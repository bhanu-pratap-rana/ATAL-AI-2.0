/**
 * Action Error Handler Wrapper
 *
 * Eliminates duplicate error handling logic across 158 server action blocks.
 * Provides consistent error logging and response formatting.
 *
 * Rule.md Compliance:
 * - DRY: Single source of truth for error handling
 * - Consistent error logging across all actions
 * - Type-safe return format
 * - Fail-closed pattern for security-sensitive operations
 *
 * Usage:
 * const result = await wrapActionError(
 *   async () => {
 *     // your action logic here
 *     return { success: true, data: ... }
 *   },
 *   '[functionName] Description'
 * )
 */

import { authLogger } from './auth-logger'

/**
 * Standard action response format
 */
export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Wraps async action functions with consistent error handling
 *
 * @param action - The async function to execute
 * @param context - Log context (e.g., '[functionName] Description')
 * @param defaultError - Default error message if extraction fails
 * @returns Standardized ActionResponse
 */
export async function wrapActionError<T = unknown>(
  action: () => Promise<T | ActionResponse<T>>,
  context: string,
  defaultError = 'An error occurred'
): Promise<ActionResponse<T>> {
  try {
    const result = await action()

    // If result is already an ActionResponse, return it as-is
    if (result && typeof result === 'object' && 'success' in result) {
      return result as ActionResponse<T>
    }

    // Otherwise wrap successful data
    return {
      success: true,
      data: result as T,
    }
  } catch (error) {
    // Log error for debugging
    authLogger.error(context, error)

    // Extract error message
    const errorMessage = error instanceof Error ? error.message : defaultError

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Wraps action functions with context and optional validation
 *
 * @param action - The async function to execute
 * @param context - Log context (e.g., '[functionName] Description')
 * @param validate - Optional validation function
 * @returns Standardized ActionResponse
 */
export async function wrapAction<T = unknown>(
  action: () => Promise<T>,
  context: string,
  validate?: (data: T) => boolean | string
): Promise<ActionResponse<T>> {
  return wrapActionError(
    async () => {
      const result = await action()

      // Run validation if provided
      if (validate) {
        const validationResult = validate(result)
        if (validationResult !== true) {
          throw new Error(typeof validationResult === 'string' ? validationResult : 'Validation failed')
        }
      }

      return result
    },
    context
  )
}

/**
 * Wraps mutation actions (create/update/delete) with consistent handling
 *
 * @param action - The async function to execute
 * @param context - Log context (e.g., '[deleteUser] User deletion')
 * @param successMessage - Optional message to include on success
 * @returns Standardized ActionResponse
 */
export async function wrapMutation<T = unknown>(
  action: () => Promise<T>,
  context: string,
  successMessage?: string
): Promise<ActionResponse<T>> {
  const result = await wrapActionError(action, context)

  if (result.success && successMessage) {
    // Log success at debug level
    authLogger.debug(`${context} - ${successMessage}`)
  }

  return result
}
