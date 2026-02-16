/**
 * Tests for QuestionNavigation.tsx
 * Target: ~20 tests covering navigation button states and behavior
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionNavigation } from "@/components/assessment/QuestionNavigation";

describe("QuestionNavigation", () => {
  const defaultProps = {
    currentIndex: 5,
    totalQuestions: 10,
    hasSelectedAnswer: true,
    isSubmitting: false,
    canGoBack: true,
    isReviewingHistory: false,
    onPrevious: jest.fn(),
    onSkip: jest.fn(),
    onClear: jest.fn(),
    onNext: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("button rendering", () => {
    it("should render previous button", () => {
      render(<QuestionNavigation {...defaultProps} />);

      expect(screen.getAllByRole("button", { name: /previous/i })).toHaveLength(2); // Mobile and desktop
    });

    it("should render skip button", () => {
      render(<QuestionNavigation {...defaultProps} />);

      expect(screen.getAllByRole("button", { name: /skip/i })).toHaveLength(2); // Mobile and desktop
    });

    it("should render clear button when answer selected", () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} />);

      expect(screen.getAllByRole("button", { name: /clear/i })).toHaveLength(2); // Mobile and desktop
    });

    it("should not render clear button when no answer selected", () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={false} />);

      expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
    });

    it("should render submit/next button", () => {
      render(<QuestionNavigation {...defaultProps} />);

      expect(screen.getAllByRole("button", { name: /submit/i })).toHaveLength(2); // Mobile and desktop
    });
  });

  describe("button text", () => {
    it("should show 'Submit & Next' when answer is selected", () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} />);

      expect(screen.getAllByText("Submit & Next")).toHaveLength(2);
    });

    it("should show 'Next' when no answer is selected", () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={false} />);

      expect(screen.getAllByText("Next")).toHaveLength(2);
    });

    it("should show 'Submitting...' when submitting", () => {
      render(<QuestionNavigation {...defaultProps} isSubmitting={true} />);

      expect(screen.getAllByText("Submitting...")).toHaveLength(2);
    });

    it("should show 'Complete Assessment' on last question", () => {
      render(<QuestionNavigation {...defaultProps} currentIndex={9} />);

      expect(screen.getAllByText("Complete Assessment")).toHaveLength(2);
    });
  });

  describe("button disabled states", () => {
    it("should disable previous button on first question without canGoBack", () => {
      render(<QuestionNavigation {...defaultProps} currentIndex={0} canGoBack={false} />);

      const prevButtons = screen.getAllByRole("button", { name: /previous/i });
      prevButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it("should enable previous button when canGoBack is true", () => {
      render(<QuestionNavigation {...defaultProps} currentIndex={0} canGoBack={true} />);

      const prevButtons = screen.getAllByRole("button", { name: /previous/i });
      prevButtons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });

    it("should disable all buttons while submitting", () => {
      render(<QuestionNavigation {...defaultProps} isSubmitting={true} />);

      const prevButtons = screen.getAllByRole("button", { name: /previous/i });
      const skipButtons = screen.getAllByRole("button", { name: /skip/i });
      const clearButtons = screen.getAllByRole("button", { name: /clear/i });

      prevButtons.forEach(button => expect(button).toBeDisabled());
      skipButtons.forEach(button => expect(button).toBeDisabled());
      clearButtons.forEach(button => expect(button).toBeDisabled());
    });

    it("should disable skip button when reviewing history", () => {
      render(<QuestionNavigation {...defaultProps} isReviewingHistory={true} />);

      const skipButtons = screen.getAllByRole("button", { name: /skip/i });
      skipButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe("button callbacks", () => {
    it("should call onPrevious when previous button clicked", () => {
      render(<QuestionNavigation {...defaultProps} />);

      // Click the first previous button (mobile)
      const prevButtons = screen.getAllByRole("button", { name: /previous/i });
      fireEvent.click(prevButtons[0]);

      expect(defaultProps.onPrevious).toHaveBeenCalledTimes(1);
    });

    it("should call onSkip when skip button clicked", () => {
      render(<QuestionNavigation {...defaultProps} />);

      const skipButtons = screen.getAllByRole("button", { name: /skip/i });
      fireEvent.click(skipButtons[0]);

      expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
    });

    it("should call onClear when clear button clicked", () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} />);

      const clearButtons = screen.getAllByRole("button", { name: /clear/i });
      fireEvent.click(clearButtons[0]);

      expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
    });

    it("should call onNext when next button clicked", () => {
      render(<QuestionNavigation {...defaultProps} />);

      const nextButtons = screen.getAllByRole("button", { name: /submit/i });
      fireEvent.click(nextButtons[0]);

      expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("should have aria-label on previous button", () => {
      render(<QuestionNavigation {...defaultProps} />);

      const prevButtons = screen.getAllByRole("button", { name: /previous/i });
      prevButtons.forEach(button => {
        expect(button).toHaveAttribute("aria-label", "Go to previous question");
      });
    });

    it("should have aria-label on skip button", () => {
      render(<QuestionNavigation {...defaultProps} />);

      const skipButtons = screen.getAllByRole("button", { name: /skip/i });
      skipButtons.forEach(button => {
        expect(button).toHaveAttribute("aria-label", "Skip this question");
      });
    });

    it("should have aria-label on clear button", () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} />);

      const clearButtons = screen.getAllByRole("button", { name: /clear/i });
      clearButtons.forEach(button => {
        expect(button).toHaveAttribute("aria-label", "Clear your selected answer");
      });
    });

    it("should have appropriate aria-label on next button based on state", () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={true} />);

      const nextButtons = screen.getAllByRole("button", { name: /submit/i });
      nextButtons.forEach(button => {
        expect(button).toHaveAttribute("aria-label", "Submit answer and go to next question");
      });
    });

    it("should show 'Go to next question' when no answer selected", () => {
      render(<QuestionNavigation {...defaultProps} hasSelectedAnswer={false} />);

      const nextButtons = screen.getAllByRole("button", { name: /next/i });
      nextButtons.forEach(button => {
        expect(button).toHaveAttribute("aria-label", "Go to next question");
      });
    });
  });

  describe("last question behavior", () => {
    it("should not show arrow on last question", () => {
      render(<QuestionNavigation {...defaultProps} currentIndex={9} />);

      // Complete Assessment should not have arrow
      const buttons = screen.getAllByText("Complete Assessment");
      expect(buttons).toHaveLength(2);

      // Check parent buttons don't contain arrow
      buttons.forEach(btn => {
        expect(btn.parentElement?.textContent).not.toContain("→");
      });
    });
  });
});
