/**
 * SignInStep Component
 * Extracted from StudentStartPage to reduce cognitive complexity
 * Handles all sign-in authentication methods (email, phone, username)
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase-browser";
import {
  signInWithUsername,
} from "@/app/actions/auth";
import { usePhoneInput } from "@/hooks/usePhoneInput";
import { validateEmail } from "@/lib/email-validation";
import { validatePhone } from "@/lib/validation-utils";
import { authLogger } from "@/lib/auth-logger";
import { Mail, Smartphone, UserRound } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseAuthStateReturn } from "@/hooks/useAuthState";

interface SignInStepProps {
  readonly state: UseAuthStateReturn["state"];
  readonly actions: UseAuthStateReturn["actions"];
  readonly isLoading: boolean;
}

/**
 * Check if user is teacher/admin
 */
async function checkAndHandleTeacherRedirect(
  supabase: ReturnType<typeof createClient>,
  user: { id: string; app_metadata?: { role?: string } },
  setError: (error: string | null) => void,
  context: string,
): Promise<boolean> {
  const appRole = user.app_metadata?.role;
  const isTeacherOrAdmin =
    appRole === "teacher" || appRole === "admin" || appRole === "super_admin";

  if (isTeacherOrAdmin) {
    authLogger.warn(
      `[${context}] Teacher/Admin/SuperAdmin tried to login via student page`,
    );
    await supabase.auth.signOut();
    setError(
      "This account is registered as a teacher/admin. Please use the teacher login page.",
    );
    toast.error(
      "This is a teacher/admin account. Please use the teacher login page.",
    );
    return true;
  } else {
    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (teacherProfile) {
      authLogger.warn(
        `[${context}] Teacher (via profile) tried to login via student page`,
      );
      await supabase.auth.signOut();
      setError(
        "This account is registered as a teacher. Please use the teacher login page.",
      );
      toast.error(
        "This is a teacher account. Please use the teacher login page.",
      );
      return true;
    }
  }

  return false;
}

