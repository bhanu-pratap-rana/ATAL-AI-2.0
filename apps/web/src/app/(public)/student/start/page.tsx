'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-browser'
import { requestOtp, sendForgotPasswordOtp, resetPasswordWithOtp, checkUsernameAvailable, registerWithUsername, signInWithUsername } from '@/app/actions/auth'
import { joinClass, saveStudentProfile } from '@/app/actions/student'
import { useAuthState } from '@/hooks/useAuthState'
import { useOTPInput } from '@/hooks/useOTPInput'
import { usePhoneInput } from '@/hooks/usePhoneInput'
import {
  sanitizePIN,
  sanitizeClassCode,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
  validatePIN,
  validateClassCode,
  validateOptionalPhone,
  sanitizeProfilePhone,
} from '@/lib/validation-utils'
import {
  PHONE_DIGIT_LENGTH,
  OTP_LENGTH,
  PIN_LENGTH,
  CLASS_CODE_LENGTH,
} from '@/lib/auth-constants'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authLogger } from '@/lib/auth-logger'

export default function StudentStartPage() {
  const router = useRouter()
  const supabase = createClient()
  const { state, actions } = useAuthState()

  // Initialize phone input hooks for all phone fields
  const signinPhoneInput = usePhoneInput(state.signinPhoneNumber)
  const signupPhoneInput = usePhoneInput(state.signupPhoneNumber)

  // Initialize OTP input hooks for all OTP fields
  const signupEmailOtpInput = useOTPInput(state.signupEmailOtp)
  const signupPhoneOtpInput = useOTPInput(state.signupPhoneOtp)
  const forgotPasswordOtpInput = useOTPInput(state.forgotPasswordOtp)

  // Check if already authenticated (only redirect if on initial choice step)
  // Don't redirect if user is completing profile or joining class after signup
  useEffect(() => {
    async function checkAuth() {
      // Only redirect from initial choice step
      // Users completing profile/join-class need to stay on this page
      if (state.mainStep !== 'choice') {
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/app/dashboard')
      }
    }
    checkAuth()
  }, [supabase, router, state.mainStep])

  // ========================================
  // SIGN IN - EMAIL HANDLER
  // ========================================
  async function handleSignInEmail(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setSigninEmailError(null)

    // Validate email
    const emailValidation = validateEmail(state.signinEmailAddress)
    if (!emailValidation.valid) {
      actions.setSigninEmailError(emailValidation.error || 'Invalid email')
      actions.setIsLoading(false)
      return
    }

    try {
      authLogger.debug('[SignIn Email] Attempting email authentication')
      const { data, error } = await supabase.auth.signInWithPassword({
        email: state.signinEmailAddress.trim(),
        password: state.signinEmailPassword,
      })

      if (error) {
        authLogger.error('[SignIn Email] Authentication failed', error)
        actions.setSigninEmailError(error.message || 'Invalid email or password')
        toast.error('Login failed: ' + (error.message || 'Invalid credentials'))
      } else if (data.user) {
        // Check if user is a teacher/admin via app_metadata OR has teacher_profiles record
        const appRole = data.user.app_metadata?.role
        const isTeacherOrAdmin = appRole === 'teacher' || appRole === 'admin' || appRole === 'super_admin'

        // Also check teacher_profiles table as fallback
        if (!isTeacherOrAdmin) {
          const { data: teacherProfile } = await supabase
            .from('teacher_profiles')
            .select('user_id')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (teacherProfile) {
            authLogger.warn('[SignIn Email] Teacher (via profile) tried to login via student page')
            await supabase.auth.signOut()
            actions.setSigninEmailError('This account is registered as a teacher. Please use the teacher login page.')
            toast.error('This is a teacher account. Please use the teacher login page.')
            return
          }
        } else {
          authLogger.warn('[SignIn Email] Teacher/Admin/SuperAdmin tried to login via student page')
          await supabase.auth.signOut()
          actions.setSigninEmailError('This account is registered as a teacher/admin. Please use the teacher login page.')
          toast.error('This is a teacher/admin account. Please use the teacher login page.')
          return
        }

        authLogger.success('[SignIn Email] Authentication successful')
        toast.success('Login successful!')
        router.push('/app/dashboard')
      }
    } catch (error) {
      authLogger.error('[SignIn Email] Unexpected error', error)
      actions.setSigninEmailError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // SIGN IN - PHONE HANDLER
  // ========================================
  async function handleSignInPhone(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setSigninPhoneError(null)

    // Validate phone
    const phoneValidation = validatePhone(signinPhoneInput.fullValue)
    if (!phoneValidation.valid) {
      actions.setSigninPhoneError(phoneValidation.error || 'Invalid phone')
      actions.setIsLoading(false)
      return
    }

    try {
      authLogger.debug('[SignIn Phone] Attempting phone authentication')
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: signinPhoneInput.fullValue,
        password: state.signinPhonePassword,
      })

      if (error) {
        authLogger.error('[SignIn Phone] Authentication failed', error)
        actions.setSigninPhoneError(error.message || 'Invalid phone or password')
        toast.error('Login failed: ' + (error.message || 'Invalid credentials'))
      } else if (data.user) {
        // Check if user is a teacher/admin via app_metadata OR has teacher_profiles record
        const appRole = data.user.app_metadata?.role
        const isTeacherOrAdmin = appRole === 'teacher' || appRole === 'admin' || appRole === 'super_admin'

        // Also check teacher_profiles table as fallback
        if (!isTeacherOrAdmin) {
          const { data: teacherProfile } = await supabase
            .from('teacher_profiles')
            .select('user_id')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (teacherProfile) {
            authLogger.warn('[SignIn Phone] Teacher (via profile) tried to login via student page')
            await supabase.auth.signOut()
            actions.setSigninPhoneError('This account is registered as a teacher. Please use the teacher login page.')
            toast.error('This is a teacher account. Please use the teacher login page.')
            return
          }
        } else {
          authLogger.warn('[SignIn Phone] Teacher/Admin/SuperAdmin tried to login via student page')
          await supabase.auth.signOut()
          actions.setSigninPhoneError('This account is registered as a teacher/admin. Please use the teacher login page.')
          toast.error('This is a teacher/admin account. Please use the teacher login page.')
          return
        }

        authLogger.success('[SignIn Phone] Authentication successful')
        toast.success('Login successful!')
        router.push('/app/dashboard')
      }
    } catch (error) {
      authLogger.error('[SignIn Phone] Unexpected error', error)
      actions.setSigninPhoneError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // SIGN IN - USERNAME HANDLER
  // ========================================
  async function handleSignInUsername(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setSigninUsernameError(null)

    if (!state.signinUsername.trim()) {
      actions.setSigninUsernameError('Username is required')
      actions.setIsLoading(false)
      return
    }

    if (!state.signinUsernamePassword) {
      actions.setSigninUsernameError('Password is required')
      actions.setIsLoading(false)
      return
    }

    try {
      authLogger.debug('[SignIn Username] Attempting username authentication')
      const result = await signInWithUsername(
        state.signinUsername.trim(),
        state.signinUsernamePassword
      )

      if (!result.success) {
        authLogger.error('[SignIn Username] Authentication failed', { error: result.error })
        actions.setSigninUsernameError(result.error || 'Invalid username or password')
        toast.error('Login failed: ' + (result.error || 'Invalid credentials'))
      } else {
        authLogger.success('[SignIn Username] Authentication successful')
        toast.success('Login successful!')
        router.push('/app/dashboard')
      }
    } catch (error) {
      authLogger.error('[SignIn Username] Unexpected error', error)
      actions.setSigninUsernameError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // SIGN UP - EMAIL OTP SEND
  // ========================================
  async function handleSignUpEmailSendOtp(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setSignupEmailError(null)

    // Validate email
    const emailValidation = validateEmail(state.signupEmailAddress)
    if (!emailValidation.valid) {
      actions.setSignupEmailError(emailValidation.error || 'Invalid email')
      actions.setIsLoading(false)
      return
    }

    try {
      const result = await requestOtp(state.signupEmailAddress.trim()) as {
        success: boolean
        error?: string
        exists?: boolean
        role?: string
      }
      if (!result.success) {
        // Check if email already exists
        if (result.exists) {
          authLogger.debug('[SignUp Email] Email already exists', { role: result.role })
          toast.error(result.error || 'This email is already registered')

          // If teacher/admin/super_admin account, suggest teacher login page
          if (result.role === 'teacher' || result.role === 'admin' || result.role === 'super_admin') {
            // Don't switch to signin - they need to use teacher page
            actions.setSignupEmailError(result.error || 'Please use the teacher login page.')
          } else {
            // Student account - switch to signin tab with email prefilled
            actions.setSigninEmailAddress(state.signupEmailAddress)
            actions.setMainStep('signin')
            actions.setSigninTab('email')
          }
        } else {
          actions.setSignupEmailError(result.error || 'Failed to send OTP')
          toast.error(result.error || 'Failed to send OTP')
        }
      } else {
        toast.success('OTP sent to your email!')
        actions.setSignupEmailOtpSent(true)
      }
    } catch (error) {
      authLogger.error('[SignUp Email] Failed to send OTP', error)
      actions.setSignupEmailError('Failed to send OTP')
      toast.error('Failed to send OTP')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // SIGN UP - EMAIL OTP VERIFY & CREATE
  // ========================================
  async function handleSignUpEmailVerifyAndCreate(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setSignupEmailError(null)

    // Validate inputs
    const passwordValidation = validatePassword(state.signupEmailPassword)
    if (!passwordValidation.valid) {
      actions.setSignupEmailError(passwordValidation.errors.join(', ') || 'Invalid password')
      actions.setIsLoading(false)
      return
    }

    const matchValidation = validatePasswordMatch(
      state.signupEmailPassword,
      state.signupEmailPasswordConfirm
    )
    if (!matchValidation.valid) {
      actions.setSignupEmailError(matchValidation.error || 'Passwords do not match')
      actions.setIsLoading(false)
      return
    }

    try {
      // Verify OTP and create account
      const { data, error } = await supabase.auth.verifyOtp({
        email: state.signupEmailAddress,
        token: signupEmailOtpInput.value,
        type: 'email',
      })

      if (error) {
        authLogger.error('[SignUp Email] Verification failed', error)
        // Handle specific OTP errors with user-friendly messages
        let errorMessage = 'OTP verification failed'
        if (error.message?.includes('expired') || error.message?.includes('invalid')) {
          errorMessage = 'OTP has expired or is invalid. Please request a new one.'
        } else if (error.message) {
          errorMessage = error.message
        }
        actions.setSignupEmailError(errorMessage)
        toast.error(errorMessage)
        return
      }

      if (!data.user) {
        actions.setSignupEmailError('Verification failed')
        toast.error('Email verification failed')
        return
      }

      // Set password
      const { error: updateError } = await supabase.auth.updateUser({
        password: state.signupEmailPassword,
      })

      if (updateError) {
        authLogger.error('[SignUp Email] Failed to set password', updateError)
        // Handle specific password errors
        let errorMessage = 'Failed to set password'
        if (updateError.message?.includes('same as') || updateError.message?.includes('different from')) {
          errorMessage = 'This password was already used. Please choose a different password.'
        } else if (updateError.message) {
          errorMessage = updateError.message
        }
        actions.setSignupEmailError(errorMessage)
        toast.error(errorMessage)
        return
      }

      toast.success('Account created! Now set up your profile.')
      actions.resetSignupEmail()
      // Go to profile step instead of dashboard
      actions.setMainStep('profile')
    } catch (error) {
      authLogger.error('[SignUp Email] Unexpected error', error)
      actions.setSignupEmailError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // SIGN UP - PHONE OTP SEND
  // ========================================
  async function handleSignUpPhoneSendOtp(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setSignupPhoneError(null)

    // Validate phone
    const phoneValidation = validatePhone(signupPhoneInput.fullValue)
    if (!phoneValidation.valid) {
      actions.setSignupPhoneError(phoneValidation.error || 'Invalid phone')
      actions.setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: signupPhoneInput.fullValue,
      })

      if (error) {
        authLogger.error('[SignUp Phone] Failed to send OTP', error)
        actions.setSignupPhoneError(error.message || 'Failed to send OTP')
        toast.error(error.message || 'Failed to send OTP')
      } else {
        toast.success('OTP sent to your phone!')
        actions.setSignupPhoneOtpStep('verify')
      }
    } catch (error) {
      authLogger.error('[SignUp Phone] Error sending OTP', error)
      actions.setSignupPhoneError('Failed to send OTP')
      toast.error('Failed to send OTP')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // SIGN UP - PHONE OTP VERIFY & CREATE
  // ========================================
  async function handleSignUpPhoneVerifyOtp(e: React.FormEvent) {
    e.preventDefault()

    // Validate password
    const passwordValidation = validatePassword(state.signupPhonePassword)
    if (!passwordValidation.valid) {
      actions.setSignupPhoneError(passwordValidation.errors.join(', ') || 'Invalid password')
      return
    }

    const matchValidation = validatePasswordMatch(
      state.signupPhonePassword,
      state.signupPhonePasswordConfirm
    )
    if (!matchValidation.valid) {
      actions.setSignupPhoneError(matchValidation.error || 'Passwords do not match')
      return
    }

    actions.setIsLoading(true)
    actions.setSignupPhoneError(null)

    try {
      authLogger.debug('[SignUp Phone] Verifying OTP')
      const { data, error } = await supabase.auth.verifyOtp({
        phone: signupPhoneInput.fullValue,
        token: signupPhoneOtpInput.value,
        type: 'sms',
      })

      if (error) {
        authLogger.error('[SignUp Phone] OTP verification failed', error)
        toast.error(error.message)
        return
      }

      if (!data.user) {
        authLogger.error('[SignUp Phone] No user returned')
        toast.error('Verification failed')
        return
      }

      authLogger.debug('[SignUp Phone] Setting password')
      const { error: updateError } = await supabase.auth.updateUser({
        password: state.signupPhonePassword,
      })

      if (updateError) {
        authLogger.error('[SignUp Phone] Failed to set password', updateError)
        toast.error('Failed to set password')
        return
      }

      authLogger.success('[SignUp Phone] Account created successfully')
      toast.success('Account created! Now set up your profile.')
      actions.resetSignupPhone()
      // Go to profile step instead of dashboard
      actions.setMainStep('profile')
    } catch (error) {
      authLogger.error('[SignUp Phone] Unexpected error', error)
      toast.error('Failed to verify OTP')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // SAVE STUDENT PROFILE
  // ========================================
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setProfileError(null)

    // Validate required fields
    if (!state.profileName.trim()) {
      actions.setProfileError('Name is required')
      actions.setIsLoading(false)
      return
    }

    // Validate optional phone number (if provided, must be exactly 10 digits)
    const phoneValidation = validateOptionalPhone(state.profilePhone)
    if (!phoneValidation.valid) {
      actions.setProfileError(phoneValidation.error || 'Invalid phone number')
      actions.setIsLoading(false)
      return
    }

    if (!state.profileGender) {
      actions.setProfileError('Please select your gender')
      actions.setIsLoading(false)
      return
    }

    try {
      // Ensure we have a valid session before calling server action
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        authLogger.error('[SaveProfile] No session found before save')
        actions.setProfileError('Session expired. Please sign up again.')
        toast.error('Session expired. Please sign up again.')
        return
      }

      authLogger.debug('[SaveProfile] Calling saveStudentProfile', {
        hasSession: !!session,
        userId: session.user?.id
      })

      const result = await saveStudentProfile({
        name: state.profileName.trim(),
        gender: state.profileGender as 'male' | 'female',
        rollNumber: state.profileRollNumber.trim() || undefined,
        phone: state.profilePhone.trim() || undefined,
        schoolName: state.profileSchoolName.trim() || undefined,
        className: state.profileClassName.trim() || undefined,
        village: state.profileVillage.trim() || undefined,
      })

      authLogger.debug('[SaveProfile] Server action result', { result })

      if (!result.success) {
        actions.setProfileError(result.error || 'Failed to save profile')
        toast.error(result.error || 'Failed to save profile')
        return
      }

      // CRITICAL: Refresh session to sync any metadata updates
      // This ensures the client JWT is up-to-date after profile creation
      try {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          authLogger.warn('[SaveProfile] Session refresh failed, continuing anyway', refreshError)
        }
      } catch (refreshErr) {
        authLogger.warn('[SaveProfile] Session refresh exception', refreshErr instanceof Error ? refreshErr : { error: refreshErr })
      }

      toast.success('Profile saved! Now join a class.')
      actions.resetProfile()
      // Go to join class step
      actions.setMainStep('join-class')
    } catch (error) {
      authLogger.error('[SaveProfile] Unexpected error', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      actions.setProfileError(errorMessage)
      toast.error(errorMessage)
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // JOIN CLASS AFTER PROFILE
  // ========================================
  async function handleJoinClassAfterProfile(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setJoinClassError(null)

    // Validate inputs
    const codeValidation = validateClassCode(state.joinClassCode)
    const pinValidation = validatePIN(state.joinClassPin)

    if (!codeValidation.valid) {
      actions.setJoinClassError(codeValidation.error || 'Invalid class code')
      actions.setIsLoading(false)
      return
    }

    if (!pinValidation.valid) {
      actions.setJoinClassError(pinValidation.error || 'Invalid PIN')
      actions.setIsLoading(false)
      return
    }

    try {
      const result = await joinClass({
        classCode: sanitizeClassCode(state.joinClassCode),
        pin: sanitizePIN(state.joinClassPin),
      })

      if (!result.success) {
        actions.setJoinClassError(result.error || 'Failed to join class')
        toast.error(result.error || 'Failed to join class')
        return
      }

      toast.success('Joined class successfully! 🎉')
      actions.resetJoinClass()
      router.push('/app/dashboard')
    } catch (error) {
      authLogger.error('[JoinClass] Unexpected error', error)
      actions.setJoinClassError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // SIGN UP - USERNAME REGISTRATION (No Email/Phone Required)
  // ========================================
  async function handleUsernameSignup(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setSignupUsernameError(null)

    // Validate password
    const passwordValidation = validatePassword(state.signupUsernamePassword)
    if (!passwordValidation.valid) {
      actions.setSignupUsernameError(passwordValidation.errors.join(', ') || 'Invalid password')
      actions.setIsLoading(false)
      return
    }

    const matchValidation = validatePasswordMatch(
      state.signupUsernamePassword,
      state.signupUsernamePasswordConfirm
    )
    if (!matchValidation.valid) {
      actions.setSignupUsernameError(matchValidation.error || 'Passwords do not match')
      actions.setIsLoading(false)
      return
    }

    try {
      // Check username availability first
      const availabilityCheck = await checkUsernameAvailable(state.signupUsername)
      if (!availabilityCheck.available) {
        actions.setSignupUsernameError(availabilityCheck.error || 'Username is not available')
        actions.setIsLoading(false)
        return
      }

      // Register with username
      const result = await registerWithUsername(
        state.signupUsername,
        state.signupUsernamePassword
      )

      if (!result.success) {
        actions.setSignupUsernameError(result.error || 'Registration failed')
        toast.error(result.error || 'Registration failed')
        actions.setIsLoading(false)
        return
      }

      // Sign in with the new credentials
      const signInResult = await signInWithUsername(
        state.signupUsername,
        state.signupUsernamePassword
      )

      if (!signInResult.success) {
        // Account created but sign-in failed - inform user to login manually
        toast.success('Account created! Please login with your username.')
        actions.resetSignupUsername()
        actions.setSigninUsername(state.signupUsername)
        actions.setMainStep('signin')
        actions.setSigninTab('username')
        return
      }

      toast.success('Account created! Now set up your profile.')
      actions.resetSignupUsername()
      // Go to profile step
      actions.setMainStep('profile')
    } catch (error) {
      authLogger.error('[Username Signup] Unexpected error', error)
      actions.setSignupUsernameError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // FORGOT PASSWORD - SEND OTP
  // ========================================
  async function handleForgotPasswordOtp(e: React.FormEvent) {
    e.preventDefault()
    actions.setIsLoading(true)
    actions.setForgotPasswordError(null)

    // Validate email
    const emailValidation = validateEmail(state.forgotPasswordEmail)
    if (!emailValidation.valid) {
      actions.setForgotPasswordError(emailValidation.error || 'Invalid email')
      actions.setIsLoading(false)
      return
    }

    try {
      const result = await sendForgotPasswordOtp(state.forgotPasswordEmail.trim())
      if (!result.success) {
        actions.setForgotPasswordError(result.error || 'Failed to send recovery code')
        toast.error(result.error || 'Failed to send recovery code')
      } else {
        toast.success('Recovery code sent to your email!')
        actions.setForgotPasswordStep('reset')
      }
    } catch (error) {
      authLogger.error('[Forgot Password] Failed to send recovery code', error)
      actions.setForgotPasswordError('Failed to send recovery code')
      toast.error('Failed to send recovery code')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // FORGOT PASSWORD - RESET
  // ========================================
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()

    // Validate password
    const passwordValidation = validatePassword(state.forgotPasswordNewPassword)
    if (!passwordValidation.valid) {
      actions.setForgotPasswordError(passwordValidation.errors.join(', ') || 'Invalid password')
      return
    }

    const matchValidation = validatePasswordMatch(
      state.forgotPasswordNewPassword,
      state.forgotPasswordNewPasswordConfirm
    )
    if (!matchValidation.valid) {
      actions.setForgotPasswordError(matchValidation.error || 'Passwords do not match')
      return
    }

    actions.setIsLoading(true)
    actions.setForgotPasswordError(null)

    try {
      const result = await resetPasswordWithOtp(
        state.forgotPasswordEmail,
        forgotPasswordOtpInput.value,
        state.forgotPasswordNewPassword
      )

      if (!result.success) {
        actions.setForgotPasswordError(result.error || 'Failed to reset password')
        toast.error(result.error || 'Failed to reset password')
      } else {
        toast.success('Password reset successfully!')
        actions.resetForgotPassword()
        actions.setMainStep('signin')
      }
    } catch (error) {
      authLogger.error('[Forgot Password] Failed to reset password', error)
      actions.setForgotPasswordError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      actions.setIsLoading(false)
    }
  }

  // ========================================
  // RENDER: CHOICE (Create Account / Login)
  // ========================================
  if (state.mainStep === 'choice') {
    return (
      <AuthCard
        title="Welcome, Student!"
        description="Choose an option to continue"
      >
        <div className="space-y-4">
          {/* Create Account Button */}
          <Button
            onClick={() => actions.setMainStep('signup')}
            className="w-full h-14 text-base text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5 transition-all"
            variant="default"
          >
            <span className="text-xl mr-2">✨</span>
            Create Account
          </Button>

          {/* Login Button */}
          <Button
            onClick={() => actions.setMainStep('signin')}
            className="w-full h-14 text-base text-[17px] border-2 hover:border-primary hover:shadow-[var(--shadow-primary-sm)] hover:-translate-y-0.5 transition-all"
            variant="outline"
          >
            <span className="text-xl mr-2">🔑</span>
            Login
          </Button>

          {/* Info Box - Cyan themed */}
          <div className="bg-cyan-lightest border-l-4 border-cyan p-3 rounded-xl">
            <p className="text-xs text-cyan-darkest">
              <strong>💡 New Student?</strong> Create an account to join classes and track your learning progress.
            </p>
          </div>

          {/* Link to Teacher Login */}
          <div className="text-center pt-2">
            <a href="/teacher/start" className="text-sm text-primary hover:underline">
              Are you a teacher? Login here
            </a>
          </div>
        </div>
      </AuthCard>
    )
  }

  // ========================================
  // RENDER: SIGN IN
  // ========================================
  if (state.mainStep === 'signin') {
    return (
      <AuthCard
        title="Sign In"
        description="Choose your sign-in method"
      >
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => actions.setSigninTab('email')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                state.signinTab === 'email'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-text-secondary hover:bg-muted/80'
              }`}
              disabled={state.isLoading}
            >
              📧 Email
            </button>
            <button
              onClick={() => actions.setSigninTab('phone')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                state.signinTab === 'phone'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-text-secondary hover:bg-muted/80'
              }`}
              disabled={state.isLoading}
            >
              📱 Phone
            </button>
            <button
              onClick={() => actions.setSigninTab('username')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                state.signinTab === 'username'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-text-secondary hover:bg-muted/80'
              }`}
              disabled={state.isLoading}
            >
              👤 Username
            </button>
          </div>

          {/* Email Sign In Form */}
          {state.signinTab === 'email' && (
            <form onSubmit={handleSignInEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email Address</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={state.signinEmailAddress}
                  onChange={(e) => actions.setSigninEmailAddress(e.target.value)}
                  required
                  disabled={state.isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={state.signinEmailPassword}
                  onChange={(e) => actions.setSigninEmailPassword(e.target.value)}
                  required
                  disabled={state.isLoading}
                />
                {state.signinEmailError && (
                  <p className="text-sm text-error">{state.signinEmailError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                disabled={state.isLoading || !state.signinEmailAddress || !state.signinEmailPassword}
                loading={state.isLoading}
              >
                Sign In
                <span className="ml-2">→</span>
              </Button>

              <div className="text-center space-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => actions.setMainStep('forgot-password')}
                  className="text-primary hover:underline block w-full"
                  disabled={state.isLoading}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => actions.setMainStep('choice')}
                  className="text-text-secondary hover:underline block w-full"
                  disabled={state.isLoading}
                >
                  ← Back
                </button>
              </div>
            </form>
          )}

          {/* Phone Sign In Form */}
          {state.signinTab === 'phone' && (
            <form onSubmit={handleSignInPhone} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-phone">Phone Number</Label>
                <div className="flex items-center border border-input rounded-md">
                  <span className="px-3 text-text-secondary font-medium bg-muted">+91</span>
                  <Input
                    id="signin-phone"
                    type="tel"
                    placeholder="9876543210"
                    value={signinPhoneInput.displayValue}
                    onChange={(e) => signinPhoneInput.onChange(e.target.value)}
                    required
                    disabled={state.isLoading}
                    className="border-0 flex-1"
                    maxLength={12}
                  />
                </div>
                <p className="text-xs text-text-secondary">
                  Enter your 10-digit phone number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-phone-password">Password</Label>
                <Input
                  id="signin-phone-password"
                  type="password"
                  placeholder="Enter your password"
                  value={state.signinPhonePassword}
                  onChange={(e) => actions.setSigninPhonePassword(e.target.value)}
                  required
                  disabled={state.isLoading}
                />
                {state.signinPhoneError && (
                  <p className="text-sm text-error">{state.signinPhoneError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                disabled={state.isLoading || signinPhoneInput.displayValue.length < PHONE_DIGIT_LENGTH || !state.signinPhonePassword}
                loading={state.isLoading}
              >
                Sign In
                <span className="ml-2">→</span>
              </Button>

              <div className="text-center space-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => actions.setMainStep('forgot-password')}
                  className="text-primary hover:underline block w-full"
                  disabled={state.isLoading}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => actions.setMainStep('choice')}
                  className="text-text-secondary hover:underline block w-full"
                  disabled={state.isLoading}
                >
                  ← Back
                </button>
              </div>
            </form>
          )}

          {/* Username Sign In Form */}
          {state.signinTab === 'username' && (
            <form onSubmit={handleSignInUsername} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-username">Username</Label>
                <Input
                  id="signin-username"
                  type="text"
                  placeholder="your_username"
                  value={state.signinUsername}
                  onChange={(e) => actions.setSigninUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                  disabled={state.isLoading}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-username-password">Password</Label>
                <Input
                  id="signin-username-password"
                  type="password"
                  placeholder="Enter your password"
                  value={state.signinUsernamePassword}
                  onChange={(e) => actions.setSigninUsernamePassword(e.target.value)}
                  required
                  disabled={state.isLoading}
                />
                {state.signinUsernameError && (
                  <p className="text-sm text-error">{state.signinUsernameError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                disabled={state.isLoading || !state.signinUsername || !state.signinUsernamePassword}
                loading={state.isLoading}
              >
                Sign In
                <span className="ml-2">→</span>
              </Button>

              <div className="text-center space-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => actions.setMainStep('choice')}
                  className="text-text-secondary hover:underline block w-full"
                  disabled={state.isLoading}
                >
                  ← Back
                </button>
              </div>
            </form>
          )}
        </div>
      </AuthCard>
    )
  }

  // ========================================
  // RENDER: SIGN UP
  // ========================================
  if (state.mainStep === 'signup') {
    return (
      <AuthCard
        title="Create Account"
        description="Choose your sign-up method"
      >
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => actions.setSignupTab('email')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                state.signupTab === 'email'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-text-secondary hover:bg-muted/80'
              }`}
              disabled={state.isLoading}
            >
              📧 Email
            </button>
            <button
              onClick={() => actions.setSignupTab('phone')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                state.signupTab === 'phone'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-text-secondary hover:bg-muted/80'
              }`}
              disabled={state.isLoading}
            >
              📱 Phone
            </button>
            <button
              onClick={() => actions.setSignupTab('guest')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                state.signupTab === 'guest'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-text-secondary hover:bg-muted/80'
              }`}
              disabled={state.isLoading}
            >
              ⚡ Quick Start
            </button>
          </div>

          {/* Email Sign Up Form */}
          {state.signupTab === 'email' && (
            <>
              {!state.signupEmailOtpSent ? (
                <form onSubmit={handleSignUpEmailSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={state.signupEmailAddress}
                      onChange={(e) => actions.setSignupEmailAddress(e.target.value)}
                      required
                      disabled={state.isLoading}
                    />
                    {state.signupEmailError && (
                      <p className="text-sm text-error">{state.signupEmailError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                    disabled={state.isLoading || !state.signupEmailAddress}
                    loading={state.isLoading}
                  >
                    Send OTP
                    <span className="ml-2">→</span>
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignUpEmailVerifyAndCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email-otp">Verification Code</Label>
                    <Input
                      id="signup-email-otp"
                      type="text"
                      placeholder="123456"
                      value={signupEmailOtpInput.value}
                      onChange={(e) => signupEmailOtpInput.onChange(e.target.value)}
                      required
                      disabled={state.isLoading}
                      maxLength={OTP_LENGTH}
                      className="text-center text-2xl font-mono tracking-widest"
                    />
                    <p className="text-xs text-text-secondary">
                      Enter the 6-digit code sent to your email
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email-password">Password</Label>
                    <Input
                      id="signup-email-password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={state.signupEmailPassword}
                      onChange={(e) => actions.setSignupEmailPassword(e.target.value)}
                      required
                      disabled={state.isLoading}
                      autoComplete="new-password"
                    />
                    {/* Show password validation errors inline */}
                    {state.signupEmailPassword.length > 0 && (() => {
                      const validation = validatePassword(state.signupEmailPassword)
                      if (!validation.valid && validation.errors.length > 0) {
                        return (
                          <p className="text-xs text-error">
                            {validation.errors.join(', ')}
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email-password-confirm">Confirm Password</Label>
                    <Input
                      id="signup-email-password-confirm"
                      type="password"
                      placeholder="Re-enter your password"
                      value={state.signupEmailPasswordConfirm}
                      onChange={(e) => actions.setSignupEmailPasswordConfirm(e.target.value)}
                      required
                      disabled={state.isLoading}
                      autoComplete="new-password"
                    />
                    {state.signupEmailError && (
                      <p className="text-sm text-error">{state.signupEmailError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                    disabled={
                      state.isLoading ||
                      signupEmailOtpInput.value.length !== OTP_LENGTH ||
                      !validatePassword(state.signupEmailPassword).valid ||
                      state.signupEmailPassword !== state.signupEmailPasswordConfirm
                    }
                    loading={state.isLoading}
                  >
                    Create Account
                    <span className="ml-2">→</span>
                  </Button>

                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSignUpEmailSendOtp}
                      className="text-sm text-primary hover:text-primary-dark hover:underline"
                      disabled={state.isLoading}
                    >
                      Resend OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        actions.setSignupEmailOtpSent(false)
                        signupEmailOtpInput.reset()
                        actions.setSignupEmailError(null)
                      }}
                      className="text-sm text-text-secondary hover:underline"
                      disabled={state.isLoading}
                    >
                      Change email
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Phone Sign Up Form */}
          {state.signupTab === 'phone' && (
            <>
              {state.signupPhoneOtpStep === 'phone' ? (
                <form onSubmit={handleSignUpPhoneSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <div className="flex items-center border border-input rounded-md">
                      <span className="px-3 text-text-secondary font-medium bg-muted">+91</span>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="9876543210"
                        value={signupPhoneInput.displayValue}
                        onChange={(e) => signupPhoneInput.onChange(e.target.value)}
                        required
                        disabled={state.isLoading}
                        className="border-0 flex-1"
                        maxLength={12}
                      />
                    </div>
                    <p className="text-xs text-text-secondary">
                      Enter your 10-digit phone number
                    </p>
                  </div>

                  <div className="bg-cyan-lightest border-l-4 border-cyan p-3 rounded-xl">
                    <p className="text-xs text-cyan-darkest">
                      <strong>📱 SMS Verification:</strong> You&apos;ll receive a 6-digit code via SMS. Standard rates may apply.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                    disabled={state.isLoading || signupPhoneInput.displayValue.length < PHONE_DIGIT_LENGTH}
                    loading={state.isLoading}
                  >
                    Send OTP
                    <span className="ml-2">→</span>
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignUpPhoneVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone-otp">Verification Code</Label>
                    <Input
                      id="signup-phone-otp"
                      type="text"
                      placeholder="123456"
                      value={signupPhoneOtpInput.value}
                      onChange={(e) => signupPhoneOtpInput.onChange(e.target.value)}
                      required
                      disabled={state.isLoading}
                      maxLength={OTP_LENGTH}
                      className="text-center text-2xl font-mono tracking-widest"
                    />
                    <p className="text-xs text-text-secondary">
                      Enter the 6-digit code sent to your phone
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone-password">Password</Label>
                    <Input
                      id="signup-phone-password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={state.signupPhonePassword}
                      onChange={(e) => actions.setSignupPhonePassword(e.target.value)}
                      required
                      disabled={state.isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone-password-confirm">Confirm Password</Label>
                    <Input
                      id="signup-phone-password-confirm"
                      type="password"
                      placeholder="Re-enter your password"
                      value={state.signupPhonePasswordConfirm}
                      onChange={(e) => actions.setSignupPhonePasswordConfirm(e.target.value)}
                      required
                      disabled={state.isLoading}
                    />
                    {state.signupPhoneError && (
                      <p className="text-sm text-error">{state.signupPhoneError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                    disabled={
                      state.isLoading ||
                      signupPhoneOtpInput.value.length !== OTP_LENGTH ||
                      !state.signupPhonePassword ||
                      !state.signupPhonePasswordConfirm
                    }
                    loading={state.isLoading}
                  >
                    Create Account
                    <span className="ml-2">→</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => actions.setSignupPhoneOtpStep('phone')}
                    className="text-sm text-text-secondary hover:underline block w-full text-center"
                    disabled={state.isLoading}
                  >
                    Change phone number
                  </button>
                </form>
              )}
            </>
          )}

          {/* Username Sign Up Form (Guest - No Email/Phone Required) */}
          {state.signupTab === 'guest' && (
            <form onSubmit={handleUsernameSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="e.g., rahul_sharma"
                  value={state.signupUsername}
                  onChange={(e) => actions.setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                  disabled={state.isLoading}
                  maxLength={20}
                  className="font-mono"
                />
                <p className="text-xs text-text-secondary">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-username-password">Password</Label>
                <Input
                  id="signup-username-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={state.signupUsernamePassword}
                  onChange={(e) => actions.setSignupUsernamePassword(e.target.value)}
                  required
                  disabled={state.isLoading}
                  autoComplete="new-password"
                />
                {/* Show password validation errors inline */}
                {state.signupUsernamePassword.length > 0 && (() => {
                  const validation = validatePassword(state.signupUsernamePassword)
                  if (!validation.valid && validation.errors.length > 0) {
                    return (
                      <p className="text-xs text-error">
                        {validation.errors.join(', ')}
                      </p>
                    )
                  }
                  return null
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-username-password-confirm">Confirm Password</Label>
                <Input
                  id="signup-username-password-confirm"
                  type="password"
                  placeholder="Re-enter your password"
                  value={state.signupUsernamePasswordConfirm}
                  onChange={(e) => actions.setSignupUsernamePasswordConfirm(e.target.value)}
                  required
                  disabled={state.isLoading}
                  autoComplete="new-password"
                />
                {state.signupUsernameError && (
                  <p className="text-sm text-error">{state.signupUsernameError}</p>
                )}
              </div>

              <div className="bg-cyan-lightest border-l-4 border-cyan p-3 rounded-xl">
                <p className="text-xs text-cyan-darkest">
                  <strong>💡 No email needed!</strong> Create an account with just a username and password.
                  Remember your username for future logins.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                disabled={
                  state.isLoading ||
                  !state.signupUsername ||
                  state.signupUsername.length < 3 ||
                  !validatePassword(state.signupUsernamePassword).valid ||
                  state.signupUsernamePassword !== state.signupUsernamePasswordConfirm
                }
                loading={state.isLoading}
              >
                Create Account
                <span className="ml-2">→</span>
              </Button>
            </form>
          )}

          <div className="text-center text-sm text-text-secondary">
            <button
              type="button"
              onClick={() => actions.setMainStep('choice')}
              className="text-primary hover:underline"
              disabled={state.isLoading}
            >
              ← Back
            </button>
          </div>
        </div>
      </AuthCard>
    )
  }

  // ========================================
  // RENDER: FORGOT PASSWORD
  // ========================================
  if (state.mainStep === 'forgot-password') {
    return (
      <AuthCard
        title="Reset Password"
        description="Recover your account"
      >
        <div className="space-y-4">
          {state.forgotPasswordStep === 'email' ? (
            <form onSubmit={handleForgotPasswordOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={state.forgotPasswordEmail}
                  onChange={(e) => actions.setForgotPasswordEmail(e.target.value)}
                  required
                  disabled={state.isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                disabled={state.isLoading || !state.forgotPasswordEmail}
                loading={state.isLoading}
              >
                Send Recovery Code
                <span className="ml-2">→</span>
              </Button>

              <button
                type="button"
                onClick={() => actions.setMainStep('signin')}
                className="text-sm text-text-secondary hover:underline block w-full text-center"
                disabled={state.isLoading}
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-otp">Recovery Code</Label>
                <Input
                  id="forgot-otp"
                  type="text"
                  placeholder="123456"
                  value={forgotPasswordOtpInput.value}
                  onChange={(e) => forgotPasswordOtpInput.onChange(e.target.value)}
                  required
                  disabled={state.isLoading}
                  maxLength={OTP_LENGTH}
                  className="text-center text-2xl font-mono tracking-widest"
                />
                <p className="text-xs text-text-secondary">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-new-password">New Password</Label>
                <Input
                  id="forgot-new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={state.forgotPasswordNewPassword}
                  onChange={(e) => actions.setForgotPasswordNewPassword(e.target.value)}
                  required
                  disabled={state.isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-confirm-password">Confirm Password</Label>
                <Input
                  id="forgot-confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={state.forgotPasswordNewPasswordConfirm}
                  onChange={(e) => actions.setForgotPasswordNewPasswordConfirm(e.target.value)}
                  required
                  disabled={state.isLoading}
                />
                {state.forgotPasswordError && (
                  <p className="text-sm text-error">{state.forgotPasswordError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
                disabled={
                  state.isLoading ||
                  forgotPasswordOtpInput.value.length !== OTP_LENGTH ||
                  !state.forgotPasswordNewPassword ||
                  !state.forgotPasswordNewPasswordConfirm
                }
                loading={state.isLoading}
              >
                Reset Password
                <span className="ml-2">→</span>
              </Button>

              <button
                type="button"
                onClick={() => actions.setForgotPasswordStep('email')}
                className="text-sm text-text-secondary hover:underline block w-full text-center"
                disabled={state.isLoading}
              >
                Change email
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              actions.resetForgotPassword()
              actions.setMainStep('signin')
            }}
            className="text-sm text-text-secondary hover:underline block w-full text-center"
            disabled={state.isLoading}
          >
            Back to sign in
          </button>
        </div>
      </AuthCard>
    )
  }

  // ========================================
  // RENDER: PROFILE COLLECTION
  // ========================================
  if (state.mainStep === 'profile') {
    return (
      <AuthCard
        title="Complete Your Profile"
        description="Tell us a bit about yourself"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Name - Required */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full Name *</Label>
            <Input
              id="profile-name"
              type="text"
              placeholder="Enter your full name"
              value={state.profileName}
              onChange={(e) => actions.setProfileName(e.target.value)}
              required
              disabled={state.isLoading}
            />
          </div>

          {/* Gender - Required */}
          <div className="space-y-2">
            <Label>Gender *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={state.profileGender === 'male'}
                  onChange={() => actions.setProfileGender('male')}
                  disabled={state.isLoading}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Male</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={state.profileGender === 'female'}
                  onChange={() => actions.setProfileGender('female')}
                  disabled={state.isLoading}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Female</span>
              </label>
            </div>
          </div>

          {/* School Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-school">School Name</Label>
            <Input
              id="profile-school"
              type="text"
              placeholder="Enter your school name"
              value={state.profileSchoolName}
              onChange={(e) => actions.setProfileSchoolName(e.target.value)}
              disabled={state.isLoading}
            />
          </div>

          {/* Class */}
          <div className="space-y-2">
            <Label htmlFor="profile-class">Class</Label>
            <Input
              id="profile-class"
              type="text"
              placeholder="e.g., Class 10, Grade 8"
              value={state.profileClassName}
              onChange={(e) => actions.setProfileClassName(e.target.value)}
              disabled={state.isLoading}
            />
          </div>

          {/* Roll Number */}
          <div className="space-y-2">
            <Label htmlFor="profile-roll-number">Roll Number</Label>
            <Input
              id="profile-roll-number"
              type="text"
              placeholder="e.g., 101, ST2024001"
              value={state.profileRollNumber}
              onChange={(e) => actions.setProfileRollNumber(e.target.value)}
              disabled={state.isLoading}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone Number</Label>
            <Input
              id="profile-phone"
              type="tel"
              placeholder="10-digit mobile number"
              value={state.profilePhone}
              onChange={(e) => actions.setProfilePhone(sanitizeProfilePhone(e.target.value))}
              disabled={state.isLoading}
              maxLength={10}
            />
            <p className="text-xs text-text-secondary">
              Enter 10-digit Indian mobile number (e.g., 9876543210)
            </p>
            {state.profilePhone && state.profilePhone.length > 0 && state.profilePhone.length < 10 && (
              <p className="text-xs text-warning">{10 - state.profilePhone.length} more digits needed</p>
            )}
          </div>

          {/* Village/Location */}
          <div className="space-y-2">
            <Label htmlFor="profile-village">Village/Location</Label>
            <Input
              id="profile-village"
              type="text"
              placeholder="Enter your village or location"
              value={state.profileVillage}
              onChange={(e) => actions.setProfileVillage(e.target.value)}
              disabled={state.isLoading}
            />
          </div>

          {state.profileError && (
            <p className="text-sm text-error">{state.profileError}</p>
          )}

          <Button
            type="submit"
            className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
            disabled={state.isLoading || !state.profileName || !state.profileGender}
            loading={state.isLoading}
          >
            Save Profile & Continue
            <span className="ml-2">→</span>
          </Button>
        </form>
      </AuthCard>
    )
  }

  // ========================================
  // RENDER: JOIN CLASS
  // ========================================
  if (state.mainStep === 'join-class') {
    return (
      <AuthCard
        title="Join a Class"
        description="Enter the class code and PIN from your teacher"
      >
        <form onSubmit={handleJoinClassAfterProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-class-code">Class Code</Label>
            <Input
              id="join-class-code"
              type="text"
              placeholder="e.g., ABC-123"
              value={state.joinClassCode}
              onChange={(e) => actions.setJoinClassCode(sanitizeClassCode(e.target.value))}
              required
              disabled={state.isLoading}
              className="uppercase text-center font-mono text-lg"
              maxLength={CLASS_CODE_LENGTH}
            />
            <p className="text-xs text-text-secondary">
              Ask your teacher for the class code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="join-class-pin">Class PIN</Label>
            <Input
              id="join-class-pin"
              type="password"
              placeholder="••••"
              value={state.joinClassPin}
              onChange={(e) => actions.setJoinClassPin(sanitizePIN(e.target.value))}
              required
              disabled={state.isLoading}
              maxLength={PIN_LENGTH}
              className="text-center text-2xl font-mono tracking-widest"
            />
            <p className="text-xs text-text-secondary">
              4-digit PIN provided by your teacher
            </p>
          </div>

          <div className="bg-cyan-lightest border-l-4 border-cyan p-3 rounded-xl">
            <p className="text-xs text-cyan-darkest">
              <strong>📌 Note:</strong> Get the class code and PIN from your teacher to join their class.
            </p>
          </div>

          {state.joinClassError && (
            <p className="text-sm text-error">{state.joinClassError}</p>
          )}

          <Button
            type="submit"
            className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
            disabled={
              state.isLoading ||
              !state.joinClassCode ||
              state.joinClassPin.length !== PIN_LENGTH
            }
            loading={state.isLoading}
          >
            Join Class
            <span className="ml-2">→</span>
          </Button>

          <button
            type="button"
            onClick={() => router.push('/app/dashboard')}
            className="text-sm text-text-secondary hover:underline block w-full text-center"
            disabled={state.isLoading}
          >
            Skip for now →
          </button>
        </form>
      </AuthCard>
    )
  }

  // Fallback
  return null
}
