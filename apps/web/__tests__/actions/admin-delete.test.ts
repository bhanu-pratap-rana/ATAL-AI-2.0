/**
 * Tests for admin-delete.ts
 * Target: ~20 tests covering user deletion with cascade cleanup
 */

import { deleteUserByEmail } from "@/app/actions/admin-delete";

// Mock dependencies
const mockDeleteUser = jest.fn();
const mockFrom = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createAdminClient: jest.fn().mockImplementation(async () => ({
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
    from: mockFrom,
  })),
  verifySuperAdminAuth: jest.fn().mockResolvedValue({
    authorized: true,
    user: { id: "super-admin-123", email: "super@admin.com" },
  }),
}));

jest.mock("@/lib/admin-utils", () => ({
  findAuthUserByEmail: jest.fn().mockResolvedValue({
    id: "user-to-delete",
    email: "delete@test.com",
  }),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkAdminOperationRateLimit: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
  },
}));

import { verifySuperAdminAuth } from "@/lib/supabase-server";
import { findAuthUserByEmail } from "@/lib/admin-utils";
import { checkAdminOperationRateLimit } from "@/lib/rate-limiter-distributed";

describe("admin-delete actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup
    (verifySuperAdminAuth as jest.Mock).mockResolvedValue({
      authorized: true,
      user: { id: "super-admin-123", email: "super@admin.com" },
    });

    (findAuthUserByEmail as jest.Mock).mockResolvedValue({
      id: "user-to-delete",
      email: "delete@test.com",
    });

    (checkAdminOperationRateLimit as jest.Mock).mockResolvedValue(true);

    mockDeleteUser.mockResolvedValue({ error: null });

    // Setup chain for cascade delete
    mockFrom.mockReturnValue({
      delete: mockDelete,
    });
    mockDelete.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockResolvedValue({ error: null });
  });

  describe("deleteUserByEmail", () => {
    describe("validation", () => {
      it("should reject invalid email format", async () => {
        const result = await deleteUserByEmail("invalid-email");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should accept valid email format", async () => {
        const result = await deleteUserByEmail("valid@test.com");

        expect(result.success).toBe(true);
      });
    });

    describe("authorization", () => {
      it("should require super_admin authentication", async () => {
        await deleteUserByEmail("test@test.com");

        expect(verifySuperAdminAuth).toHaveBeenCalledWith("deleteUserByEmail");
      });

      it("should reject if not super_admin", async () => {
        (verifySuperAdminAuth as jest.Mock).mockResolvedValueOnce({
          authorized: false,
          error: { success: false, error: "Not authorized" },
        });

        const result = await deleteUserByEmail("test@test.com");

        expect(result.success).toBe(false);
      });
    });

    describe("rate limiting", () => {
      it("should reject when rate limited", async () => {
        (checkAdminOperationRateLimit as jest.Mock).mockResolvedValueOnce(false);

        const result = await deleteUserByEmail("test@test.com");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });
    });

    describe("user lookup", () => {
      it("should return error when user not found", async () => {
        (findAuthUserByEmail as jest.Mock).mockResolvedValueOnce(null);

        const result = await deleteUserByEmail("notfound@test.com");

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
      });
    });

    describe("self-deletion prevention", () => {
      it("should prevent deleting own account", async () => {
        (findAuthUserByEmail as jest.Mock).mockResolvedValueOnce({
          id: "super-admin-123", // Same as logged in user
          email: "super@admin.com",
        });

        const result = await deleteUserByEmail("super@admin.com");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Cannot delete your own account");
      });
    });

    describe("cascade deletion", () => {
      it("should delete related data before auth user", async () => {
        const result = await deleteUserByEmail("delete@test.com");

        expect(result.success).toBe(true);
        expect(mockFrom).toHaveBeenCalled();
        expect(mockDeleteUser).toHaveBeenCalledWith("user-to-delete");
      });

      it("should continue deletion even if some cascade tables fail", async () => {
        // Simulate one table failing
        let callCount = 0;
        mockEq.mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            return Promise.reject(new Error("Table error"));
          }
          return Promise.resolve({ error: null });
        });

        const result = await deleteUserByEmail("delete@test.com");

        // Should still succeed overall
        expect(result.success).toBe(true);
        expect(mockDeleteUser).toHaveBeenCalled();
      });

      it("should delete from all related tables", async () => {
        await deleteUserByEmail("delete@test.com");

        // Check that from was called for multiple tables
        const fromCalls = mockFrom.mock.calls.map((call) => call[0]);
        expect(fromCalls).toContain("student_profiles");
        expect(fromCalls).toContain("teacher_profiles");
        expect(fromCalls).toContain("enrollments");
      });
    });

    describe("auth deletion", () => {
      it("should delete user from auth after cascade", async () => {
        const result = await deleteUserByEmail("delete@test.com");

        expect(result.success).toBe(true);
        expect(mockDeleteUser).toHaveBeenCalledWith("user-to-delete");
      });

      it("should return error if auth deletion fails", async () => {
        mockDeleteUser.mockResolvedValueOnce({
          error: { message: "Auth delete failed" },
        });

        const result = await deleteUserByEmail("delete@test.com");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Auth delete failed");
      });
    });

    describe("success response", () => {
      it("should return success message with email", async () => {
        const result = await deleteUserByEmail("delete@test.com");

        expect(result.success).toBe(true);
        expect(result.message).toContain("delete@test.com");
        expect(result.message).toContain("deleted");
      });
    });

    describe("email normalization", () => {
      it("should normalize email to lowercase", async () => {
        await deleteUserByEmail("DELETE@TEST.COM");

        expect(findAuthUserByEmail).toHaveBeenCalledWith(
          expect.anything(),
          "delete@test.com"
        );
      });
    });

    describe("error handling", () => {
      it("should handle unexpected errors gracefully", async () => {
        (verifySuperAdminAuth as jest.Mock).mockRejectedValueOnce(
          new Error("Unexpected")
        );

        const result = await deleteUserByEmail("test@test.com");

        expect(result.success).toBe(false);
      });
    });
  });
});
