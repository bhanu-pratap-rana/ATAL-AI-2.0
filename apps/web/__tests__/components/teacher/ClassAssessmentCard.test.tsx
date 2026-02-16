/**
 * Tests for ClassAssessmentCard component
 * Target: ~15 tests covering rendering, score colors, and navigation
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ClassAssessmentCard } from "@/components/teacher/ClassAssessmentCard";

// Mock Next.js Link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

describe("ClassAssessmentCard", () => {
  const defaultClassData = {
    classId: "class-123",
    className: "Class 10A",
    subject: "Mathematics",
    studentCount: 30,
    assessmentsTaken: 15,
    averageScore: 75,
  };

  describe("rendering", () => {
    it("should render class name", () => {
      render(<ClassAssessmentCard classData={defaultClassData} />);

      expect(screen.getByText("Class 10A")).toBeInTheDocument();
    });

    it("should render subject when provided", () => {
      render(<ClassAssessmentCard classData={defaultClassData} />);

      expect(screen.getByText("Mathematics")).toBeInTheDocument();
    });

    it("should not render subject when null", () => {
      const classData = { ...defaultClassData, subject: null };
      render(<ClassAssessmentCard classData={classData} />);

      expect(screen.queryByText("Mathematics")).not.toBeInTheDocument();
    });

    it("should not render subject when undefined", () => {
      const classData = { ...defaultClassData, subject: undefined };
      render(<ClassAssessmentCard classData={classData} />);

      expect(screen.queryByText("Mathematics")).not.toBeInTheDocument();
    });

    it("should render student count", () => {
      render(<ClassAssessmentCard classData={defaultClassData} />);

      expect(screen.getByText("30")).toBeInTheDocument();
      expect(screen.getByText("Students")).toBeInTheDocument();
    });

    it("should render assessments taken count", () => {
      render(<ClassAssessmentCard classData={defaultClassData} />);

      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("Assessments")).toBeInTheDocument();
    });

    it("should render average score with percentage", () => {
      render(<ClassAssessmentCard classData={defaultClassData} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
      expect(screen.getByText("Avg Score")).toBeInTheDocument();
    });

    it("should render dash when average score is null", () => {
      const classData = { ...defaultClassData, averageScore: null };
      render(<ClassAssessmentCard classData={classData} />);

      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  describe("score color styling", () => {
    it("should apply success color for scores >= 80", () => {
      const classData = { ...defaultClassData, averageScore: 85 };
      const { container } = render(<ClassAssessmentCard classData={classData} />);

      const scoreElement = container.querySelector(".bg-success-light");
      expect(scoreElement).toBeInTheDocument();
    });

    it("should apply warning color for scores 60-79", () => {
      const classData = { ...defaultClassData, averageScore: 65 };
      const { container } = render(<ClassAssessmentCard classData={classData} />);

      const scoreElement = container.querySelector(".bg-warning-light");
      expect(scoreElement).toBeInTheDocument();
    });

    it("should apply error color for scores < 60", () => {
      const classData = { ...defaultClassData, averageScore: 45 };
      const { container } = render(<ClassAssessmentCard classData={classData} />);

      const scoreElement = container.querySelector(".bg-error-light");
      expect(scoreElement).toBeInTheDocument();
    });

    it("should apply surface color when score is null", () => {
      const classData = { ...defaultClassData, averageScore: null };
      const { container } = render(<ClassAssessmentCard classData={classData} />);

      const scoreElement = container.querySelector(".bg-surface.text-text-tertiary");
      expect(scoreElement).toBeInTheDocument();
    });
  });

  describe("navigation links", () => {
    it("should render View Class link with correct href", () => {
      render(<ClassAssessmentCard classData={defaultClassData} />);

      const viewClassLink = screen.getByRole("link", { name: /View Class/i });
      expect(viewClassLink).toHaveAttribute("href", "/app/teacher/classes/class-123");
    });

    it("should render View Results link with correct href", () => {
      render(<ClassAssessmentCard classData={defaultClassData} />);

      const viewResultsLink = screen.getByRole("link", { name: /View Results/i });
      expect(viewResultsLink).toHaveAttribute("href", "/app/teacher/assessments/class-123");
    });

    it("should have View Class and View Results buttons", () => {
      render(<ClassAssessmentCard classData={defaultClassData} />);

      expect(screen.getByRole("button", { name: /View Class/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /View Results/i })).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle zero student count", () => {
      const classData = { ...defaultClassData, studentCount: 0 };
      render(<ClassAssessmentCard classData={classData} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle zero assessments taken", () => {
      const classData = { ...defaultClassData, assessmentsTaken: 0 };
      render(<ClassAssessmentCard classData={classData} />);

      // There should be two "0" elements - one for assessments
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle score at exact boundary (80)", () => {
      const classData = { ...defaultClassData, averageScore: 80 };
      const { container } = render(<ClassAssessmentCard classData={classData} />);

      expect(container.querySelector(".bg-success-light")).toBeInTheDocument();
    });

    it("should handle score at exact boundary (60)", () => {
      const classData = { ...defaultClassData, averageScore: 60 };
      const { container } = render(<ClassAssessmentCard classData={classData} />);

      expect(container.querySelector(".bg-warning-light")).toBeInTheDocument();
    });
  });
});
