/**
 * Tests for StudentStepComponents (ChoiceStep)
 * Target: ~12 tests covering rendering and navigation
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChoiceStep } from "@/components/auth/StudentStepComponents";

// Mock AuthCard
jest.mock("@/components/auth/AuthCard", () => ({
  AuthCard: ({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="auth-card">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

describe("ChoiceStep", () => {
  const mockActions = {
    setMainStep: jest.fn(),
  };

  const mockState = {};

  const defaultProps = {
    loading: false,
    actions: mockActions,
    state: mockState,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render welcome title", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(screen.getByText("Welcome, Student!")).toBeInTheDocument();
    });

    it("should render description", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(screen.getByText("Choose an option to continue")).toBeInTheDocument();
    });

    it("should render Create Account button", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /Create Account/i })
      ).toBeInTheDocument();
    });

    it("should render Login button", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
    });

    it("should render sparkle emoji for Create Account", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(screen.getByText("✨")).toBeInTheDocument();
    });

    it("should render key emoji for Login", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(screen.getByText("🔑")).toBeInTheDocument();
    });

    it("should render new student info box", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(screen.getByText(/New Student\?/i)).toBeInTheDocument();
    });

    it("should render lightbulb emoji in info box", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(screen.getByText(/💡/)).toBeInTheDocument();
    });

    it("should render teacher login link", () => {
      render(<ChoiceStep {...defaultProps} />);

      expect(
        screen.getByRole("link", { name: /Are you a teacher/i })
      ).toBeInTheDocument();
    });

    it("should link to teacher start page", () => {
      render(<ChoiceStep {...defaultProps} />);

      const teacherLink = screen.getByRole("link", { name: /Are you a teacher/i });
      expect(teacherLink).toHaveAttribute("href", "/teacher/start");
    });
  });

  describe("navigation", () => {
    it("should navigate to signup when Create Account is clicked", () => {
      render(<ChoiceStep {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

      expect(mockActions.setMainStep).toHaveBeenCalledWith("signup");
    });

    it("should navigate to signin when Login is clicked", () => {
      render(<ChoiceStep {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Login/i }));

      expect(mockActions.setMainStep).toHaveBeenCalledWith("signin");
    });
  });
});
