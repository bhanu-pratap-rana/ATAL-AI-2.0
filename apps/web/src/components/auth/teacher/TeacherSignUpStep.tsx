/**
 * TeacherSignUpStep Component
 * Extracted from teacher/start/page.tsx to reduce cognitive complexity
 * Handles teacher signup with email or phone verification (OTP)
 */

"use client";

import { useCallback } from "react";
import { Mail, Smartphone } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  TeacherOnboardingState,
  TeacherOnboardingActions,
} from "@/hooks/useTeacherOnboarding";

interface TeacherSignUpStepProps {
  readonly state: TeacherOnboardingState;
  readonly actions: TeacherOnboardingActions;
}

export function TeacherSignUpStep({
  state,
  actions,
}: TeacherSignUpStepProps) {
  // Handle email method selection
  const handleEmailMethodSelect = useCallback(() => {
    actions.setSignupMethod("email");
    actions.setPhoneError("");
    actions.setEmailError("");
  }, [actions]);

  // Handle phone method selection
  const handlePhoneMethodSelect = useCallback(() => {
    actions.setSignupMethod("phone");
    actions.setPhoneError("");
    actions.setEmailError("");
  }, [actions]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
      <AuthCard
        title="Teacher Registration"
        description="Step 1 of 4: Choose your verification method"
      >
        <div className="space-y-3 sm:space-y-4">
          {/* PR-68: tab/tabpanel pair wired via aria-controls. */}
          <div role="tablist" aria-label="Verification method" className="flex gap-2 sm:gap-3">
            <Button
              type="button"
              role="tab"
              id="tab-signup-email"
              aria-controls="panel-signup-method"
              aria-selected={state.signupMethod === "email"}
              size="sm"
              variant={state.signupMethod === "email" ? "default" : "secondary"}
              onClick={handleEmailMethodSelect}
              className="flex-1 gap-1.5 text-xs sm:text-sm"
              disabled={state.loading}
            >
              <Mail size={14} strokeWidth={2.5} aria-hidden="true" className="hidden sm:block" />
              Email
            </Button>
            <Button
              type="button"
              role="tab"
              id="tab-signup-phone"
              aria-controls="panel-signup-method"
              aria-selected={state.signupMethod === "phone"}
              size="sm"
              variant={state.signupMethod === "phone" ? "default" : "secondary"}
              onClick={handlePhoneMethodSelect}
              className="flex-1 gap-1.5 text-xs sm:text-sm"
              disabled={state.loading}
            >
              <Smartphone size={14} strokeWidth={2.5} aria-hidden="true" className="hidden sm:block" />
              Phone
            </Button>
          </div>

          <div
            role="tabpanel"
            id="panel-signup-method"
            aria-labelledby={state.signupMethod === "phone" ? "tab-signup-phone" : "tab-signup-email"}
          >

          {/* Email Method */}
          {state.signupMethod === "email" && (
            <>
              {state.otpSent ? (
                <form
                  onSubmit={actions.handleVerifyOTP}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      placeholder="123456"
                      value={state.otp}
                      onChange={(e) =>
                        actions.setOtp(
                          e.target.value.replaceAll(/\D/g, "").slice(0, 6),
                        )
                      }
                      required
                      disabled={state.loading}
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-widest"
                    />
                    <p className="text-xs text-slate-500">
                      Enter the 6-digit code sent to {state.email}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-[#2563EB]/40 shadow-md" variant="ghost"
                    disabled={state.loading || state.otp.length !== 6}
                    loading={state.loading}
                  >
                    Verify & Continue
                  </Button>

                  <div className="flex flex-col items-center gap-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={actions.handleSendOTP}
                      className="text-sm hover:text-[#1D4ED8] text-[#2563EB]"
                      disabled={state.loading}
                    >
                      Resend OTP
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        actions.setOtpSent(false);
                        actions.setOtp("");
                      }}
                      className="text-sm"
                      disabled={state.loading}
                    >
                      Use different email
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={actions.handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="teacher@school.edu"
                      value={state.email}
                      onChange={(e) => actions.setEmail(e.target.value)}
                      required
                      disabled={state.loading}
                    />
                    {state.emailError && (
                      <div className="space-y-2">
                        <p className="text-sm text-error">
                          {state.emailError}
                        </p>
                        {state.emailSuggestion && (
                          <Button
                            type="button"
                            variant="link"
                            onClick={() =>
                              actions.setEmail(state.emailSuggestion)
                            }
                            className="h-auto p-0 text-sm text-cyan hover:text-cyan-dark"
                            disabled={state.loading}
                          >
                            ✓ Use suggested: {state.emailSuggestion}
                          </Button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      We&apos;ll send a 6-digit code to this email
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-[#2563EB]/40 shadow-md" variant="ghost"
                    disabled={state.loading || !state.email}
                    loading={state.loading}
                  >
                    Send Verification Code
                  </Button>
                </form>
              )}
            </>
          )}

          {/* Phone Method */}
          {state.signupMethod === "phone" && (
            <div className="space-y-4">
              <div className="bg-cyan-lightest border-l-4 border-cyan p-3 rounded-xl">
                <p className="text-xs text-cyan-darkest inline-flex items-start gap-1.5 flex-wrap">
                  <Smartphone size={14} strokeWidth={2.5} aria-hidden="true" className="shrink-0 mt-0.5" />
                  <strong>Phone Verification</strong>
                  <br />
                  Enter your 10-digit phone number. We&apos;ll send a
                  verification code via OTP.
                </p>
              </div>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-500">
                        +91
                      </span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="9876543210"
                      value={state.phoneNumber}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replaceAll(/\D/g, "")
                          .slice(0, 10);
                        actions.setPhoneNumber(digits);
                        actions.setPhoneError("");
                      }}
                      required
                      disabled={state.loading}
                      maxLength={10}
                    />
                  </div>
                  {state.phoneError && (
                    <p className="text-sm text-error">{state.phoneError}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    10-digit Indian phone number
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (state.phoneNumber.length === 10) {
                      // Phone OTP will be sent here
                      actions.setPhoneOtpSent(true);
                    } else {
                      actions.setPhoneError("Phone number must be 10 digits");
                    }
                  }}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-[#2563EB]/40 shadow-md" variant="ghost"
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
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      placeholder="123456"
                      value={state.phoneOtp}
                      onChange={(e) =>
                        actions.setPhoneOtp(
                          e.target.value.replaceAll(/\D/g, "").slice(0, 6),
                        )
                      }
                      required
                      disabled={state.loading}
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-widest"
                    />
                    <p className="text-xs text-slate-500">
                      Enter the 6-digit code sent to +91{state.phoneNumber}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      if (state.phoneOtp.length === 6) {
                        // Phone verification would happen here
                        actions.setStep("set-password");
                      }
                    }}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-[#2563EB]/40 shadow-md" variant="ghost"
                    disabled={state.loading || state.phoneOtp.length !== 6}
                    loading={state.loading}
                  >
                    Verify & Continue
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      actions.setPhoneOtpSent(false);
                      actions.setPhoneOtp("");
                    }}
                    className="w-full text-sm"
                    disabled={state.loading}
                  >
                    Change phone number
                  </Button>
                </form>
              )}
            </div>
          )}

          <div className="text-center pt-2">
            <Button
              type="button"
              variant="link"
              onClick={() => actions.setStep("choice")}
              className="text-sm"
              disabled={state.loading}
            >
              ← Back to options
            </Button>
          </div>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}
