'use client'

import { useTeacherOnboarding } from '@/hooks/useTeacherOnboarding'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validatePassword, sanitizeProfilePhone } from '@/lib/validation-utils'
import { useRouter } from 'next/navigation'

export default function TeacherStartPage() {
  const router = useRouter()
  const { state, actions } = useTeacherOnboarding()

  // Render based on current step
  if (state.step === 'choice') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Teacher Portal"
          description="Are you a new or existing teacher?"
        >
          <div className="space-y-3 sm:space-y-4">
            {/* Create Account Button */}
            <Button
              onClick={() => actions.setStep('auth')}
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
              onClick={() => actions.setStep('login')}
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

  if (state.step === 'login') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Teacher Login"
          description="Sign in with your registered email and password"
        >
          <form onSubmit={actions.handleTeacherLogin} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email Address</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="teacher@school.edu"
                value={state.loginEmail}
                onChange={(e) => actions.setLoginEmail(e.target.value)}
                required
                disabled={state.loading}
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
                value={state.loginPassword}
                onChange={(e) => actions.setLoginPassword(e.target.value)}
                required
                disabled={state.loading}
              />
              {state.loginError && (
                <p className="text-sm text-error">{state.loginError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={state.loading || !state.loginEmail || !state.loginPassword}
              loading={state.loading}
            >
              {state.loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="space-y-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  actions.setForgotEmail(state.loginEmail)
                  actions.setStep('forgot-password')
                }}
                className="text-sm text-primary hover:text-primary-dark hover:underline w-full text-center"
                disabled={state.loading}
              >
                Forgot your password?
              </button>
              <button
                type="button"
                onClick={() => actions.setStep('choice')}
                className="text-sm text-primary hover:underline w-full text-center"
                disabled={state.loading}
              >
                Back to options
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm text-text-secondary hover:text-primary hover:underline w-full text-center"
                disabled={state.loading}
              >
                Back to home
              </button>
            </div>
          </form>
        </AuthCard>
      </div>
    )
  }

  if (state.step === 'auth') {
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
                  actions.setSignupMethod('email')
                  actions.setPhoneError('')
                  actions.setEmailError('')
                }}
                className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  state.signupMethod === 'email'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-muted text-text-secondary hover:bg-muted/80'
                }`}
                disabled={state.loading}
              >
                <span className="hidden sm:inline">📧 </span>Email
              </button>
              <button
                onClick={() => {
                  actions.setSignupMethod('phone')
                  actions.setPhoneError('')
                  actions.setEmailError('')
                }}
                className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  state.signupMethod === 'phone'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-muted text-text-secondary hover:bg-muted/80'
                }`}
                disabled={state.loading}
              >
                <span className="hidden sm:inline">📱 </span>Phone
              </button>
            </div>

            {/* Email Method */}
            {state.signupMethod === 'email' && (
              <>
                {!state.otpSent ? (
                  <form onSubmit={actions.handleSendOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="teacher@school.edu"
                        value={state.email}
                        onChange={(e) => actions.setEmail(e.target.value)}
                        required
                        disabled={state.loading}
                      />
                      {state.emailError && (
                        <div className="space-y-2">
                          <p className="text-sm text-error">{state.emailError}</p>
                          {state.emailSuggestion && (
                            <button
                              type="button"
                              onClick={() => actions.setEmail(state.emailSuggestion)}
                              className="text-sm text-cyan hover:text-cyan-dark hover:underline"
                              disabled={state.loading}
                            >
                              ✓ Use suggested: {state.emailSuggestion}
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
                      disabled={state.loading || !state.email}
                      loading={state.loading}
                    >
                      Send Verification Code
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={actions.handleVerifyOTP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={state.otp}
                        onChange={(e) =>
                          actions.setOtp(e.target.value.replaceAll(/\D/g, '').slice(0, 6))
                        }
                        required
                        disabled={state.loading}
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-widest"
                      />
                      <p className="text-xs text-text-secondary">
                        Enter the 6-digit code sent to {state.email}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full shadow-[var(--shadow-primary)]"
                      disabled={state.loading || state.otp.length !== 6}
                      loading={state.loading}
                    >
                      Verify & Continue
                    </Button>

                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={actions.handleSendOTP}
                        className="text-sm text-primary hover:text-primary-dark hover:underline"
                        disabled={state.loading}
                      >
                        Resend OTP
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.setOtpSent(false)
                          actions.setOtp('')
                        }}
                        className="text-sm text-primary hover:underline"
                        disabled={state.loading}
                      >
                        Use different email
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* Phone Method */}
            {state.signupMethod === 'phone' && (
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
                        value={state.phoneNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replaceAll(/\D/g, '').slice(0, 10)
                          actions.setPhoneNumber(digits)
                          actions.setPhoneError('')
                        }}
                        required
                        disabled={state.loading}
                        maxLength={10}
                      />
                    </div>
                    {state.phoneError && (
                      <p className="text-sm text-error">{state.phoneError}</p>
                    )}
                    <p className="text-xs text-text-secondary">
                      10-digit Indian phone number
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      if (state.phoneNumber.length !== 10) {
                        actions.setPhoneError('Phone number must be 10 digits')
                      } else {
                        // Phone OTP will be sent here
                        actions.setPhoneOtpSent(true)
                      }
                    }}
                    className="w-full shadow-[var(--shadow-primary)]"
                    disabled={state.loading || state.phoneNumber.length !== 10}
                    loading={state.loading}
                  >
                    Send OTP to Phone
                  </Button>
                </form>

                {state.phoneOtpSent && (
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-otp">Verification Code</Label>
                      <Input
                        id="phone-otp"
                        type="text"
                        placeholder="123456"
                        value={state.phoneOtp}
                        onChange={(e) =>
                          actions.setPhoneOtp(e.target.value.replaceAll(/\D/g, '').slice(0, 6))
                        }
                        required
                        disabled={state.loading}
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-widest"
                      />
                      <p className="text-xs text-text-secondary">
                        Enter the 6-digit code sent to +91{state.phoneNumber}
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        if (state.phoneOtp.length !== 6) {
                          // toast.error handled in hook
                        } else {
                          // Phone verification would happen here
                          actions.setStep('set-password')
                        }
                      }}
                      className="w-full shadow-[var(--shadow-primary)]"
                      disabled={state.loading || state.phoneOtp.length !== 6}
                      loading={state.loading}
                    >
                      Verify & Continue
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        actions.setPhoneOtpSent(false)
                        actions.setPhoneOtp('')
                      }}
                      className="text-sm text-primary hover:underline block w-full text-center"
                      disabled={state.loading}
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
                onClick={() => actions.setStep('choice')}
                className="text-sm text-primary hover:underline"
                disabled={state.loading}
              >
                ← Back to options
              </button>
            </div>
          </div>
        </AuthCard>
      </div>
    )
  }

  if (state.step === 'set-password') {
    const getPasswordStrengthLabel = () => {
      if (state.password.length === 0) return ''
      const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
      return labels[state.passwordStrength] || ''
    }

    const getPasswordStrengthColor = () => {
      const colors = [
        'bg-error',
        'bg-warning',
        'bg-warning',
        'bg-cyan',
        'bg-success',
      ]
      return colors[state.passwordStrength] || 'bg-surface-dark'
    }

    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Create Password"
          description="Step 2 of 4: Secure your account"
        >
          <form onSubmit={actions.handleSetPassword} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password (min 8 characters)"
                value={state.password}
                onChange={(e) => actions.handlePasswordChange(e.target.value)}
                required
                disabled={state.loading}
                minLength={8}
              />
              {state.password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((strength) => (
                      <div
                        key={`strength-${strength}`}
                        className={`h-1 flex-1 rounded ${
                          strength <= state.passwordStrength
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
                    const validation = validatePassword(state.password)
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
                value={state.passwordConfirm}
                onChange={(e) => actions.setPasswordConfirm(e.target.value)}
                required
                disabled={state.loading}
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
                state.loading ||
                !validatePassword(state.password).valid ||
                state.password !== state.passwordConfirm
              }
              loading={state.loading}
            >
              Set Password & Continue
            </Button>
          </form>
        </AuthCard>
      </div>
    )
  }

  if (state.step === 'verify-school') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="School Verification"
          description="Step 3 of 4: Verify your school credentials"
        >
          <form onSubmit={actions.handleSchoolVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-code">School Code</Label>
              <Input
                id="school-code"
                type="text"
                placeholder="14H0182"
                value={state.schoolCode}
                onChange={(e) => actions.setSchoolCode(e.target.value.toUpperCase())}
                required
                disabled={state.loading}
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
                value={state.staffPin}
                onChange={(e) => actions.setStaffPin(e.target.value)}
                required
                disabled={state.loading}
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
              disabled={state.loading}
              loading={state.loading}
            >
              Verify School
            </Button>
          </form>
        </AuthCard>
      </div>
    )
  }

  if (state.step === 'profile') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Teacher Profile"
          description="Step 4 of 4: Complete your profile"
        >
          <form onSubmit={actions.handleProfileSubmit} className="space-y-4">
            {/* Display verified school info */}
            {state.verifiedSchoolName && (
              <div className="bg-success-light border-l-4 border-success p-3 rounded">
                <p className="text-sm text-success">
                  <strong>✓ School Verified</strong>
                  <br />
                  <span className="text-xs">
                    {state.verifiedSchoolName} ({state.schoolCode.toUpperCase()})
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
                value={state.teacherName}
                onChange={(e) => actions.setTeacherName(e.target.value)}
                required
                disabled={state.loading}
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
                    checked={state.teacherGender === 'male'}
                    onChange={() => actions.setTeacherGender('male')}
                    disabled={state.loading}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Male</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="teacher-gender"
                    value="female"
                    checked={state.teacherGender === 'female'}
                    onChange={() => actions.setTeacherGender('female')}
                    disabled={state.loading}
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
                value={state.phone}
                onChange={(e) => actions.setPhone(sanitizeProfilePhone(e.target.value))}
                disabled={state.loading}
                maxLength={10}
              />
              <p className="text-xs text-text-secondary">
                Enter 10-digit Indian mobile number (e.g., 9876543210)
              </p>
              {state.phone && state.phone.length > 0 && state.phone.length < 10 && (
                <p className="text-xs text-warning">{10 - state.phone.length} more digits needed</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="village">Village/Location</Label>
              <Input
                id="village"
                type="text"
                placeholder="Enter your village or location"
                value={state.village}
                onChange={(e) => actions.setVillage(e.target.value)}
                disabled={state.loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={state.loading || !state.teacherName || !state.teacherGender}
              loading={state.loading}
            >
              Complete Registration
            </Button>
          </form>
        </AuthCard>
      </div>
    )
  }

  // Forgot Password: Request OTP
  if (state.step === 'forgot-password' && !state.forgotOtpSent) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Reset Password"
          description="Enter your email to receive a recovery code"
        >
          <form onSubmit={actions.handleForgotPasswordOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="teacher@school.edu"
                value={state.forgotEmail}
                onChange={(e) => actions.setForgotEmail(e.target.value)}
                required
                disabled={state.loading}
              />
              <p className="text-xs text-text-secondary">
                We&apos;ll send a recovery code to this email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={state.loading || !state.forgotEmail}
              loading={state.loading}
            >
              {state.loading ? 'Sending...' : 'Send Recovery Code'}
            </Button>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  actions.setStep('login')
                  actions.setForgotEmail('')
                  actions.setForgotOtpSent(false)
                }}
                className="text-sm text-primary hover:underline w-full text-center"
                disabled={state.loading}
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
  if (state.step === 'forgot-password' && state.forgotOtpSent) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <AuthCard
          title="Reset Password"
          description={`Enter the code sent to ${state.forgotEmail}`}
        >
          <form onSubmit={actions.handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-otp">Recovery Code</Label>
              <Input
                id="forgot-otp"
                type="text"
                placeholder="123456"
                value={state.forgotOtp}
                onChange={(e) => actions.setForgotOtp(e.target.value.replaceAll(/\D/g, '').slice(0, 6))}
                required
                disabled={state.loading}
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
                value={state.forgotNewPassword}
                onChange={(e) => actions.setForgotNewPassword(e.target.value)}
                required
                disabled={state.loading}
                minLength={8}
              />
              {/* Show validation errors for forgot password */}
              {state.forgotNewPassword.length > 0 && (() => {
                const validation = validatePassword(state.forgotNewPassword)
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
                value={state.forgotConfirmPassword}
                onChange={(e) => actions.setForgotConfirmPassword(e.target.value)}
                required
                disabled={state.loading}
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full shadow-[var(--shadow-primary)]"
              disabled={state.loading || state.forgotOtp.length !== 6 || !validatePassword(state.forgotNewPassword).valid || state.forgotNewPassword !== state.forgotConfirmPassword}
              loading={state.loading}
            >
              {state.loading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={actions.handleForgotPasswordOtp}
                className="text-sm text-primary hover:text-primary-dark hover:underline w-full text-center"
                disabled={state.loading}
              >
                Resend Recovery Code
              </button>
              <button
                type="button"
                onClick={() => {
                  actions.setForgotOtp('')
                  actions.setForgotOtpSent(false)
                }}
                className="text-sm text-primary hover:underline w-full text-center"
                disabled={state.loading}
              >
                Back to email entry
              </button>
              <button
                type="button"
                onClick={() => {
                  actions.setStep('login')
                  actions.setForgotEmail('')
                  actions.setForgotOtp('')
                  actions.setForgotNewPassword('')
                  actions.setForgotConfirmPassword('')
                  actions.setForgotOtpSent(false)
                }}
                className="text-sm text-text-secondary hover:underline w-full text-center"
                disabled={state.loading}
              >
                Back to login
              </button>
            </div>
          </form>
        </AuthCard>
      </div>
    )
  }

  if (state.step === 'complete') {
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
