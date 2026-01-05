/**
 * Form utility functions for common patterns
 * Reduces duplication across form components
 */

/**
 * Get the aria-describedby ID for form inputs based on error/helper text priority
 * Error messages take priority over helper text
 */
export function getInputDescriptionId(
  fieldId: string,
  error?: string,
  helperText?: string,
): string | undefined {
  if (error) return `${fieldId}-error`;
  if (helperText) return `${fieldId}-helper`;
  return undefined;
}

/**
 * Get language label for AI service prompts
 * Maps language codes to display names
 */
export function getLanguageLabelForAI(language: string): string {
  if (language === "hi") return "Hindi";
  if (language === "as") return "Assamese";
  return "English";
}

/**
 * Get confidence level classification from test score
 * Used for student mastery tracking
 */
export function getConfidenceLevel(
  score: number,
): "high" | "medium" | "low" {
  if (score >= 90) return "high";
  if (score >= 70) return "medium";
  return "low";
}

/**
 * Get masked context for error logging
 * Handles type checking and conditional data masking
 */
export function getMaskedContext(
  context: unknown,
  maskFn?: (data: unknown) => unknown,
): unknown {
  if (context instanceof Error) return context;
  if (context && maskFn) return maskFn(context);
  return undefined;
}

/**
 * Create error handler function that extracts error messages
 * For use in form submission handlers
 */
export function createErrorHandler(
  onError?: (error: string) => void,
): ((error: unknown) => void) | undefined {
  if (!onError) return undefined;
  return (error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error);
    onError(message);
  };
}
