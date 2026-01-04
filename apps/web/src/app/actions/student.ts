'use server'

import { revalidatePath } from 'next/cache'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { createClient, getCurrentUser, verifyStudentAuth } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkRateLimit, checkStudentMutationRateLimit } from '@/lib/rate-limiter-distributed'
import { queryCache } from '@/lib/cache/query-cache'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'
import { JoinClassSchema, StudentProfileSchema, ClassIdSchema } from '@/lib/validation-schemas'
import type { UpsertStudentProfileRPCResponse } from '@/types/auth'

interface StudentProfileParams {
  name: string
  gender: 'male' | 'female'
  phone?: string
  rollNumber?: string
  schoolName?: string
  className?: string
  village?: string
}

/**
 * Save student profile after signup
 * Creates a new record in student_profiles table
 */
export async function saveStudentProfile(params: StudentProfileParams) {
  try {
    // Validate inputs
    const validatedInput = StudentProfileSchema.parse(params)
    authLogger.debug('[saveStudentProfile] Validated input', {
      name: validatedInput.name,
      gender: validatedInput.gender
    })

    // SECURITY: Verify caller is authenticated and is a student (not teacher/admin)
    const auth = await verifyStudentAuth('saveStudentProfile')
    if (!auth.authorized) {
      return auth.error
    }

    const user = auth.user

    authLogger.debug('[saveStudentProfile] User authenticated', {
      userId: user.id,
      email: user.email,
      isAnonymous: user.is_anonymous
    })

    // SECURITY: Rate limit student mutations to prevent abuse
    if (!(await checkStudentMutationRateLimit(user.id))) {
      authLogger.warn('[saveStudentProfile] Rate limit exceeded', { userId: user.id })
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    // SECURITY FIX #2: Use atomic UPSERT RPC to eliminate race condition
    // Single database operation ensures concurrent requests are serialized atomically
    // No check-then-insert pattern window for concurrent requests to exploit
    authLogger.debug('[saveStudentProfile] Calling atomic upsert_student_profile RPC...', {
      userId: user.id,
      name: validatedInput.name
    })

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'upsert_student_profile',
      {
        p_user_id: user.id,
        p_name: validatedInput.name,
        p_gender: validatedInput.gender,
        p_date_of_birth: null, // Not in current schema - reserved for future
        p_phone: validatedInput.phone || null,
        p_location: validatedInput.village || null,
        p_medium: null, // Not in current schema - reserved for future
        p_board: null, // Not in current schema - reserved for future
        p_class: validatedInput.className || null,
      }
    )

    if (rpcError) {
      authLogger.error('[saveStudentProfile] RPC upsert_student_profile failed', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        userId: user.id
      })
      return { success: false, error: 'Failed to save profile. Please try again.' }
    }

    // RPC returns JSON object with success/error
    const rpcResponse = rpcResult as UpsertStudentProfileRPCResponse
    if (rpcResponse && typeof rpcResponse === 'object') {
      if (rpcResponse.success === false) {
        authLogger.error('[saveStudentProfile] RPC returned error', {
          error: rpcResponse.error,
          code: rpcResponse.code
        })
        return { success: false, error: 'Failed to save profile. Please try again.' }
      }
    }

    authLogger.success('[saveStudentProfile] Profile saved successfully (UPSERT)', {
      userId: user.id,
      result: rpcResult
    })
    revalidatePath('/app/dashboard')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      authLogger.error('[saveStudentProfile] Validation error', { issues: error.issues })
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[saveStudentProfile] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Internal function to fetch student profile from database
 * This is wrapped by getStudentProfile() with query caching
 */
async function fetchStudentProfileFromDB(userId: string) {
  const supabase = await createClient()

  // Use maybeSingle to avoid 406 error when profile doesn't exist
  // OPTIMIZATION: Select only needed columns instead of *
  const { data: profile, error } = await supabase
    .from('student_profiles')
    .select('user_id, name, gender, date_of_birth, phone, location, medium, board, class, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return profile
}

/**
 * Get current user's student profile
 * PERFORMANCE: Results cached for 2 minutes to reduce database load
 */
export async function getStudentProfile() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated', profile: null }
    }

    // PERFORMANCE: Use query cache - 2 minute TTL for student profiles
    // Student profiles change less frequently and benefit from caching
    const profile = await queryCache.getOrFetch(
      `student:${user.id}:profile`,
      () => fetchStudentProfileFromDB(user.id),
      2 * 60 * 1000 // 2 minutes
    )

    return { success: true, profile }
  } catch (error) {
    authLogger.error('[getStudentProfile] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      profile: null,
    }
  }
}

/**
 * Preview class details before joining
 * Returns class name, teacher name, and subject without requiring PIN
 * This allows students to verify they're joining the right class
 */
