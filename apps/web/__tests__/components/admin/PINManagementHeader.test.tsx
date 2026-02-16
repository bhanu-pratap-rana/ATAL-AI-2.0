/**
 * Tests for PINManagementHeader component
 * Target: ~15 tests covering header rendering and navigation
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PINManagementHeader } from "@/components/admin/pins/PINManagementHeader";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  LogOut: ({ className }: { size?: number; className?: string }) => (
    <span data-testid="logout-icon" className={className}>
      LogOut
    </span>
  ),
  ArrowLeft: ({ className }: { size?: number; className?: string }) => (
    <span data-testid="arrow-left-icon" className={className}>
      ArrowLeft
    </span>
  ),
}));

describe("PINManagementHeader", () => {
  const defaultProps = {
    isSuperAdmin: false,
    onSignOut: jest.fn(),
    onDashboardClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render the header title", () => {
      render(<PINManagementHeader {...defaultProps} />);

      expect(screen.getByText("School PIN Management")).toBeInTheDocument();
    });

    it("should render sign out button", () => {
      render(<PINManagementHeader {...defaultProps} />);

      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("should render logout icon", () => {
      render(<PINManagementHeader {...defaultProps} />);

      expect(screen.getByTestId("logout-icon")).toBeInTheDocument();
    });

    it("should have sticky positioning", () => {
      const { container } = render(<PINManagementHeader {...defaultProps} />);

      const header = container.firstChild;
      expect(header).toHaveClass("sticky");
      expect(header).toHaveClass("top-0");
    });
  });

  describe("super admin navigation", () => {
    it("should not render dashboard button for non-super admin", () => {
      render(<PINManagementHeader {...defaultProps} isSuperAdmin={false} />);

      expect(screen.queryByText("Back to Dashboard")).not.toBeInTheDocument();
    });

    it("should render dashboard button for super admin", () => {
      render(<PINManagementHeader {...defaultProps} isSuperAdmin={true} />);

      expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
    });

    it("should render arrow left icon for super admin", () => {
      render(<PINManagementHeader {...defaultProps} isSuperAdmin={true} />);

      expect(screen.getByTestId("arrow-left-icon")).toBeInTheDocument();
    });

    it("should call onDashboardClick when dashboard button clicked", () => {
      const onDashboardClick = jest.fn();
      render(
        <PINManagementHeader
          {...defaultProps}
          isSuperAdmin={true}
          onDashboardClick={onDashboardClick}
        />
      );

      fireEvent.click(screen.getByText("Back to Dashboard"));

      expect(onDashboardClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("sign out functionality", () => {
    it("should call onSignOut when sign out button clicked", () => {
      const onSignOut = jest.fn();
      render(<PINManagementHeader {...defaultProps} onSignOut={onSignOut} />);

      fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

      expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it("should show sign out button for non-super admin", () => {
      render(<PINManagementHeader {...defaultProps} isSuperAdmin={false} />);

      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("should show sign out button for super admin", () => {
      render(<PINManagementHeader {...defaultProps} isSuperAdmin={true} />);

      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });
  });

  describe("layout", () => {
    it("should have flex layout for button container", () => {
      const { container } = render(
        <PINManagementHeader {...defaultProps} isSuperAdmin={true} />
      );

      // Find button container
      const buttonContainer = container.querySelector(".flex.items-center.gap-4");
      expect(buttonContainer).toBeInTheDocument();
    });

    it("should have both buttons when super admin", () => {
      render(<PINManagementHeader {...defaultProps} isSuperAdmin={true} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(2);
    });

    it("should have only sign out button when not super admin", () => {
      render(<PINManagementHeader {...defaultProps} isSuperAdmin={false} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(1);
    });
  });

  describe("styling", () => {
    it("should have white background", () => {
      const { container } = render(<PINManagementHeader {...defaultProps} />);

      const header = container.firstChild;
      expect(header).toHaveClass("bg-white");
    });

    it("should have border at bottom", () => {
      const { container } = render(<PINManagementHeader {...defaultProps} />);

      const header = container.firstChild;
      expect(header).toHaveClass("border-b");
    });

    it("should have z-index for stacking", () => {
      const { container } = render(<PINManagementHeader {...defaultProps} />);

      const header = container.firstChild;
      expect(header).toHaveClass("z-10");
    });
  });
});
