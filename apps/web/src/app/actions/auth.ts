'use server'

import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { BLOCKED_EMAIL_DOMAINS, COMMON_DOMAIN_TYPOS } from '@/lib/auth-constants'
import { authLogger } from '@/lib/auth-logger'
import { findAuthUserByEmail } from '@/lib/admin-utils'
import { checkOtpRateLimit, checkOtpVerifyRateLimit, checkPasswordResetRateLimit, checkEnumerationRateLimit } from '@/lib/rate-limiter-distributed'
import { isValidEmailDomain } from '@/lib/email-validation'
import { isTeacherOrHigher } from '@/lib/auth/role-utils'
import {
  AuthEmailSchema,
  AuthPasswordSchema,
  OtpTokenSchema,
  UsernameSchema,
} from '@/lib/validation-schemas'

/**
 * Check if email exists in the system and determine role
 *
 * Role hierarchy:
 * - Student: Can only be student (cannot become teacher/admin)
 * - Teacher: Can be teacher, can be promoted to admin
 * - Admin: Teacher with admin privileges
 * - Super Admin: Only Atal AI (system account)
 *
 * Rules:
 * - Student email cannot be used for teacher/admin signup
 * - Teacher email cannot be used for student signup
 * - Existing auth users must login, not create new account
 */
export async function checkEmailExistsInAuth(email: string): Promise<{
  exists: boolean
  role?: 'student' | 'teacher' | 'admin' | 'super_admin' | 'unknown'
  hasStudentProfile?: boolean
  hasTeacherProfile?: boolean
}> {
  try {
    // Validate and normalize email
    const trimmedEmail = AuthEmailSchema.parse(email)

    // Use admin client to check auth.users (bypasses RLS)
    const adminClient = await createAdminClient()

    // Check if user exists in Supabase auth (with pagination support)
    const existingAuthUser = await findAuthUserByEmail(adminClient, trimmedEmail)

    if (!existingAuthUser) {
      authLogger.debug('[checkEmailExistsInAuth] Email not found in auth.users')
      return { exists: false }
    }

    // User exists in auth - check their profiles
    const userId = existingAuthUser.id

    // Check student_profiles
    const { data: studentProfile } = await adminClient
      .from('student_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    // Check teacher_profiles
    const { data: teacherProfile } = await adminClient
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    const hasStudentProfile = !!studentProfile
    const hasTeacherProfile = !!teacherProfile

    // Determine role based on profiles and app_metadata
    let role: 'student' | 'teacher' | 'admin' | 'super_admin' | 'unknown' = 'unknown'
    const appRole = existingAuthUser.app_metadata?.role

    if (appRole === 'super_admin') {
      role = 'super_admin'
    } else if (appRole === 'admin') {
      role = 'admin'
    } else if (hasTeacherProfile || appRole === 'teacher') {
      role = 'teacher'
    } else if (hasStudentProfile) {
      role = 'student'
    }

    authLogger.info('[checkEmailExistsInAuth] Email exists', {
      role,
      hasStudentProfile,
      hasTeacherProfile,
      appRole
    })

    return {
      exists: true,
      role,
      hasStudentProfile,
      hasTeacherProfile
    }
  } catch (error) {
    authLogger.error('[checkEmailExistsInAuth] Unexpected error', error)
    return { exists: false }
  }
}

/**
 * Request an OTP (One-Time Password) to be sent to the user's email address
 *
 * Validates the email, checks rate limits, and sends OTP via Supabase Auth.
 * Auto-creates the user if they don't exist yet.
 *
 * @param email - The email address to send OTP to
 * @returns Object with success status and error/role information if applicable
 *
 * @example
 * ```typescript
 * const result = await requestOtp('user@example.com')
 * if (result.success) {
 *   // OTP sent successfully, prompt user for OTP code
 * } else if (result.exists && result.role === 'teacher') {
 *   // Email is registered as teacher, direct to teacher login
 * } else {
 *   // Show error message to user
 *   showError(result.error)
 * }
 * ```
 */
/**
 * Helper: Validate and parse email input
 */
function validateEmailInput(email: string): { success: true; email: string } | { success: false; error: string } {
  try {
    const trimmedEmail = AuthEmailSchema.parse(email)
    return { success: true, email: trimmedEmail }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      authLogger.debug('[requestOtp] Invalid email format', { error: firstError?.message })
      return { success: false, error: firstError?.message || 'Please enter a valid email address.' }
    }
    throw error
  }
}

