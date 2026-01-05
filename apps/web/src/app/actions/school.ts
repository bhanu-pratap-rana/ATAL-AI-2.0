'use server'

import { z } from 'zod'
import { createClient, createAdminClient, getCurrentUser } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'
import { checkRateLimit } from '@/lib/rate-limiter-distributed'
import { RATE_LIMITS } from '@/lib/constants/rate-limits'
import {
  SearchQuerySchema,
  SchoolCodeSchema,
  StaffPinSchema,
  TeacherNameSchema,
  PhoneSchema,
} from '@/lib/validation-schemas'

// Use centralized rate limits from constants
const SEARCH_RATE_LIMIT = RATE_LIMITS.schoolSearch
const VERIFY_TEACHER_RATE_LIMIT = RATE_LIMITS.teacherVerification

export interface VerifyTeacherParams {
  schoolCode: string
  staffPin: string
  teacherName: string
  phone?: string
  subject?: string
}

export interface VerifyTeacherResult {
  success: boolean
  error?: string
  schoolId?: string
  schoolName?: string
}

/**
 * Verify teacher credentials using School Code + Staff PIN
 * This elevates the authenticated user's role to 'teacher'
 */
/**
 * Helper: Validate and parse input parameters
 */
function validateVerifyTeacherInput(
  schoolCode: string,
  staffPin: string,
  teacherName?: string,
  phone?: string
): { success: true; data: { schoolCode: string; staffPin: string; teacherName?: string; phone?: string } } | { success: false; error: string } {
  try {
    const validatedSchoolCode = SchoolCodeSchema.parse(schoolCode)
    const validatedStaffPin = StaffPinSchema.parse(staffPin)
    const validatedTeacherName = teacherName ? TeacherNameSchema.parse(teacherName) : undefined
    const validatedPhone = phone ? PhoneSchema.parse(phone) : undefined

    return {
      success: true,
      data: {
        schoolCode: validatedSchoolCode,
        staffPin: validatedStaffPin,
        teacherName: validatedTeacherName,
        phone: validatedPhone,
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    return { success: false, error: 'Validation failed' }
  }
}

/**
 * Helper: Check if user can register as teacher
 */
async function canUserRegisterAsTeacher(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  adminClient: Awaited<ReturnType<typeof createAdminClient>>
): Promise<{ canRegister: true } | { canRegister: false; error: string }> {
  if (!user) {
    return { canRegister: false, error: 'Not authenticated' }
  }

  const isAnonymous = user.is_anonymous || false
  if (isAnonymous) {
    return {
      canRegister: false,
      error: 'Anonymous users cannot register as teachers. Please sign in with email or phone.',
    }
  }

  const { data: existingTeacher, error: existingTeacherError } = await adminClient
    .from('teacher_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingTeacherError) {
    authLogger.error('[verifyTeacher] Error checking existing teacher profile', existingTeacherError)
  }

  if (existingTeacher) {
    return { canRegister: false, error: 'You are already registered as a teacher' }
  }

  return { canRegister: true }
}

/**
 * Helper: Lookup school by code
 */
async function lookupSchoolByCode(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  schoolCode: string
): Promise<{ success: true; school: { id: string; school_code: string; school_name: string } } | { success: false; error: string }> {
  const { data: school, error: schoolError } = await adminClient
    .from('schools')
    .select('id, school_code, school_name')
    .eq('school_code', schoolCode.toUpperCase().trim())
    .maybeSingle()

  if (schoolError) {
    authLogger.error('[verifyTeacher] Error looking up school', schoolError)
    return {
      success: false,
      error: 'Failed to lookup school. Please try again.',
    }
  }

  if (!school) {
    authLogger.debug('[verifyTeacher] School code not found', { schoolCode })
    return {
      success: false,
      error: 'Invalid school code. Please verify and try again.',
    }
  }

  return { success: true, school }
}

/**
 * Helper: Verify staff PIN via RPC
 */
async function verifyStaffPinRPC(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  schoolId: string,
  staffPin: string
): Promise<{ success: true; pinMatch: boolean } | { success: false; error: string }> {
  const { data: verifyResult, error: verifyError } = await adminClient.rpc('verify_staff_pin', {
    p_school_id: schoolId,
    p_pin: staffPin,
  })

  if (verifyError) {
    authLogger.error('[verifyTeacher] RPC error during PIN verification', {
      message: verifyError.message,
      code: verifyError.code,
      details: verifyError.details,
      hint: verifyError.hint
    })
    return {
      success: false,
      error: 'Unable to verify PIN. Please try again.',
    }
  }

  let pinMatch = false
  if (verifyResult && Array.isArray(verifyResult) && verifyResult.length > 0) {
    pinMatch = verifyResult[0].is_valid === true
    authLogger.debug('[verifyTeacher] PIN match result', { is_valid: verifyResult[0].is_valid, pinMatch })
  } else {
    authLogger.warn('[verifyTeacher] No PIN record found for school', { schoolId })
  }

  return { success: true, pinMatch }
}

/**
 * Helper: Create teacher profile and update user metadata
 */
async function createTeacherProfile(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  schoolId: string,
  schoolCode: string,
  teacherName: string,
  phone?: string,
  subject?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { error: insertError } = await adminClient.from('teacher_profiles').insert({
    user_id: userId,
    school_id: schoolId,
    name: teacherName,
    phone,
    subject,
    school_code: schoolCode,
  })

  if (insertError) {
    authLogger.error('[verifyTeacher] Failed to create teacher profile', insertError)
    return {
      success: false,
      error: 'Failed to create teacher profile. Please try again.',
    }
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    userId,
    {
      app_metadata: {
        role: 'teacher',
        school_id: schoolId,
        school_code: schoolCode,
      },
    }
  )

  if (updateError) {
    authLogger.warn('[verifyTeacher] Failed to update app_metadata (non-critical)', updateError)
  }

  return { success: true }
}

/**
 * Verify teacher credentials and create profile (refactored to reduce cognitive complexity)
 * CRITICAL FIX: Reduced complexity from 23 to <15 by extracting helper functions
 */
export async function verifyTeacher({
  schoolCode,
  staffPin,
  teacherName,
  phone,
  subject,
}: VerifyTeacherParams): Promise<VerifyTeacherResult> {
  try {
    const inputValidation = validateVerifyTeacherInput(schoolCode, staffPin, teacherName, phone)
    if (!inputValidation.success) {
      return inputValidation
    }

    const user = await getCurrentUser()
    const adminClient = await createAdminClient()

    const registrationCheck = await canUserRegisterAsTeacher(user, adminClient)
    if (!registrationCheck.canRegister) {
      return { success: false, error: registrationCheck.error }
    }

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const isAllowed = await checkRateLimit(`verify-teacher:${user.id}`, VERIFY_TEACHER_RATE_LIMIT)
    if (!isAllowed) {
      authLogger.warn('[verifyTeacher] Rate limit exceeded for user', { userId: user.id })
      return {
        success: false,
        error: 'Too many verification attempts. Please wait an hour before trying again.',
      }
    }

    const schoolLookup = await lookupSchoolByCode(adminClient, inputValidation.data.schoolCode)
    if (!schoolLookup.success) {
      return schoolLookup
    }

    authLogger.debug('[verifyTeacher] School found', { schoolId: schoolLookup.school.id, schoolName: schoolLookup.school.school_name })

    const pinVerification = await verifyStaffPinRPC(
      adminClient,
      schoolLookup.school.id,
      inputValidation.data.staffPin
    )
    if (!pinVerification.success) {
      return pinVerification
    }

    if (!pinVerification.pinMatch) {
      authLogger.warn('[verifyTeacher] Invalid PIN attempt', { schoolCode: inputValidation.data.schoolCode, schoolId: schoolLookup.school.id })
      return {
        success: false,
        error: 'Invalid PIN. Please verify and try again.',
      }
    }

    authLogger.info('[verifyTeacher] PIN verified successfully', { schoolId: schoolLookup.school.id })

    if (inputValidation.data.teacherName && inputValidation.data.teacherName.trim()) {
      const profileResult = await createTeacherProfile(
        adminClient,
        user.id,
        schoolLookup.school.id,
        schoolLookup.school.school_code,
        inputValidation.data.teacherName,
        inputValidation.data.phone,
        subject
      )
      if (!profileResult.success) {
        return profileResult
      }
    }

    return {
      success: true,
      schoolId: schoolLookup.school.id,
      schoolName: schoolLookup.school.school_name,
    }
  } catch (error) {
    authLogger.error('[verifyTeacher] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

/**
 * Get all schools (for dropdown/search)
 */
export async function searchSchools(query: string) {
  try {
    const validatedQuery = SearchQuerySchema.parse(query)

    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] }
    }

    const isAllowed = await checkRateLimit(`search-schools:${user.id}`, SEARCH_RATE_LIMIT)
    if (!isAllowed) {
      return { success: false, error: 'Too many search requests. Please wait a moment before trying again.', data: [] }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('schools')
      .select('id, school_code, school_name, district')
      .or(`school_code.ilike.%${validatedQuery}%,school_name.ilike.%${validatedQuery}%`)
      .limit(20)

    if (error) {
      authLogger.error('[searchSchools] Failed to search schools', error)
      return { success: false, error: 'Failed to search schools', data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    authLogger.error('[searchSchools] Unexpected error', error)
    return { success: false, error: 'An unexpected error occurred', data: [] }
  }
}

/**
 * Get school by code
 * @internal - Not currently used, kept for potential future use
 */
async function getSchoolByCode(schoolCode: string) {
  try {
    const supabase = await createClient()

    // Use .maybeSingle() - school code may not exist
    // OPTIMIZATION: Select only needed columns instead of *
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, school_code, district, created_at, updated_at')
      .eq('school_code', schoolCode.toUpperCase().trim())
      .maybeSingle()

    if (error) {
      authLogger.error('[getSchoolByCode] School lookup error', error)
      return { success: false, error: 'Failed to lookup school. Please try again.' }
    }

    if (!data) {
      authLogger.debug('[getSchoolByCode] School not found', { schoolCode })
      return { success: false, error: 'Unable to find school. Please verify your school code and try again.' }
    }

    return { success: true, data }
  } catch (error) {
    authLogger.error('[getSchoolByCode] Unexpected error', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Helper: Validate PIN input
 */
function validatePinInput(newPin: string): { valid: true } | { valid: false; error: string } {
  if (!newPin || newPin.length < 4) {
    return {
      valid: false,
      error: 'PIN must be at least 4 characters long',
    }
  }
  return { valid: true }
}

/**
 * Helper: Check if user is authorized to rotate PINs
 */
async function checkPinRotationAuthorization(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ authorized: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; userRole: string | undefined } | { authorized: false; error: string }> {
  if (!user) {
    authLogger.warn('[rotateStaffPin] Unauthenticated access attempt')
    return { authorized: false, error: 'Not authenticated' }
  }

  const userRole = user.app_metadata?.role
  let isAuthorized = userRole === 'admin' || userRole === 'super_admin' || userRole === 'teacher'

  if (!isAuthorized && !userRole) {
    const { data: teacherProfile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id, school_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      authLogger.error('[rotateStaffPin] Error checking teacher profile', profileError)
      return { authorized: false, error: 'Failed to verify authorization' }
    }

    isAuthorized = !!teacherProfile
  }

  if (!isAuthorized) {
    authLogger.warn('[rotateStaffPin] Unauthorized role access attempt', { userId: user.id, role: userRole })
    return { authorized: false, error: 'Unauthorized: Teacher or Admin access required' }
  }

  return { authorized: true, user, userRole }
}

/**
 * Helper: Check if user is authorized for specific school
 */
async function checkSchoolAuthorization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  schoolId: string,
  userRole: string | undefined
): Promise<{ authorized: true } | { authorized: false; error: string }> {
  if (userRole === 'admin' || userRole === 'super_admin') {
    return { authorized: true }
  }

  const { data: teacherProfile, error: teacherError } = await supabase
    .from('teacher_profiles')
    .select('school_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (teacherError) {
    authLogger.error('[rotateStaffPin] Error checking teacher school authorization', teacherError)
    return { authorized: false, error: 'Failed to verify school authorization' }
  }

  const isAuthorizedForSchool = !!(teacherProfile && schoolId === teacherProfile.school_id)
  if (!isAuthorizedForSchool) {
    authLogger.warn('[rotateStaffPin] User not authorized for school', { userId: user.id, schoolId })
    return { authorized: false, error: 'Unauthorized: You can only rotate PINs for your own school.' }
  }

  return { authorized: true }
}

/**
 * Helper: Lookup school and verify authorization
 */
async function lookupSchoolAndVerifyAuth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  schoolCode: string,
  userRole: string | undefined
): Promise<{ success: true; school: { id: string; school_code: string; school_name: string } } | { success: false; error: string }> {
  const { data: schoolData, error: schoolError } = await supabase
    .from('schools')
    .select('id, school_code, school_name')
    .eq('school_code', schoolCode.toUpperCase().trim())
    .maybeSingle()

  if (schoolError) {
    authLogger.error('[rotateStaffPin] Error looking up school', schoolError)
    return { success: false, error: 'Failed to lookup school' }
  }

  if (!schoolData) {
    authLogger.warn('[rotateStaffPin] School code not found or not provided', { schoolCode })
    return {
      success: false,
      error: 'Unable to rotate PIN. Please verify your school code and try again.',
    }
  }

  const authCheck = await checkSchoolAuthorization(supabase, user, schoolData.id, userRole)
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error }
  }

  return { success: true, school: schoolData }
}

/**
 * Helper: Call RPC to rotate PIN
 */
async function rotatePinViaRPC(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  schoolId: string,
  newPin: string
): Promise<{ success: true; rotatedAt: string } | { success: false; error: string }> {
  const { data: rotateResult, error: rotateError } = await adminClient.rpc('rotate_staff_pin', {
    p_school_id: schoolId,
    p_new_pin: newPin,
  })

  if (rotateError) {
    authLogger.error('[rotateStaffPin] Failed to rotate PIN via RPC', rotateError)
    return {
      success: false,
      error: 'Failed to rotate PIN. Please try again.',
    }
  }

  if (!rotateResult || !rotateResult[0]?.success) {
    const errorMsg = rotateResult?.[0]?.error_message || 'Failed to rotate PIN'
    authLogger.error('[rotateStaffPin] RPC rotation failed', { error: errorMsg })
    return {
      success: false,
      error: errorMsg,
    }
  }

  return {
    success: true,
    rotatedAt: new Date().toISOString(),
  }
}

/**
 * Rotate Staff PIN for a school (refactored to reduce cognitive complexity)
 * Generates new bcrypt hash and updates school_staff_credentials
 * CRITICAL FIX: Reduced complexity from 24 to <15 by extracting helper functions
 *
 * @param schoolCode - The school code (e.g., "14H0182")
 * @param newPin - The new staff PIN (will be hashed)
 * @returns Success status with rotation timestamp
 */
export async function rotateStaffPin(schoolCode: string, newPin: string) {
  try {
    const validatedSchoolCode = SchoolCodeSchema.parse(schoolCode)
    const validatedNewPin = StaffPinSchema.parse(newPin)

    const pinValidation = validatePinInput(validatedNewPin)
    if (!pinValidation.valid) {
      return { success: false, error: pinValidation.error }
    }

    const user = await getCurrentUser()
    const supabase = await createClient()

    const authCheck = await checkPinRotationAuthorization(user, supabase)
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const schoolLookup = await lookupSchoolAndVerifyAuth(
      supabase,
      authCheck.user,
      validatedSchoolCode,
      authCheck.userRole
    )
    if (!schoolLookup.success) {
      return schoolLookup
    }

    const adminClient = await createAdminClient()
    const rotateResult = await rotatePinViaRPC(adminClient, schoolLookup.school.id, validatedNewPin)
    if (!rotateResult.success) {
      return rotateResult
    }

    authLogger.success('[rotateStaffPin] PIN rotated successfully', { schoolId: schoolLookup.school.id })
    return {
      success: true,
      schoolCode: schoolLookup.school.school_code,
      schoolName: schoolLookup.school.school_name,
      rotatedAt: rotateResult.rotatedAt,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return { success: false, error: firstError?.message || 'Invalid input' }
    }
    authLogger.error('[rotateStaffPin] Unexpected error', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

/**
 * Get PIN rotation history for a school (Admin only)
 * Returns when the PIN was last rotated
 * @internal - Not currently used, kept for potential future use
 *
 * @param schoolCode - The school code
 * @returns Rotation metadata (without exposing the hash)
 */
async function getStaffPinRotationInfo(schoolCode: string) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Use .maybeSingle() - school code may not exist
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, school_code, school_name')
      .eq('school_code', schoolCode.toUpperCase().trim())
      .maybeSingle()

    if (schoolError) {
      authLogger.error('[getStaffPinRotationInfo] Error finding school', schoolError)
      return { success: false, error: 'Failed to lookup school' }
    }

    if (!school) {
      return { success: false, error: 'School not found' }
    }

    // Use .maybeSingle() - PIN credentials may not exist
    const { data: credentials, error: credError } = await supabase
      .from('school_staff_credentials')
      .select('rotated_at, created_at')
      .eq('school_id', school.id)
      .maybeSingle()

    if (credError) {
      authLogger.error('[getStaffPinRotationInfo] Error checking credentials', credError)
      return { success: false, error: 'Failed to check PIN status' }
    }

    if (!credentials) {
      return {
        success: true,
        schoolCode: school.school_code,
        schoolName: school.school_name,
        hasCredentials: false,
      }
    }

    return {
      success: true,
      schoolCode: school.school_code,
      schoolName: school.school_name,
      hasCredentials: true,
      createdAt: credentials.created_at,
      lastRotatedAt: credentials.rotated_at,
    }
  } catch (error) {
    authLogger.error('[getStaffPinRotationInfo] Unexpected error', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Check if current user is an admin (admin or super_admin role)
 *
 * NOTE: This is a lightweight client-side authorization check.
 * For server actions that need full user data, use verifyAdminAuth() from supabase-server.ts.
 * This function is intentionally simpler for client-side use cases like conditional UI rendering.
 */
export async function checkAdminAuth(): Promise<{
  authorized: boolean
  error?: string
}> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { authorized: false, error: 'Not authenticated' }
    }

    const userRole = user.app_metadata?.role
    if (userRole === 'admin' || userRole === 'super_admin') {
      return { authorized: true }
    }

    return { authorized: false, error: 'Admin access required' }
  } catch (error) {
    authLogger.error('[checkAdminAuth] Error checking admin authorization', error)
    return { authorized: false, error: 'An error occurred while checking authorization' }
  }
}
