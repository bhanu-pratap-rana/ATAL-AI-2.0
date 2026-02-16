/**
 * Tests for AdminUnauthorizedState component
 * Target: ~12 tests covering rendering, content, and navigation
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AdminUnauthorizedState } from "@/components/admin/manage/AdminUnauthorizedState";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  ShieldAlert: ({ className }: { className?: string }) => (
    <span data-testid="shield-icon" className={className}>
      Shield
    </span>
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

describe("AdminUnauthorizedState", () => {
  describe("rendering", () => {
    it("should render Access Denied title", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    it("should render super admin requirement description", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByText("Super admin access required")).toBeInTheDocument();
    });

    it("should render Unauthorized Access message", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByText("Unauthorized Access")).toBeInTheDocument();
    });

    it("should render explanation text", () => {
      render(<AdminUnauthorizedState />);

      expect(
        screen.getByText(/This page requires super admin privileges/i)
      ).toBeInTheDocument();
    });

    it("should render shield alert icon", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByTestId("shield-icon")).toBeInTheDocument();
    });

    it("should render What to do section", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByText("What to do:")).toBeInTheDocument();
    });

    it("should render sign-in instructions", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByText(/Sign in with a super admin account/i)).toBeInTheDocument();
      expect(screen.getByText("/admin/login")).toBeInTheDocument();
    });

    it("should render contact administrator instruction", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByText(/Contact your system administrator for access/i)).toBeInTheDocument();
    });
  });

  describe("navigation buttons", () => {
    it("should render Back to Login button in header", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByRole("button", { name: /Back to Login/i })).toBeInTheDocument();
    });

    it("should render Go to Admin Login button", () => {
      render(<AdminUnauthorizedState />);

      expect(screen.getByRole("button", { name: /Go to Admin Login/i })).toBeInTheDocument();
    });

    it("should have clickable Back to Login button", () => {
      render(<AdminUnauthorizedState />);

      const backButton = screen.getByRole("button", { name: /Back to Login/i });
      expect(backButton).not.toBeDisabled();
    });

    it("should have clickable Go to Admin Login button", () => {
      render(<AdminUnauthorizedState />);

      const loginButton = screen.getByRole("button", { name: /Go to Admin Login/i });
      expect(loginButton).not.toBeDisabled();
    });
  });
});