/**
 * Helper: Validate email domain
 */
function validateEmailDomain(email: string): { valid: true } | { valid: false; error: string } {
  const emailDomain = email.split('@')[1]
  if (!emailDomain || !isValidEmailDomain(emailDomain)) {
    authLogger.debug('[requestOtp] Invalid email domain')
    return {
      valid: false,
      error: 'Please enter a valid email address from a recognized email provider.'
    }
  }
  return { valid: true }
}

/**
 * Helper: Check rate limits (OTP and enumeration)
 */
async function checkRateLimits(email: string): Promise<{ allowed: true } | { allowed: false; error: string }> {
  if (!(await checkOtpRateLimit(email))) {
    authLogger.warn('[requestOtp] Rate limit exceeded', { type: 'otp_limit' })
    return {
      allowed: false,
      error: 'Too many OTP requests. Please wait an hour before requesting again.',
    }
  }

  const enumerationKey = `email:check:${email}`
  if (!(await checkEnumerationRateLimit(enumerationKey))) {
    authLogger.warn('[requestOtp] Email enumeration rate limit exceeded', {
      email,
      limitType: 'enumeration'
    })
    return {
      allowed: false,
      error: 'If this email is registered, check your inbox for a login link. If you don\'t have an account, you can create one.',
    }
  }

  return { allowed: true }
}

/**
 * Helper: Check for blocked domains and suspicious patterns
 */
function validateEmailSecurity(email: string): { valid: true } | { valid: false; error: string } {
  const domain = email.split('@')[1]
  
  if (domain && BLOCKED_EMAIL_DOMAINS.has(domain.toLowerCase())) {
    authLogger.debug('[requestOtp] Blocked domain detected')

    if (COMMON_DOMAIN_TYPOS[domain]) {
      const suggestedEmail = email.replace(domain, COMMON_DOMAIN_TYPOS[domain])
      authLogger.warn('[requestOtp] Possible typo detected in email domain')
      return {
        valid: false,
        error: `Did you mean ${suggestedEmail}? Please check your email address.`
      }
    }

    return {
      valid: false,
      error: 'Please enter a valid email address from a recognized email provider.'
    }
  }

  const suspiciousPatterns = ['test@', 'fake@', 'example@', 'spam@', 'temp@', 'disposable@']
  if (suspiciousPatterns.some(pattern => email.startsWith(pattern))) {
    authLogger.debug('[requestOtp] Suspicious email pattern detected')
    return {
      valid: false,
      error: 'Please use a valid email address.'
    }
  }

  return { valid: true }
}

/**
 * Helper: Handle email enumeration check
 */
async function handleEmailEnumerationCheck(email: string): Promise<{ shouldProceed: true } | { shouldProceed: false; error: string }> {
  const emailCheck = await checkEmailExistsInAuth(email)
  if (emailCheck.exists) {
    authLogger.warn('[requestOtp] Email already registered - enumeration attempt detected', {
      email,
      role: emailCheck.role,
      sourceIP: '[IP_ADDRESS]'
    })

    return {
      shouldProceed: false,
      error: 'If this email is registered, check your inbox for a login link. If you don\'t have an account, you can create one.',
    }
  }

  return { shouldProceed: true }
}

/**
 * Helper: Handle Supabase OTP request errors
 */
function handleOtpRequestError(error: { message: string; status?: number; name?: string }): string {
  authLogger.error('[requestOtp] Supabase error', error, {
    status: error.status,
    name: error.name,
  })

  if (error.message.includes('rate limit')) {
    return 'Too many requests. Please wait a few minutes and try again.'
  }
  if (error.message.includes('Email provider') || error.message.includes('email')) {
    return 'Email service issue. Please check Supabase dashboard Auth settings.'
  }
  if (error.message.includes('Invalid email')) {
    return 'Please enter a valid email address.'
  }

  return error.message
}

/**
 * Request OTP for email authentication (refactored to reduce cognitive complexity)
 * CRITICAL FIX: Reduced complexity from 20 to <15 by extracting helper functions
 */
