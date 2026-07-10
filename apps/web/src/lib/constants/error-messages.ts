/**
 * Centralized Error Messages
 *
 * Single source of truth for all error messages across the application.
 * Eliminates message duplication and ensures consistency.
 *
 * Rule.md Compliance:
 * - Centralized strings for easy maintenance
 * - Consistent error messaging across all operations
 * - Easy to update messages globally
 * - User-friendly error text
 */

/**
 * Authentication and session errors
 */
export const AUTH_ERRORS = {
  UNAUTHORIZED: "You are not authorized to perform this action",
  SESSION_EXPIRED: "Your session has expired. Please log in again",
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_NOT_FOUND: "User not found",
  EMAIL_ALREADY_EXISTS: "This email is already registered",
  PHONE_ALREADY_EXISTS: "This phone number is already registered",
} as const;

/**
 * Rate limiting errors
 */
export const RATE_LIMIT_ERRORS = {
  TOO_MANY_REQUESTS: "Too many requests. Please try again later.",
  WAIT_BEFORE_RETRY: "Too many requests. Please wait before trying again.",
  WAIT_FEW_MINUTES: "Too many requests. Please wait a few minutes and try again.",
  AI_RATE_LIMIT: "Too many requests. Please wait before asking another question.",
  ESSAY_RATE_LIMIT: "Too many requests. Please wait before submitting another essay.",
  QUESTIONS_RATE_LIMIT: "Too many requests. Please wait before generating more questions.",
  SUMMARY_RATE_LIMIT: "Too many requests. Please wait before summarizing more content.",
} as const;

