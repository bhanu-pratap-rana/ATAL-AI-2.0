/**
 * QuestionPagination Component Tests
 * Tests for the assessment question pagination with status indicators
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { QuestionPagination, PaginationLegend, type QuestionStatus } from '@/components/assessment/QuestionPagination'

describe('QuestionPagination', () => {
  const defaultProps = {
    totalQuestions: 10,
    currentIndex: 0,
    questionStatuses: Array(10).fill('unanswered') as QuestionStatus[],
    historyLength: 0,
    onJumpTo: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render navigation container with proper role', () => {
      render(<QuestionPagination {...defaultProps} />)
      expect(screen.getByRole('navigation', { name: /question navigation/i })).toBeInTheDocument()
    })

    it('should render 5 pagination dots for 10 questions (window size)', () => {
      render(<QuestionPagination {...defaultProps} />)
      // Should show questions 1-5 in the window
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should render fewer dots if total questions is less than window size', () => {
      render(<QuestionPagination {...defaultProps} totalQuestions={3} />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.queryByText('4')).not.toBeInTheDocument()
    })

    it('should show ellipsis when there are questions after the window', () => {
      render(<QuestionPagination {...defaultProps} />)
      // With 10 questions and window at start, should show trailing ellipsis
      const ellipses = screen.getAllByText('...')
      expect(ellipses.length).toBeGreaterThanOrEqual(1)
    })

    it('should show ellipsis when there are questions before the window', () => {
      render(<QuestionPagination {...defaultProps} currentIndex={7} />)
      // Window should shift, showing leading ellipsis
      const ellipses = screen.getAllByText('...')
      expect(ellipses.length).toBeGreaterThanOrEqual(1)
    })

    it('should render left and right arrow buttons', () => {
      render(<QuestionPagination {...defaultProps} />)
      expect(screen.getByRole('button', { name: /previous questions/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next questions/i })).toBeInTheDocument()
    })
  })

  describe('Current Question Indicator', () => {
    it('should mark current question with aria-current="step"', () => {
      render(<QuestionPagination {...defaultProps} currentIndex={2} />)
      const currentButton = screen.getByRole('button', { name: /question 3 \(current\)/i })
      expect(currentButton).toHaveAttribute('aria-current', 'step')
    })

    it('should provide correct accessibility label for current question', () => {
      render(<QuestionPagination {...defaultProps} currentIndex={0} />)
      expect(screen.getByRole('button', { name: /question 1 \(current\)/i })).toBeInTheDocument()
    })
  })

  describe('Question Status Colors', () => {
    it('should label answered questions correctly', () => {
      const statuses: QuestionStatus[] = ['answered', ...Array(9).fill('unanswered')]
      render(<QuestionPagination {...defaultProps} currentIndex={1} questionStatuses={statuses} historyLength={1} />)
      expect(screen.getByRole('button', { name: /question 1 \(answered\)/i })).toBeInTheDocument()
    })

    it('should label skipped questions correctly', () => {
      const statuses: QuestionStatus[] = ['skipped', ...Array(9).fill('unanswered')]
      render(<QuestionPagination {...defaultProps} currentIndex={1} questionStatuses={statuses} historyLength={1} />)
      expect(screen.getByRole('button', { name: /question 1 \(skipped\)/i })).toBeInTheDocument()
    })

    it('should label unanswered questions as not attempted', () => {
      render(<QuestionPagination {...defaultProps} currentIndex={0} />)
      expect(screen.getByRole('button', { name: /question 2 \(not attempted\)/i })).toBeInTheDocument()
    })
  })

  describe('Jump Navigation', () => {
    it('should call onJumpTo when clicking a question within history', () => {
      const onJumpTo = jest.fn()
      const statuses: QuestionStatus[] = ['answered', 'current', ...Array(8).fill('unanswered')]
      render(
        <QuestionPagination
          {...defaultProps}
          currentIndex={1}
          questionStatuses={statuses}
          historyLength={2}
          onJumpTo={onJumpTo}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /question 1 \(answered\)/i }))
      expect(onJumpTo).toHaveBeenCalledWith(0)
    })

    it('should not call onJumpTo when clicking a question outside history', () => {
      const onJumpTo = jest.fn()
      render(
        <QuestionPagination
          {...defaultProps}
          currentIndex={0}
          historyLength={0}
          onJumpTo={onJumpTo}
        />
      )

      // Question 2 should be disabled (not in history)
      const question2Button = screen.getByRole('button', { name: /question 2 \(not attempted\)/i })
      fireEvent.click(question2Button)
      expect(onJumpTo).not.toHaveBeenCalled()
    })

    it('should disable buttons for questions not in history', () => {
      render(
        <QuestionPagination
          {...defaultProps}
          currentIndex={0}
          historyLength={1}
        />
      )

      const question2Button = screen.getByRole('button', { name: /question 2 \(not attempted\)/i })
      expect(question2Button).toBeDisabled()
    })
  })

  describe('Arrow Navigation', () => {
    it('should call onJumpTo with previous index when clicking left arrow', () => {
      const onJumpTo = jest.fn()
      render(
        <QuestionPagination
          {...defaultProps}
          currentIndex={3}
          historyLength={4}
          onJumpTo={onJumpTo}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /previous questions/i }))
      expect(onJumpTo).toHaveBeenCalledWith(2)
    })

    it('should call onJumpTo with next index when clicking right arrow', () => {
      const onJumpTo = jest.fn()
      render(
        <QuestionPagination
          {...defaultProps}
          currentIndex={2}
          historyLength={4}
          onJumpTo={onJumpTo}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /next questions/i }))
      expect(onJumpTo).toHaveBeenCalledWith(3)
    })

    it('should disable left arrow on first question with no shift available', () => {
      render(<QuestionPagination {...defaultProps} currentIndex={0} historyLength={0} />)
      expect(screen.getByRole('button', { name: /previous questions/i })).toBeDisabled()
    })

    it('should disable right arrow when at end of history and no shift available', () => {
      render(
        <QuestionPagination
          {...defaultProps}
          totalQuestions={5}
          currentIndex={4}
          historyLength={4}
        />
      )
      expect(screen.getByRole('button', { name: /next questions/i })).toBeDisabled()
    })
  })

  describe('Window Sliding', () => {
    it('should center window around current question when in middle', () => {
      render(<QuestionPagination {...defaultProps} currentIndex={5} />)
      // With current at index 5, window offset = floor(5 - 2.5) = 2
      // So visible dots are indices 2,3,4,5,6 (questions 3,4,5,6,7)
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('should show start of questions when at beginning', () => {
      render(<QuestionPagination {...defaultProps} currentIndex={1} />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should show end of questions when at end', () => {
      render(<QuestionPagination {...defaultProps} currentIndex={9} />)
      // Should show questions 6-10 (indices 5-9)
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })
  })
})

describe('PaginationLegend', () => {
  it('should render all status labels', () => {
    render(<PaginationLegend />)
    expect(screen.getByText('Current')).toBeInTheDocument()
    expect(screen.getByText('Answered')).toBeInTheDocument()
    expect(screen.getByText('Skipped')).toBeInTheDocument()
    expect(screen.getByText('Not Attempted')).toBeInTheDocument()
  })

  it('should render color indicators with aria-hidden', () => {
    render(<PaginationLegend />)
    const indicators = document.querySelectorAll('[aria-hidden="true"]')
    expect(indicators.length).toBe(4)
  })
})
