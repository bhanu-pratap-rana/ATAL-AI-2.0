/**
 * Tests for AdminRoleCheckResult component
 * Target: ~10 tests covering admin/non-admin states
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AdminRoleCheckResult } from "@/components/admin/AdminRoleCheckResult";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  AlertCircle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-circle-icon" className={className} />
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
}));

describe("AdminRoleCheckResult", () => {
  describe("when user is admin", () => {
    it("should render check circle icon", () => {
      render(<AdminRoleCheckResult isAdmin={true} />);
      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
    });

    it("should not render alert circle icon", () => {
      render(<AdminRoleCheckResult isAdmin={true} />);
      expect(screen.queryByTestId("alert-circle-icon")).not.toBeInTheDocument();
    });

    it("should show ready to login message", () => {
      render(<AdminRoleCheckResult isAdmin={true} />);
      expect(screen.getByText("Ready to Login!")).toBeInTheDocument();
    });

    it("should show login instructions", () => {
      render(<AdminRoleCheckResult isAdmin={true} />);
      expect(
        screen.getByText(/This user now has admin access/i)
      ).toBeInTheDocument();
    });

    it("should have success styling", () => {
      const { container } = render(<AdminRoleCheckResult isAdmin={true} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("bg-success-light");
      expect(wrapper.className).toContain("border-success/30");
    });
  });

  describe("when user is not admin", () => {
    it("should render alert circle icon", () => {
      render(<AdminRoleCheckResult isAdmin={false} />);
      expect(screen.getByTestId("alert-circle-icon")).toBeInTheDocument();
    });

    it("should not render check circle icon", () => {
      render(<AdminRoleCheckResult isAdmin={false} />);
      expect(screen.queryByTestId("check-circle-icon")).not.toBeInTheDocument();
    });

    it("should show not admin yet message", () => {
      render(<AdminRoleCheckResult isAdmin={false} />);
      expect(screen.getByText("Not Admin Yet")).toBeInTheDocument();
    });

    it("should show set admin role instructions", () => {
      render(<AdminRoleCheckResult isAdmin={false} />);
      expect(
        screen.getByText(/Set Admin Role/i)
      ).toBeInTheDocument();
    });

    it("should have warning styling", () => {
      const { container } = render(<AdminRoleCheckResult isAdmin={false} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("bg-warning-light");
      expect(wrapper.className).toContain("border-warning/30");
    });
  });
});