export async function requestOtp(email: string) {
  try {
    const emailValidation = validateEmailInput(email)
    if (!emailValidation.success) {
      return emailValidation
    }

    const domainValidation = validateEmailDomain(emailValidation.email)
    if (!domainValidation.valid) {
      return { success: false, error: domainValidation.error }
    }

    const rateLimitCheck = await checkRateLimits(emailValidation.email)
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error }
    }

    const securityValidation = validateEmailSecurity(emailValidation.email)
    if (!securityValidation.valid) {
      return { success: false, error: securityValidation.error }
    }

    const enumerationCheck = await handleEmailEnumerationCheck(emailValidation.email)
    if (!enumerationCheck.shouldProceed) {
      return { success: false, error: enumerationCheck.error }
    }

    authLogger.debug('[requestOtp] Starting OTP request')

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOtp({
      email: emailValidation.email,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      return { success: false, error: handleOtpRequestError(error) }
    }

    authLogger.success('[requestOtp] OTP sent successfully')
    return { success: true, data }
  } catch (error) {
    authLogger.error('[requestOtp] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

export async function verifyOtp(email: string, token: string) {
  try {
    // Validate inputs
    let validatedEmail: string
    let validatedToken: string
    try {
      validatedEmail = AuthEmailSchema.parse(email)
      validatedToken = OtpTokenSchema.parse(token)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        return { success: false, error: firstError?.message || 'Invalid input' }
      }
      throw error
    }

    authLogger.debug('[verifyOtp] Starting OTP verification')

    // SECURITY: Rate limit OTP verification to prevent brute-force attacks
    if (!(await checkOtpVerifyRateLimit(validatedEmail))) {
      authLogger.warn('[verifyOtp] Rate limit exceeded', { email: validatedEmail })
      return { success: false, error: 'Too many verification attempts. Please try again later.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      email: validatedEmail,
      token: validatedToken,
      type: 'email',
    })

    if (error) {
      authLogger.error('[verifyOtp] Verification failed', error)
      return { success: false, error: error.message }
    }

    // SECURITY: Only trust app_metadata.role (server-side set, immutable by client)
    // Never fall back to user_metadata.role as it can be client-modified
    const role = data.user?.app_metadata?.role || 'student'
    authLogger.success('[verifyOtp] OTP verified successfully', { role })

    // Session is now created - check user role and redirect
    // Revalidate the layout to pick up the new session
    revalidatePath('/', 'layout')

    authLogger.debug('[verifyOtp] Redirecting user', { role })

    // Redirect based on role - teachers, admins, and super_admins go to teacher classes
    if (isTeacherOrHigher(role)) {
      redirect('/app/teacher/classes')
    } else {
      redirect('/app/dashboard')
    }
  } catch (error) {
    // Next.js redirect() throws a NEXT_REDIRECT error which is expected behavior
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error // Re-throw to allow the redirect to happen
    }

    authLogger.error('[verifyOtp] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Send forgot password OTP
 * Used for both teacher and student password recovery
 *
 * Users can reset password in two ways:
 * 1. Embedded form in /student/start or /teacher/start (main flow)
 * 2. Dedicated /reset-password page (alternative flow for email links)
 *
 * Email contains 6-digit OTP code. User manually enters it along with new password.
 *
 * Password requirements:
 * - Minimum 8 characters
 * - Maximum 64 characters (supports long passphrases)
 * - No complexity rules required
 *
 * @param email - User's email address
 * @returns Object with success status and error message if failed
 *
 * @example
 * ```typescript
 * const result = await sendForgotPasswordOtp('user@example.com')
 * if (result.success) {
 *   // Email sent with OTP code
 *   // User can now:
 *   // 1. Enter OTP in embedded form on current page
 *   // 2. OR navigate to /reset-password?email=user@example.com
 * }
 * ```
 */
export async function sendForgotPasswordOtp(email: string) {
  try {
    // Validate email format using Zod schema
    let trimmedEmail: string
    try {
      trimmedEmail = AuthEmailSchema.parse(email)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        return { success: false, error: firstError?.message || 'Please enter a valid email address.' }
      }
      throw error
    }

    // Check rate limit - prevent password reset spam/abuse
    if (!(await checkPasswordResetRateLimit(trimmedEmail))) {
      authLogger.warn('[sendForgotPasswordOtp] Rate limit exceeded', { type: 'password_reset_limit' })
      return {
        success: false,
        error: 'Too many password reset requests. Please wait an hour before requesting again.',
      }
    }

    authLogger.debug('[sendForgotPasswordOtp] Sending recovery OTP')

    const supabase = await createClient()

    // Note: Using manual OTP entry (not magic link), so emailRedirectTo is not needed
    // Email contains 6-digit OTP that user enters manually
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false, // Don't create user if doesn't exist
      },
    })

    if (error) {
      authLogger.error('[sendForgotPasswordOtp] Error', error)

      // SECURITY FIX: Prevent email enumeration
      // Always return success message regardless of whether email exists
      // This prevents attackers from discovering valid email addresses
      authLogger.info('[sendForgotPasswordOtp] Request processed', {
        emailDomain: trimmedEmail.split('@')[1] // Log domain for monitoring, not full email
      })
    }

    // Always return success message to prevent email enumeration
    authLogger.success('[sendForgotPasswordOtp] Request completed')
    return {
      success: true,
      message: 'If this email is registered, you will receive a password reset code shortly.'
    }
  } catch (error) {
    authLogger.error('[sendForgotPasswordOtp] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Reset password after OTP verification
 * Used for both teacher and student password recovery
 */
/**
 * Sign out the current user
 * Used when user tries to login via wrong role page
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      authLogger.error('[signOutUser] Sign out failed', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    authLogger.error('[signOutUser] Unexpected error', error)
    return { success: false, error: 'Failed to sign out' }
  }
}

/**
 * Reset password with OTP verification
 * Validates OTP and updates user's password to a new one
 *
 * Password Validation:
 * - Minimum: 8 characters
 * - Maximum: 64 characters (supports long passphrases like "correct horse battery staple")
 * - No complexity rules enforced (no uppercase, lowercase, number, special char requirements)
 * - Breach checking via HaveIBeenPwned API (optional, Task 3.3)
 *
 * Security Features:
 * - OTP must be valid and not expired (Supabase manages expiry)
 * - OTP is single-use (Supabase invalidates after verification)
 * - All other sessions revoked after password reset (prevents account compromise)
 * - Current session kept active (user can proceed to dashboard)
 *
 * @param email - User's email address
 * @param token - 6-digit OTP code from email
 * @param newPassword - New password (must be 8-64 characters)
 * @returns Object with success status and error message if failed
 *
 * @example
 * ```typescript
 * const result = await resetPasswordWithOtp(
 *   'user@example.com',
 *   '123456',
 *   'correct horse battery staple'
 * )
 * if (result.success) {
 *   // Password reset successfully
 *   // User should login with new password
 * }
 * ```
 */
export async function resetPasswordWithOtp(email: string, token: string, newPassword: string) {
  try {
    // Validate inputs using Zod schemas (NIST 2025 compliant)
    let validatedEmail: string
    let validatedToken: string
    try {
      validatedEmail = AuthEmailSchema.parse(email)
      validatedToken = OtpTokenSchema.parse(token)
      AuthPasswordSchema.parse(newPassword) // Validates min 8, max 64 chars
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        return { success: false, error: firstError?.message || 'Invalid input' }
      }
      throw error
    }

    authLogger.debug('[resetPasswordWithOtp] Starting password reset', {
      email: validatedEmail.substring(0, 5) + '...',
    })

    const supabase = await createClient()

    // First verify the OTP
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: validatedEmail,
      token: validatedToken,
      type: 'email',
    })

    if (verifyError) {
      authLogger.error('[resetPasswordWithOtp] OTP verification failed', verifyError)
      return {
        success: false,
        error: "Invalid or expired recovery code. Please request a new one."
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Verification failed. Please try again.'
      }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      authLogger.error('[resetPasswordWithOtp] Password update failed', updateError)
      return {
        success: false,
        error: updateError.message
      }
    }

    // SECURITY: Invalidate all OTHER sessions after password reset
    // This prevents any compromised sessions from remaining active
    // Use 'others' scope to keep the current (just-authenticated) session active
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })
      if (signOutError) {
        // Log but don't fail - password was successfully reset
        authLogger.warn('[resetPasswordWithOtp] Failed to revoke other sessions', signOutError)
      } else {
        authLogger.debug('[resetPasswordWithOtp] Other sessions revoked successfully')
      }
    } catch (signOutErr) {
      // Don't fail the password reset if session revocation fails
      authLogger.warn('[resetPasswordWithOtp] Exception revoking other sessions', signOutErr instanceof Error ? signOutErr : { error: signOutErr })
    }

    authLogger.success('[resetPasswordWithOtp] Password reset successfully')
    revalidatePath('/', 'layout')

    return { success: true }
  } catch (error) {
    authLogger.error('[resetPasswordWithOtp] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Check if current user is a teacher
 * Returns isTeacher status and user ID
 */
export async function checkUserIsTeacher(): Promise<{
  isTeacher: boolean
  userId?: string
  error?: string
}> {
  try {
    const { getCurrentUser, createClient } = await import('@/lib/supabase-server')
    const user = await getCurrentUser()

    if (!user) {
      return { isTeacher: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Check if user has a teacher profile
    const { data: teacherProfile, error } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      authLogger.error('[checkUserIsTeacher] Error checking teacher profile', error)
      return { isTeacher: false, userId: user.id, error: 'Failed to check teacher status' }
    }

    return {
      isTeacher: !!teacherProfile,
      userId: user.id,
    }
  } catch (error) {
    authLogger.error('[checkUserIsTeacher] Unexpected error', error)
    return { isTeacher: false, error: 'An unexpected error occurred' }
  }
}

// ========================================
// USERNAME-BASED AUTHENTICATION
// ========================================

/**
 * Check if username is available
 */
export async function checkUsernameAvailable(username: string): Promise<{
  available: boolean
  error?: string
}> {
  try {
    // SECURITY FIX: Add rate limiting to prevent username enumeration attacks
    // Limit repeated checks of different usernames to prevent brute-force enumeration
    const enumerationAllowed = await checkEnumerationRateLimit(`username:check:${username.toLowerCase()}`)
    if (!enumerationAllowed) {
      authLogger.warn('[checkUsernameAvailable] Username enumeration rate limit exceeded', {
        username: username.substring(0, 3) + '*', // Log partial username for privacy
      })
      return { available: false, error: 'Too many username checks. Please try again later.' }
    }

    // Validate username format using Zod schema
    let validatedUsername: string
    try {
      validatedUsername = UsernameSchema.parse(username)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        return { available: false, error: firstError?.message || 'Invalid username format' }
      }
      throw error
    }

    const adminClient = await createAdminClient()

    // Check if username exists in usernames table
    const { data, error } = await adminClient
      .from('usernames')
      .select('username')
      .ilike('username', validatedUsername)
      .maybeSingle()

    if (error) {
      authLogger.error('[checkUsernameAvailable] Error checking username', error)
      return { available: false, error: 'Failed to check username availability' }
    }

    return { available: !data }
  } catch (error) {
    authLogger.error('[checkUsernameAvailable] Unexpected error', error)
    return { available: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Register a new student with username and password
 * Creates a Supabase user with an internal email and stores the username mapping
 */
export async function registerWithUsername(
  username: string,
  password: string
): Promise<{
  success: boolean
  error?: string
  userId?: string
}> {
  try {
    // Validate username and password using Zod schemas
    let trimmedUsername: string
    try {
      trimmedUsername = UsernameSchema.parse(username)
      AuthPasswordSchema.parse(password)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0]
        return { success: false, error: firstError?.message || 'Invalid input' }
      }
      throw error
    }

    // Rate limit check
    if (!(await checkOtpRateLimit(`username:${trimmedUsername}`))) {
      authLogger.warn('[registerWithUsername] Rate limit exceeded', { username: trimmedUsername })
      return {
        success: false,
        error: 'Too many registration attempts. Please wait before trying again.',
      }
    }

    const adminClient = await createAdminClient()

    // Check if username is already taken
    const { data: existingUsername } = await adminClient
      .from('usernames')
      .select('username')
      .ilike('username', trimmedUsername)
      .maybeSingle()

    if (existingUsername) {
      authLogger.debug('[registerWithUsername] Username already taken', { username: trimmedUsername })
      return { success: false, error: 'This username is already taken. Please choose another.' }
    }

    // Generate internal email for Supabase auth
    // Format: username_randomsuffix@student.atal.internal
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const internalEmail = `${trimmedUsername}_${randomSuffix}@student.atal.internal`

    // Create user with admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password: password,
      email_confirm: true, // Auto-confirm since no real email
      user_metadata: {
        username: trimmedUsername,
        auth_type: 'username',
      },
    })

    if (authError) {
      authLogger.error('[registerWithUsername] Failed to create user', authError)
      return { success: false, error: 'Failed to create account. Please try again.' }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create account' }
    }

    // SECURITY FIX #3: Atomic signup - ensure username AND profile creation succeed together
    // Store username mapping
    const { error: insertError } = await adminClient
      .from('usernames')
      .insert({
        user_id: authData.user.id,
        username: trimmedUsername,
      })

    if (insertError) {
      // Rollback: delete the created user
      authLogger.error('[registerWithUsername] Failed to store username, rolling back', insertError)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: 'Failed to register username. Please try again.' }
    }

    // Create student profile atomically using UPSERT RPC
    // This prevents orphaned users if profile creation fails
    const { error: profileError } = await adminClient.rpc(
      'upsert_student_profile',
      {
        p_user_id: authData.user.id,
        p_name: trimmedUsername, // Use username as initial name
        p_gender: null,
        p_date_of_birth: null,
        p_phone: null,
        p_location: null,
        p_medium: null,
        p_board: null,
        p_class: null,
      }
    )

    if (profileError) {
      // Rollback: delete both username and auth user
      authLogger.error('[registerWithUsername] Failed to create student profile, rolling back', profileError)
      await adminClient.from('usernames').delete().eq('user_id', authData.user.id)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: 'Failed to complete registration. Please try again.' }
    }

    authLogger.success('[registerWithUsername] User registered successfully with profile', {
      userId: authData.user.id,
      username: trimmedUsername,
    })

    return { success: true, userId: authData.user.id }
  } catch (error) {
    authLogger.error('[registerWithUsername] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

/**
 * Sign in with username and password
 * Looks up the internal email from username and authenticates
 */
export async function signInWithUsername(
  username: string,
  password: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Validate inputs - username is required, password is required but we don't validate format on login
    let trimmedUsername: string
    try {
      trimmedUsername = UsernameSchema.parse(username)
    } catch (error) {
      if (error instanceof z.ZodError) {
        // For login, return generic error to avoid leaking username format requirements
        return { success: false, error: 'Invalid username or password' }
      }
      throw error
    }

    if (!password) {
      return { success: false, error: 'Password is required' }
    }

    // Rate limit check
    if (!(await checkOtpRateLimit(`signin:${trimmedUsername}`))) {
      authLogger.warn('[signInWithUsername] Rate limit exceeded', { username: trimmedUsername })
      return {
        success: false,
        error: 'Too many login attempts. Please wait before trying again.',
      }
    }

    const adminClient = await createAdminClient()

    // Look up username to get user_id
    const { data: usernameData, error: lookupError } = await adminClient
      .from('usernames')
      .select('user_id')
      .ilike('username', trimmedUsername)
      .maybeSingle()

    if (lookupError) {
      authLogger.error('[signInWithUsername] Error looking up username', lookupError)
      return { success: false, error: 'Login failed. Please try again.' }
    }

    if (!usernameData) {
      authLogger.debug('[signInWithUsername] Username not found', { username: trimmedUsername })
      return { success: false, error: 'Invalid username or password' }
    }

    // Get the user's email from auth.users
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
      usernameData.user_id
    )

    if (userError || !userData.user?.email) {
      authLogger.error('[signInWithUsername] Error getting user', userError)
      return { success: false, error: 'Login failed. Please try again.' }
    }

    // Now sign in with the internal email and password using regular client
    const supabase = await createClient()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: password,
    })

    if (signInError) {
      authLogger.debug('[signInWithUsername] Invalid password', { username: trimmedUsername })
      return { success: false, error: 'Invalid username or password' }
    }

    if (!signInData.user) {
      return { success: false, error: 'Login failed' }
    }

    // Check if this is a teacher/admin account (shouldn't be possible with username auth, but check anyway)
    const appRole = signInData.user.app_metadata?.role
    if (appRole === 'teacher' || appRole === 'admin' || appRole === 'super_admin') {
      await supabase.auth.signOut()
      return { success: false, error: 'This account cannot use username login' }
    }

    authLogger.success('[signInWithUsername] User signed in successfully', {
      userId: signInData.user.id,
      username: trimmedUsername,
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    authLogger.error('[signInWithUsername] Unexpected error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}
