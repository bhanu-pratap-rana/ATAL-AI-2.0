/**
 * QuestionNavigation Component Tests
 * Tests for the assessment question navigation buttons
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { QuestionNavigation } from '@/components/assessment/QuestionNavigation'

describe('QuestionNavigation', () => {
  const defaultProps = {
    currentIndex: 0,
    totalQuestions: 10,
    hasSelectedAnswer: false,
    isSubmitting: false,
    canGoBack: false,
    isReviewingHistory: false,
    onPrevious: jest.fn(),
    onSkip: jest.fn(),
    onClear: jest.fn(),
    onNext: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Button Rendering', () => {
    it('should render Previous button', () => {
      render(<QuestionNavigation {...defaultProps} />)
      expect(screen.getAllByRole('button', { name: /previous/i }).length).toBeGreaterThan(0)
    })

    it('should render Skip button', () => {
      render(<QuestionNavigation {...defaultProps} />)
      expect(screen.getAllByRole('button', { name: /skip/i }).length).toBeGreaterThan(0)
    })

    it('should render Next/Submit button', () => {
      render(<QuestionNavigation {...defaultProps} />)
      expect(screen.getAllByRole('button', { name: /next|submit/i }).length).toBeGreaterThan(0)
    })

    it('should not render Clear button when no answer selected', () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={false} />)
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })

    it('should render Clear button when answer is selected', () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} />)
      expect(screen.getAllByRole('button', { name: /clear/i }).length).toBeGreaterThan(0)
    })
  })

  describe('Previous Button', () => {
    it('should be disabled on first question with no history', () => {
      render(<QuestionNavigation {...defaultProps} currentIndex={0} canGoBack={false} />)
      const previousButtons = screen.getAllByRole('button', { name: /previous/i })
      previousButtons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })

    it('should be enabled when canGoBack is true', () => {
      render(<QuestionNavigation {...defaultProps} currentIndex={1} canGoBack={true} />)
      const previousButtons = screen.getAllByRole('button', { name: /previous/i })
      const enabledButton = previousButtons.find(btn => !btn.hasAttribute('disabled'))
      expect(enabledButton).toBeDefined()
    })

    it('should call onPrevious when clicked', () => {
      const onPrevious = jest.fn()
      render(<QuestionNavigation {...defaultProps} canGoBack={true} onPrevious={onPrevious} />)
      const previousButtons = screen.getAllByRole('button', { name: /previous/i })
      const enabledButton = previousButtons.find(btn => !btn.hasAttribute('disabled'))
      if (enabledButton) {
        fireEvent.click(enabledButton)
        expect(onPrevious).toHaveBeenCalled()
      }
    })
  })

  describe('Skip Button', () => {
    it('should call onSkip when clicked', () => {
      const onSkip = jest.fn()
      render(<QuestionNavigation {...defaultProps} onSkip={onSkip} />)
      const skipButtons = screen.getAllByRole('button', { name: /skip/i })
      fireEvent.click(skipButtons[0])
      expect(onSkip).toHaveBeenCalled()
    })

    it('should be disabled when reviewing history', () => {
      render(<QuestionNavigation {...defaultProps} isReviewingHistory={true} />)
      const skipButtons = screen.getAllByRole('button', { name: /skip/i })
      skipButtons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })

    it('should be disabled when submitting', () => {
      render(<QuestionNavigation {...defaultProps} isSubmitting={true} />)
      const skipButtons = screen.getAllByRole('button', { name: /skip/i })
      skipButtons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })
  })

  describe('Clear Button', () => {
    it('should call onClear when clicked', () => {
      const onClear = jest.fn()
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} onClear={onClear} />)
      const clearButtons = screen.getAllByRole('button', { name: /clear/i })
      fireEvent.click(clearButtons[0])
      expect(onClear).toHaveBeenCalled()
    })

    it('should be disabled when submitting', () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} isSubmitting={true} />)
      const clearButtons = screen.getAllByRole('button', { name: /clear/i })
      clearButtons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })
  })

  describe('Next/Submit Button', () => {
    it('should show "Next" text when not on last question without answer', () => {
      render(<QuestionNavigation {...defaultProps} currentIndex={0} hasSelectedAnswer={false} />)
      expect(screen.getAllByText(/next/i).length).toBeGreaterThan(0)
    })

    it('should show "Submit & Next" when answer is selected', () => {
      render(<QuestionNavigation {...defaultProps} currentIndex={0} hasSelectedAnswer={true} />)
      expect(screen.getAllByText(/submit.*next/i).length).toBeGreaterThan(0)
    })

    it('should show "Complete Assessment" on last question', () => {
      render(
        <QuestionNavigation
          {...defaultProps}
          currentIndex={9}
          totalQuestions={10}
          hasSelectedAnswer={true}
          isReviewingHistory={false}
        />
      )
      expect(screen.getAllByText(/complete assessment/i).length).toBeGreaterThan(0)
    })

    it('should show "Submitting..." when isSubmitting is true', () => {
      render(<QuestionNavigation {...defaultProps} isSubmitting={true} />)
      expect(screen.getAllByText(/submitting/i).length).toBeGreaterThan(0)
    })

    it('should call onNext when clicked', () => {
      const onNext = jest.fn()
      render(<QuestionNavigation {...defaultProps} onNext={onNext} />)
      const nextButtons = screen.getAllByRole('button', { name: /next|submit/i })
      fireEvent.click(nextButtons[0])
      expect(onNext).toHaveBeenCalled()
    })

    it('should be disabled when submitting', () => {
      render(<QuestionNavigation {...defaultProps} isSubmitting={true} />)
      // When submitting, buttons show "Submitting..." text but keep the same aria-label
      const nextButtons = screen.getAllByRole('button', { name: /next/i })
      nextButtons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-labels for all buttons', () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} />)
      expect(screen.getAllByRole('button', { name: /go to previous question/i }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('button', { name: /skip this question/i }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('button', { name: /clear your selected answer/i }).length).toBeGreaterThan(0)
    })
  })
})
