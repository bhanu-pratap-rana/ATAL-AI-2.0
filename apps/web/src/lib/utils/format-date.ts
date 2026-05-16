/**
 * Date and duration formatting utilities.
 *
 * Simple in-house helpers so we don't pull in date-fns. PR-65 added the
 * formatDuration* + formatRelativeDay helpers below to dedup 8 inline
 * implementations across student/teacher dashboards, assessments, and
 * analytics. Each function lists the inputs it accepts (minutes vs
 * seconds vs ms) to make it obvious which to pick.
 */

import { MS_PER_DAY } from "@/lib/constants/time";

/** "1h 30m" / "30m" — input is minutes. */
export function formatDurationFromMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "0m";
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/** "1m 30s" / "45s" — input is seconds. */
export function formatDurationFromSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0s";
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/** "1:30" mm:ss — input is milliseconds; "<1s" when sub-second. */
export function formatDurationMMSS(ms: number): string {
  if (!Number.isFinite(ms) || ms < 1000) return "<1s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * "Today" / "Yesterday" / "3 days ago" / short date for ≥ 7 days.
 * Accepts null for the "no activity yet" case (returns "Never").
 */
export function formatRelativeDay(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const target = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(target.getTime())) return "Never";
  const diffDays = Math.floor((Date.now() - target.getTime()) / MS_PER_DAY);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return target.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: target.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - targetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffDays < 7) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
  }
  if (diffMonths < 12) {
    return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
  }
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
}

/**
 * Format a date as a short date string (e.g., "Jan 15, 2024")
 */
export function formatShortDate(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return targetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date as a full date and time string (e.g., "January 15, 2024 at 3:30 PM")
 */
export function formatFullDateTime(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return targetDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
