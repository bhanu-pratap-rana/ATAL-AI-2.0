/**
 * Tests for UnauthorizedMessage component
 * Target: ~12 tests covering unauthorized display and actions
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnauthorizedMessage } from "@/components/admin/UnauthorizedMessage";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock lucide-react
jest.mock("lucide-react", () => ({
  AlertCircle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-circle-icon" className={className} />
  ),
}));

// Mock Button
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

describe("UnauthorizedMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("default rendering", () => {
    it("should render default title", () => {
      render(<UnauthorizedMessage />);
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    it("should render default message", () => {
      render(<UnauthorizedMessage />);
      expect(
        screen.getByText("You do not have permission to access this resource.")
      ).toBeInTheDocument();
    });

    it("should render alert icon", () => {
      render(<UnauthorizedMessage />);
      expect(screen.getByTestId("alert-circle-icon")).toBeInTheDocument();
    });

    it("should render login button by default", () => {
      render(<UnauthorizedMessage />);
      expect(
        screen.getByRole("button", { name: /Back to Login/i })
      ).toBeInTheDocument();
    });
  });

  describe("custom props", () => {
    it("should render custom title", () => {
      render(<UnauthorizedMessage title="Custom Title" />);
      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("should render custom message", () => {
      render(<UnauthorizedMessage message="Custom error message" />);
      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });

    it("should hide login button when showLoginButton is false", () => {
      render(<UnauthorizedMessage showLoginButton={false} />);
      expect(
        screen.queryByRole("button", { name: /Back to Login/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("should navigate to login when button clicked", () => {
      render(<UnauthorizedMessage />);
      fireEvent.click(screen.getByRole("button", { name: /Back to Login/i }));
      expect(mockPush).toHaveBeenCalledWith("/admin/login");
    });
  });

  describe("dismiss functionality", () => {
    it("should not render dismiss button when onDismiss not provided", () => {
      render(<UnauthorizedMessage />);
      expect(
        screen.queryByRole("button", { name: /Dismiss/i })
      ).not.toBeInTheDocument();
    });

    it("should render dismiss button when onDismiss provided", () => {
      const onDismiss = jest.fn();
      render(<UnauthorizedMessage onDismiss={onDismiss} />);
      expect(
        screen.getByRole("button", { name: /Dismiss/i })
      ).toBeInTheDocument();
    });

    it("should call onDismiss when dismiss button clicked", () => {
      const onDismiss = jest.fn();
      render(<UnauthorizedMessage onDismiss={onDismiss} />);
      fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("should show both buttons when all props provided", () => {
      const onDismiss = jest.fn();
      render(<UnauthorizedMessage showLoginButton={true} onDismiss={onDismiss} />);
      expect(
        screen.getByRole("button", { name: /Back to Login/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Dismiss/i })
      ).toBeInTheDocument();
    });
  });
});
