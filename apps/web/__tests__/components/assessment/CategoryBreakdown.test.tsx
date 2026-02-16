/**
 * Tests for CategoryBreakdown and CategoryStrengths components
 * Target: ~20 tests covering rendering, color coding, and sorting
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  CategoryBreakdown,
  CategoryStrengths,
} from "@/components/assessment/CategoryBreakdown";

describe("CategoryBreakdown", () => {
  const defaultCategories = {
    "digital-device-familiarity": { total: 10, correct: 8 },
    "internet-web-awareness": { total: 10, correct: 6 },
    "digital-content-creation": { total: 10, correct: 4 },
  };

  describe("rendering", () => {
    it("should render the Category Performance heading", () => {
      render(<CategoryBreakdown categories={defaultCategories} />);

      expect(
        screen.getByRole("heading", { name: "Category Performance" })
      ).toBeInTheDocument();
    });

    it("should render all categories", () => {
      render(<CategoryBreakdown categories={defaultCategories} />);

      expect(screen.getByText("Digital Devices")).toBeInTheDocument();
      expect(screen.getByText("Internet & Web")).toBeInTheDocument();
      expect(screen.getByText("Content Creation")).toBeInTheDocument();
    });

    it("should display correct/total counts", () => {
      render(<CategoryBreakdown categories={defaultCategories} />);

      expect(screen.getByText("8/10")).toBeInTheDocument();
      expect(screen.getByText("6/10")).toBeInTheDocument();
      expect(screen.getByText("4/10")).toBeInTheDocument();
    });

    it("should display percentages", () => {
      render(<CategoryBreakdown categories={defaultCategories} />);

      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(screen.getByText("60%")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();
    });

    it("should render progress bars for each category", () => {
      render(<CategoryBreakdown categories={defaultCategories} />);

      const progressBars = screen.getAllByRole("progressbar");
      expect(progressBars).toHaveLength(3);
    });

    it("should render category icons", () => {
      render(<CategoryBreakdown categories={defaultCategories} />);

      expect(screen.getByText("💻")).toBeInTheDocument();
      expect(screen.getByText("🌐")).toBeInTheDocument();
      expect(screen.getByText("🎨")).toBeInTheDocument();
    });

    it("should return null for empty categories", () => {
      const { container } = render(<CategoryBreakdown categories={{}} />);

      expect(container.firstChild).toBeNull();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CategoryBreakdown categories={defaultCategories} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("sorting", () => {
    it("should sort categories by percentage descending", () => {
      render(<CategoryBreakdown categories={defaultCategories} />);

      const categoryLabels = screen.getAllByText(/Digital Devices|Internet & Web|Content Creation/);
      expect(categoryLabels[0]).toHaveTextContent("Digital Devices"); // 80%
      expect(categoryLabels[1]).toHaveTextContent("Internet & Web"); // 60%
      expect(categoryLabels[2]).toHaveTextContent("Content Creation"); // 40%
    });
  });

  describe("color coding", () => {
    it("should display success color for 80%+ scores", () => {
      const categories = {
        "problem-solving-aptitude": { total: 10, correct: 9 },
      };
      render(<CategoryBreakdown categories={categories} />);

      const percentage = screen.getByText("90%");
      expect(percentage).toHaveClass("text-success");
    });

    it("should display warning color for 60-79% scores", () => {
      const categories = {
        "problem-solving-aptitude": { total: 10, correct: 7 },
      };
      render(<CategoryBreakdown categories={categories} />);

      const percentage = screen.getByText("70%");
      expect(percentage).toHaveClass("text-warning");
    });

    it("should display error color for below 60% scores", () => {
      const categories = {
        "problem-solving-aptitude": { total: 10, correct: 5 },
      };
      render(<CategoryBreakdown categories={categories} />);

      const percentage = screen.getByText("50%");
      expect(percentage).toHaveClass("text-error");
    });
  });

  describe("edge cases", () => {
    it("should handle zero total questions", () => {
      const categories = {
        "digital-device-familiarity": { total: 0, correct: 0 },
      };
      render(<CategoryBreakdown categories={categories} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("0/0")).toBeInTheDocument();
    });

    it("should handle unknown category keys", () => {
      const categories = {
        "custom-unknown-category": { total: 10, correct: 5 },
      };
      render(<CategoryBreakdown categories={categories} />);

      // Should capitalize and format the key
      expect(screen.getByText("Custom Unknown Category")).toBeInTheDocument();
      expect(screen.getByText("📝")).toBeInTheDocument();
    });

    it("should render problem-solving and contextual application icons", () => {
      const categories = {
        "problem-solving-aptitude": { total: 10, correct: 8 },
        "contextual-application": { total: 10, correct: 7 },
      };
      render(<CategoryBreakdown categories={categories} />);

      expect(screen.getByText("🧩")).toBeInTheDocument();
      expect(screen.getByText("🎯")).toBeInTheDocument();
    });
  });
});

describe("CategoryStrengths", () => {
  const defaultCategories = {
    "digital-device-familiarity": { total: 10, correct: 9 },
    "internet-web-awareness": { total: 10, correct: 8 },
    "digital-content-creation": { total: 10, correct: 3 },
    "problem-solving-aptitude": { total: 10, correct: 2 },
  };

  describe("strengths mode", () => {
    it("should render Your Strengths heading", () => {
      render(<CategoryStrengths categories={defaultCategories} type="strengths" />);

      expect(screen.getByText("Your Strengths")).toBeInTheDocument();
    });

    it("should render strength icon", () => {
      render(<CategoryStrengths categories={defaultCategories} type="strengths" />);

      expect(screen.getByText("💪")).toBeInTheDocument();
    });

    it("should display top 2 performing categories", () => {
      render(<CategoryStrengths categories={defaultCategories} type="strengths" />);

      expect(screen.getByText("Digital Devices")).toBeInTheDocument();
      expect(screen.getByText("Internet & Web")).toBeInTheDocument();
    });

    it("should display percentages for strengths", () => {
      render(<CategoryStrengths categories={defaultCategories} type="strengths" />);

      expect(screen.getByText("(90%)")).toBeInTheDocument();
      expect(screen.getByText("(80%)")).toBeInTheDocument();
    });

    it("should use success badge style for strengths", () => {
      render(<CategoryStrengths categories={defaultCategories} type="strengths" />);

      const badges = screen.getAllByText(/Digital Devices|Internet & Web/);
      badges.forEach((badge) => {
        expect(badge.closest("span")).toHaveClass("bg-success-light");
      });
    });
  });

  describe("weaknesses mode", () => {
    it("should render Areas to Improve heading", () => {
      render(<CategoryStrengths categories={defaultCategories} type="weaknesses" />);

      expect(screen.getByText("Areas to Improve")).toBeInTheDocument();
    });

    it("should render study icon", () => {
      render(<CategoryStrengths categories={defaultCategories} type="weaknesses" />);

      expect(screen.getByText("📚")).toBeInTheDocument();
    });

    it("should display bottom 2 performing categories", () => {
      render(<CategoryStrengths categories={defaultCategories} type="weaknesses" />);

      expect(screen.getByText("Problem Solving")).toBeInTheDocument();
      expect(screen.getByText("Content Creation")).toBeInTheDocument();
    });

    it("should display percentages for weaknesses", () => {
      render(<CategoryStrengths categories={defaultCategories} type="weaknesses" />);

      expect(screen.getByText("(20%)")).toBeInTheDocument();
      expect(screen.getByText("(30%)")).toBeInTheDocument();
    });

    it("should use warning badge style for weaknesses", () => {
      render(<CategoryStrengths categories={defaultCategories} type="weaknesses" />);

      const badges = screen.getAllByText(/Problem Solving|Content Creation/);
      badges.forEach((badge) => {
        expect(badge.closest("span")).toHaveClass("bg-warning-light");
      });
    });
  });

  describe("default type", () => {
    it("should default to strengths type", () => {
      render(<CategoryStrengths categories={defaultCategories} />);

      expect(screen.getByText("Your Strengths")).toBeInTheDocument();
      expect(screen.getByText("💪")).toBeInTheDocument();
    });
  });
});
