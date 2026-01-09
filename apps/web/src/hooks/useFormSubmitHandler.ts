"use client";

/**
 * Form Submission Handler Hook
 * Consolidates duplicated form submission, loading, and error handling logic
 * Used by: SignUpEmailFlow, SignUpPhoneFlow, SignInEmail, PasswordReset, etc.
 */

import { useState, useCallback } from "react";
import { clientLogger } from "@/lib/client-logger";
import { toast } from "sonner";

export interface UseFormSubmitHandlerOptions {
  /** Message shown on successful submission */
  successMessage?: string;
  /** Prefix for logging context (e.g., "SignUpEmailFlow") */
  logPrefix?: string;
  /** Custom error handler (called instead of default toast) */
  onError?: (error: string) => void;
  /** Custom success handler (called in addition to toast) */
  onSuccess?: () => void | Promise<void>;
  /** Whether to show success toast (default: true) */
  showSuccessToast?: boolean;
}

export interface UseFormSubmitHandlerResult {
  /** Call this on form submit */
  handleSubmit: (callback: () => Promise<void>) => (e: React.FormEvent) => Promise<void>;
  /** Whether submission is in progress */
  isLoading: boolean;
  /** Current error message (if any) */
  error: string | null;
  /** Manually set error */
  setError: (error: string | null) => void;
  /** Manually trigger loading state */
  setIsLoading: (loading: boolean) => void;
  /** Reset form state */
  reset: () => void;
}

/**
 * Hook for handling form submission with consistent error handling and loading states
 *
 * @param options Configuration options
 * @returns Form submission handler and state management
 *
 * @example
 * const { handleSubmit, isLoading, error, setError } = useFormSubmitHandler({
 *   successMessage: "Account created successfully!",
 *   logPrefix: "SignUpFlow",
 * });
 *
 * const onSubmit = handleSubmit(async () => {
 *   await signUp(email, password);
 * });
 *
 * return (
 *   <form onSubmit={onSubmit}>
 *     {error && <div className="text-error">{error}</div>}
 *     <button disabled={isLoading}>{isLoading ? "Loading..." : "Submit"}</button>
 *   </form>
 * );
 */
export function useFormSubmitHandler(
  options: UseFormSubmitHandlerOptions = {},
): UseFormSubmitHandlerResult {
  const {
    successMessage = "Success",
    logPrefix = "Form",
    onError,
    onSuccess,
    showSuccessToast = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (callback: () => Promise<void>) =>
      async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
          await callback();

          if (showSuccessToast) {
            toast.success(successMessage);
          }

          if (onSuccess) {
            await onSuccess();
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred";

          // Convert err to Error type for clientLogger
          const logError = err instanceof Error ? err : new Error(String(err));
          clientLogger.error(`[${logPrefix}] Form submission error`, logError);

          if (onError) {
            onError(errorMessage);
          } else {
            setError(errorMessage);
            toast.error(errorMessage);
          }
        } finally {
          setIsLoading(false);
        }
      },
    [logPrefix, onError, onSuccess, successMessage, showSuccessToast],
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    handleSubmit,
    isLoading,
    error,
    setError,
    setIsLoading,
    reset,
  };
}
