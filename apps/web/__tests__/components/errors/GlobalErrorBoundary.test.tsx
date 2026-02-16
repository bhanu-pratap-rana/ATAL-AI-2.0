/**
 * Tests for GlobalErrorBoundary component
 * Target: ~15 tests covering error handling and recovery UI
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlobalErrorBoundary } from "@/components/errors/GlobalErrorBoundary";

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div data-testid="child-content">Child content</div>;
}

// Suppress console.error for error boundary tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe("GlobalErrorBoundary", () => {
  const originalLocation = globalThis.location;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock location.reload using delete and assignment
    delete (globalThis as { location?: Location }).location;
    (globalThis as { location: Partial<Location> }).location = {
      reload: jest.fn(),
      href: "http://localhost",
      origin: "http://localhost",
      pathname: "/",
      search: "",
      hash: "",
    } as unknown as Location;
  });

  afterEach(() => {
    // Restore original location
    (globalThis as { location: Location }).location = originalLocation;
  });

  describe("normal rendering", () => {
    it("should render children when no error", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={false} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("should not show error UI when no error", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={false} />
        </GlobalErrorBoundary>
      );

      expect(screen.queryByText("Something Went Wrong")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should show error UI when error is thrown", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
    });

    it("should show error icon emoji", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText("😕")).toBeInTheDocument();
    });

    it("should show error description", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(
        screen.getByText(/We encountered an unexpected error/i)
      ).toBeInTheDocument();
    });

    it("should not show children when error occurs", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });

    it("should log error to client logger", () => {
      const { clientLogger } = require("@/lib/client-logger");

      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(clientLogger.error).toHaveBeenCalledWith(
        "[Global] Unhandled component error:",
        expect.objectContaining({
          error: "Test error message",
        })
      );
    });
  });

  describe("error details", () => {
    it("should render error details section", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText("Error Details")).toBeInTheDocument();
    });

    it("should show error message in details", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });

    it("should be collapsed by default", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      const details = screen.getByText("Error Details").closest("details");
      expect(details).not.toHaveAttribute("open");
    });
  });

  describe("action buttons", () => {
    it("should render Reload Page button", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByRole("button", { name: /Reload Page/i })).toBeInTheDocument();
    });

    it("should have clickable Reload button", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      const reloadButton = screen.getByRole("button", { name: /Reload Page/i });
      // Verify button is clickable and has proper styling
      expect(reloadButton).not.toBeDisabled();
      expect(reloadButton).toHaveClass("bg-primary");
      // Click shouldn't throw
      expect(() => fireEvent.click(reloadButton)).not.toThrow();
    });

    it("should render Go to Dashboard link", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByRole("link", { name: /Go to Dashboard/i })).toBeInTheDocument();
    });

    it("should link to dashboard", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      const dashboardLink = screen.getByRole("link", { name: /Go to Dashboard/i });
      expect(dashboardLink).toHaveAttribute("href", "/app/dashboard");
    });
  });

  describe("support section", () => {
    it("should render Contact Support link", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByRole("link", { name: /Contact Support/i })).toBeInTheDocument();
    });

    it("should link to settings page", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      const supportLink = screen.getByRole("link", { name: /Contact Support/i });
      expect(supportLink).toHaveAttribute("href", "/app/settings");
    });

    it("should render Need help text", () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText("Need help?")).toBeInTheDocument();
    });
  });
});
