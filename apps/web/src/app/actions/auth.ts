'use server'

import { createClient, createAdminClient, getCurrentUser } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { BLOCKED_EMAIL_DOMAINS, COMMON_DOMAIN_TYPOS, EMAIL_REGEX } from '@/lib/auth-constants'
import { authLogger } from '@/lib/auth-logger'
import { checkOtpRateLimit, checkPasswordResetRateLimit } from '@/lib/rate-limiter-distributed'
import { isValidEmailDomain } from '@/lib/email-validation'

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
    const trimmedEmail = email.trim().toLowerCase()

    // Use admin client to check auth.users (bypasses RLS)
    const adminClient = await createAdminClient()

    // Check if user exists in Supabase auth
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      authLogger.error('[checkEmailExistsInAuth] Error listing auth users', authError)
      return { exists: false }
    }

    const existingAuthUser = authData?.users?.find(u => u.email?.toLowerCase() === trimmedEmail)

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

export async function requestOtp(email: string) {
  try {
    // Validate email format
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail) {
      authLogger.debug('[requestOtp] Empty email provided')
      return { success: false, error: 'Please enter an email address.' }
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      authLogger.debug('[requestOtp] Invalid email format')
      return { success: false, error: 'Please enter a valid email address.' }
    }

    // Validate email domain
    const emailDomain = trimmedEmail.split('@')[1]
    if (!emailDomain || !isValidEmailDomain(emailDomain)) {
      authLogger.debug('[requestOtp] Invalid email domain')
      return {
        success: false,
        error: 'Please enter a valid email address from a recognized email provider.'
      }
    }

    // Check rate limit - prevent brute force attacks
    if (!(await checkOtpRateLimit(trimmedEmail))) {
      authLogger.warn('[requestOtp] Rate limit exceeded', { type: 'otp_limit' })
      return {
        success: false,
        error: 'Too many OTP requests. Please wait an hour before requesting again.',
      }
    }

    // Check if email already exists in the system
    const emailCheck = await checkEmailExistsInAuth(trimmedEmail)
    if (emailCheck.exists) {
      authLogger.info('[requestOtp] Email already registered', { role: emailCheck.role })

      // Provide role-specific error messages
      let errorMessage = 'This email is already registered. Please login instead.'
      if (emailCheck.role === 'teacher' || emailCheck.role === 'admin' || emailCheck.role === 'super_admin') {
        errorMessage = 'This email is registered as a teacher account. Please use the teacher login page.'
      } else if (emailCheck.role === 'student') {
        errorMessage = 'This email is already registered. Please login instead.'
      }

      return {
        success: false,
        error: errorMessage,
        exists: true,
        role: emailCheck.role,
      }
    }

    // Check for blocked/fake domains first
    const domain = trimmedEmail.split('@')[1]
    if (domain && BLOCKED_EMAIL_DOMAINS.has(domain.toLowerCase())) {
      authLogger.debug('[requestOtp] Blocked domain detected')

      // Check if it's a typo and suggest correction using centralized constant
      if (COMMON_DOMAIN_TYPOS[domain]) {
        const suggestedEmail = trimmedEmail.replace(domain, COMMON_DOMAIN_TYPOS[domain])
        authLogger.warn('[requestOtp] Possible typo detected in email domain')
        return {
          success: false,
          error: `Did you mean ${suggestedEmail}? Please check your email address.`
        }
      }

      return {
        success: false,
        error: 'Please enter a valid email address from a recognized email provider.'
      }
    }

    // Additional check: reject obviously fake emails
    const suspiciousPatterns = ['test@', 'fake@', 'example@', 'spam@', 'temp@', 'disposable@']
    if (suspiciousPatterns.some(pattern => trimmedEmail.startsWith(pattern))) {
      authLogger.debug('[requestOtp] Suspicious email pattern detected')
      return {
        success: false,
        error: 'Please use a valid email address.'
      }
    }

    authLogger.debug('[requestOtp] Starting OTP request')

    const supabase = await createClient()

    // Note: Using manual OTP entry (not magic link), so emailRedirectTo is not needed
    const { data, error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true, // Auto-create user if doesn't exist
      },
    })

    if (error) {
      const errorStatus = (error as { status?: number }).status
      const errorName = (error as { name?: string }).name
      authLogger.error('[requestOtp] Supabase error', error, {
        status: errorStatus,
        name: errorName,
      })

      // Provide more specific error messages
      let userMessage = error.message
      if (error.message.includes('rate limit')) {
        userMessage = 'Too many requests. Please wait a few minutes and try again.'
      } else if (error.message.includes('Email provider') || error.message.includes('email')) {
        userMessage = 'Email service issue. Please check Supabase dashboard Auth settings.'
      } else if (error.message.includes('Invalid email')) {
        userMessage = 'Please enter a valid email address.'
      }

      return { success: false, error: userMessage }
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
    authLogger.debug('[verifyOtp] Starting OTP verification')

    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
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
    if (role === 'teacher' || role === 'admin' || role === 'super_admin') {
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
 */
export async function sendForgotPasswordOtp(email: string) {
  try {
    const trimmedEmail = email.trim().toLowerCase()

    // Validate email format
    if (!trimmedEmail) {
      return { success: false, error: 'Please enter an email address.' }
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' }
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
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false, // Don't create user if doesn't exist
      },
    })

    if (error) {
      authLogger.error('[sendForgotPasswordOtp] Error', error)

      // If user doesn't exist, inform them
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return {
          success: false,
          error: 'No account found with this email. Please sign up first.'
        }
      }

      return { success: false, error: error.message }
    }

    authLogger.success('[sendForgotPasswordOtp] OTP sent successfully')
    return { success: true }
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
 * Check if authenticated user is a teacher (has teacher_profiles record)
 * Used to enforce role-based login restrictions
 */
export async function checkUserIsTeacher(): Promise<{
  isTeacher: boolean
  userId?: string
  error?: string
}> {
  try {
    // Get current user using consistent pattern
    const user = await getCurrentUser()

    if (!user) {
      return { isTeacher: false, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Check if user has a teacher_profiles record
    // Use .maybeSingle() - user may not be a teacher
    const { data: teacherProfile, error: profileError } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      authLogger.error('[checkUserIsTeacher] Error checking teacher profile', profileError)
    }

    const isTeacher = !!teacherProfile
    authLogger.debug('[checkUserIsTeacher] User role checked', { userId: user.id, isTeacher })

    return { isTeacher, userId: user.id }
  } catch (error) {
    authLogger.error('[checkUserIsTeacher] Unexpected error', error)
    return { isTeacher: false, error: 'Failed to check user role' }
  }
}

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

export async function resetPasswordWithOtp(email: string, token: string, newPassword: string) {
  try {
    authLogger.debug('[resetPasswordWithOtp] Starting password reset')

    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long.'
      }
    }

    const supabase = await createClient()

    // First verify the OTP
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
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

// ========================================
// USERNAME-BASED AUTHENTICATION
// ========================================

/**
 * Validate username format
 * Rules:
 * - 3-20 characters
 * - Alphanumeric and underscores only
 * - Must start with a letter
 * - Case insensitive (stored lowercase)
 */
function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim()

  if (!trimmed) {
    return { valid: false, error: 'Username is required' }
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be at most 20 characters' }
  }

  if (!/^[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Username must start with a letter' }
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' }
  }

  return { valid: true }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailable(username: string): Promise<{
  available: boolean
  error?: string
}> {
  try {
    const validation = validateUsername(username)
    if (!validation.valid) {
      return { available: false, error: validation.error }
    }

    const adminClient = await createAdminClient()

    // Check if username exists in usernames table
    const { data, error } = await adminClient
      .from('usernames')
      .select('username')
      .ilike('username', username.trim().toLowerCase())
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
    // Validate username
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return { success: false, error: usernameValidation.error }
    }

    // Validate password (at least 8 characters)
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' }
    }

    const trimmedUsername = username.trim().toLowerCase()

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

    authLogger.success('[registerWithUsername] User registered successfully', {
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
    const trimmedUsername = username.trim().toLowerCase()

    if (!trimmedUsername) {
      return { success: false, error: 'Username is required' }
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
