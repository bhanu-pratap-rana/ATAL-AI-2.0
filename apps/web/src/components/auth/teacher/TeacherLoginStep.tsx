/**
 * TeacherLoginStep Component
 * Extracted from teacher/start/page.tsx to reduce cognitive complexity
 * Handles teacher login with email and password
 */

"use client";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  TeacherOnboardingState,
  TeacherOnboardingActions,
} from "@/hooks/useTeacherOnboarding";

interface TeacherLoginStepProps {
  readonly state: TeacherOnboardingState;
  readonly actions: TeacherOnboardingActions;
}

export function TeacherLoginStep({
  state,
  actions,
}: TeacherLoginStepProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
      <AuthCard
        title="Teacher Login"
        description="Sign in with your registered email and password"
      >
        <form
          onSubmit={actions.handleTeacherLogin}
          className="space-y-3 sm:space-y-4"
        >
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
            <p className="text-xs text-slate-500">
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
            disabled={
              state.loading || !state.loginEmail || !state.loginPassword
            }
            loading={state.loading}
          >
            {state.loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="space-y-2 pt-4">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                actions.setForgotEmail(state.loginEmail);
                actions.setStep("forgot-password");
              }}
              className="w-full text-sm hover:text-primary-dark"
              disabled={state.loading}
            >
              Forgot your password?
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => actions.setStep("choice")}
              className="w-full text-sm"
              disabled={state.loading}
            >
              Back to options
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => {
                globalThis.location.href = "/";
              }}
              className="w-full text-sm text-slate-500 hover:text-primary"
              disabled={state.loading}
            >
              Back to home
            </Button>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
