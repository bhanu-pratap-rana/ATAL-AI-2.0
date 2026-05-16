/**
 * Centralised score → colour mapping.
 *
 * Four files used to ship their own `getScoreColor()` and they all
 * returned different shapes (`bg-emerald-500`, `text-emerald-600`,
 * bg+text combinations) for the same score buckets. PR-65 unifies them
 * with explicit-purpose helpers so callers pick the shape that
 * matches the surface (progress bar fill vs. text vs. score badge).
 *
 * Thresholds: ≥80 = success, ≥60 = warning, <60 = error.
 * These match `MASTERY_THRESHOLDS` from lib/constants/thresholds.
 */

const SUCCESS = 80;
const WARNING = 60;

/** Background colour for filled bars / dots / chips. */
export function getScoreBgColor(score: number): string {
  if (score >= SUCCESS) return "bg-emerald-500";
  if (score >= WARNING) return "bg-amber-400";
  return "bg-error";
}

/** Foreground/text colour for the score number itself. */
export function getScoreTextColor(score: number): string {
  if (score >= SUCCESS) return "text-emerald-600";
  if (score >= WARNING) return "text-amber-600";
  return "text-error";
}

/**
 * Badge-style classes — soft tinted background + dark text — for "23%"
 * pill chips next to a row. Returns a class string with both bg and text.
 */
export function getScoreBadgeClasses(score: number): string {
  if (score >= SUCCESS) return "bg-emerald-50 text-emerald-700";
  if (score >= WARNING) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

/** Short label for a score bucket — used in badges/lists. */
export function getScoreLabel(score: number): "Excellent" | "Good" | "Needs work" {
  if (score >= SUCCESS) return "Excellent";
  if (score >= WARNING) return "Good";
  return "Needs work";
}
