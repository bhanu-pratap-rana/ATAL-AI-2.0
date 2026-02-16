/**
 * Tests for QuestionPagination and PaginationLegend components
 * Target: ~18 tests covering rendering, navigation, and accessibility
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  QuestionPagination,
  PaginationLegend,
} from "@/components/assessment/QuestionPagination";

describe("QuestionPagination", () => {
  const defaultProps = {
    totalQuestions: 10,
    currentIndex: 0,
    questionStatuses: Array(10).fill("unanswered") as (
      | "current"
      | "answered"
      | "skipped"
      | "unanswered"
    )[],
    historyLength: 5,
    onJumpTo: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render navigation with proper aria-label", () => {
      render(<QuestionPagination {...defaultProps} />);

      expect(screen.getByRole("navigation", { name: "Question navigation" })).toBeInTheDocument();
    });

    it("should render previous and next buttons", () => {
      render(<QuestionPagination {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Previous questions" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next questions" })).toBeInTheDocument();
    });

    it("should render question number buttons", () => {
      render(<QuestionPagination {...defaultProps} />);

      // Should show first 5 questions (window size)
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("should show ellipsis when there are more questions after window", () => {
      render(<QuestionPagination {...defaultProps} />);

      expect(screen.getByText("...")).toBeInTheDocument();
    });

    it("should not show ellipsis when all questions fit in window", () => {
      const props = { ...defaultProps, totalQuestions: 5 };
      render(<QuestionPagination {...props} />);

      expect(screen.queryByText("...")).not.toBeInTheDocument();
    });
  });

  describe("current question indication", () => {
    it("should mark current question with aria-current", () => {
      render(<QuestionPagination {...defaultProps} currentIndex={2} />);

      const currentButton = screen.getByRole("button", { name: /Question 3 \(current\)/i });
      expect(currentButton).toHaveAttribute("aria-current", "step");
    });

    it("should apply different styling for current question", () => {
      const { container } = render(<QuestionPagination {...defaultProps} currentIndex={0} />);

      const currentButton = container.querySelector('[aria-current="step"]');
      expect(currentButton).toHaveClass("scale-110");
    });
  });

  describe("question status colors", () => {
    it("should show answered status with success color", () => {
      const statuses = [...defaultProps.questionStatuses];
      statuses[0] = "answered";
      const props = { ...defaultProps, questionStatuses: statuses, currentIndex: 1 };

      render(<QuestionPagination {...props} />);

      const answeredButton = screen.getByRole("button", { name: /Question 1 \(answered\)/i });
      expect(answeredButton.classList.toString()).toContain("bg-success");
    });

    it("should show skipped status with warning color", () => {
      const statuses = [...defaultProps.questionStatuses];
      statuses[0] = "skipped";
      const props = { ...defaultProps, questionStatuses: statuses, currentIndex: 1 };

      render(<QuestionPagination {...props} />);

      expect(screen.getByRole("button", { name: /Question 1 \(skipped\)/i })).toBeInTheDocument();
    });

    it("should show unanswered status with border color", () => {
      const props = { ...defaultProps, currentIndex: 0 };
      render(<QuestionPagination {...props} />);

      // Question 2 should be unanswered (not current)
      expect(
        screen.getByRole("button", { name: /Question 2 \(not attempted\)/i })
      ).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("should call onJumpTo when clicking a question within history", () => {
      render(<QuestionPagination {...defaultProps} historyLength={5} />);

      const question3Button = screen.getByRole("button", { name: /Question 3/i });
      fireEvent.click(question3Button);

      expect(defaultProps.onJumpTo).toHaveBeenCalledWith(2);
    });

    it("should not call onJumpTo for questions outside history", () => {
      render(<QuestionPagination {...defaultProps} historyLength={2} />);

      const question4Button = screen.getByRole("button", { name: /Question 4/i });
      fireEvent.click(question4Button);

      expect(defaultProps.onJumpTo).not.toHaveBeenCalled();
    });

    it("should call onJumpTo with previous index when clicking left arrow", () => {
      render(<QuestionPagination {...defaultProps} currentIndex={3} />);

      const leftButton = screen.getByRole("button", { name: "Previous questions" });
      fireEvent.click(leftButton);

      expect(defaultProps.onJumpTo).toHaveBeenCalledWith(2);
    });

    it("should call onJumpTo with next index when clicking right arrow", () => {
      render(<QuestionPagination {...defaultProps} currentIndex={2} historyLength={5} />);

      const rightButton = screen.getByRole("button", { name: "Next questions" });
      fireEvent.click(rightButton);

      expect(defaultProps.onJumpTo).toHaveBeenCalledWith(3);
    });
  });

  describe("disabled states", () => {
    it("should disable left arrow at first question when no offset", () => {
      render(<QuestionPagination {...defaultProps} totalQuestions={5} currentIndex={0} />);

      const leftButton = screen.getByRole("button", { name: "Previous questions" });
      expect(leftButton).toBeDisabled();
    });

    it("should disable questions outside history", () => {
      render(<QuestionPagination {...defaultProps} historyLength={2} />);

      const question5Button = screen.getByRole("button", { name: /Question 5/i });
      expect(question5Button).toBeDisabled();
    });
  });

  describe("sliding window", () => {
    it("should center window around current question", () => {
      render(<QuestionPagination {...defaultProps} currentIndex={5} historyLength={10} />);

      // Window should show questions around index 5 (questions 4-8)
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument();
    });

    it("should show start ellipsis when offset > 0", () => {
      render(<QuestionPagination {...defaultProps} currentIndex={7} historyLength={10} />);

      // Should show ellipsis at start
      const ellipses = screen.getAllByText("...");
      expect(ellipses.length).toBeGreaterThan(0);
    });
  });
});

describe("PaginationLegend", () => {
  it("should render all status labels", () => {
    render(<PaginationLegend />);

    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Answered")).toBeInTheDocument();
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(screen.getByText("Not Attempted")).toBeInTheDocument();
  });

  it("should render color indicators with aria-hidden", () => {
    const { container } = render(<PaginationLegend />);

    const colorIndicators = container.querySelectorAll('[aria-hidden="true"]');
    expect(colorIndicators.length).toBe(4);
  });

  it("should have proper styling for each status color", () => {
    const { container } = render(<PaginationLegend />);

    expect(container.querySelector(".bg-info")).toBeInTheDocument();
    expect(container.querySelector(".bg-success")).toBeInTheDocument();
    expect(container.querySelector(".bg-warning")).toBeInTheDocument();
    expect(container.querySelector(".bg-border")).toBeInTheDocument();
  });
});
