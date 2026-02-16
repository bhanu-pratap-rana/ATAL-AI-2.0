/**
 * Tests for AssessmentSummary.tsx
 * Target: ~15 tests covering assessment result display and navigation
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { AssessmentSummary } from "@/components/assessment/AssessmentSummary";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock child components
jest.mock("@/components/assessment/ResultCircle", () => ({
  ResultCircle: ({ percentage, label }: { percentage: number; label: string }) => (
    <div data-testid="result-circle">
      <span data-testid="percentage">{percentage}</span>
      <span data-testid="label">{label}</span>
    </div>
  ),
}));

jest.mock("@/components/assessment/CategoryBreakdown", () => ({
  CategoryBreakdown: ({ categories }: { categories: Record<string, unknown> }) => (
    <div data-testid="category-breakdown">
      {Object.keys(categories).length} categories
    </div>
  ),
  CategoryStrengths: ({ type }: { type: string }) => (
    <div data-testid={`category-${type}`}>{type}</div>
  ),
}));

jest.mock("@/components/assessment/LevelBadge", () => ({
  LevelBadge: ({ score }: { score: number }) => (
    <div data-testid="level-badge">Score: {score}</div>
  ),
  LevelCard: ({ score }: { score: number }) => (
    <div data-testid="level-card">Level for: {score}</div>
  ),
}));

jest.mock("@/components/assessment/AssessmentStats", () => ({
  AssessmentStats: ({ avgResponseTime }: { avgResponseTime: number }) => (
    <div data-testid="assessment-stats">Avg time: {avgResponseTime}</div>
  ),
}));

describe("AssessmentSummary", () => {
  const defaultProps = {
    score: 75,
    totalQuestions: 20,
    correctAnswers: 15,
    moduleBreakdown: {
      math: { total: 10, correct: 8 },
      english: { total: 10, correct: 7 },
    },
    avgResponseTime: 25,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the summary page", () => {
      render(<AssessmentSummary {...defaultProps} />);

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("should display the score in ResultCircle", () => {
      render(<AssessmentSummary {...defaultProps} />);

      expect(screen.getByTestId("percentage")).toHaveTextContent("75");
    });

    it("should display correct answers count", () => {
      render(<AssessmentSummary {...defaultProps} />);

      expect(screen.getByText("15/20")).toBeInTheDocument();
    });

    it("should display the level badge", () => {
      render(<AssessmentSummary {...defaultProps} />);

      expect(screen.getByTestId("level-badge")).toBeInTheDocument();
    });

    it("should display category breakdown", () => {
      render(<AssessmentSummary {...defaultProps} />);

      expect(screen.getByTestId("category-breakdown")).toBeInTheDocument();
    });

    it("should display strengths and weaknesses", () => {
      render(<AssessmentSummary {...defaultProps} />);

      expect(screen.getByTestId("category-strengths")).toBeInTheDocument();
      expect(screen.getByTestId("category-weaknesses")).toBeInTheDocument();
    });

    it("should display assessment stats", () => {
      render(<AssessmentSummary {...defaultProps} />);

      expect(screen.getByTestId("assessment-stats")).toBeInTheDocument();
    });
  });

  describe("score messages", () => {
    it("should show excellent message for score >= 80", () => {
      render(<AssessmentSummary {...defaultProps} score={85} />);

      expect(screen.getByText("Excellent Work!")).toBeInTheDocument();
      expect(screen.getByText("🎉")).toBeInTheDocument();
    });

    it("should show good job message for score 60-79", () => {
      render(<AssessmentSummary {...defaultProps} score={70} />);

      expect(screen.getByText("Good Job!")).toBeInTheDocument();
      expect(screen.getByText("👍")).toBeInTheDocument();
    });

    it("should show great start message for score 40-59", () => {
      render(<AssessmentSummary {...defaultProps} score={50} />);

      expect(screen.getByText("Great Start!")).toBeInTheDocument();
      expect(screen.getByText("📚")).toBeInTheDocument();
    });

    it("should show ready to learn message for score < 40", () => {
      render(<AssessmentSummary {...defaultProps} score={30} />);

      expect(screen.getByText("Ready to Learn!")).toBeInTheDocument();
      expect(screen.getByText("🚀")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("should navigate to curriculum on Start Learning click", () => {
      render(<AssessmentSummary {...defaultProps} />);

      fireEvent.click(screen.getByText("Start Learning"));

      expect(mockPush).toHaveBeenCalledWith("/app/curriculum");
    });

    it("should navigate to assessment start on Retake click", () => {
      render(<AssessmentSummary {...defaultProps} />);

      fireEvent.click(screen.getByText("Retake Assessment"));

      expect(mockPush).toHaveBeenCalledWith("/app/assessment/start");
    });

    it("should navigate to dashboard on Go to Dashboard click", () => {
      render(<AssessmentSummary {...defaultProps} />);

      fireEvent.click(screen.getByText("Go to Dashboard"));

      expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
    });
  });

  describe("edge cases", () => {
    it("should handle score of 0", () => {
      render(
        <AssessmentSummary
          {...defaultProps}
          score={0}
          correctAnswers={0}
        />
      );

      expect(screen.getByTestId("percentage")).toHaveTextContent("0");
      expect(screen.getByText("0/20")).toBeInTheDocument();
    });

    it("should handle score of 100", () => {
      render(
        <AssessmentSummary
          {...defaultProps}
          score={100}
          correctAnswers={20}
        />
      );

      expect(screen.getByTestId("percentage")).toHaveTextContent("100");
      expect(screen.getByText("20/20")).toBeInTheDocument();
    });

    it("should handle empty module breakdown", () => {
      render(<AssessmentSummary {...defaultProps} moduleBreakdown={{}} />);

      expect(screen.getByTestId("category-breakdown")).toHaveTextContent(
        "0 categories"
      );
    });
  });
});
