"use client";

/**
 * Async Operation Handler Hook
 * Consolidates duplicated async operation, loading, and error handling logic
 * Used by: Admin actions, data mutations, async operations, etc.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/lib/client-logger";

export interface UseAsyncOperationOptions {
  /** Success message shown on successful completion */
  successMessage?: string;
  /** Prefix for logging context */
  logPrefix?: string;
  /** Custom error handler (instead of default toast) */
  onError?: (error: string) => void;
  /** Custom success handler (in addition to toast) */
  onSuccess?: () => void | Promise<void>;
  /** Whether to show success toast (default: true) */
  showSuccessToast?: boolean;
}

export interface UseAsyncOperationResult {
  /** Execute async operation */
  execute: <T>(operation: () => Promise<T>) => Promise<T | null>;
  /** Whether operation is in progress */
  isLoading: boolean;
  /** Current error message (if any) */
  error: string | null;
  /** Reset error state */
  resetError: () => void;
  /** Reset all state */
  reset: () => void;
}

/**
 * Hook for handling async operations with consistent error handling and loading states
 *
 * @param options Configuration options
 * @returns Operation executor and state management
 *
 * @example
 * const { execute, isLoading, error } = useAsyncOperation({
 *   successMessage: "Admin account deleted",
 *   logPrefix: "AdminActions",
 * });
 *
 * const handleDelete = async () => {
 *   const result = await execute(() => deleteAdminAccount(adminId));
 *   if (result) {
 *     // Navigate or refresh
 *   }
 * };
 */
export function useAsyncOperation(
  options: UseAsyncOperationOptions = {},
): UseAsyncOperationResult {
  const {
    successMessage = "Operation completed",
    logPrefix = "AsyncOperation",
    onError,
    onSuccess,
    showSuccessToast = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await operation();

        if (showSuccessToast) {
          toast.success(successMessage);
        }

        if (onSuccess) {
          await onSuccess();
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";

        const logError = err instanceof Error ? err : new Error(String(err));
        clientLogger.error(`[${logPrefix}] Operation failed`, logError);

        if (onError) {
          onError(errorMessage);
        } else {
          setError(errorMessage);
          toast.error(errorMessage);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [logPrefix, onError, onSuccess, successMessage, showSuccessToast],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    resetError,
    reset,
  };
}
