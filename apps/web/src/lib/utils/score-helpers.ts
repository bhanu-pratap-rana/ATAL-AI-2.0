/**
 * Centralised score → colour mapping.
 *
 * Four files used to ship their own `getScoreColor()` returning
 * different shapes (`bg-emerald-500`, `text-emerald-600`, bg+text
 * combinations) for the same buckets. PR-65 unified them with
 * explicit-purpose helpers so callers pick the shape that matches
 * the surface (progress bar fill vs. text vs. score badge).
 *
 * PR-66 fix: thresholds were drifted (80/60) from the canonical
 * MASTERY_THRESHOLDS.PASSING=70. A score of 72 now correctly renders
 * green ("mastered") instead of amber. We expose the lower band as
 * a separate `WARNING` constant since `STRUGGLING=50` is what
 * `MASTERY_THRESHOLDS` actually documents.
 */

import { MASTERY_THRESHOLDS } from "@/lib/constants/thresholds";

const SUCCESS = MASTERY_THRESHOLDS.PASSING;
const WARNING = MASTERY_THRESHOLDS.STRUGGLING;

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
