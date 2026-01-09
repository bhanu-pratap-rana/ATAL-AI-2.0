"use client";

/**
 * Form Field Error Component
 * Reusable error and helper text renderer
 * Consolidates duplicated error/helper rendering logic from multiple input components
 */

interface FormFieldErrorProps {
  /**
   * Unique identifier for the field (used in aria attributes)
   */
  id: string;

  /**
   * Error message to display (takes precedence over helperText)
   */
  error?: string;

  /**
   * Helper text to display when there's no error
   */
  helperText?: string;
}

/**
 * Renders error or helper text for form fields
 * Used by EmailInput, PasswordInput, OTPInput, PhoneInputWithPrefix, etc.
 *
 * @example
 * <FormFieldError id="email" error={emailError} helperText="Enter your email address" />
 */
export function FormFieldError({
  id,
  error,
  helperText,
}: FormFieldErrorProps) {
  if (error) {
    return (
      <p id={`${id}-error`} className="text-sm text-error" role="alert">
        {error}
      </p>
    );
  }

  if (helperText) {
    return (
      <p id={`${id}-helper`} className="text-xs text-text-secondary">
        {helperText}
      </p>
    );
  }

  return null;
}
