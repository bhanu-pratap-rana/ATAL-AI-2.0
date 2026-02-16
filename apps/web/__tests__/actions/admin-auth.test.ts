/**
 * Tests for admin-auth.ts
 * Target: ~25 tests covering admin user creation and existence checks
 */

import {
  checkAdminExists,
  createAdminUser,
} from "@/app/actions/admin-auth";

// Mock dependencies
const mockListUsers = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateUserById = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createAdminClient: jest.fn().mockImplementation(async () => ({
    auth: {
      admin: {
        listUsers: mockListUsers,
        createUser: mockCreateUser,
        updateUserById: mockUpdateUserById,
      },
    },
  })),
  verifySuperAdminAuth: jest.fn().mockResolvedValue({
    authorized: true,
    user: { id: "super-admin-123", email: "super@admin.com" },
  }),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn().mockResolvedValue(true),
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
import { checkRateLimit } from "@/lib/rate-limiter-distributed";

describe("admin-auth actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock responses
    mockListUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "new-user-123" } },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ error: null });
    (verifySuperAdminAuth as jest.Mock).mockResolvedValue({
      authorized: true,
      user: { id: "super-admin-123", email: "super@admin.com" },
    });
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe("checkAdminExists", () => {
    it("should return exists:false when no admin users exist", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: { users: [] },
        error: null,
      });

      const result = await checkAdminExists();

      expect(result.exists).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it("should return exists:true when admin exists", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: {
          users: [
            { id: "1", email: "user@test.com", app_metadata: { role: "admin" } },
          ],
        },
        error: null,
      });

      const result = await checkAdminExists();

      expect(result.exists).toBe(true);
    });

    it("should return exists:true when super_admin exists", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "1",
              email: "user@test.com",
              app_metadata: { role: "super_admin" },
            },
          ],
        },
        error: null,
      });

      const result = await checkAdminExists();

      expect(result.exists).toBe(true);
    });

    it("should return exists:false when only regular users exist", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "1",
              email: "user@test.com",
              app_metadata: { role: "student" },
            },
            {
              id: "2",
              email: "teacher@test.com",
              app_metadata: { role: "teacher" },
            },
          ],
        },
        error: null,
      });

      const result = await checkAdminExists();

      expect(result.exists).toBe(false);
    });

    it("should fail closed (return exists:true) on list error", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error" },
      });

      const result = await checkAdminExists();

      expect(result.exists).toBe(true);
      expect(result.error).toBe("Failed to check admin status");
    });

    it("should fail closed (return exists:true) on unexpected error", async () => {
      mockListUsers.mockRejectedValueOnce(new Error("Unexpected"));

      const result = await checkAdminExists();

      expect(result.exists).toBe(true);
      expect(result.error).toBe("Failed to check admin status");
    });

    it("should handle null user metadata", async () => {
      mockListUsers.mockResolvedValueOnce({
        data: {
          users: [
            { id: "1", email: "user@test.com", app_metadata: null },
          ],
        },
        error: null,
      });

      const result = await checkAdminExists();

      expect(result.exists).toBe(false);
    });
  });

  describe("createAdminUser", () => {
    describe("validation", () => {
      it("should reject invalid email format", async () => {
        const result = await createAdminUser("invalid-email", "Password123!");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject short password", async () => {
        const result = await createAdminUser("admin@test.com", "short");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should accept valid email and password", async () => {
        const result = await createAdminUser(
          "admin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(true);
      });
    });

    describe("rate limiting", () => {
      it("should reject when rate limited", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValueOnce(false);

        const result = await createAdminUser(
          "admin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });
    });

    describe("bootstrap mode (no admin exists)", () => {
      it("should create first admin as super_admin", async () => {
        const result = await createAdminUser(
          "admin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain("Super Admin");
        expect(mockUpdateUserById).toHaveBeenCalledWith("new-user-123", {
          app_metadata: { role: "super_admin" },
        });
      });

      it("should not require authentication for first admin", async () => {
        await createAdminUser("admin@test.com", "ValidPassword123!");

        expect(verifySuperAdminAuth).not.toHaveBeenCalled();
      });
    });

    describe("authenticated mode (admin exists)", () => {
      beforeEach(() => {
        mockListUsers.mockResolvedValue({
          data: {
            users: [
              {
                id: "existing",
                email: "existing@test.com",
                app_metadata: { role: "admin" },
              },
            ],
          },
          error: null,
        });
      });

      it("should require super_admin authentication", async () => {
        const result = await createAdminUser(
          "newadmin@test.com",
          "ValidPassword123!"
        );

        expect(verifySuperAdminAuth).toHaveBeenCalledWith("createAdminUser");
        expect(result.success).toBe(true);
      });

      it("should reject if not super_admin", async () => {
        (verifySuperAdminAuth as jest.Mock).mockResolvedValueOnce({
          authorized: false,
        });

        const result = await createAdminUser(
          "newadmin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Only super admins");
      });

      it("should create subsequent admins as admin (not super_admin)", async () => {
        const result = await createAdminUser(
          "newadmin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(true);
        expect(mockUpdateUserById).toHaveBeenCalledWith("new-user-123", {
          app_metadata: { role: "admin" },
        });
      });

      it("should reject if user already exists", async () => {
        mockListUsers.mockResolvedValueOnce({
          data: {
            users: [
              {
                id: "existing",
                email: "existing@test.com",
                app_metadata: { role: "admin" },
              },
            ],
          },
          error: null,
        });

        const result = await createAdminUser(
          "existing@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("already exists");
      });
    });

    describe("error handling", () => {
      it("should handle listUsers error", async () => {
        mockListUsers.mockResolvedValueOnce({
          data: null,
          error: { message: "DB error" },
        });

        const result = await createAdminUser(
          "admin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to access user database");
      });

      it("should handle createUser error", async () => {
        mockCreateUser.mockResolvedValueOnce({
          data: { user: null },
          error: { message: "Creation failed" },
        });

        const result = await createAdminUser(
          "admin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Creation failed");
      });

      it("should handle updateUserById error", async () => {
        mockUpdateUserById.mockResolvedValueOnce({
          error: { message: "Update failed" },
        });

        const result = await createAdminUser(
          "admin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("Failed to set admin role");
      });

      it("should handle unexpected errors", async () => {
        mockListUsers.mockRejectedValueOnce(new Error("Unexpected"));

        const result = await createAdminUser(
          "admin@test.com",
          "ValidPassword123!"
        );

        expect(result.success).toBe(false);
      });
    });

    describe("email normalization", () => {
      it("should normalize email to lowercase", async () => {
        const result = await createAdminUser(
          "ADMIN@TEST.COM",
          "ValidPassword123!"
        );

        expect(result.success).toBe(true);
        expect(mockCreateUser).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "admin@test.com",
          })
        );
      });
    });
  });
});
