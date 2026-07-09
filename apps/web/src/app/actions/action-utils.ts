/**
 * Shared utilities for server actions
 * Consolidates common patterns like Zod validation error handling
 */

import { authLogger } from "@/lib/auth-logger";

/**
 * Standard server action result type
 * All server actions should return this structure for consistent error handling
 */
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper: Handle unexpected errors in server actions
 * Logs error and returns generic message for security
 */
export function handleActionError(
  context: string,
  error: unknown,
): ActionResult {
  authLogger.error(`[${context}] Unexpected error`, error);
  return {
    success: false,
    error: "An unexpected error occurred",
  };
}
