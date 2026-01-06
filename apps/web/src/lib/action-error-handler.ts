/**
 * Server Action Error Handling Utilities
 * Centralizes error handling patterns used across all action files
 */

import { z } from "zod";
import { authLogger } from "./auth-logger";

/**
 * Standard response type for all server actions
 */
export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Handle Zod validation errors in a consistent way
 * Returns a standardized error response
 */
export function handleZodError(error: unknown): ActionResponse {
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return {
      success: false,
      error: firstError?.message || "Invalid input",
    };
  }
  throw error; // Re-throw if not a ZodError
}

/**
 * Handle unexpected errors with proper logging
 * Returns a standardized error response
 */
export function handleUnexpectedError(
  error: unknown,
  actionName: string,
  context?: Record<string, unknown>,
): ActionResponse {
  authLogger.error(`[${actionName}] Unexpected error`, {
    error: error instanceof Error ? error.message : String(error),
    ...context,
  });

  return {
    success: false,
    error: "An unexpected error occurred. Please try again.",
  };
}

/**
 * Handle database operation errors
 */
export function handleDatabaseError(
  error: unknown,
  actionName: string,
  operation: string,
): ActionResponse {
  authLogger.error(`[${actionName}] Database error during ${operation}`, {
    error: error instanceof Error ? error.message : String(error),
  });

  return {
    success: false,
    error: "Database operation failed. Please try again.",
  };
}

/**
 * Handle authentication errors
 */
export function handleAuthError(reason: string): ActionResponse {
  return {
    success: false,
    error: reason || "Authentication failed. Please login again.",
  };
}

/**
 * Handle rate limit errors
 */
export function handleRateLimitError(
  actionName: string,
  userId: string,
): ActionResponse {
  authLogger.warn(`[${actionName}] Rate limit exceeded`, { userId });

  return {
    success: false,
    error: "Too many requests. Please try again later.",
  };
}

/**
 * Handle validation errors (non-Zod)
 */
export function handleValidationError(message: string): ActionResponse {
  return {
    success: false,
    error: message,
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(data?: T): ActionResponse<T> {
  return {
    success: true,
    data,
  };
}
