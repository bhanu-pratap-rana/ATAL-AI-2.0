'use client'

import { useCallback } from 'react'

/**
 * ATAL AI Assessment Question Pagination - Jyoti Theme
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 *
 * Features:
 * - 5-dot sliding window
 * - Status colors: current (blue), answered (green), skipped (amber), unanswered (gray)
 * - Click to jump (within history only)
 * - Arrow buttons to shift window
 */

export type QuestionStatus = 'current' | 'answered' | 'skipped' | 'unanswered'

interface QuestionPaginationProps {
  readonly totalQuestions: number
  readonly currentIndex: number
  readonly questionStatuses: QuestionStatus[]
  readonly historyLength: number
  readonly onJumpTo: (index: number) => void
}

export function QuestionPagination({
  totalQuestions,
  currentIndex,
  questionStatuses,
  historyLength,
  onJumpTo,
}: QuestionPaginationProps) {
  // Calculate pagination window (show 5 dots at a time)
  const WINDOW_SIZE = 5
  const maxOffset = Math.max(0, totalQuestions - WINDOW_SIZE)

  // Center the window around current question when possible
  const calculateOffset = useCallback(() => {
    if (totalQuestions <= WINDOW_SIZE) return 0
    const idealOffset = Math.floor(currentIndex - WINDOW_SIZE / 2)
    return Math.max(0, Math.min(idealOffset, maxOffset))
  }, [currentIndex, totalQuestions, maxOffset])

  const offset = calculateOffset()

  // Get dots to display
  const visibleDots = Array.from({ length: Math.min(WINDOW_SIZE, totalQuestions) }, (_, i) => {
    const questionIndex = offset + i
    return {
      index: questionIndex,
      status: questionStatuses[questionIndex] || 'unanswered',
      isCurrent: questionIndex === currentIndex,
      canJump: questionIndex < historyLength, // Can only jump within history
    }
  })

  const canShiftLeft = offset > 0
  const canShiftRight = offset < maxOffset

  // Get status color class
  const getStatusColor = (status: QuestionStatus, isCurrent: boolean) => {
    if (isCurrent) return 'bg-info ring-2 ring-info ring-offset-2'
    switch (status) {
      case 'answered':
        return 'bg-success'
      case 'skipped':
        return 'bg-warning'
      default:
        return 'bg-border'
    }
  }

  // Get status label for accessibility
  const getStatusLabel = (status: QuestionStatus, index: number, isCurrent: boolean) => {
    const baseLabel = `Question ${index + 1}`
    if (isCurrent) return `${baseLabel} (current)`
    switch (status) {
      case 'answered':
        return `${baseLabel} (answered)`
      case 'skipped':
        return `${baseLabel} (skipped)`
      default:
        return `${baseLabel} (not attempted)`
    }
  }

  return (
    <div className="flex items-center justify-center gap-2" role="navigation" aria-label="Question navigation">
      {/* Left Arrow */}
      <button
        type="button"
        onClick={() => onJumpTo(Math.max(0, currentIndex - 1))}
        disabled={!canShiftLeft && currentIndex === 0}
        className={`
          w-8 h-8 flex items-center justify-center rounded-full
          transition-colors duration-200
          ${canShiftLeft || currentIndex > 0
            ? 'text-text-secondary hover:text-primary hover:bg-primary-lighter cursor-pointer'
            : 'text-text-muted cursor-not-allowed'
          }
        `}
        aria-label="Previous questions"
      >
        <span className="text-lg">←</span>
      </button>

      {/* Pagination Dots */}
      <div className="flex items-center gap-2">
        {/* Show ellipsis if there are questions before the window */}
        {offset > 0 && (
          <span className="text-text-muted text-sm px-1" aria-hidden="true">
            ...
          </span>
        )}

        {visibleDots.map(({ index, status, isCurrent, canJump }) => (
          <button
            key={index}
            type="button"
            onClick={() => canJump && onJumpTo(index)}
            disabled={!canJump}
            className={`
              min-w-[2.75rem] min-h-[2.75rem] w-8 h-8 sm:w-10 sm:h-10
              rounded-full flex items-center justify-center
              text-xs sm:text-sm font-semibold
              transition-all duration-200
              ${getStatusColor(status, isCurrent)}
              ${isCurrent ? 'text-white scale-110' : 'text-white'}
              ${canJump && !isCurrent
                ? 'hover:scale-105 hover:ring-2 hover:ring-primary hover:ring-offset-1 cursor-pointer'
                : ''
              }
              ${canJump || isCurrent ? '' : 'opacity-60 cursor-default'}
            `}
            aria-label={getStatusLabel(status, index, isCurrent)}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {index + 1}
          </button>
        ))}

        {/* Show ellipsis if there are questions after the window */}
        {offset + WINDOW_SIZE < totalQuestions && (
          <span className="text-text-muted text-sm px-1" aria-hidden="true">
            ...
          </span>
        )}
      </div>

      {/* Right Arrow */}
      <button
        type="button"
        onClick={() => onJumpTo(Math.min(historyLength, currentIndex + 1))}
        disabled={currentIndex >= historyLength && !canShiftRight}
        className={`
          w-8 h-8 flex items-center justify-center rounded-full
          transition-colors duration-200
          ${canShiftRight || currentIndex < historyLength
            ? 'text-text-secondary hover:text-primary hover:bg-primary-lighter cursor-pointer'
            : 'text-text-muted cursor-not-allowed'
          }
        `}
        aria-label="Next questions"
      >
        <span className="text-lg">→</span>
      </button>
    </div>
  )
}

// Legend component for explaining the pagination colors
export function PaginationLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-text-secondary mt-2">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-info" aria-hidden="true" />
        <span>Current</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-success" aria-hidden="true" />
        <span>Answered</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-warning" aria-hidden="true" />
        <span>Skipped</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-border" aria-hidden="true" />
        <span>Not Attempted</span>
      </div>
    </div>
  )
}
