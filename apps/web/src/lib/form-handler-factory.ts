/**
 * Factory functions for creating standard form handlers
 * Eliminates the repeated 8-step form submission pattern found 18+ times in auth pages
 *
 * Standard Pattern:
 * 1. Prevent default
 * 2. Set loading: true
 * 3. Clear error
 * 4. Validate input(s)
 * 5. If invalid: set error, return
 * 6. Execute async operation in try/catch
 * 7. Handle error response
 * 8. Finally: Set loading: false
 *
 * These factories encapsulate this entire pattern
 */

import { ValidationResult } from '@/hooks/useValidationHandler'
import { validateEmail, validatePassword, validatePasswordMatch } from '@/lib/validation-utils'
import { createErrorHandler } from '@/lib/form-utils'

/**
 * Handler state for form operations
 */
export interface FormHandlerState {
  isLoading: boolean
  error: string | null
}

/**
 * Response types for form submission handlers
 */
export interface EmailSubmitResponse {
  success: boolean
  error?: string
  message?: string
}

export interface PasswordSubmitResponse {
  success: boolean
  error?: string
  message?: string
}

/**
 * Options for creating a form handler
 */
export interface FormHandlerOptions<T = void> {
  /** Validation function(s) to run before executing the handler */
  validate: () => ValidationResult | Promise<ValidationResult> | ValidationResult[]
  /** The main async operation to perform */
  onSubmit: () => Promise<T>
  /** Called when validation fails */
  onValidationError?: (error: string) => void
  /** Called when submission fails */
  onSubmitError?: (error: unknown) => void
  /** Called when submission succeeds */
  onSuccess?: (result: T) => void
  /** Called in finally block */
  onFinally?: () => void
}

/**
 * Result from executing a form handler
 */
export interface FormHandlerResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Creates a standard form submission handler that manages validation and loading
 *
 * Handles the complete 8-step form submission pattern in a single, reusable function
 *
 * @example
 * ```typescript
 * const handleEmailSubmit = createFormHandler({
 *   validate: () => validateEmail(email),
 *   onSubmit: async () => {
 *     return await requestOtp(email)
 *   },
 *   onValidationError: (error) => setEmailError(error),
 *   onSubmitError: (error) => console.error('Failed:', error),
 *   onSuccess: () => setEmailSent(true),
 * })
 *
 * // Use in form:
 * <button onClick={(e) => handleEmailSubmit(e, setIsLoading)}>
 *   Submit
 * </button>
 * ```
 */
export function createFormHandler<T = void>(options: FormHandlerOptions<T>) {
  return async (
    e: React.FormEvent | undefined,
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void
  ): Promise<FormHandlerResult<T>> => {
    // Step 1: Prevent default form submission
    if (e) {
      e.preventDefault()
    }

    // Step 2: Set loading
    setLoading(true)

    // Step 3: Clear previous error
    setError(null)

    try {
      // Step 4: Validate input(s)
      const validationResults = Array.isArray(options.validate)
        ? options.validate
        : [await Promise.resolve(options.validate())]

      // Step 5: Check if any validation failed
      for (const result of validationResults) {
        if (!result.valid) {
          const errorMessage = Array.isArray(result.error)
            ? result.error.join(', ')
            : result.error || 'Validation failed'

          setError(errorMessage)
          options.onValidationError?.(errorMessage)

          return {
            success: false,
            error: errorMessage,
          }
        }
      }

      // Step 6 & 7: Execute async operation (try/catch)
      const result = await options.onSubmit()

      // Success
      options.onSuccess?.(result)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      // Step 7: Handle error
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      options.onSubmitError?.(error)

      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      // Step 8: Stop loading
      setLoading(false)
      options.onFinally?.()
    }
  }
}

/**
 * Creates a reusable email validation + submission handler
 *
 * @example
 * ```typescript
 * const handleEmailOtp = createEmailHandler(
 *   email,
 *   (email) => requestOtp(email),
 *   (error) => setEmailError(error),
 *   () => setOtpSent(true)
 * )
 * ```
 */
export function createEmailHandler(
  email: string,
  submitFn: (email: string) => Promise<EmailSubmitResponse>,
  onError?: (error: string) => void,
  onSuccess?: () => void
) {
  return createFormHandler({
    validate: () => validateEmail(email),
    onSubmit: () => submitFn(email),
    onValidationError: onError,
    onSubmitError: createErrorHandler(onError),
    onSuccess,
  })
}

/**
 * Creates a reusable password validation + submission handler
 *
 * @example
 * ```typescript
 * const handlePasswordReset = createPasswordHandler(
 *   newPassword,
 *   passwordConfirm,
 *   (pwd) => resetPassword(pwd),
 *   (error) => setPasswordError(error),
 *   () => router.push('/login')
 * )
 * ```
 */
export function createPasswordHandler(
  password: string,
  passwordConfirm: string,
  submitFn: (password: string) => Promise<PasswordSubmitResponse>,
  onError?: (error: string) => void,
  onSuccess?: () => void
) {
  return createFormHandler({
    validate: () => [validatePassword(password), validatePasswordMatch(password, passwordConfirm)],
    onSubmit: () => submitFn(password),
    onValidationError: onError,
    onSubmitError: createErrorHandler(onError),
    onSuccess,
  })
}

/**
 * Reduces a validation result to a single error string
 * Handles both single errors and arrays of errors
 */
export function getErrorMessage(result: ValidationResult | ValidationResult[]): string {
  if (Array.isArray(result)) {
    // Multiple validation results
    for (const r of result) {
      if (!r.valid) {
        return getErrorMessage(r)
      }
    }
    return ''
  }

  // Single validation result
  if (Array.isArray(result.error)) {
    return result.error.join(', ')
  }

  if (Array.isArray(result.errors)) {
    return result.errors.join(', ')
  }

  return result.error || 'Validation failed'
}

/**
 * Higher-order function to create a handler wrapper with standard error handling
 *
 * @example
 * ```typescript
 * const withErrorHandling = createHandlerWrapper(
 *   (error) => toast.error(error),
 *   (msg) => toast.success(msg)
 * )
 *
 * const myHandler = withErrorHandling(async () => {
 *   await someAsyncOperation()
 *   return 'Success!'
 * })
 * ```
 */
export function createHandlerWrapper(
  onError?: (error: string) => void,
  onSuccess?: (message: string) => void
) {
  return async (
    handler: () => Promise<string | void>,
    setLoading: (loading: boolean) => void
  ): Promise<boolean> => {
    setLoading(true)
    try {
      const result = await handler()
      if (result) {
        onSuccess?.(result)
      }
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      onError?.(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }
}
