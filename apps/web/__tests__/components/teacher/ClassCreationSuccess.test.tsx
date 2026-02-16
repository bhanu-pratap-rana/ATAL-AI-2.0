/**
 * Tests for ClassCreationSuccess component
 * Target: ~12 tests covering class creation success display
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClassCreationSuccess } from "@/components/teacher/ClassCreationSuccess";

// Mock dialog components
jest.mock("@/components/ui/dialog", () => ({
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe("ClassCreationSuccess", () => {
  const defaultProps = {
    classCode: "ABC123",
    joinPin: "4567",
    onDone: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render success title with emoji", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(screen.getByText(/Class Created!/i)).toBeInTheDocument();
    });

    it("should render dialog description", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(
        screen.getByText(/Share these codes with your students/i)
      ).toBeInTheDocument();
    });

    it("should render class code label", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(screen.getByText("Class Code")).toBeInTheDocument();
    });

    it("should render join PIN label", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(screen.getByText("Join PIN")).toBeInTheDocument();
    });
  });

  describe("class code display", () => {
    it("should display the class code", () => {
      render(<ClassCreationSuccess {...defaultProps} classCode="XYZ789" />);
      expect(screen.getByText("XYZ789")).toBeInTheDocument();
    });

    it("should show 6-character code description", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(
        screen.getByText(/Students will enter this 6-character code/i)
      ).toBeInTheDocument();
    });
  });

  describe("join PIN display", () => {
    it("should display the join PIN", () => {
      render(<ClassCreationSuccess {...defaultProps} joinPin="9999" />);
      expect(screen.getByText("9999")).toBeInTheDocument();
    });

    it("should show 4-digit PIN description", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(screen.getByText(/4-digit PIN for class security/i)).toBeInTheDocument();
    });
  });

  describe("warning banner", () => {
    it("should display keep codes safe warning", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(screen.getByText(/Keep these codes safe!/i)).toBeInTheDocument();
    });

    it("should mention viewing codes in class details", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(
        screen.getByText(/You can view these codes anytime in the class details/i)
      ).toBeInTheDocument();
    });
  });

  describe("done button", () => {
    it("should render Done button", () => {
      render(<ClassCreationSuccess {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    });

    it("should call onDone when clicked", () => {
      const onDone = jest.fn();
      render(<ClassCreationSuccess {...defaultProps} onDone={onDone} />);

      fireEvent.click(screen.getByRole("button", { name: "Done" }));

      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });
});
