/**
 * Tests for AdminAccessDeniedState component
 * Target: ~10 tests covering access denied display
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminAccessDeniedState } from "@/components/admin/AdminAccessDeniedState";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  ShieldAlert: ({ className }: { className?: string }) => (
    <svg data-testid="shield-alert-icon" className={className} />
  ),
}));

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

describe("AdminAccessDeniedState", () => {
  const defaultProps = {
    onNavigateToLogin: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render access denied title", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    it("should render description text", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(
        screen.getByText("This page is for first-time setup only")
      ).toBeInTheDocument();
    });

    it("should render shield alert icon", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(screen.getByTestId("shield-alert-icon")).toBeInTheDocument();
    });

    it("should render admin account exists message", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(
        screen.getByText("Admin Account Already Exists")
      ).toBeInTheDocument();
    });

    it("should render security explanation", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(
        screen.getByText(/The system already has an admin account configured/i)
      ).toBeInTheDocument();
    });
  });

  describe("what to do section", () => {
    it("should render what to do heading", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(screen.getByText("What to do:")).toBeInTheDocument();
    });

    it("should show login path instruction", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(screen.getByText(/\/admin\/login/i)).toBeInTheDocument();
    });

    it("should mention contacting administrator", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(
        screen.getByText(/Contact your system administrator/i)
      ).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("should render back to login button", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /Back to Login/i })
      ).toBeInTheDocument();
    });

    it("should render go to admin login button", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /Go to Admin Login/i })
      ).toBeInTheDocument();
    });

    it("should call onNavigateToLogin when back button clicked", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /Back to Login/i }));
      expect(defaultProps.onNavigateToLogin).toHaveBeenCalledTimes(1);
    });

    it("should call onNavigateToLogin when main button clicked", () => {
      render(<AdminAccessDeniedState {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Go to Admin Login/i })
      );
      expect(defaultProps.onNavigateToLogin).toHaveBeenCalledTimes(1);
    });
  });
});
