/**
 * Time Utilities
 *
 * Centralized time formatting and conversion functions.
 * Eliminates duplicate formatTime() implementations across components.
 *
 * Rule.md Compliance:
 * - Single source of truth for time formatting
 * - Reusable across assessment timers, signup flows, and other components
 * - Type-safe time operations
 */

/**
 * Format seconds to MM:SS format
 * Used by AssessmentTimer, SignUpEmailFlow, etc.
 *
 * @param seconds - Total seconds to format
 * @returns Formatted time string (e.g., "05:30")
 */
export function formatTimeMMSS(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format seconds with compact display for OTP cooldown
 * Used by SignUpEmailFlow, TeacherSignupEmailFlow
 *
 * @param seconds - Total seconds to format
 * @returns Formatted time string (e.g., "1:30" or "45s")
 */
export function formatTimeTidyCompact(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
}

/**
 * Convert seconds to human-readable format
 * Used for progress displays, time remaining, etc.
 *
 * @param seconds - Total seconds
 * @returns Human-readable string (e.g., "2 hours", "5 minutes", "30 seconds")
 */
export function formatTimeHumanReadable(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''}`
}

/**
 * Check if cooldown period has elapsed
 *
 * @param lastAttemptTime - Timestamp of last attempt
 * @param cooldownSeconds - Cooldown period in seconds
 * @returns true if cooldown has elapsed
 */
export function isCooldownElapsed(lastAttemptTime: Date, cooldownSeconds: number): boolean {
  const now = new Date()
  const elapsedSeconds = (now.getTime() - lastAttemptTime.getTime()) / 1000
  return elapsedSeconds >= cooldownSeconds
}

/**
 * Calculate remaining cooldown time
 *
 * @param lastAttemptTime - Timestamp of last attempt
 * @param cooldownSeconds - Cooldown period in seconds
 * @returns Remaining seconds, or 0 if cooldown elapsed
 */
export function getRemainingCooldown(lastAttemptTime: Date, cooldownSeconds: number): number {
  const now = new Date()
  const elapsedSeconds = (now.getTime() - lastAttemptTime.getTime()) / 1000
  return Math.max(0, cooldownSeconds - Math.ceil(elapsedSeconds))
}

/**
 * Parse duration string to seconds
 * Supports formats like "1h", "30m", "45s", "1h30m"
 *
 * @param durationString - Duration in string format
 * @returns Total seconds
 */
export function parseDuration(durationString: string): number {
  const hourMatch = durationString.match(/(\d+)h/)
  const minuteMatch = durationString.match(/(\d+)m/)
  const secondMatch = durationString.match(/(\d+)s/)

  let totalSeconds = 0
  if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600
  if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60
  if (secondMatch) totalSeconds += parseInt(secondMatch[1])

  return totalSeconds
}
