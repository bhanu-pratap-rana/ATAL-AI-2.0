/**
 * Server Action Error Handling Utilities
 * Centralizes error handling patterns used across all action files.
 *
 * PR-67: narrowed the return type to `{ success: false; error: string }`.
 * Was `ActionResponse<unknown>` with `success: boolean` which broke
 * discriminated-union narrowing in callers — they couldn't combine
 * `handleZodError(error)` with their own happy-path
 * `{ success: true; ... }` returns under a strict
 * `Promise<{success:true; ...} | {success:false; error}>` signature.
 */

import { z } from "zod";

export interface ActionErrorResponse {
  readonly success: false;
  readonly error: string;
}

/**
 * Handle Zod validation errors in a consistent way.
 * Returns a standardized error response. Re-throws if not a ZodError.
 */
export function handleZodError(error: unknown): ActionErrorResponse {
  if (error instanceof z.ZodError) {
    const firstError = error.issues[0];
    return {
      success: false,
      error: firstError?.message || "Invalid input",
    };
  }
  throw error;
}

