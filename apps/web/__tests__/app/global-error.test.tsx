/**
 * Tests for Global Error Page
 * Tests the root error boundary component
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock Sentry
const mockCaptureException = jest.fn();
jest.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import GlobalError from "@/app/global-error";

describe("GlobalError", () => {
  const mockReset = jest.fn();
  const mockError = new Error("Test error message") as Error & { digest?: string };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the error page", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    });

    it("should render the sad emoji icon", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      expect(screen.getByText("😔")).toBeInTheDocument();
    });

    it("should render apology message", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      expect(
        screen.getByText(/We apologize for the inconvenience/i)
      ).toBeInTheDocument();
    });

    it("should render Try Again button", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      expect(
        screen.getByRole("button", { name: /Try Again/i })
      ).toBeInTheDocument();
    });

    it("should render Go Home button", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      expect(
        screen.getByRole("button", { name: /Go Home/i })
      ).toBeInTheDocument();
    });
  });

  describe("Sentry Integration", () => {
    it("should report error to Sentry on mount", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      expect(mockCaptureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: expect.objectContaining({
            errorType: "global-error",
          }),
        })
      );
    });

    it("should include digest in Sentry tags when available", () => {
      const errorWithDigest = new Error("Test error") as Error & { digest?: string };
      errorWithDigest.digest = "digest-123";

      render(<GlobalError error={errorWithDigest} reset={mockReset} />);

      expect(mockCaptureException).toHaveBeenCalledWith(
        errorWithDigest,
        expect.objectContaining({
          tags: expect.objectContaining({
            digest: "digest-123",
          }),
        })
      );
    });
  });

  describe("User Interactions", () => {
    it("should call reset when Try Again is clicked", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });
      fireEvent.click(tryAgainButton);

      expect(mockReset).toHaveBeenCalled();
    });

    it("should handle mouse hover on Try Again button", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });

      fireEvent.mouseOver(tryAgainButton);
      fireEvent.mouseOut(tryAgainButton);

      expect(tryAgainButton).toBeInTheDocument();
    });

    it("should handle focus on Try Again button", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });

      fireEvent.focus(tryAgainButton);
      fireEvent.blur(tryAgainButton);

      expect(tryAgainButton).toBeInTheDocument();
    });

    it("should handle mouse hover on Go Home button", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      const homeButton = screen.getByRole("button", { name: /Go Home/i });

      fireEvent.mouseOver(homeButton);
      fireEvent.mouseOut(homeButton);

      expect(homeButton).toBeInTheDocument();
    });

    it("should handle focus on Go Home button", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      const homeButton = screen.getByRole("button", { name: /Go Home/i });

      fireEvent.focus(homeButton);
      fireEvent.blur(homeButton);

      expect(homeButton).toBeInTheDocument();
    });
  });

  describe("Error Digest Handling", () => {
    // Note: In test mode (NODE_ENV=test), the error digest is not displayed
    // These tests verify the component doesn't crash with digest present/absent

    it("should handle error without digest", () => {
      const errorWithoutDigest = new Error("Test error") as Error & { digest?: string };

      render(<GlobalError error={errorWithoutDigest} reset={mockReset} />);

      // Component should still render
      expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    });

    it("should handle error with digest property", () => {
      const errorWithDigest = new Error("Test error") as Error & { digest?: string };
      errorWithDigest.digest = "error-digest-abc123";

      render(<GlobalError error={errorWithDigest} reset={mockReset} />);

      // Component should still render
      expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      expect(
        screen.getByRole("heading", { name: /Something went wrong!/i })
      ).toBeInTheDocument();
    });

    it("should have buttons with proper roles", () => {
      render(<GlobalError error={mockError} reset={mockReset} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });
  });
});
