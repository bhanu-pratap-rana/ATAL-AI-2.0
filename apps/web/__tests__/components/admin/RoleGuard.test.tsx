/**
 * Tests for RoleGuard component
 * Target: ~20 tests covering role authorization and loading states
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { RoleGuard } from "@/components/admin/RoleGuard";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock supabase-browser
const mockGetSession = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe("RoleGuard", () => {
  const ChildComponent = () => <div data-testid="child">Protected Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading state", () => {
    it("should show loading spinner initially", () => {
      mockGetSession.mockImplementation(() => new Promise(() => {}));

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should show loading spinner with animation", () => {
      mockGetSession.mockImplementation(() => new Promise(() => {}));

      const { container } = render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("unauthenticated users", () => {
    it("should redirect to login when no session", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/login");
      });
    });

    it("should redirect to login when session error", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error("Session error"),
      });

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/login");
      });
    });

    it("should redirect to login on unexpected error", async () => {
      mockGetSession.mockRejectedValue(new Error("Network error"));

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/login");
      });
    });
  });

  describe("super_admin required role", () => {
    it("should render children for super_admin user", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "super@example.com",
              app_metadata: { role: "super_admin" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="super_admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should show unauthorized for admin when super_admin required", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "admin@example.com",
              app_metadata: { role: "admin" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="super_admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
    });

    it("should show unauthorized for teacher when super_admin required", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "teacher@example.com",
              app_metadata: { role: "teacher" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="super_admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
    });
  });

  describe("admin required role", () => {
    it("should render children for super_admin user", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "super@example.com",
              app_metadata: { role: "super_admin" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should render children for admin user", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "admin@example.com",
              app_metadata: { role: "admin" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should show unauthorized for teacher when admin required", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "teacher@example.com",
              app_metadata: { role: "teacher" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
    });
  });

  describe("teacher required role", () => {
    it("should render children for super_admin user", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "super@example.com",
              app_metadata: { role: "super_admin" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="teacher">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should render children for admin user", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "admin@example.com",
              app_metadata: { role: "admin" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="teacher">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should render children for teacher user", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "teacher@example.com",
              app_metadata: { role: "teacher" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="teacher">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId("child")).toBeInTheDocument();
      });
    });

    it("should show unauthorized for student when teacher required", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "student@example.com",
              app_metadata: { role: "student" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="teacher">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
    });
  });

  describe("missing/default role", () => {
    it("should default to user role when no role in metadata", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "user@example.com",
              app_metadata: {},
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
    });

    it("should handle undefined app_metadata", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "user@example.com",
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
      });
    });
  });

  describe("fallback prop", () => {
    it("should render custom fallback when unauthorized", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "user@example.com",
              app_metadata: { role: "student" },
            },
          },
        },
        error: null,
      });

      const CustomFallback = () => <div data-testid="custom-fallback">Custom Denied</div>;

      render(
        <RoleGuard requiredRole="admin" fallback={<CustomFallback />}>
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      });
    });

    it("should render default fallback when no custom fallback provided", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              email: "user@example.com",
              app_metadata: { role: "student" },
            },
          },
        },
        error: null,
      });

      render(
        <RoleGuard requiredRole="admin">
          <ChildComponent />
        </RoleGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
        expect(screen.getByText("🔒")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Back to Login/i })).toBeInTheDocument();
      });
    });
  });
});
