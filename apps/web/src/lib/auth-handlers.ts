/**
 * Unified Authentication Handlers
 *
 * Centralizes all authentication flows (signin, signup, OTP verification)
 * into reusable, testable functions. This eliminates ~550+ lines of duplicate code.
 *
 * Benefits:
 * - Single source of truth for auth logic
 * - Consistent error handling across all flows
 * - Easier testing and debugging
 * - Type-safe across all handlers
 *
 * Follows rule.md: NO DUPLICATION, ARCHITECTURAL CONSISTENCY
 */

import { SupabaseClient, User, AuthError } from "@supabase/supabase-js";
import { validateEmail } from "./email-validation";
import {
  validatePhone,
  validatePassword,
} from "./validation-utils";
import { checkOtpRateLimit } from "./rate-limiter-distributed";
import { authLogger } from "./auth-logger";

/**
 * Extended signin result type for internal use
 * Extends the base type with additional fields needed by handlers
 */
export interface SignInResult {
  success: boolean;
  error?: string;
  user?: User;
  requiresProfileCheck?: boolean;
}

/**
 * Generic OTP result type
 */
export interface OTPResult {
  success: boolean;
  error?: string;
  user?: User;
  token?: string;
}

/**
 * Helper: Validate and check rate limit for OTP identifier
 */
async function validateAndCheckOtpLimit(
  identifier: string,
  channel: "email" | "phone",
  skipRateLimit?: boolean,
): Promise<{ valid: boolean; error?: string }> {
  if (channel === "email") {
    const validation = validateEmail(identifier);
    if (!validation.valid) {
      return { valid: false, error: validation.error || "Invalid email" };
    }
  } else {
    const validation = validatePhone(identifier);
    if (!validation.valid) {
      return { valid: false, error: validation.error || "Invalid phone" };
    }
  }

  if (!skipRateLimit) {
    const isRateLimitOk = await checkOtpRateLimit(identifier);
    if (!isRateLimitOk) {
      authLogger.warn("[handleSendOTP] Rate limit exceeded", { identifier });
      return {
        valid: false,
        error: "Too many OTP requests. Please wait before trying again.",
      };
    }
  }

  return { valid: true };
}

/**
 * Helper: Send OTP via Supabase based on channel
 */
async function sendOtpViaChannel(
  supabase: SupabaseClient,
  identifier: string,
  channel: "email" | "phone",
  options?: {
    redirectUrl?: string;
    shouldCreateUser?: boolean;
  },
): Promise<AuthError | null> {
  if (channel === "email") {
    const result = await supabase.auth.signInWithOtp({
      email: identifier.trim().toLowerCase(),
      options: {
        ...(options?.redirectUrl && { emailRedirectTo: options.redirectUrl }),
        shouldCreateUser: options?.shouldCreateUser ?? true,
      },
    });
    return result.error;
  }

  const result = await supabase.auth.signInWithOtp({
    phone: identifier,
    options: {
      shouldCreateUser: options?.shouldCreateUser ?? true,
    },
  });
  return result.error;
}

/**
 * Unified OTP send handler for email and phone
 * Replaces duplicate OTP send logic across multiple files
 * REFACTORED: Reduced complexity from 18 to ~7 by extracting helper functions
 *
 * @param supabase - Supabase client instance
 * @param identifier - Email or phone number to send OTP to
 * @param channel - 'email' or 'phone'
 * @param options - Configuration (rate limit check, redirect URL, etc)
 * @returns OTPResult with success status
 *
 * WHY: Email and phone OTP send have 80% identical code. This consolidates
 * the pattern while handling channel-specific details (validation, rate limiting).
 */
