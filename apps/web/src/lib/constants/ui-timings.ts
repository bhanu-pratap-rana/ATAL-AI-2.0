/**
 * UI Timing Constants
 *
 * Centralized timeout and delay values for consistent UX.
 * Prevents hardcoded magic numbers scattered across components.
 *
 * Rule.md Compliance:
 * - Single source of truth for UI timing
 * - Easy to modify and test
 * - Type-safe
 */

/**
 * Clipboard copy feedback timing
 */
export const CLIPBOARD_TIMING = {
  /** How long to show "Copied!" feedback */
  successFeedback: 2000,
} as const;

/**
 * Form submission feedback timing
 */
export const FORM_TIMING = {
  /** Delay before callback after successful form submission */
  successCallback: 1500,
  /** Delay before showing next steps after form success */
  nextStepsDelay: 2000,
} as const;

/**
 * Assessment-related timing
 */
export const ASSESSMENT_TIMING = {
  /** Threshold for rapid response warning (ms) */
  rapidResponseThreshold: 5000,
  /** How long to show rapid response warning */
  rapidWarningDuration: 3000,
} as const;

/**
 * Profile editor timing
 */
export const PROFILE_TIMING = {
  /** How long to show success message */
  successMessage: 3000,
} as const;