export function SignInStep({ state, actions, isLoading }: SignInStepProps) {
  const router = useRouter();
  const supabase = createClient();
  const signinPhoneInput = usePhoneInput(state.signinPhoneNumber);

  // ========================================
  // SIGN IN - EMAIL HANDLER
  // ========================================
  const handleSignInEmail = useCallback(
    async (e: React.SyntheticEvent) => {
      e.preventDefault();
      actions.setIsLoading(true);
      actions.setSigninEmailError(null);

      const emailValidation = validateEmail(state.signinEmailAddress);
      if (!emailValidation.valid) {
        actions.setSigninEmailError(emailValidation.error || "Invalid email");
        actions.setIsLoading(false);
        return;
      }

      try {
        authLogger.debug("[SignIn Email] Attempting email authentication");
        const { data, error } = await supabase.auth.signInWithPassword({
          email: state.signinEmailAddress.trim(),
          password: state.signinEmailPassword,
        });

        if (error) {
          authLogger.error("[SignIn Email] Authentication failed", error);
          actions.setSigninEmailError(
            error.message || "Invalid email or password",
          );
          toast.error(
            "Login failed: " + (error.message || "Invalid credentials"),
          );
        } else if (data.user) {
          const isTeacher = await checkAndHandleTeacherRedirect(
            supabase,
            data.user as { id: string; app_metadata?: { role?: string } },
            actions.setSigninEmailError,
            "SignIn Email",
          );
          if (isTeacher) {
            return;
          }

          authLogger.success("[SignIn Email] Authentication successful");
          toast.success("Login successful!");
          router.push("/app/student/dashboard");
        }
      } catch (error) {
        authLogger.error("[SignIn Email] Unexpected error", error);
        actions.setSigninEmailError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      } finally {
        actions.setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.signinEmailAddress, state.signinEmailPassword, actions, router],
  );

  // ========================================
  // SIGN IN - PHONE HANDLER
  // ========================================
  const handleSignInPhone = useCallback(
    async (e: React.SyntheticEvent) => {
      e.preventDefault();
      actions.setIsLoading(true);
      actions.setSigninPhoneError(null);

      const phoneValidation = validatePhone(signinPhoneInput.fullValue);
      if (!phoneValidation.valid) {
        actions.setSigninPhoneError(phoneValidation.error || "Invalid phone");
        actions.setIsLoading(false);
        return;
      }

      try {
        authLogger.debug("[SignIn Phone] Attempting phone authentication");
        const { data, error } = await supabase.auth.signInWithPassword({
          phone: signinPhoneInput.fullValue,
          password: state.signinPhonePassword,
        });

        if (error) {
          authLogger.error("[SignIn Phone] Authentication failed", error);
          actions.setSigninPhoneError(
            error.message || "Invalid phone or password",
          );
          toast.error(
            "Login failed: " + (error.message || "Invalid credentials"),
          );
        } else if (data.user) {
          const isTeacher = await checkAndHandleTeacherRedirect(
            supabase,
            data.user as { id: string; app_metadata?: { role?: string } },
            actions.setSigninPhoneError,
            "SignIn Phone",
          );
          if (isTeacher) {
            return;
          }

          authLogger.success("[SignIn Phone] Authentication successful");
          toast.success("Login successful!");
          router.push("/app/student/dashboard");
        }
      } catch (error) {
        authLogger.error("[SignIn Phone] Unexpected error", error);
        actions.setSigninPhoneError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      } finally {
        actions.setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signinPhoneInput.fullValue, state.signinPhonePassword, actions, router],
  );

  // ========================================
  // SIGN IN - USERNAME HANDLER
  // ========================================
  const handleSignInUsername = useCallback(
    async (e: React.SyntheticEvent) => {
      e.preventDefault();
      actions.setIsLoading(true);
      actions.setSigninUsernameError(null);

      if (!state.signinUsername.trim()) {
        actions.setSigninUsernameError("Username is required");
        actions.setIsLoading(false);
        return;
      }

      if (!state.signinUsernamePassword) {
        actions.setSigninUsernameError("Password is required");
        actions.setIsLoading(false);
        return;
      }

      try {
        authLogger.debug("[SignIn Username] Attempting username authentication");
        const result = await signInWithUsername(
          state.signinUsername.trim(),
          state.signinUsernamePassword,
        );

        if (result.success) {
          authLogger.success("[SignIn Username] Authentication successful");
          toast.success("Login successful!");
          router.push("/app/student/dashboard");
        } else {
          authLogger.error("[SignIn Username] Authentication failed", {
            error: result.error,
          });
          actions.setSigninUsernameError(
            result.error || "Invalid username or password",
          );
          toast.error("Login failed: " + (result.error || "Invalid credentials"));
        }
      } catch (error) {
        authLogger.error("[SignIn Username] Unexpected error", error);
        actions.setSigninUsernameError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      } finally {
        actions.setIsLoading(false);
      }
    },
    [state.signinUsername, state.signinUsernamePassword, actions, router],
  );

  return (
    <AuthCard title="Sign In" description="Choose your sign-in method">
      <div className="space-y-4">
        {/* Tab Navigation — WAI-ARIA tab pattern wires each tab to its panel
            via id ↔ aria-controls / aria-labelledby, so SRs can find the
            form when the user activates a tab. */}
        <div role="tablist" className="flex gap-2" aria-label="Sign in method">
          <Button
            type="button"
            role="tab"
            id="signin-tab-email"
            aria-selected={state.signinTab === "email"}
            aria-controls="signin-panel-email"
            variant={state.signinTab === "email" ? "default" : "secondary"}
            size="sm"
            onClick={() => actions.setSigninTab("email")}
            className="flex-1 gap-1.5"
            disabled={isLoading}
          >
            <Mail size={14} strokeWidth={2.5} aria-hidden="true" />
            Email
          </Button>
          <Button
            type="button"
            role="tab"
            id="signin-tab-phone"
            aria-selected={state.signinTab === "phone"}
            aria-controls="signin-panel-phone"
            variant={state.signinTab === "phone" ? "default" : "secondary"}
            size="sm"
            onClick={() => actions.setSigninTab("phone")}
            className="flex-1 gap-1.5"
            disabled={isLoading}
          >
            <Smartphone size={14} strokeWidth={2.5} aria-hidden="true" />
            Phone
          </Button>
          <Button
            type="button"
            role="tab"
            id="signin-tab-username"
            aria-selected={state.signinTab === "username"}
            aria-controls="signin-panel-username"
            variant={state.signinTab === "username" ? "default" : "secondary"}
            size="sm"
            onClick={() => actions.setSigninTab("username")}
            className="flex-1 gap-1.5"
            disabled={isLoading}
          >
            <UserRound size={14} strokeWidth={2.5} aria-hidden="true" />
            Username
          </Button>
        </div>

        {/* Email Sign In Form */}
        {state.signinTab === "email" && (
          <form
            id="signin-panel-email"
            role="tabpanel"
            aria-labelledby="signin-tab-email"
            onSubmit={handleSignInEmail}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email Address</Label>
              <Input
                id="signin-email"
                type="email"
                autoComplete="username"
                placeholder="your.email@example.com"
                value={state.signinEmailAddress}
                onChange={(e) =>
                  actions.setSigninEmailAddress(e.target.value)
                }
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={state.signinEmailPassword}
                onChange={(e) =>
                  actions.setSigninEmailPassword(e.target.value)
                }
                required
                disabled={isLoading}
                aria-invalid={!!state.signinEmailError}
                aria-describedby={state.signinEmailError ? "signin-email-error" : undefined}
              />
              {state.signinEmailError && (
                <p id="signin-email-error" role="alert" className="text-sm text-error">{state.signinEmailError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-[17px] shadow-primary hover:shadow-(--shadow-primary-hover) hover:-translate-y-0.5"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Button
                type="button"
                variant="link"
                onClick={() => actions.setMainStep("signup")}
                className="inline h-auto p-0 align-baseline font-medium"
                disabled={isLoading}
              >
                Create one
              </Button>
            </p>
          </form>
        )}

        {/* Phone Sign In Form */}
        {state.signinTab === "phone" && (
          <form
            id="signin-panel-phone"
            role="tabpanel"
            aria-labelledby="signin-tab-phone"
            onSubmit={handleSignInPhone}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="signin-phone">Phone Number</Label>
              <Input
                id="signin-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 (555) 123-4567"
                value={signinPhoneInput.displayValue}
                onChange={(e) => signinPhoneInput.onChange(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signin-phone-password">Password</Label>
              <Input
                id="signin-phone-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={state.signinPhonePassword}
                onChange={(e) =>
                  actions.setSigninPhonePassword(e.target.value)
                }
                required
                disabled={isLoading}
                aria-invalid={!!state.signinPhoneError}
                aria-describedby={state.signinPhoneError ? "signin-phone-error" : undefined}
              />
              {state.signinPhoneError && (
                <p id="signin-phone-error" role="alert" className="text-sm text-error">{state.signinPhoneError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-[17px] shadow-primary hover:shadow-(--shadow-primary-hover) hover:-translate-y-0.5"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Button
                type="button"
                variant="link"
                onClick={() => actions.setMainStep("signup")}
                className="inline h-auto p-0 align-baseline font-medium"
                disabled={isLoading}
              >
                Create one
              </Button>
            </p>
          </form>
        )}

        {/* Username Sign In Form */}
        {state.signinTab === "username" && (
          <form
            id="signin-panel-username"
            role="tabpanel"
            aria-labelledby="signin-tab-username"
            onSubmit={handleSignInUsername}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="signin-username">Username</Label>
              <Input
                id="signin-username"
                type="text"
                autoComplete="username"
                placeholder="your.username"
                value={state.signinUsername}
                onChange={(e) =>
                  actions.setSigninUsername(e.target.value)
                }
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signin-username-password">Password</Label>
              <Input
                id="signin-username-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={state.signinUsernamePassword}
                onChange={(e) =>
                  actions.setSigninUsernamePassword(e.target.value)
                }
                required
                disabled={isLoading}
                aria-invalid={!!state.signinUsernameError}
                aria-describedby={state.signinUsernameError ? "signin-username-error" : undefined}
              />
              {state.signinUsernameError && (
                <p id="signin-username-error" role="alert" className="text-sm text-error">{state.signinUsernameError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-[17px] shadow-primary hover:shadow-(--shadow-primary-hover) hover:-translate-y-0.5"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Button
                type="button"
                variant="link"
                onClick={() => actions.setMainStep("signup")}
                className="inline h-auto p-0 align-baseline font-medium"
                disabled={isLoading}
              >
                Create one
              </Button>
            </p>
          </form>
        )}
      </div>
    </AuthCard>
  );
}
