'use server'

/**
 * Centralized Action Result Types
 *
 * Single source of truth for all server action return types.
 * Ensures consistent error handling across the application.
 *
 * @module action-types
 */

/**
 * Standard result type for all server actions
 *
 * @template T - The type of data returned on success
 *
 * @example
 * // Success case
 * return { success: true, data: { userId: '123' } }
 *
 * @example
 * // Error case
 * return { success: false, error: 'Validation failed' }
 *
 * @example
 * // Success with message
 * return { success: true, data: user, message: 'User created successfully' }
 */
export type ActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: ActionErrorCode }

/**
 * Standard error codes for categorizing action failures
 * Helps with client-side error handling and analytics
 */
export type ActionErrorCode =
  | 'UNAUTHORIZED'       // User not authenticated
  | 'FORBIDDEN'          // User lacks permission
  | 'NOT_FOUND'          // Resource not found
  | 'VALIDATION_ERROR'   // Input validation failed
  | 'RATE_LIMITED'       // Too many requests
  | 'CONFLICT'           // Resource already exists
  | 'INTERNAL_ERROR'     // Unexpected server error

/**
 * Helper to create a success response
 *
 * @template T - The type of data being returned
 * @param data - The data to return
 * @param message - Optional success message
 * @returns ActionResult with success: true
 *
 * @example
 * return successResponse({ userId: '123' }, 'User created')
 */
export function successResponse<T>(data: T, message?: string): ActionResult<T> {
  return { success: true, data, message }
}

/**
 * Helper to create an error response
 *
 * @param error - Error message to display
 * @param code - Optional error code for categorization
 * @returns ActionResult with success: false
 *
 * @example
 * return errorResponse('Email already exists', 'CONFLICT')
 */
export function errorResponse(error: string, code?: ActionErrorCode): ActionResult<never> {
  return { success: false, error, code }
}

/**
 * Helper to create an unauthorized error response
 *
 * @param message - Optional custom message (defaults to 'Authentication required')
 * @returns ActionResult with success: false and UNAUTHORIZED code
 */
export function unauthorizedResponse(message = 'Authentication required'): ActionResult<never> {
  return { success: false, error: message, code: 'UNAUTHORIZED' }
}

/**
 * Helper to create a forbidden error response
 *
 * @param message - Optional custom message (defaults to 'Permission denied')
 * @returns ActionResult with success: false and FORBIDDEN code
 */
export function forbiddenResponse(message = 'Permission denied'): ActionResult<never> {
  return { success: false, error: message, code: 'FORBIDDEN' }
}

/**
 * Helper to create a validation error response
 *
 * @param message - Validation error message
 * @returns ActionResult with success: false and VALIDATION_ERROR code
 */
export function validationErrorResponse(message: string): ActionResult<never> {
  return { success: false, error: message, code: 'VALIDATION_ERROR' }
}

/**
 * Helper to create a not found error response
 *
 * @param resource - Name of the resource that wasn't found
 * @returns ActionResult with success: false and NOT_FOUND code
 */
export function notFoundResponse(resource: string): ActionResult<never> {
  return { success: false, error: `${resource} not found`, code: 'NOT_FOUND' }
}

/**
 * Helper to create an internal error response
 * Use this for unexpected errors that should be logged
 *
 * @param message - Optional custom message (defaults to 'An unexpected error occurred')
 * @returns ActionResult with success: false and INTERNAL_ERROR code
 */
export function internalErrorResponse(message = 'An unexpected error occurred'): ActionResult<never> {
  return { success: false, error: message, code: 'INTERNAL_ERROR' }
}

/**
 * Helper to create a rate limit error response
 *
 * @param message - Optional custom message
 * @returns ActionResult with success: false and RATE_LIMITED code
 */
export function rateLimitResponse(message = 'Too many requests. Please try again later.'): ActionResult<never> {
  return { success: false, error: message, code: 'RATE_LIMITED' }
}
