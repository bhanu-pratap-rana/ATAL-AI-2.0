/**
 * Tests for ProfileButton component
 * Target: ~8 tests covering profile button display and navigation
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ProfileButton } from "@/components/teacher/ProfileButton";

// Mock Next.js Link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  );
});

// Mock lucide-react User icon
jest.mock("lucide-react", () => ({
  User: () => <span data-testid="user-icon" />,
}));

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button data-variant={variant} data-size={size} className={className}>
      {children}
    </button>
  ),
}));

describe("ProfileButton", () => {
  describe("rendering", () => {
    it("should render the profile button", () => {
      render(<ProfileButton />);
      expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    it("should render user icon", () => {
      render(<ProfileButton />);
      expect(screen.getByTestId("user-icon")).toBeInTheDocument();
    });

    it("should wrap in a Link component", () => {
      render(<ProfileButton />);
      expect(screen.getByTestId("next-link")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("should link to settings page", () => {
      render(<ProfileButton />);
      const link = screen.getByTestId("next-link");
      expect(link).toHaveAttribute("href", "/app/settings");
    });
  });

  describe("styling", () => {
    it("should use outline variant", () => {
      render(<ProfileButton />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "outline");
    });

    it("should use sm size", () => {
      render(<ProfileButton />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-size", "sm");
    });

    it("should apply custom className for cyan theme", () => {
      render(<ProfileButton />);
      const button = screen.getByRole("button");
      expect(button.className).toContain("border-cyan/30");
      expect(button.className).toContain("text-cyan-dark");
    });
  });

  describe("accessibility", () => {
    it("should render as clickable button element", () => {
      render(<ProfileButton />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});
