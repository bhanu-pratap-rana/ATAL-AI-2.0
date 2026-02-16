/**
 * Tests for app/actions/admin.ts
 * Admin role management server actions
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createAdminClient: jest.fn(),
  verifySuperAdminAuth: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkAdminOperationRateLimit: jest.fn(),
}));

jest.mock("@/lib/auth/role-utils", () => ({
  isAdmin: jest.fn(),
}));

jest.mock("@/lib/admin-utils", () => ({
  findAuthUserByEmail: jest.fn(),
}));

import { setAdminRole, checkAdminRoleByEmail } from "@/app/actions/admin";
import {
  createAdminClient,
  verifySuperAdminAuth,
} from "@/lib/supabase-server";
import { checkAdminOperationRateLimit } from "@/lib/rate-limiter-distributed";
import { isAdmin } from "@/lib/auth/role-utils";
import { findAuthUserByEmail } from "@/lib/admin-utils";
import { authLogger } from "@/lib/auth-logger";

const mockCreateAdminClient = createAdminClient as jest.Mock;
const mockVerifySuperAdminAuth = verifySuperAdminAuth as jest.Mock;
const mockCheckRateLimit = checkAdminOperationRateLimit as jest.Mock;
const mockIsAdmin = isAdmin as jest.Mock;
const mockFindAuthUserByEmail = findAuthUserByEmail as jest.Mock;

describe("admin actions", () => {
  let mockAdminClient: {
    auth: {
      admin: {
        updateUserById: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminClient = {
      auth: {
        admin: {
          updateUserById: jest.fn(),
        },
      },
    };

    mockCreateAdminClient.mockResolvedValue(mockAdminClient);
    mockCheckRateLimit.mockResolvedValue(true);
    mockIsAdmin.mockReturnValue(false);
  });

  describe("setAdminRole", () => {
    const validEmail = "test@example.com";

    it("should return error for invalid email format", async () => {
      const result = await setAdminRole("invalid-email");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error when not authorized as super_admin", async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: false,
        error: { success: false, error: "Unauthorized" },
      });

      const result = await setAdminRole(validEmail);

      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    it("should return error when rate limited", async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        user: { id: "admin-123" },
      });
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await setAdminRole(validEmail);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Too many requests");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should return error when user not found", async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        user: { id: "admin-123" },
      });
      mockFindAuthUserByEmail.mockResolvedValue(null);

      const result = await setAdminRole(validEmail);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
      expect(authLogger.warn).toHaveBeenCalled();
    });

    it("should return success message when user already has admin role", async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        user: { id: "admin-123" },
      });
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "admin" },
      });
      mockIsAdmin.mockReturnValue(true);

      const result = await setAdminRole(validEmail);

      expect(result.success).toBe(true);
      expect(result.message).toContain("already has");
    });

    it("should successfully set admin role for user", async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        user: { id: "admin-123" },
      });
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: {},
      });
      mockAdminClient.auth.admin.updateUserById.mockResolvedValue({
        error: null,
      });

      const result = await setAdminRole(validEmail);

      expect(result.success).toBe(true);
      expect(result.message).toContain("successfully set");
      expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          app_metadata: expect.objectContaining({ role: "admin" }),
        })
      );
      expect(authLogger.success).toHaveBeenCalled();
    });

    it("should preserve existing app_metadata when setting admin role", async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        user: { id: "admin-123" },
      });
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: { school_id: "school-123", verified: true },
      });
      mockAdminClient.auth.admin.updateUserById.mockResolvedValue({
        error: null,
      });

      await setAdminRole(validEmail);

      expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        "user-123",
        {
          app_metadata: {
            school_id: "school-123",
            verified: true,
            role: "admin",
          },
        }
      );
    });

    it("should return error when update fails", async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        user: { id: "admin-123" },
      });
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: {},
      });
      mockAdminClient.auth.admin.updateUserById.mockResolvedValue({
        error: { message: "Update failed" },
      });

      const result = await setAdminRole(validEmail);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to set admin role");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      mockVerifySuperAdminAuth.mockRejectedValue(new Error("Network error"));

      const result = await setAdminRole(validEmail);

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should normalize email before processing", async () => {
      mockVerifySuperAdminAuth.mockResolvedValue({
        authorized: true,
        user: { id: "admin-123" },
      });
      mockFindAuthUserByEmail.mockResolvedValue(null);

      // Use a valid email format - the schema trims and lowercases
      await setAdminRole("TEST@EXAMPLE.COM");

      // Verify findAuthUserByEmail was called (email was valid and passed validation)
      expect(mockFindAuthUserByEmail).toHaveBeenCalled();
    });
  });

  describe("checkAdminRoleByEmail", () => {
    const validEmail = "test@example.com";

    it("should return error for invalid email format", async () => {
      const result = await checkAdminRoleByEmail("invalid");

      expect(result.hasAdminRole).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error when rate limited", async () => {
      mockCheckRateLimit.mockResolvedValue(false);

      const result = await checkAdminRoleByEmail(validEmail);

      expect(result.hasAdminRole).toBe(false);
      expect(result.error).toContain("Too many requests");
    });

    it("should return false when user not found", async () => {
      mockFindAuthUserByEmail.mockResolvedValue(null);

      const result = await checkAdminRoleByEmail(validEmail);

      expect(result.hasAdminRole).toBe(false);
      expect(result.error).toBe("User not found");
    });

    it("should return true when user has admin role", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "admin" },
      });
      mockIsAdmin.mockReturnValue(true);

      const result = await checkAdminRoleByEmail(validEmail);

      expect(result.hasAdminRole).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return false when user does not have admin role", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: { role: "teacher" },
      });
      mockIsAdmin.mockReturnValue(false);

      const result = await checkAdminRoleByEmail(validEmail);

      expect(result.hasAdminRole).toBe(false);
    });

    it("should return false when user has no role", async () => {
      mockFindAuthUserByEmail.mockResolvedValue({
        id: "user-123",
        app_metadata: {},
      });
      mockIsAdmin.mockReturnValue(false);

      const result = await checkAdminRoleByEmail(validEmail);

      expect(result.hasAdminRole).toBe(false);
    });

    it("should handle unexpected errors", async () => {
      mockCheckRateLimit.mockRejectedValue(new Error("Network error"));

      const result = await checkAdminRoleByEmail(validEmail);

      expect(result.hasAdminRole).toBe(false);
      expect(result.error).toBe("Failed to check role");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should use email as rate limit identifier", async () => {
      mockFindAuthUserByEmail.mockResolvedValue(null);

      await checkAdminRoleByEmail(validEmail);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        expect.stringMatching(/test@example\.com/i)
      );
    });
  });
});
