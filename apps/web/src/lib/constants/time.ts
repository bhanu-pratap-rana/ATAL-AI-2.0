/**
 * Time constants in milliseconds.
 *
 * PR-64: extracted from 8+ inline `1000 * 60 * 60 * 24` repetitions across
 * progress, assessments, lesson-download, offline cache, and rate-limiter.
 * Use these everywhere instead of recomputing the literal — the multiplier
 * trick is correct but unscannable, and a typo would be silent.
 */

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

