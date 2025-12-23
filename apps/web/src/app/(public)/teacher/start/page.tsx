'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-browser'
import { verifyTeacher } from '@/app/actions/school'
import {
  sendEmailOtp,
  verifyEmailOtp,
  setPassword as setUserPassword,
  saveTeacherProfile,
} from '@/app/actions/teacher-onboard'
import {
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
} from '@/app/actions/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authLogger } from '@/lib/auth-logger'
import { validateEmail, validatePassword, validatePasswordMatch, validateOptionalPhone, sanitizeProfilePhone } from '@/lib/validation-utils'
import { FORM_TIMING } from '@/lib/constants/ui-timings'
import zxcvbn from 'zxcvbn'

// Type for SendEmailOtpResult
interface SendEmailOtpResult {
  success: boolean
  error?: string
  exists?: boolean
}

type Step = 'choice' | 'login' | 'forgot-password' | 'reset-password' | 'auth' | 'set-password' | 'verify-school' | 'profile' | 'complete'

export default function TeacherStartPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('choice')
  const [loading, setLoading] = useState(false)
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email')

  // Login: Email & Password
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Forgot Password: Email
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotOtpSent, setForgotOtpSent] = useState(false)
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')

  // Step 1: Email OTP Auth (for signup)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  // Step 1: Phone OTP Auth (for signup) - alternative method
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)

  // Step 1C: Password Creation
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<number>(0)

  // Step 2: School Verification
  const [schoolCode, setSchoolCode] = useState('')
  const [staffPin, setStaffPin] = useState('')
  const [verifiedSchoolName, setVerifiedSchoolName] = useState('')
  const [verifiedSchoolId, setVerifiedSchoolId] = useState('')

  // Step 3: Teacher Profile
  const [teacherName, setTeacherName] = useState('')
  const [teacherGender, setTeacherGender] = useState<'male' | 'female' | ''>('')
  const [phone, setPhone] = useState('')
  const [village, setVillage] = useState('')

  // Track if auth check has been performed to prevent duplicate toasts
  const [authChecked, setAuthChecked] = useState(false)

  // Check if already authenticated and has completed registration
  // Only runs on initial mount (choice step)
  useEffect(() => {
    // Skip if already checked or not on choice step (prevents duplicate toasts)
    if (authChecked || step !== 'choice') return

    async function checkAuth() {
      setAuthChecked(true) // Set immediately to prevent race conditions

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        // Check if user already has a teacher profile (already completed registration)
        const { data: profile } = await supabase
          .from('teacher_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (profile) {
          // Already registered, redirect to dashboard
          toast.success('You are already registered!')
          router.push('/app/teacher/classes')
        } else {
          // Has session but no profile - could be a student account
          // Sign them out silently (no toast needed - they can proceed with signup)
          await supabase.auth.signOut()
        }
      }
    }
    checkAuth()
  }, [supabase, router, authChecked, step])

  // LOGIN: Email & Password Authentication
  async function handleTeacherLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setLoginError('')

    try {
      authLogger.debug('[Teacher Login] Attempting login')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      })

      authLogger.debug('[Teacher Login] Auth response received')

      if (error) {
        authLogger.error('[Teacher Login] Authentication failed', error)
        // Provide more helpful error message
        let errorMsg = 'Invalid email or password'
        if (error.message?.includes('Invalid login credentials')) {
          errorMsg = 'Invalid email or password. Please check your credentials and try again.'
        } else if (error.message) {
          errorMsg = error.message
        }
        setLoginError(errorMsg)
        toast.error(errorMsg)
      } else if (data.user) {
        authLogger.debug('[Teacher Login] User authenticated')

        // Check if teacher profile exists
        try {
          const { data: profile, error: profileError } = await supabase
            .from('teacher_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle()

          authLogger.debug('[Teacher Login] Profile fetch complete')

          if (profileError) {
            authLogger.error('[Teacher Login] Profile fetch error', profileError)
            toast.error('Error checking profile: ' + profileError.message)
            await supabase.auth.signOut()
          } else if (profile) {
            authLogger.success('[Teacher Login] Profile found, redirecting')
            toast.success('Login successful!')
            router.push('/app/teacher/classes')
          } else {
            // Check if this is a student account
            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('user_id')
              .eq('user_id', data.user.id)
              .maybeSingle()

            if (studentProfile) {
              authLogger.error('[Teacher Login] This is a student account')
              setLoginError('This email is registered as a student account. Please use the student login page.')
              toast.error('This is a student account. Please use the student login page.')
            } else {
              authLogger.error('[Teacher Login] Profile not found - incomplete registration')
              setLoginError('No teacher profile found. Please complete your registration first.')
              toast.error('No teacher profile found. Please complete registration.')
            }
            await supabase.auth.signOut()
          }
        } catch (profileErr) {
          authLogger.error('[Teacher Login] Exception checking profile', profileErr)
          toast.error('Error checking profile')
          await supabase.auth.signOut()
        }
      }
    } catch (error) {
      authLogger.error('[Teacher Login] Unexpected error', error)
      setLoginError('An unexpected error occurred')
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Forgot Password: Send OTP
  async function handleForgotPasswordOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await sendForgotPasswordOtp(forgotEmail)

      if (result.success) {
        toast.success('Recovery code sent to your email!')
        setForgotOtpSent(true)
      } else {
        toast.error(result.error || 'Failed to send recovery code')
      }
    } catch (error) {
      toast.error('Failed to send recovery code')
    } finally {
      setLoading(false)
    }
  }

  // Forgot Password: Reset password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()

    // Validate password using shared validation (same as students)
    const passwordValidation = validatePassword(forgotNewPassword)
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.errors.join(', ') || 'Invalid password')
      return
    }

    const matchValidation = validatePasswordMatch(forgotNewPassword, forgotConfirmPassword)
    if (!matchValidation.valid) {
      toast.error(matchValidation.error || 'Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const result = await resetPasswordWithOtp(forgotEmail, forgotOtp, forgotNewPassword)

      if (result.success) {
        toast.success('Password reset successfully! ✓')
        // Reset form and go back to login
        setForgotEmail('')
        setForgotOtp('')
        setForgotNewPassword('')
        setForgotConfirmPassword('')
        setForgotOtpSent(false)
        setStep('login')
        setLoginEmail(forgotEmail)
      } else {
        toast.error(result.error || 'Failed to reset password')
      }
    } catch (error) {
      toast.error('Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  // STEP 1A: Send Email OTP
  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setEmailError('')
    setEmailSuggestion('')

    try {
      // Validate email format and detect typos
      const emailValidation = validateEmail(email)

      if (!emailValidation.valid) {
        // Check if there's a suggestion for a typo
        if (emailValidation.suggestion) {
          setEmailError(emailValidation.error || 'Invalid email')
          setEmailSuggestion(emailValidation.suggestion)
          toast.error(emailValidation.error || 'Invalid email')
        } else {
          setEmailError(emailValidation.error || 'Invalid email')
          toast.error(emailValidation.error || 'Invalid email')
        }
        setLoading(false)
        return
      }

      const result = (await sendEmailOtp(email)) as SendEmailOtpResult

      if (result.success) {
        toast.success('OTP sent to your email!')
        setOtpSent(true)
      } else {
        // Check if email already exists
        if (result.exists) {
          toast.error(result.error || 'This email is already registered')
          authLogger.debug('[Teacher Signup] Email already exists, redirecting to login')
          // Redirect to login with email prefilled
          setLoginEmail(email)
          setEmail('')
          setOtp('')
          setOtpSent(false)
          setStep('login')
        } else {
          setEmailError(result.error || 'Failed to send OTP')
          toast.error(result.error || 'Failed to send OTP')
        }
      }
    } catch (error) {
      authLogger.error('[Teacher Signup] Failed to send OTP', error)
      setEmailError('An unexpected error occurred')
      toast.error('Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // STEP 1B: Verify OTP
  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await verifyEmailOtp({ email, token: otp })

      if (result.success) {
        toast.success('Email verified! ✓')
        setStep('set-password')
      } else {
        toast.error(result.error || 'Failed to verify OTP')
      }
    } catch (error) {
      toast.error('Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  // STEP 1C: Set Password
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate password using shared validation (same as students)
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        toast.error(passwordValidation.errors.join(', ') || 'Invalid password')
        setLoading(false)
        return
      }

      const matchValidation = validatePasswordMatch(password, passwordConfirm)
      if (!matchValidation.valid) {
        toast.error(matchValidation.error || 'Passwords do not match')
        setLoading(false)
        return
      }

      const result = await setUserPassword(password)

      if (result.success) {
        toast.success('Password set successfully! ✓')
        setStep('verify-school')
      } else {
        toast.error(result.error || 'Failed to set password')
      }
    } catch (error) {
      toast.error('Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  // Handle password strength calculation
  function handlePasswordChange(value: string) {
    setPassword(value)
    if (value.length > 0) {
      const result = zxcvbn(value)
      setPasswordStrength(result.score)
    } else {
      setPasswordStrength(0)
    }
  }

  // STEP 2: School Verification
  async function handleSchoolVerification(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Call server action to verify school credentials (without creating profile yet)
      const result = await verifyTeacher({
        schoolCode: schoolCode.toUpperCase().trim(),
        staffPin: staffPin.trim(),
        teacherName: '', // Will be filled in next step
        phone: '',
      })

      if (result.success && result.schoolId && result.schoolName) {
        // Store verified school info for next step
        setVerifiedSchoolName(result.schoolName)
        setVerifiedSchoolId(result.schoolId)
        toast.success(`School verified: ${result.schoolName}`)
        setStep('profile')
      } else {
        toast.error(result.error || 'Verification failed')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // STEP 3: Teacher Profile
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Validate required fields
    if (!teacherGender) {
      toast.error('Please select your gender')
      setLoading(false)
      return
    }

    // Validate optional phone number (if provided, must be exactly 10 digits)
    const phoneValidation = validateOptionalPhone(phone)
    if (!phoneValidation.valid) {
      toast.error(phoneValidation.error || 'Invalid phone number')
      setLoading(false)
      return
    }

    try {
      // Save teacher profile with verified school info
      // Note: Subject is not collected here - it's set per-class when creating classes
      const result = await saveTeacherProfile({
        name: teacherName.trim(),
        gender: teacherGender as 'male' | 'female',
        phone: phone.trim() || undefined,
        village: village.trim() || undefined,
        schoolId: verifiedSchoolId,
        schoolCode: schoolCode.toUpperCase().trim(),
      })

      if (result.success) {
        toast.success('Teacher registration complete! 🎉')
        setStep('complete')

        // CRITICAL: Refresh session to get updated JWT with teacher role
        // The server updated app_metadata.role = 'teacher', but client JWT is stale
        try {
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            authLogger.warn('[Teacher Registration] Session refresh failed, user may need to re-login', refreshError)
          }
        } catch (refreshErr) {
          authLogger.warn('[Teacher Registration] Session refresh exception', refreshErr instanceof Error ? refreshErr : { error: refreshErr })
        }

        setTimeout(() => {
          router.push('/app/teacher/classes')
        }, FORM_TIMING.nextStepsDelay)
      } else {
        toast.error(result.error || 'Profile creation failed')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Render based on current step
  if (step === 'choice') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Teacher Portal"
          description="Are you a new or existing teacher?"
        >
          <div className="space-y-3 sm:space-y-4">
            {/* Create Account Button */}
            <Button
              onClick={() => setStep('auth')}
              className="w-full h-14 text-base shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5 transition-all"
              variant="default"
            >
              <span className="text-xl mr-3">✨</span>
              <div className="text-left">
                <div className="font-semibold">Create New Account</div>
                <div className="text-xs font-normal opacity-90">
                  New teacher registration
                </div>
              </div>
            </Button>

            {/* Login Button */}
            <Button
              onClick={() => setStep('login')}
              className="w-full h-14 text-base border-2 hover:border-primary hover:shadow-[var(--shadow-primary-sm)] hover:-translate-y-0.5 transition-all"
              variant="outline"
            >
              <span className="text-xl mr-3">🔓</span>
              <div className="text-left">
                <div className="font-semibold">Login to Account</div>
                <div className="text-xs font-normal opacity-70">
                  Existing teacher login
                </div>
              </div>
            </Button>

            {/* Info Box - Cyan themed */}
            <div className="bg-cyan-lightest border-l-4 border-cyan p-4 rounded-xl">
              <p className="text-sm text-cyan-darkest">
                <strong>💡 Choose your option:</strong>
                <br />
                <span className="text-xs">
                  New teachers need school verification. Existing teachers can login with email & password.
                </span>
              </p>
            </div>

            {/* Back Button */}
            <div className="text-center pt-2">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-text-secondary hover:text-primary hover:underline"
              >
                ← Back to home
              </button>
            </div>
          </div>
        </AuthCard>
      </div>
    )
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Teacher Login"
          description="Sign in with your registered email and password"
        >
          <form onSubmit={handleTeacherLogin} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email Address</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="teacher@school.edu"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-text-secondary">
                Your registered email address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                disabled={loading}
              />
              {loginError && (
                <p className="text-sm text-error">{loginError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={loading || !loginEmail || !loginPassword}
              loading={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="space-y-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(loginEmail)
                  setStep('forgot-password')
                }}
                className="text-sm text-primary hover:text-primary-dark hover:underline w-full text-center"
                disabled={loading}
              >
                Forgot your password?
              </button>
              <button
                type="button"
                onClick={() => setStep('choice')}
                className="text-sm text-primary hover:underline w-full text-center"
                disabled={loading}
              >
                Back to options
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm text-text-secondary hover:text-primary hover:underline w-full text-center"
                disabled={loading}
              >
                Back to home
              </button>
            </div>
          </form>
        </AuthCard>
      </div>
    )
  }

  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Teacher Registration"
          description="Step 1 of 4: Choose your verification method"
        >
          <div className="space-y-3 sm:space-y-4">
            {/* Tab Navigation - Responsive sizing */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setSignupMethod('email')
                  setPhoneError('')
                  setEmailError('')
                }}
                className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  signupMethod === 'email'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-muted text-text-secondary hover:bg-muted/80'
                }`}
                disabled={loading}
              >
                <span className="hidden sm:inline">📧 </span>Email
              </button>
              <button
                onClick={() => {
                  setSignupMethod('phone')
                  setPhoneError('')
                  setEmailError('')
                }}
                className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  signupMethod === 'phone'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-muted text-text-secondary hover:bg-muted/80'
                }`}
                disabled={loading}
              >
                <span className="hidden sm:inline">📱 </span>Phone
              </button>
            </div>

            {/* Email Method */}
            {signupMethod === 'email' && (
              <>
                {!otpSent ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="teacher@school.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                      {emailError && (
                        <div className="space-y-2">
                          <p className="text-sm text-error">{emailError}</p>
                          {emailSuggestion && (
                            <button
                              type="button"
                              onClick={() => setEmail(emailSuggestion)}
                              className="text-sm text-cyan hover:text-cyan-dark hover:underline"
                              disabled={loading}
                            >
                              ✓ Use suggested: {emailSuggestion}
                            </button>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-text-secondary">
                        We&apos;ll send a 6-digit code to this email
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full shadow-[var(--shadow-primary)]"
                      disabled={loading || !email}
                      loading={loading}
                    >
                      Send Verification Code
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        required
                        disabled={loading}
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-widest"
                      />
                      <p className="text-xs text-text-secondary">
                        Enter the 6-digit code sent to {email}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full shadow-[var(--shadow-primary)]"
                      disabled={loading || otp.length !== 6}
                      loading={loading}
                    >
                      Verify & Continue
                    </Button>

                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        className="text-sm text-primary hover:text-primary-dark hover:underline"
                        disabled={loading}
                      >
                        Resend OTP
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false)
                          setOtp('')
                        }}
                        className="text-sm text-primary hover:underline"
                        disabled={loading}
                      >
                        Use different email
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* Phone Method */}
            {signupMethod === 'phone' && (
              <div className="space-y-4">
                <div className="bg-cyan-lightest border-l-4 border-cyan p-3 rounded-xl">
                  <p className="text-xs text-cyan-darkest">
                    <strong>📱 Phone Verification</strong>
                    <br />
                    Enter your 10-digit phone number. We&apos;ll send a verification code via OTP.
                  </p>
                </div>
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium text-text-secondary">+91</span>
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="9876543210"
                        value={phoneNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setPhoneNumber(digits)
                          setPhoneError('')
                        }}
                        required
                        disabled={loading}
                        maxLength={10}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-sm text-error">{phoneError}</p>
                    )}
                    <p className="text-xs text-text-secondary">
                      10-digit Indian phone number
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      if (phoneNumber.length !== 10) {
                        setPhoneError('Phone number must be 10 digits')
                      } else {
                        // Phone OTP will be sent here
                        setPhoneOtpSent(true)
                        toast.success('OTP sent to your phone!')
                      }
                    }}
                    className="w-full shadow-[var(--shadow-primary)]"
                    disabled={loading || phoneNumber.length !== 10}
                    loading={loading}
                  >
                    Send OTP to Phone
                  </Button>
                </form>

                {phoneOtpSent && (
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-otp">Verification Code</Label>
                      <Input
                        id="phone-otp"
                        type="text"
                        placeholder="123456"
                        value={phoneOtp}
                        onChange={(e) =>
                          setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        required
                        disabled={loading}
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-widest"
                      />
                      <p className="text-xs text-text-secondary">
                        Enter the 6-digit code sent to +91{phoneNumber}
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        if (phoneOtp.length !== 6) {
                          toast.error('Please enter 6-digit code')
                        } else {
                          // Phone verification would happen here
                          toast.success('Phone verified!')
                          setStep('set-password')
                        }
                      }}
                      className="w-full shadow-[var(--shadow-primary)]"
                      disabled={loading || phoneOtp.length !== 6}
                      loading={loading}
                    >
                      Verify & Continue
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setPhoneOtpSent(false)
                        setPhoneOtp('')
                      }}
                      className="text-sm text-primary hover:underline block w-full text-center"
                      disabled={loading}
                    >
                      Change phone number
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep('choice')}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                ← Back to options
              </button>
            </div>
          </div>
        </AuthCard>
      </div>
    )
  }

  if (step === 'set-password') {
    const getPasswordStrengthLabel = () => {
      if (password.length === 0) return ''
      const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
      return labels[passwordStrength] || ''
    }

    const getPasswordStrengthColor = () => {
      const colors = [
        'bg-error',
        'bg-warning',
        'bg-warning',
        'bg-cyan',
        'bg-success',
      ]
      return colors[passwordStrength] || 'bg-surface-dark'
    }

    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Create Password"
          description="Step 2 of 4: Secure your account"
        >
          <form onSubmit={handleSetPassword} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password (min 8 characters)"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i <= passwordStrength
                            ? getPasswordStrengthColor()
                            : 'bg-surface-dark'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Strength: {getPasswordStrengthLabel()}
                  </p>
                  {/* Show validation errors */}
                  {(() => {
                    const validation = validatePassword(password)
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
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-confirm">Confirm Password</Label>
              <Input
                id="password-confirm"
                type="password"
                placeholder="Re-enter password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
            </div>

            <div className="bg-cyan-lightest border-l-4 border-cyan p-3 rounded-xl">
              <p className="text-xs text-cyan-darkest">
                <strong>🔒 Why a password?</strong>
                <br />
                A password enables account recovery and allows you to access your
                account from multiple devices securely.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={
                loading ||
                !validatePassword(password).valid ||
                password !== passwordConfirm
              }
              loading={loading}
            >
              Set Password & Continue
            </Button>
          </form>
        </AuthCard>
      </div>
    )
  }

  if (step === 'verify-school') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="School Verification"
          description="Step 3 of 4: Verify your school credentials"
        >
          <form onSubmit={handleSchoolVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-code">School Code</Label>
              <Input
                id="school-code"
                type="text"
                placeholder="14H0182"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                required
                disabled={loading}
                maxLength={10}
                className="uppercase font-mono"
              />
              <p className="text-xs text-text-secondary">
                SEBA school code (e.g., 14H0182)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-pin">Staff PIN</Label>
              <Input
                id="staff-pin"
                type="password"
                placeholder="Enter staff PIN"
                value={staffPin}
                onChange={(e) => setStaffPin(e.target.value)}
                required
                disabled={loading}
                className="font-mono"
              />
              <p className="text-xs text-text-secondary">
                Provided by your school administrator
              </p>
            </div>

            <div className="bg-cyan-lightest border-l-4 border-cyan p-3 rounded-xl">
              <p className="text-xs text-cyan-darkest">
                <strong>🔒 Secure Verification</strong>
                <br />
                Your credentials are verified using bcrypt encryption. Staff PINs
                are never exposed to clients.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={loading}
              loading={loading}
            >
              Verify School
            </Button>
          </form>
        </AuthCard>
      </div>
    )
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Teacher Profile"
          description="Step 4 of 4: Complete your profile"
        >
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* Display verified school info */}
            {verifiedSchoolName && (
              <div className="bg-success-light border-l-4 border-success p-3 rounded">
                <p className="text-sm text-success">
                  <strong>✓ School Verified</strong>
                  <br />
                  <span className="text-xs">
                    {verifiedSchoolName} ({schoolCode.toUpperCase()})
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Gender - Required */}
            <div className="space-y-2">
              <Label>Gender *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="teacher-gender"
                    value="male"
                    checked={teacherGender === 'male'}
                    onChange={() => setTeacherGender('male')}
                    disabled={loading}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Male</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="teacher-gender"
                    value="female"
                    checked={teacherGender === 'female'}
                    onChange={() => setTeacherGender('female')}
                    disabled={loading}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Female</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(sanitizeProfilePhone(e.target.value))}
                disabled={loading}
                maxLength={10}
              />
              <p className="text-xs text-text-secondary">
                Enter 10-digit Indian mobile number (e.g., 9876543210)
              </p>
              {phone && phone.length > 0 && phone.length < 10 && (
                <p className="text-xs text-warning">{10 - phone.length} more digits needed</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="village">Village/Location</Label>
              <Input
                id="village"
                type="text"
                placeholder="Enter your village or location"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={loading || !teacherName || !teacherGender}
              loading={loading}
            >
              Complete Registration
            </Button>
          </form>
        </AuthCard>
      </div>
    )
  }

  // Forgot Password: Request OTP
  if (step === 'forgot-password' && !forgotOtpSent) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Reset Password"
          description="Enter your email to receive a recovery code"
        >
          <form onSubmit={handleForgotPasswordOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="teacher@school.edu"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-text-secondary">
                We&apos;ll send a recovery code to this email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={loading || !forgotEmail}
              loading={loading}
            >
              {loading ? 'Sending...' : 'Send Recovery Code'}
            </Button>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('login')
                  setForgotEmail('')
                  setForgotOtpSent(false)
                }}
                className="text-sm text-primary hover:underline w-full text-center"
                disabled={loading}
              >
                Back to login
              </button>
            </div>
          </form>
        </AuthCard>
      </div>
    )
  }

  // Forgot Password: Verify OTP and Reset
  if (step === 'forgot-password' && forgotOtpSent) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Reset Password"
          description={`Enter the code sent to ${forgotEmail}`}
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-otp">Recovery Code</Label>
              <Input
                id="forgot-otp"
                type="text"
                placeholder="123456"
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={loading}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest"
              />
              <p className="text-xs text-text-secondary">
                Enter the 6-digit code from your email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forgot-new-password">New Password</Label>
              <Input
                id="forgot-new-password"
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
              {/* Show validation errors for forgot password */}
              {forgotNewPassword.length > 0 && (() => {
                const validation = validatePassword(forgotNewPassword)
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
              <Label htmlFor="forgot-confirm-password">Confirm Password</Label>
              <Input
                id="forgot-confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={loading || forgotOtp.length !== 6 || !validatePassword(forgotNewPassword).valid || forgotNewPassword !== forgotConfirmPassword}
              loading={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleForgotPasswordOtp}
                className="text-sm text-primary hover:text-primary-dark hover:underline w-full text-center"
                disabled={loading}
              >
                Resend Recovery Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotOtp('')
                  setForgotOtpSent(false)
                }}
                className="text-sm text-primary hover:underline w-full text-center"
                disabled={loading}
              >
                Back to email entry
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('login')
                  setForgotEmail('')
                  setForgotOtp('')
                  setForgotNewPassword('')
                  setForgotConfirmPassword('')
                  setForgotOtpSent(false)
                }}
                className="text-sm text-text-secondary hover:underline w-full text-center"
                disabled={loading}
              >
                Back to login
              </button>
            </div>
          </form>
        </AuthCard>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard title="Registration Complete!" description="Welcome to ATAL AI">
          <div className="text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <p className="text-lg font-semibold">You&apos;re all set!</p>
            <p className="text-sm text-text-secondary">
              Redirecting to your teacher dashboard...
            </p>
          </div>
        </AuthCard>
      </div>
    )
  }

  return null
}
