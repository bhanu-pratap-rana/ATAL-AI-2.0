/**
 * Tests for AssessmentStats component
 * Target: ~15 tests covering rendering, time formatting, and IRT display
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AssessmentStats } from "@/components/assessment/AssessmentStats";

describe("AssessmentStats", () => {
  const defaultProps = {
    avgResponseTime: 5000, // 5 seconds
    moduleBreakdown: {
      "Module A": { total: 10, correct: 8 },
      "Module B": { total: 5, correct: 4 },
    },
  };

  describe("rendering", () => {
    it("should render the Quick Stats heading", () => {
      render(<AssessmentStats {...defaultProps} />);

      expect(screen.getByRole("heading", { name: "Quick Stats" })).toBeInTheDocument();
    });

    it("should render response time label", () => {
      render(<AssessmentStats {...defaultProps} />);

      expect(screen.getByText("Avg. Response Time")).toBeInTheDocument();
    });

    it("should render modules covered label", () => {
      render(<AssessmentStats {...defaultProps} />);

      expect(screen.getByText("Modules Covered")).toBeInTheDocument();
    });

    it("should display correct number of modules", () => {
      render(<AssessmentStats {...defaultProps} />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("time formatting", () => {
    it("should format time in seconds for short durations", () => {
      render(<AssessmentStats {...defaultProps} avgResponseTime={30000} />);

      expect(screen.getByText("30s")).toBeInTheDocument();
    });

    it("should format time in minutes and seconds for longer durations", () => {
      render(<AssessmentStats {...defaultProps} avgResponseTime={90000} />);

      expect(screen.getByText("1m 30s")).toBeInTheDocument();
    });

    it("should round time to nearest second", () => {
      render(<AssessmentStats {...defaultProps} avgResponseTime={5500} />);

      expect(screen.getByText("6s")).toBeInTheDocument();
    });

    it("should handle zero response time", () => {
      render(<AssessmentStats {...defaultProps} avgResponseTime={0} />);

      expect(screen.getByText("0s")).toBeInTheDocument();
    });

    it("should handle multi-minute durations", () => {
      render(<AssessmentStats {...defaultProps} avgResponseTime={180000} />);

      expect(screen.getByText("3m 0s")).toBeInTheDocument();
    });
  });

  describe("module breakdown", () => {
    it("should count modules correctly", () => {
      const props = {
        ...defaultProps,
        moduleBreakdown: {
          "Module A": { total: 5, correct: 3 },
          "Module B": { total: 5, correct: 4 },
          "Module C": { total: 5, correct: 5 },
        },
      };
      render(<AssessmentStats {...props} />);

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should handle empty module breakdown", () => {
      const props = { ...defaultProps, moduleBreakdown: {} };
      render(<AssessmentStats {...props} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle single module", () => {
      const props = {
        ...defaultProps,
        moduleBreakdown: { "Single Module": { total: 10, correct: 8 } },
      };
      render(<AssessmentStats {...props} />);

      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("IRT data display", () => {
    const irtData = {
      theta: 1.25,
      standardError: 0.35,
      proficiencyLevel: "Intermediate",
      categoryScores: {
        "Category A": {
          theta: 1.0,
          score: 75,
          proficiency: "Good",
          correct: 8,
          total: 10,
        },
      },
    };

    it("should not render IRT section when irtData is not provided", () => {
      render(<AssessmentStats {...defaultProps} />);

      expect(screen.queryByText("Ability Estimate (IRT)")).not.toBeInTheDocument();
    });

    it("should render IRT section when irtData is provided", () => {
      render(<AssessmentStats {...defaultProps} irtData={irtData} />);

      expect(screen.getByText("Ability Estimate (IRT)")).toBeInTheDocument();
    });

    it("should display theta value with proper formatting", () => {
      render(<AssessmentStats {...defaultProps} irtData={irtData} />);

      expect(screen.getByText("θ = 1.25")).toBeInTheDocument();
    });

    it("should display standard error with ± symbol", () => {
      render(<AssessmentStats {...defaultProps} irtData={irtData} />);

      expect(screen.getByText("±0.35")).toBeInTheDocument();
    });

    it("should display ability score and standard error labels", () => {
      render(<AssessmentStats {...defaultProps} irtData={irtData} />);

      expect(screen.getByText("Ability Score")).toBeInTheDocument();
      expect(screen.getByText("Standard Error")).toBeInTheDocument();
    });

    it("should display proficiency level", () => {
      render(<AssessmentStats {...defaultProps} irtData={irtData} />);

      expect(screen.getByText("Your ability level:")).toBeInTheDocument();
      expect(screen.getByText("Intermediate")).toBeInTheDocument();
    });

    it("should handle different proficiency levels", () => {
      const advancedIrt = { ...irtData, proficiencyLevel: "Advanced" };
      render(<AssessmentStats {...defaultProps} irtData={advancedIrt} />);

      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("should format theta with two decimal places", () => {
      const preciseIrt = { ...irtData, theta: 0.5 };
      render(<AssessmentStats {...defaultProps} irtData={preciseIrt} />);

      expect(screen.getByText("θ = 0.50")).toBeInTheDocument();
    });

    it("should format standard error with two decimal places", () => {
      const preciseIrt = { ...irtData, standardError: 0.1 };
      render(<AssessmentStats {...defaultProps} irtData={preciseIrt} />);

      expect(screen.getByText("±0.10")).toBeInTheDocument();
    });
  });
});
