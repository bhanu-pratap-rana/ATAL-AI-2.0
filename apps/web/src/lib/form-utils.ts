/**
 * Form utility functions for common patterns
 * Reduces duplication across form components
 *
 * CLEANUP: Removed unused exports (Phase 5 code quality scan):
 * - getConfidenceLevel: Duplicate of thresholds.ts - use getConfidenceLevel from there
 * - createErrorHandler: Never imported by any consumer
 * - createFieldResetters: Never imported by any consumer
 * - parseApiError: Never imported by any consumer
 */

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