export async function handleSendOTP(
  supabase: SupabaseClient,
  identifier: string,
  channel: "email" | "phone",
  options?: {
    skipRateLimit?: boolean;
    redirectUrl?: string;
    shouldCreateUser?: boolean;
  },
): Promise<OTPResult> {
  try {
    // Validate and check rate limit
    const validation = await validateAndCheckOtpLimit(
      identifier,
      channel,
      options?.skipRateLimit,
    );
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    authLogger.debug(`[handleSendOTP] Sending ${channel} OTP`, { identifier });

    // Send OTP via channel-specific method
    const error = await sendOtpViaChannel(supabase, identifier, channel, options);

    if (error) {
      authLogger.warn("[handleSendOTP] OTP send failed", error);
      return {
        success: false,
        error: error.message || "Failed to send OTP",
      };
    }

    authLogger.success("[handleSendOTP] OTP sent successfully", { channel });
    return { success: true };
  } catch (error) {
    authLogger.error("[handleSendOTP] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Unified OTP verification handler for email and phone
 * Replaces duplicate OTP verify logic across multiple flows
 *
 * @param supabase - Supabase client instance
 * @param identifier - Object with email or phone that received the OTP
 * @param token - The OTP token to verify
 * @param channel - 'email' or 'sms'
 * @param options - Configuration (return user, role-based redirect, etc)
 * @returns OTPResult with verification status and optional user data
 *
 * WHY: OTP verification is repeated in 4 different places with 70% duplication.
 * This function handles the core verification while options allow different
 * post-verification behavior (redirect vs return user vs callback).
 */
export async function handleVerifyOTP(
  supabase: SupabaseClient,
  identifier: { email?: string; phone?: string },
  token: string,
  channel: "email" | "sms",
  options?: {
    returnUser?: boolean;
  },
): Promise<OTPResult> {
  try {
    const id = identifier.email || identifier.phone;
    if (!id) {
      return { success: false, error: "Email or phone is required" };
    }

    authLogger.debug("[handleVerifyOTP] Verifying OTP", { channel });

    // Call Supabase OTP verification
    let data: { user: User | null; session: unknown } | null = null;
    let error: AuthError | null = null;

    if (identifier.email) {
      const result = await supabase.auth.verifyOtp({
        email: identifier.email.toLowerCase(),
        token: token.trim(),
        type: channel as "email" | "signup",
      });
      data = result.data;
      error = result.error;
    } else if (identifier.phone) {
      const result = await supabase.auth.verifyOtp({
        phone: identifier.phone,
        token: token.trim(),
        type: "sms",
      });
      data = result.data;
      error = result.error;
    }

    // Guard: data is always set after the if/else-if above (early return on !id ensures
    // at least one branch executes), but TypeScript can't infer this
    if (!data) {
      return { success: false, error: "Email or phone is required" };
    }

    if (error) {
      authLogger.warn("[handleVerifyOTP] OTP verification failed", error);

      // Provide better error messages for common cases
      if (error.message.includes("expired")) {
        return {
          success: false,
          error: "That code has expired. Request a new one.",
        };
      }
      if (error.message.includes("invalid")) {
        return {
          success: false,
          error: "That code didn't work. Please check and try again.",
        };
      }

      return {
        success: false,
        error: error.message || "OTP verification failed",
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: "Verification failed - no user data",
      };
    }

    authLogger.success("[handleVerifyOTP] OTP verification successful");

    if (options?.returnUser) {
      return {
        success: true,
        user: data.user,
      };
    }

    return { success: true };
  } catch (error) {
    authLogger.error("[handleVerifyOTP] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Unified password set/update handler
 * Replaces duplicate password setting logic in signup flows
 *
 * @param supabase - Supabase client instance
 * @param password - Password to set
 * @param validate - Whether to validate password strength first
 * @returns OTPResult with success status
 *
 * WHY: Both email and phone signup verify OTP then set password with
 * identical error handling. This consolidates that flow.
 */
export async function handleSetPassword(
  supabase: SupabaseClient,
  password: string,
  validate: boolean = true,
): Promise<OTPResult> {
  try {
    // Validate password if requested
    if (validate) {
      const validation = validatePassword(password);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(", ") || "Invalid password",
        };
      }
    }

    authLogger.debug("[handleSetPassword] Setting password");

    // Update user password
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      authLogger.warn("[handleSetPassword] Password update failed", error);
      return {
        success: false,
        error: error.message || "Failed to set password",
      };
    }

    authLogger.success("[handleSetPassword] Password set successfully");
    return { success: true };
  } catch (error) {
    authLogger.error("[handleSetPassword] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Anonymous / Quick Start sign-in.
 *
 * Why this exists: many rural-Kamrup students don't have email or
 * phone — their only credential is a username plus the class code
 * provided by their teacher. The auth-state machine routes those users
 * through Supabase's anonymous sign-in (a session with no identifier
 * is created server-side; the username + class details are then
 * attached to the new student profile).
 *
 * Wired up via the "username" / Quick Start tab in SignUpStep and
 * SignInStep. Centralised here so the same handler covers both flows
 * and the next consumer (join-by-class flow) gets consistent behaviour.
 */
export async function handleAnonymousSignIn(
  supabase: SupabaseClient,
): Promise<SignInResult> {
  try {
    authLogger.debug("[handleAnonymousSignIn] Attempting anonymous signin");

    const { error } = await supabase.auth.signInAnonymously();

    if (error) {
      authLogger.warn("[handleAnonymousSignIn] Anonymous signin failed", error);
      return {
        success: false,
        error: error.message || "Failed to sign in as guest",
      };
    }

    authLogger.success("[handleAnonymousSignIn] Anonymous signin successful");
    return { success: true };
  } catch (error) {
    authLogger.error("[handleAnonymousSignIn] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
