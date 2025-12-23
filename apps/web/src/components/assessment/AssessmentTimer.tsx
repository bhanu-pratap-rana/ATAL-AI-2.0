'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * ATAL AI Assessment Timer - Jyoti Theme
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 *
 * Features:
 * - Elapsed time display (MM:SS format)
 * - Auto-incrementing every second
 * - Proper cleanup on unmount
 */

interface AssessmentTimerProps {
  /** Whether to pause the timer */
  isPaused?: boolean
  /** Initial elapsed time in seconds (for resuming) */
  initialSeconds?: number
  /** Callback when time updates (receives total seconds) */
  onTimeUpdate?: (seconds: number) => void
  /** Custom class name for styling */
  className?: string
}

export function AssessmentTimer({
  isPaused = false,
  initialSeconds = 0,
  onTimeUpdate,
  className = '',
}: AssessmentTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Format seconds as MM:SS
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Start/stop timer based on pause state
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const newTime = prev + 1
        onTimeUpdate?.(newTime)
        return newTime
      })
    }, 1000)

    // Cleanup on unmount or when paused
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPaused, onTimeUpdate])

  // Sync with initialSeconds when it changes
  useEffect(() => {
    setElapsedSeconds(initialSeconds)
  }, [initialSeconds])

  return (
    <div
      className={`inline-flex items-center gap-2 text-text-secondary ${className}`}
      role="timer"
      aria-label={`Elapsed time: ${formatTime(elapsedSeconds)}`}
    >
      <span className="text-lg" aria-hidden="true">
        ⏱️
      </span>
      <span className="font-mono text-base font-medium tabular-nums">
        {formatTime(elapsedSeconds)}
      </span>
    </div>
  )
}

/**
 * Compact timer for use in progress header
 */
export function CompactTimer({
  isPaused = false,
  initialSeconds = 0,
  onTimeUpdate,
}: Omit<AssessmentTimerProps, 'className'>) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const newTime = prev + 1
        onTimeUpdate?.(newTime)
        return newTime
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPaused, onTimeUpdate])

  useEffect(() => {
    setElapsedSeconds(initialSeconds)
  }, [initialSeconds])

  return (
    <span
      className="text-sm font-mono font-medium text-text-tertiary tabular-nums"
      role="timer"
      aria-label={`Elapsed time: ${formatTime(elapsedSeconds)}`}
    >
      {formatTime(elapsedSeconds)}
    </span>
  )
}
