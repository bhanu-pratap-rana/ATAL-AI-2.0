/**
 * AssessmentTimer Component Tests
 * Tests for the assessment elapsed time display
 */

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { AssessmentTimer, CompactTimer } from '@/components/assessment/AssessmentTimer'

describe('AssessmentTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Time Display', () => {
    it('should display initial time of 00:00', () => {
      render(<AssessmentTimer />)
      expect(screen.getByText('00:00')).toBeInTheDocument()
    })

    it('should display custom initial time', () => {
      render(<AssessmentTimer initialSeconds={65} />)
      expect(screen.getByText('01:05')).toBeInTheDocument()
    })

    it('should format minutes and seconds correctly', () => {
      render(<AssessmentTimer initialSeconds={125} />)
      expect(screen.getByText('02:05')).toBeInTheDocument()
    })

    it('should pad single digit values with zeros', () => {
      render(<AssessmentTimer initialSeconds={5} />)
      expect(screen.getByText('00:05')).toBeInTheDocument()
    })
  })

  describe('Timer Counting', () => {
    it('should increment time every second', () => {
      render(<AssessmentTimer />)

      expect(screen.getByText('00:00')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByText('00:01')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByText('00:02')).toBeInTheDocument()
    })

    it('should increment minutes after 60 seconds', () => {
      render(<AssessmentTimer initialSeconds={59} />)

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByText('01:00')).toBeInTheDocument()
    })

    it('should call onTimeUpdate callback with new time', () => {
      const onTimeUpdate = jest.fn()
      render(<AssessmentTimer onTimeUpdate={onTimeUpdate} />)

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(onTimeUpdate).toHaveBeenCalledWith(1)

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(onTimeUpdate).toHaveBeenCalledWith(2)
    })
  })

  describe('Pause Functionality', () => {
    it('should not increment when paused', () => {
      render(<AssessmentTimer isPaused={true} />)

      expect(screen.getByText('00:00')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(5000)
      })
      expect(screen.getByText('00:00')).toBeInTheDocument()
    })

    it('should resume counting when unpaused', () => {
      const { rerender } = render(<AssessmentTimer isPaused={true} />)

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(screen.getByText('00:00')).toBeInTheDocument()

      rerender(<AssessmentTimer isPaused={false} />)

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(screen.getByText('00:02')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have timer role', () => {
      render(<AssessmentTimer />)
      expect(screen.getByRole('timer')).toBeInTheDocument()
    })

    it('should have descriptive aria-label', () => {
      render(<AssessmentTimer initialSeconds={65} />)
      expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Elapsed time: 01:05')
    })

    it('should update aria-label as time changes', () => {
      render(<AssessmentTimer />)

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Elapsed time: 00:01')
    })
  })

  describe('Initial Seconds Sync', () => {
    it('should sync with initialSeconds when it changes', () => {
      const { rerender } = render(<AssessmentTimer initialSeconds={10} />)
      expect(screen.getByText('00:10')).toBeInTheDocument()

      rerender(<AssessmentTimer initialSeconds={30} />)
      expect(screen.getByText('00:30')).toBeInTheDocument()
    })
  })
})

describe('CompactTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should render with compact styling', () => {
    render(<CompactTimer />)
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('should display initial time', () => {
    render(<CompactTimer initialSeconds={90} />)
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })

  it('should increment time', () => {
    render(<CompactTimer />)

    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(screen.getByText('00:03')).toBeInTheDocument()
  })

  it('should respect isPaused prop', () => {
    render(<CompactTimer isPaused={true} />)

    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('should call onTimeUpdate callback', () => {
    const onTimeUpdate = jest.fn()
    render(<CompactTimer onTimeUpdate={onTimeUpdate} />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onTimeUpdate).toHaveBeenCalledWith(1)
  })

  it('should have timer role', () => {
    render(<CompactTimer />)
    expect(screen.getByRole('timer')).toBeInTheDocument()
  })
})
