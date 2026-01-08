/**
 * useStudentAuth Hook
 * Extracted from student/start/page.tsx to reduce cognitive complexity
 * Manages all authentication handlers and state transitions
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase-browser";
import {
  signInWithUsername,
} from "@/app/actions/auth";
import { useAuthState } from "@/hooks/useAuthState";
import { useOTPInput } from "@/hooks/useOTPInput";
import { usePhoneInput } from "@/hooks/usePhoneInput";
import {
  validateEmail,
  validatePhone,
} from "@/lib/validation-utils";
import { authLogger } from "@/lib/auth-logger";

/**
 * Check if user is teacher/admin and redirect if needed
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

  if (!isTeacherOrAdmin) {
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
  } else {
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
  }

  return false;
}

export function useStudentAuth() {
  const router = useRouter();
  const supabase = createClient();
  const { state, actions } = useAuthState();

  // Initialize phone input hooks
  const signinPhoneInput = usePhoneInput(state.signinPhoneNumber);
  const signupPhoneInput = usePhoneInput(state.signupPhoneNumber);

  // Initialize OTP input hooks
  const signupEmailOtpInput = useOTPInput(state.signupEmailOtp);
  const signupPhoneOtpInput = useOTPInput(state.signupPhoneOtp);
  const forgotPasswordOtpInput = useOTPInput(state.forgotPasswordOtp);

  // ========================================
  // SIGN IN - EMAIL HANDLER
  // ========================================
  const handleSignInEmail = useCallback(
    async (e: React.FormEvent) => {
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
          router.push("/app/dashboard");
        }
      } catch (error) {
        authLogger.error("[SignIn Email] Unexpected error", error);
        actions.setSigninEmailError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      } finally {
        actions.setIsLoading(false);
      }
    },
    [state.signinEmailAddress, state.signinEmailPassword, supabase, actions, router],
  );

  // ========================================
  // SIGN IN - PHONE HANDLER
  // ========================================
  const handleSignInPhone = useCallback(
    async (e: React.FormEvent) => {
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
          router.push("/app/dashboard");
        }
      } catch (error) {
        authLogger.error("[SignIn Phone] Unexpected error", error);
        actions.setSigninPhoneError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      } finally {
        actions.setIsLoading(false);
      }
    },
    [signinPhoneInput.fullValue, state.signinPhonePassword, supabase, actions, router],
  );

  // ========================================
  // SIGN IN - USERNAME HANDLER
  // ========================================
  const handleSignInUsername = useCallback(
    async (e: React.FormEvent) => {
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

        if (!result.success) {
          authLogger.error("[SignIn Username] Authentication failed", {
            error: result.error,
          });
          actions.setSigninUsernameError(
            result.error || "Invalid username or password",
          );
          toast.error("Login failed: " + (result.error || "Invalid credentials"));
        } else {
          authLogger.success("[SignIn Username] Authentication successful");
          toast.success("Login successful!");
          router.push("/app/dashboard");
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

  // Return handlers and hooks for use in components
  return {
    state,
    actions,
    signinPhoneInput,
    signupPhoneInput,
    signupEmailOtpInput,
    signupPhoneOtpInput,
    forgotPasswordOtpInput,
    handlers: {
      handleSignInEmail,
      handleSignInPhone,
      handleSignInUsername,
      // Additional handlers to be added...
    },
  };
}
