/**
 * Tests for AdminLoadingState component
 * Target: ~6 tests covering rendering and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AdminLoadingState } from "@/components/admin/manage/AdminLoadingState";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className}>
      Loading...
    </span>
  ),
}));

describe("AdminLoadingState", () => {
  describe("rendering", () => {
    it("should render loading spinner", () => {
      render(<AdminLoadingState />);

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });

    it("should render verification message", () => {
      render(<AdminLoadingState />);

      expect(screen.getByText("Verifying authorization...")).toBeInTheDocument();
    });

    it("should have animation class on loader", () => {
      render(<AdminLoadingState />);

      const loader = screen.getByTestId("loader-icon");
      expect(loader).toHaveClass("animate-spin");
    });

    it("should have primary color on loader", () => {
      render(<AdminLoadingState />);

      const loader = screen.getByTestId("loader-icon");
      expect(loader).toHaveClass("text-primary");
    });

    it("should render full-height container", () => {
      const { container } = render(<AdminLoadingState />);

      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
    });

    it("should have centered content", () => {
      const { container } = render(<AdminLoadingState />);

      expect(container.querySelector(".items-center")).toBeInTheDocument();
      expect(container.querySelector(".justify-center")).toBeInTheDocument();
    });
  });
});
