/**
 * Tests for auth-factory.ts
 */

import { verifyRoleAuth, verifyProfileAuth } from "@/lib/auth-factory";

// Mock dependencies
jest.mock("@/lib/supabase-server", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";

const mockGetCurrentUser = getCurrentUser as jest.Mock;

describe("auth-factory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyRoleAuth", () => {
    const defaultOptions = {
      functionName: "TestFunction",
      requiredRoles: ["admin", "super_admin"],
      errorMessage: "Admin access required",
    };

    it("should return unauthorized when no user is authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await verifyRoleAuth(defaultOptions);

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe("Authentication required");
      }
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[TestFunction] Unauthorized: No authenticated user"
      );
    });

    it("should return authorized when user has required role", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: { role: "admin" },
      };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const result = await verifyRoleAuth(defaultOptions);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.user).toEqual(mockUser);
      }
    });

    it("should return authorized for super_admin role", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: { role: "super_admin" },
      };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const result = await verifyRoleAuth(defaultOptions);

      expect(result.authorized).toBe(true);
    });

    it("should return forbidden when user lacks required role", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: { role: "student" },
      };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const result = await verifyRoleAuth(defaultOptions);

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe("Admin access required");
      }
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[TestFunction] Forbidden: Role check failed",
        expect.objectContaining({
          userId: "user-123",
          requiredRoles: ["admin", "super_admin"],
          actualRole: "student",
        })
      );
    });

    it("should return forbidden when user has no role", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: {},
      };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const result = await verifyRoleAuth(defaultOptions);

      expect(result.authorized).toBe(false);
    });

    it("should include log context in warning", async () => {
      const mockUser = {
        id: "user-123",
        app_metadata: { role: "teacher" },
      };
      mockGetCurrentUser.mockResolvedValue(mockUser);

      await verifyRoleAuth({
        ...defaultOptions,
        logContext: { schoolId: "school-456" },
      });

      expect(authLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          schoolId: "school-456",
        })
      );
    });
  });

  describe("verifyProfileAuth", () => {
    const defaultOptions = {
      functionName: "TestFunction",
      profileCheckFn: jest.fn(),
      notFoundMessage: "Profile not found",
      errorMessage: "Profile check failed",
    };

    it("should return unauthorized when no user is authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await verifyProfileAuth(defaultOptions);

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe("Authentication required");
      }
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[TestFunction] Unauthorized: No authenticated user"
      );
    });

    it("should return authorized when profile check passes", async () => {
      const mockUser = { id: "user-123" };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const profileCheckFn = jest.fn().mockResolvedValue(true);

      const result = await verifyProfileAuth({
        ...defaultOptions,
        profileCheckFn,
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.user).toEqual(mockUser);
      }
      expect(profileCheckFn).toHaveBeenCalledWith(mockUser);
    });

    it("should return forbidden when profile check fails", async () => {
      const mockUser = { id: "user-123" };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const profileCheckFn = jest.fn().mockResolvedValue(false);

      const result = await verifyProfileAuth({
        ...defaultOptions,
        profileCheckFn,
      });

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe("Profile not found");
      }
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[TestFunction] Forbidden: User profile not found",
        expect.objectContaining({ userId: "user-123" })
      );
    });

    it("should return error when profile check throws", async () => {
      const mockUser = { id: "user-123" };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const profileCheckFn = jest.fn().mockRejectedValue(new Error("DB error"));

      const result = await verifyProfileAuth({
        ...defaultOptions,
        profileCheckFn,
      });

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe("Profile check failed");
      }
      expect(authLogger.error).toHaveBeenCalledWith(
        "[TestFunction] Failed to verify user profile",
        expect.any(Error)
      );
    });

    it("should handle non-Error thrown by profile check", async () => {
      const mockUser = { id: "user-123" };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const profileCheckFn = jest.fn().mockRejectedValue("String error");

      const result = await verifyProfileAuth({
        ...defaultOptions,
        profileCheckFn,
      });

      expect(result.authorized).toBe(false);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[TestFunction] Failed to verify user profile",
        expect.objectContaining({ error: "String error" })
      );
    });

    it("should include profile data when provided", async () => {
      const mockUser = { id: "user-123" };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const profileCheckFn = jest.fn().mockResolvedValue(true);
      const profileData = { name: "Test User", school: "ABC School" };

      const result = await verifyProfileAuth({
        ...defaultOptions,
        profileCheckFn,
        profileData,
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.profile).toEqual(profileData);
      }
    });

    it("should return empty profile when not provided", async () => {
      const mockUser = { id: "user-123" };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const profileCheckFn = jest.fn().mockResolvedValue(true);

      const result = await verifyProfileAuth({
        ...defaultOptions,
        profileCheckFn,
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.profile).toEqual({});
      }
    });

    it("should include log context in warning", async () => {
      const mockUser = { id: "user-123" };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const profileCheckFn = jest.fn().mockResolvedValue(false);

      await verifyProfileAuth({
        ...defaultOptions,
        profileCheckFn,
        logContext: { action: "update" },
      });

      expect(authLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          action: "update",
        })
      );
    });
  });
});
