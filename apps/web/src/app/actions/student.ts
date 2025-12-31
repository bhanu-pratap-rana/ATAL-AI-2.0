'use server'

import { revalidatePath } from 'next/cache'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { createClient, getCurrentUser, verifyStudentAuth } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkRateLimit, checkStudentMutationRateLimit } from '@/lib/rate-limiter-distributed'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'
import { JoinClassSchema, StudentProfileSchema, ClassIdSchema } from '@/lib/validation-schemas'

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

    // Get user using consistent getCurrentUser() pattern
    const user = await getCurrentUser()

    if (!user) {
      authLogger.error('[saveStudentProfile] No authenticated user - session may not be synced')
      return { success: false, error: 'Not authenticated. Please try logging in again.' }
    }

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

    // Check if profile already exists (use maybeSingle to avoid 406 error when no rows found)
    const { data: existingProfile, error: selectError } = await supabase
      .from('student_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Log select error if any (maybeSingle returns null for no rows, not an error)
    if (selectError) {
      authLogger.error('[saveStudentProfile] Error checking existing profile', {
        code: selectError.code,
        message: selectError.message,
        details: selectError.details,
        hint: selectError.hint
      })
      // Continue anyway - we'll try to insert and handle duplicate if it exists
    }

    if (existingProfile) {
      authLogger.debug('[saveStudentProfile] Profile exists, updating...')
      // Update existing profile
      const { error: updateError } = await supabase
        .from('student_profiles')
        .update({
          name: validatedInput.name,
          gender: validatedInput.gender,
          phone: validatedInput.phone || null,
          roll_number: validatedInput.rollNumber || null,
          school_name: validatedInput.schoolName || null,
          class_name: validatedInput.className || null,
          village: validatedInput.village || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        authLogger.error('[saveStudentProfile] Failed to update profile', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        })
        return { success: false, error: `Failed to update profile: ${updateError.message}` }
      }

      authLogger.success('[saveStudentProfile] Profile updated successfully')
      return { success: true }
    }

    // Create new profile
    authLogger.debug('[saveStudentProfile] Creating new profile...', { userId: user.id })
    const { data: insertData, error: insertError } = await supabase
      .from('student_profiles')
      .insert({
        user_id: user.id,
        name: validatedInput.name,
        gender: validatedInput.gender,
        phone: validatedInput.phone || null,
        roll_number: validatedInput.rollNumber || null,
        school_name: validatedInput.schoolName || null,
        class_name: validatedInput.className || null,
        village: validatedInput.village || null,
      })
      .select()

    if (insertError) {
      authLogger.error('[saveStudentProfile] Failed to create profile', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        userId: user.id
      })

      // Provide more specific error messages based on error code
      let errorMessage = 'Failed to create profile'
      if (insertError.code === '23505') {
        errorMessage = 'Profile already exists for this user'
      } else if (insertError.code === '23503') {
        errorMessage = 'User account not found. Please try signing up again.'
      } else if (insertError.code === '42501') {
        errorMessage = 'Permission denied. Please try logging in again.'
      } else if (insertError.message) {
        errorMessage = insertError.message
      }

      return { success: false, error: errorMessage }
    }

    authLogger.success('[saveStudentProfile] Profile created successfully', {
      userId: user.id,
      insertData
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
 * Get current user's student profile
 */
export async function getStudentProfile() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated', profile: null }
    }

    const supabase = await createClient()

    // Use maybeSingle to avoid 406 error when profile doesn't exist
    const { data: profile, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      authLogger.error('[getStudentProfile] Error fetching profile', error)
      return { success: false, error: 'Failed to fetch profile', profile: null }
    }

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
    // Normalize class code
    classCode = classCode.toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (classCode.length !== 6) {
      return { success: false, error: 'Class code must be 6 characters' }
    }

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
      .eq('class_code', classCode)
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
      return auth.error!
    }

    // SECURITY: Rate limit to prevent PIN brute force attacks
    // Uses dedicated class join limits (5 attempts per hour per class)
    const isAllowed = await checkRateLimit(`join-class:${auth.user!.id}:${classCode}`, RATE_LIMITS.classJoinAttempts)
    if (!isAllowed) {
      authLogger.warn('[joinClass] Rate limit exceeded', { userId: auth.user!.id, classCode })
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
      authLogger.warn('[joinClass] Invalid PIN attempt', { classCode, userId: auth.user!.id })
      return { success: false, error: 'Invalid class code or PIN' }
    }

    // Check if already enrolled
    // Use .maybeSingle() instead of .single() - .single() throws PGRST116 when no rows found
    const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', classData.id)
      .eq('student_id', auth.user!.id)
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
        student_id: auth.user!.id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
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
      return auth.error!
    }

    // SECURITY: Rate limit student mutations to prevent abuse
    if (!(await checkStudentMutationRateLimit(auth.user!.id))) {
      authLogger.warn('[leaveClass] Rate limit exceeded', { userId: auth.user!.id })
      return { success: false, error: 'Too many requests. Please try again later.' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('class_id', validatedClassId)
      .eq('student_id', auth.user!.id)

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