export async function previewClass(classCode: string): Promise<{
  success: boolean
  data?: {
    className: string
    teacherName: string
    subject: string | null
    studentCount: number
  }
  error?: string
}> {
  try {
    // Validate input using schema (consistent with other functions)
    const validatedClassCode = JoinClassSchema.pick({ classCode: true }).parse({
      classCode: classCode.toUpperCase().replace(/[^A-Z0-9]/g, ''),
    }).classCode

    const supabase = await createClient()

    // Find class by code (no PIN required for preview)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        subject,
        teacher_id
      `)
      .eq('class_code', validatedClassCode)
      .maybeSingle()

    if (classError) {
      authLogger.error('[previewClass] Error looking up class', classError)
      return { success: false, error: 'Failed to lookup class' }
    }

    if (!classData) {
      return { success: false, error: 'Class not found. Please check the code.' }
    }

    // Get teacher name
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('name')
      .eq('user_id', classData.teacher_id)
      .maybeSingle()

    // Get student count
    const { count: studentCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classData.id)

    return {
      success: true,
      data: {
        className: classData.name,
        teacherName: teacherProfile?.name || 'Unknown Teacher',
        subject: classData.subject,
        studentCount: studentCount || 0
      }
    }
  } catch (error) {
    authLogger.error('[previewClass] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

interface JoinClassParams {
  classCode: string
  pin: string
}

export async function joinClass({ classCode, pin }: JoinClassParams) {
  try {
    // Validate inputs
    const validatedInput = JoinClassSchema.parse({ classCode, pin })
    classCode = validatedInput.classCode
    pin = validatedInput.pin

    // SECURITY: Verify caller is authenticated and is a student
    const auth = await verifyStudentAuth('joinClass')
    if (!auth.authorized) {
      return auth.error
    }

    // SECURITY: Rate limit to prevent PIN brute force attacks
    // Uses dedicated class join limits (5 attempts per hour per class)
    const isAllowed = await checkRateLimit(`join-class:${auth.user.id}:${classCode}`, RATE_LIMITS.classJoinAttempts)
    if (!isAllowed) {
      authLogger.warn('[joinClass] Rate limit exceeded', { userId: auth.user.id, classCode })
      return {
        success: false,
        error: 'Too many join attempts. Please wait before trying again.',
      }
    }

    const supabase = await createClient()

    // Find class by code and verify PIN - use .maybeSingle() since class may not exist
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, class_code, join_pin')
      .eq('class_code', classCode)
      .maybeSingle()

    if (classError) {
      authLogger.error('[joinClass] Error looking up class', classError)
      return { success: false, error: 'Failed to lookup class' }
    }

    if (!classData) {
      authLogger.debug('[joinClass] Class not found', { classCode })
      return { success: false, error: 'Invalid class code or PIN' }
    }

    // Verify PIN using constant-time comparison to prevent timing attacks
    let pinMatch = false
    if (classData.join_pin) {
      try {
        pinMatch = timingSafeEqual(Buffer.from(pin), Buffer.from(classData.join_pin))
      } catch {
        // timingSafeEqual throws if buffers are different lengths
        pinMatch = false
      }
    }

    if (!pinMatch) {
      authLogger.warn('[joinClass] Invalid PIN attempt', { classCode, userId: auth.user.id })
      return { success: false, error: 'Invalid class code or PIN' }
    }

    // Check if already enrolled
    // Use .maybeSingle() instead of .single() - .single() throws PGRST116 when no rows found
    const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', classData.id)
      .eq('student_id', auth.user.id)
      .maybeSingle()

    if (enrollmentCheckError) {
      authLogger.error('[joinClass] Error checking existing enrollment', enrollmentCheckError)
      return { success: false, error: 'Failed to check enrollment status' }
    }

    if (existingEnrollment) {
      return { success: false, error: 'Already enrolled in this class' }
    }

    // Create enrollment
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        class_id: classData.id,
        student_id: auth.user.id,
      })
      .select()
      .single()

    if (error) {
      // Don't expose raw Supabase error to client
      authLogger.error('[joinClassWithPIN] Failed to create enrollment', {
        code: error.code,
        message: error.message,
        details: error.details,
        classId: classData.id,
        studentId: auth.user.id,
      })

      // Return generic error message
      if (error.code === '23505') {
        // Unique constraint violation (already enrolled)
        return { success: false, error: 'Already enrolled in this class' }
      }

      return { success: false, error: 'Failed to enroll in class. Please try again.' }
    }

    revalidatePath('/app/student/classes')
    return {
      success: true,
      data: {
        ...data,
        className: classData.name,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

export async function leaveClass(classId: string) {
  try {
    // Validate class ID
    const validatedClassId = ClassIdSchema.parse(classId)

    // SECURITY: Verify caller is authenticated and is a student
    const auth = await verifyStudentAuth('leaveClass')
    if (!auth.authorized) {
      return auth.error
    }

    // SECURITY: Rate limit student mutations to prevent abuse
    if (!(await checkStudentMutationRateLimit(auth.user.id))) {
      authLogger.warn('[leaveClass] Rate limit exceeded', { userId: auth.user.id })
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_id', validatedClassId)
      .eq('student_id', auth.user.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/app/student/classes')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}
