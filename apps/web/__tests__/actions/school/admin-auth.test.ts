/**
 * Tests for admin-auth.ts
 * Target: ~15 tests covering admin authorization checks
 */

import { checkAdminAuth } from "@/app/actions/school/admin-auth";

// Mock dependencies
jest.mock("@/lib/supabase-server", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import { getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";

describe("admin-auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkAdminAuth", () => {
    describe("Authorized Users", () => {
      it("should return authorized for admin role", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "admin-123",
          email: "admin@example.com",
          app_metadata: { role: "admin" },
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should return authorized for super_admin role", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "super-admin-123",
          email: "superadmin@example.com",
          app_metadata: { role: "super_admin" },
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe("Unauthorized Users", () => {
      it("should return unauthorized for teacher role", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "teacher-123",
          email: "teacher@example.com",
          app_metadata: { role: "teacher" },
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Admin access required");
      });

      it("should return unauthorized for student role", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "student-123",
          email: "student@example.com",
          app_metadata: { role: "student" },
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Admin access required");
      });

      it("should return unauthorized for user with no role", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          email: "user@example.com",
          app_metadata: {},
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Admin access required");
      });

      it("should return unauthorized for user with undefined app_metadata", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          email: "user@example.com",
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Admin access required");
      });
    });

    describe("Unauthenticated Users", () => {
      it("should return unauthorized when no user is logged in", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });

      it("should return unauthorized when getCurrentUser returns undefined", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(undefined);

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });
    });

    describe("Error Handling", () => {
      it("should handle errors gracefully", async () => {
        (getCurrentUser as jest.Mock).mockRejectedValue(
          new Error("Database connection failed")
        );

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe(
          "An error occurred while checking authorization"
        );
        expect(authLogger.error).toHaveBeenCalledWith(
          "[checkAdminAuth] Error checking admin authorization",
          expect.any(Error)
        );
      });

      it("should handle network timeouts", async () => {
        (getCurrentUser as jest.Mock).mockRejectedValue(
          new Error("Network timeout")
        );

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe(
          "An error occurred while checking authorization"
        );
      });

      it("should handle unexpected error types", async () => {
        (getCurrentUser as jest.Mock).mockRejectedValue("String error");

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe(
          "An error occurred while checking authorization"
        );
      });
    });

    describe("Edge Cases", () => {
      it("should handle user with null app_metadata", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          email: "user@example.com",
          app_metadata: null,
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Admin access required");
      });

      it("should not authorize case-insensitive roles", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          email: "user@example.com",
          app_metadata: { role: "ADMIN" },
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Admin access required");
      });

      it("should not authorize similar role names", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue({
          id: "user-123",
          email: "user@example.com",
          app_metadata: { role: "admin_user" },
        });

        const result = await checkAdminAuth();

        expect(result.authorized).toBe(false);
        expect(result.error).toBe("Admin access required");
      });
    });
  });
});
