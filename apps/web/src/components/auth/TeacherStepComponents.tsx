/**
 * Teacher Start Page Step Components
 * Extracted to reduce cognitive complexity of TeacherStartPage
 */

'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from '@/components/auth/AuthCard'
import { validatePassword } from '@/lib/validation-utils'

interface StepComponentProps {
  loading: boolean
  setStep: (step: string) => void
  router: ReturnType<typeof useRouter>
}

interface ChoiceStepProps extends StepComponentProps {}

export function ChoiceStep({ setStep, router }: ChoiceStepProps) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
      <AuthCard
        title="Teacher Portal"
        description="Are you a new or existing teacher?"
      >
        <div className="space-y-3 sm:space-y-4">
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

          <div className="bg-cyan-lightest border-l-4 border-cyan p-4 rounded-xl">
            <p className="text-sm text-cyan-darkest">
              <strong>💡 Choose your option:</strong>
              <br />
              <span className="text-xs">
                New teachers need school verification. Existing teachers can login with email & password.
              </span>
            </p>
          </div>

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

interface LoginStepProps extends StepComponentProps {
  loginEmail: string
  setLoginEmail: (email: string) => void
  loginPassword: string
  setLoginPassword: (password: string) => void
  loginError: string
  handleTeacherLogin: (e: React.FormEvent) => Promise<void>
  setForgotEmail: (email: string) => void
}

export function LoginStep({
  loading,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  handleTeacherLogin,
  setStep,
  setForgotEmail,
  router,
}: LoginStepProps) {
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

interface CompleteStepProps extends StepComponentProps {}

export function CompleteStep({}: CompleteStepProps) {
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

interface SetPasswordStepProps extends StepComponentProps {
  password: string
  passwordConfirm: string
  passwordStrength: number
  handlePasswordChange: (value: string) => void
  setPasswordConfirm: (value: string) => void
  handleSetPassword: (e: React.FormEvent) => Promise<void>
}

export function SetPasswordStep({
  loading,
  password,
  passwordConfirm,
  passwordStrength,
  handlePasswordChange,
  setPasswordConfirm,
  handleSetPassword,
}: SetPasswordStepProps) {
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
                      key={`strength-bar-${i}`}
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

interface VerifySchoolStepProps extends StepComponentProps {
  schoolCode: string
  setSchoolCode: (value: string) => void
  staffPin: string
  setStaffPin: (value: string) => void
  handleSchoolVerification: (e: React.FormEvent) => Promise<void>
}

export function VerifySchoolStep({
  loading,
  schoolCode,
  setSchoolCode,
  staffPin,
  setStaffPin,
  handleSchoolVerification,
}: VerifySchoolStepProps) {
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

interface ProfileStepProps extends StepComponentProps {
  verifiedSchoolName: string
  schoolCode: string
  teacherName: string
  setTeacherName: (value: string) => void
  teacherGender: 'male' | 'female' | ''
  setTeacherGender: (value: 'male' | 'female') => void
  phone: string
  setPhone: (value: string) => void
  village: string
  setVillage: (value: string) => void
  handleProfileSubmit: (e: React.FormEvent) => Promise<void>
  sanitizeProfilePhone: (value: string) => string
}

export function ProfileStep({
  loading,
  verifiedSchoolName,
  schoolCode,
  teacherName,
  setTeacherName,
  teacherGender,
  setTeacherGender,
  phone,
  setPhone,
  village,
  setVillage,
  handleProfileSubmit,
  sanitizeProfilePhone,
}: ProfileStepProps) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
      <AuthCard
        title="Teacher Profile"
        description="Step 4 of 4: Complete your profile"
      >
        <form onSubmit={handleProfileSubmit} className="space-y-4">
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

interface AuthStepProps extends StepComponentProps {
  signupMethod: 'email' | 'phone'
  setSignupMethod: (method: 'email' | 'phone') => void
  email: string
  setEmail: (value: string) => void
  emailError: string
  setEmailError: (value: string) => void
  emailSuggestion: string
  otp: string
  setOtp: (value: string) => void
  otpSent: boolean
  setOtpSent: (sent: boolean) => void
  phoneNumber: string
  setPhoneNumber: (value: string) => void
  phoneError: string
  setPhoneError: (value: string) => void
  phoneOtp: string
  setPhoneOtp: (value: string) => void
  phoneOtpSent: boolean
  setPhoneOtpSent: (sent: boolean) => void
  handleSendOTP: (e: React.FormEvent) => Promise<void>
  handleVerifyOTP: (e: React.FormEvent) => Promise<void>
}

export function AuthStep({
  loading,
  signupMethod,
  setSignupMethod,
  email,
  setEmail,
  emailError,
  setEmailError,
  emailSuggestion,
  otp,
  setOtp,
  otpSent,
  setOtpSent,
  phoneNumber,
  setPhoneNumber,
  phoneError,
  setPhoneError,
  phoneOtp,
  setPhoneOtp,
  phoneOtpSent,
  setPhoneOtpSent,
  handleSendOTP,
  handleVerifyOTP,
  setStep,
  router,
}: AuthStepProps) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
      <AuthCard
        title="Teacher Registration"
        description="Step 1 of 4: Choose your verification method"
      >
        <div className="space-y-3 sm:space-y-4">
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

interface ForgotPasswordRequestStepProps extends StepComponentProps {
  forgotEmail: string
  setForgotEmail: (value: string) => void
  handleForgotPasswordOtp: (e: React.FormEvent) => Promise<void>
  setForgotOtpSent: (sent: boolean) => void
}

export function ForgotPasswordRequestStep({
  loading,
  forgotEmail,
  setForgotEmail,
  handleForgotPasswordOtp,
  setForgotOtpSent,
  setStep,
}: ForgotPasswordRequestStepProps) {
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

interface ForgotPasswordResetStepProps extends StepComponentProps {
  forgotEmail: string
  forgotOtp: string
  setForgotOtp: (value: string) => void
  forgotNewPassword: string
  setForgotNewPassword: (value: string) => void
  forgotConfirmPassword: string
  setForgotConfirmPassword: (value: string) => void
  handleResetPassword: (e: React.FormEvent) => Promise<void>
  handleForgotPasswordOtp: (e: React.FormEvent) => Promise<void>
  setForgotOtpSent: (sent: boolean) => void
  setForgotEmail: (value: string) => void
}

export function ForgotPasswordResetStep({
  loading,
  forgotEmail,
  forgotOtp,
  setForgotOtp,
  forgotNewPassword,
  setForgotNewPassword,
  forgotConfirmPassword,
  setForgotConfirmPassword,
  handleResetPassword,
  handleForgotPasswordOtp,
  setForgotOtpSent,
  setForgotEmail,
  setStep,
}: ForgotPasswordResetStepProps) {
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
