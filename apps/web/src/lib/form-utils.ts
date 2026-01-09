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
export function getConfidenceLevel(score: number): "high" | "medium" | "low" {
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
    const message = error instanceof Error ? error.message : String(error);
    onError(message);
  };
}

/**
 * Helper to capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get initial value for a form field type
 */
function getInitialValue(fieldName: string): unknown {
  if (fieldName.includes("error")) return null;
  if (fieldName.includes("loading")) return false;
  if (fieldName.includes("count")) return 0;
  if (fieldName.includes("list") || fieldName.includes("items")) return [];
  return "";
}

/**
 * Create field reset functions for a component state
 * Consolidates duplicated reset logic from multiple auth/form hooks
 *
 * @param setState State setter function
 * @param fieldGroups Map of group name to field names to reset
 * @returns Object with resetXxx functions
 *
 * @example
 * const resetters = createFieldResetters(setState, {
 *   email: ['email', 'emailError', 'emailPassword'],
 *   phone: ['phoneNumber', 'phoneError', 'phonePassword'],
 * });
 *
 * // Now use:
 * resetters.resetEmail();
 * resetters.resetPhone();
 */
export function createFieldResetters<T extends Record<string, any>>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  fieldGroups: Record<string, (keyof T)[]>,
): Record<string, () => void> {
  const resetters: Record<string, () => void> = {};

  Object.entries(fieldGroups).forEach(([groupName, fields]) => {
    resetters[`reset${capitalize(groupName)}`] = () => {
      setState((prev) => {
        const updates = { ...prev };
        fields.forEach((field) => {
          (updates as any)[field] = getInitialValue(String(field));
        });
        return updates;
      });
    };
  });

  return resetters;
}

/**
 * Parse API error message to user-friendly message
 * Used across server actions for consistent error handling
 *
 * @param errorMessage Error message from API or catch block
 * @returns User-friendly error message
 */
export function parseApiError(errorMessage: string): string {
  // Rate limiting
  if (errorMessage.toLowerCase().includes("rate limit")) {
    return "Too many requests. Please wait a few minutes and try again.";
  }

  // Authentication errors
  if (errorMessage.toLowerCase().includes("invalid credentials")) {
    return "Invalid email or password. Please try again.";
  }

  if (errorMessage.toLowerCase().includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (errorMessage.toLowerCase().includes("invalid phone")) {
    return "Please enter a valid phone number.";
  }

  // Validation errors
  if (errorMessage.toLowerCase().includes("already exists")) {
    return "This account already exists. Please sign in instead.";
  }

  if (errorMessage.toLowerCase().includes("not found")) {
    return "The requested resource could not be found.";
  }

  // Network errors
  if (
    errorMessage.toLowerCase().includes("network") ||
    errorMessage.toLowerCase().includes("fetch")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  // Default: return original message if it's concise, else generic
  if (errorMessage.length > 100) {
    return "An error occurred. Please try again.";
  }

  return errorMessage;
}
