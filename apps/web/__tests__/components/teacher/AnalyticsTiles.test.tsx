/**
 * Tests for AnalyticsTiles component
 * Target: ~15 tests covering analytics tiles display
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AnalyticsTiles } from "@/components/teacher/AnalyticsTiles";

// Mock Card components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p data-testid="card-description" className={className}>
      {children}
    </p>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
}));

describe("AnalyticsTiles", () => {
  const defaultProps = {
    activeThisWeek: 25,
    avgMinutesPerDay: 12.5,
    atRiskCount: 3,
  };

  describe("Active This Week tile", () => {
    it("should render Active This Week label", () => {
      render(<AnalyticsTiles {...defaultProps} />);
      expect(screen.getByText("Active This Week")).toBeInTheDocument();
    });

    it("should display active students count", () => {
      render(<AnalyticsTiles {...defaultProps} activeThisWeek={25} />);
      expect(screen.getByText("25")).toBeInTheDocument();
    });

    it("should show plural students text for multiple students", () => {
      render(<AnalyticsTiles {...defaultProps} activeThisWeek={25} />);
      expect(screen.getByText(/students completed/i)).toBeInTheDocument();
    });

    it("should show singular student text for one student", () => {
      render(<AnalyticsTiles {...defaultProps} activeThisWeek={1} />);
      expect(screen.getByText(/student completed/i)).toBeInTheDocument();
    });

    it("should render student emoji icon", () => {
      render(<AnalyticsTiles {...defaultProps} />);
      expect(screen.getByText("👥")).toBeInTheDocument();
    });
  });

  describe("Avg Minutes Per Day tile", () => {
    it("should render Avg Minutes/Day label", () => {
      render(<AnalyticsTiles {...defaultProps} />);
      expect(screen.getByText("Avg Minutes/Day")).toBeInTheDocument();
    });

    it("should display average minutes with one decimal", () => {
      render(<AnalyticsTiles {...defaultProps} avgMinutesPerDay={12.5} />);
      expect(screen.getByText("12.5")).toBeInTheDocument();
    });

    it("should format whole numbers with .0", () => {
      render(<AnalyticsTiles {...defaultProps} avgMinutesPerDay={10} />);
      expect(screen.getByText("10.0")).toBeInTheDocument();
    });

    it("should render timer emoji icon", () => {
      render(<AnalyticsTiles {...defaultProps} />);
      expect(screen.getByText("⏱️")).toBeInTheDocument();
    });

    it("should show description text", () => {
      render(<AnalyticsTiles {...defaultProps} />);
      expect(screen.getByText("minutes per student per day")).toBeInTheDocument();
    });
  });

  describe("At-Risk Students tile with at-risk students", () => {
    it("should render At-Risk Students label", () => {
      render(<AnalyticsTiles {...defaultProps} atRiskCount={3} />);
      expect(screen.getByText("At-Risk Students")).toBeInTheDocument();
    });

    it("should display at-risk count", () => {
      render(<AnalyticsTiles {...defaultProps} atRiskCount={3} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should show warning emoji when students are at risk", () => {
      render(<AnalyticsTiles {...defaultProps} atRiskCount={5} />);
      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("should show rapid guessing message when at risk", () => {
      render(<AnalyticsTiles {...defaultProps} atRiskCount={2} />);
      expect(screen.getByText(/with >30% rapid guessing/i)).toBeInTheDocument();
    });
  });

  describe("At-Risk Students tile without at-risk students", () => {
    it("should display zero count", () => {
      render(<AnalyticsTiles {...defaultProps} atRiskCount={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should show checkmark emoji when no students at risk", () => {
      render(<AnalyticsTiles {...defaultProps} atRiskCount={0} />);
      expect(screen.getByText("✅")).toBeInTheDocument();
    });

    it("should show all engaged message when no at risk", () => {
      render(<AnalyticsTiles {...defaultProps} atRiskCount={0} />);
      expect(screen.getByText("All students engaged")).toBeInTheDocument();
    });
  });

  describe("grid layout", () => {
    it("should render three cards", () => {
      render(<AnalyticsTiles {...defaultProps} />);
      const cards = screen.getAllByTestId("card");
      expect(cards).toHaveLength(3);
    });
  });
});
