/**
 * Ternary Utilities - Extract Complex Conditional Logic
 *
 * Replaces nested ternary operators with readable helper functions.
 * Improves code readability and maintainability per rule.md.
 *
 * Rule.md Compliance:
 * - No nested ternaries in component render logic
 * - Dedicated utility functions for conditional rendering
 * - Centralized logic for easier maintenance
 *
 * Usage:
 * const fontClass = getFontClass('hi')  // Instead of: language === 'hi' ? 'font-devanagari' : ...
 */

/**
 * Language to font class mapping
 * Replaces nested ternary: language === 'hi' ? 'font-devanagari' : language === 'as' ? 'font-bengali' : ''
 */
export function getFontClass(language: string | null): string {
  switch (language) {
    case "hi":
      return "font-devanagari";
    case "as":
      return "font-bengali";
    default:
      return "";
  }
}

/**
 * Status badge color mapping
 * Used for question status, assessment status, etc.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
    case "mastered":
      return "bg-success text-white";
    case "in_progress":
    case "attempted":
      return "bg-info text-white";
    case "pending":
    case "not_started":
      return "bg-border text-text-secondary";
    case "failed":
    case "locked":
      return "bg-error/10 text-error";
    default:
      return "bg-muted text-text-secondary";
  }
}

/**
 * Assessment progress label
 */
export function getProgressLabel(progress: number): string {
  if (progress === 0) return "Not started";
  if (progress < 25) return "Just started";
  if (progress < 50) return "Halfway there";
  if (progress < 75) return "Almost done";
  if (progress < 100) return "Nearly complete";
  return "Complete";
}

/**
 * Button variant based on state
 */
export function getButtonVariant(
  isLoading: boolean,
  isDisabled: boolean,
  hasError: boolean,
): "default" | "outline" | "secondary" | "destructive" {
  if (isLoading) return "secondary";
  if (isDisabled) return "outline";
  if (hasError) return "destructive";
  return "default";
}

/**
 * Button text based on loading state
 */
export function getButtonText(
  isLoading: boolean,
  loadingText: string,
  defaultText: string,
): string {
  return isLoading ? loadingText : defaultText;
}

/**
 * Opacity class based on disabled state
 */
export function getOpacityClass(isDisabled: boolean): string {
  return isDisabled
    ? "opacity-50 cursor-not-allowed"
    : "opacity-100 cursor-pointer";
}

/**
 * Error message visibility
 */
export function shouldShowError(
  error: string | null,
  touched: boolean,
): boolean {
  return !!error && touched;
}

/**
 * Input border color based on validation
 */
export function getInputBorderClass(
  hasError: boolean,
  isFocused: boolean,
  isValid: boolean,
): string {
  if (hasError) return "border-error focus:border-error focus:ring-error/50";
  if (isFocused)
    return "border-primary focus:border-primary focus:ring-primary/50";
  if (isValid) return "border-success";
  return "border-border";
}

/**
 * Icon based on result status
 */
export function getResultIcon(
  status: "success" | "error" | "warning" | "info",
): string {
  switch (status) {
    case "success":
      return "✓";
    case "error":
      return "✕";
    case "warning":
      return "⚠";
    case "info":
      return "ℹ";
  }
}

/**
 * Mastery level label
 */
export function getMasteryLabel(score: number): string {
  if (score >= 90) return "Expert";
  if (score >= 75) return "Proficient";
  if (score >= 60) return "Developing";
  if (score >= 40) return "Emerging";
  return "Beginning";
}

/**
 * Score color based on performance
 */
export function getScoreColor(score: number | null): string {
  if (score === null) return "bg-surface text-text-tertiary";
  if (score >= 85) return "bg-success/10 text-success";
  if (score >= 70) return "bg-info/10 text-info";
  if (score >= 50) return "bg-warning/10 text-warning";
  return "bg-error/10 text-error";
}

/**
 * Role display name
 *
 * Re-exported from role-utils for backward compatibility.
 * Use `@/lib/auth/role-utils` as the authoritative source.
 *
 * @see {@link @/lib/auth/role-utils#getRoleDisplayName} for the canonical implementation
 */
export { getRoleDisplayName } from "@/lib/auth/role-utils";

/**
 * Permission label
 */
export function getPermissionLabel(permission: string): string {
  switch (permission) {
    case "create":
      return "Can Create";
    case "read":
      return "Can View";
    case "update":
      return "Can Edit";
    case "delete":
      return "Can Delete";
    case "admin":
      return "Full Access";
    default:
      return permission;
  }
}
