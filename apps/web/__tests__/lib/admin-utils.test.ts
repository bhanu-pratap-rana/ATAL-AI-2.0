/**
 * Tests for admin-utils.ts
 * Target: ~20 tests covering admin utility functions
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createAdminClient: jest.fn(),
  verifyAdminAuth: jest.fn(),
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

jest.mock("@/lib/validation/rpc-schemas", () => ({
  validateSupabaseAuthUsers: jest.fn((users) => users),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn(),
}));

import {
  fetchAllAuthUsers,
  findAuthUserByEmail,
  findAuthUserById,
  verifyAdminAuthAndRateLimit,
} from "@/lib/admin-utils";
import { verifyAdminAuth } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { validateSupabaseAuthUsers } from "@/lib/validation/rpc-schemas";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";

describe("admin-utils", () => {
  let mockAdminClient: {
    auth: {
      admin: {
        listUsers: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockResolvedValue(true);

    mockAdminClient = {
      auth: {
        admin: {
          listUsers: jest.fn(),
        },
      },
    };
  });

  describe("fetchAllAuthUsers", () => {
    it("should fetch users from first page", async () => {
      const mockUsers = [
        { id: "user-1", email: "user1@example.com" },
        { id: "user-2", email: "user2@example.com" },
      ];

      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const result = await fetchAllAuthUsers(mockAdminClient as any);

      expect(result).toEqual(mockUsers);
      expect(mockAdminClient.auth.admin.listUsers).toHaveBeenCalledWith({
        perPage: 1000,
        page: 1,
      });
    });

    it("should fetch multiple pages of users", async () => {
      const firstPage = Array(1000).fill(null).map((_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
      }));
      const secondPage = [
        { id: "user-1000", email: "user1000@example.com" },
      ];

      mockAdminClient.auth.admin.listUsers
        .mockResolvedValueOnce({ data: { users: firstPage }, error: null })
        .mockResolvedValueOnce({ data: { users: secondPage }, error: null });

      const result = await fetchAllAuthUsers(mockAdminClient as any);

      expect(result.length).toBe(1001);
      expect(mockAdminClient.auth.admin.listUsers).toHaveBeenCalledTimes(2);
    });

    it("should stop when receiving empty users array", async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      const result = await fetchAllAuthUsers(mockAdminClient as any);

      expect(result).toEqual([]);
    });

    it("should stop when receiving null users", async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: null },
        error: null,
      });

      const result = await fetchAllAuthUsers(mockAdminClient as any);

      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: null,
        error: { message: "API error" },
      });

      const result = await fetchAllAuthUsers(mockAdminClient as any);

      expect(result).toEqual([]);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[fetchAllAuthUsers] Error fetching auth users page",
        expect.objectContaining({ page: 1, error: "API error" })
      );
    });

    it("should handle validation errors", async () => {
      const mockUsers = [{ id: "user-1" }];
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });
      (validateSupabaseAuthUsers as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Validation failed");
      });

      const result = await fetchAllAuthUsers(mockAdminClient as any);

      expect(result).toEqual([]);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[fetchAllAuthUsers] Failed to validate users",
        expect.objectContaining({ error: "Validation failed" })
      );
    });

    it("should handle unexpected errors", async () => {
      mockAdminClient.auth.admin.listUsers.mockRejectedValue(
        new Error("Network error")
      );

      const result = await fetchAllAuthUsers(mockAdminClient as any);

      expect(result).toEqual([]);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[fetchAllAuthUsers] Unexpected error",
        expect.any(Error)
      );
    });
  });

  describe("findAuthUserByEmail", () => {
    it("should find user by email", async () => {
      const mockUsers = [
        { id: "user-1", email: "user1@example.com" },
        { id: "user-2", email: "user2@example.com" },
      ];

      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const result = await findAuthUserByEmail(
        mockAdminClient as any,
        "user2@example.com"
      );

      expect(result?.id).toBe("user-2");
    });

    it("should find user with case-insensitive email match", async () => {
      const mockUsers = [
        { id: "user-1", email: "User@EXAMPLE.com" },
      ];

      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const result = await findAuthUserByEmail(
        mockAdminClient as any,
        "user@example.com"
      );

      expect(result?.id).toBe("user-1");
    });

    it("should return undefined when user not found", async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      const result = await findAuthUserByEmail(
        mockAdminClient as any,
        "notfound@example.com"
      );

      expect(result).toBeUndefined();
    });
  });

  describe("findAuthUserById", () => {
    it("should find user by ID", async () => {
      const mockUsers = [
        { id: "user-1", email: "user1@example.com" },
        { id: "user-2", email: "user2@example.com" },
      ];

      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const result = await findAuthUserById(mockAdminClient as any, "user-2");

      expect(result?.email).toBe("user2@example.com");
    });

    it("should return undefined when user ID not found", async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      const result = await findAuthUserById(mockAdminClient as any, "nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("verifyAdminAuthAndRateLimit", () => {
    it("should return authorized when auth and rate limit pass", async () => {
      (verifyAdminAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: { id: "admin-123", email: "admin@example.com" },
      });
      (checkRateLimit as jest.Mock).mockResolvedValue(true);

      const result = await verifyAdminAuthAndRateLimit("testAction", {
        maxTokens: 10,
        refillRate: 1,
        refillInterval: 1000,
      });

      expect(result.authorized).toBe(true);
      expect((result as any).user?.id).toBe("admin-123");
    });

    it("should return unauthorized when auth fails", async () => {
      (verifyAdminAuth as jest.Mock).mockResolvedValue({
        authorized: false,
        error: { success: false, error: "Not authenticated" },
      });

      const result = await verifyAdminAuthAndRateLimit("testAction", {
        maxTokens: 10,
        refillRate: 1,
        refillInterval: 1000,
      });

      expect(result.authorized).toBe(false);
      expect((result as any).error).toEqual({
        success: false,
        error: "Not authenticated",
      });
    });

    it("should return unauthorized when rate limit exceeded", async () => {
      (verifyAdminAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: { id: "admin-123" },
      });
      (checkRateLimit as jest.Mock).mockResolvedValue(false);

      const result = await verifyAdminAuthAndRateLimit("blockedAction", {
        maxTokens: 10,
        refillRate: 1,
        refillInterval: 1000,
      });

      expect(result.authorized).toBe(false);
      expect((result as any).error.error).toContain("Too many requests");
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[blockedAction] Rate limit exceeded",
        { userId: "admin-123" }
      );
    });

    it("should use correct rate limit key format", async () => {
      (verifyAdminAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: { id: "admin-456" },
      });

      await verifyAdminAuthAndRateLimit("getDashboardMetrics", {
        maxTokens: 100,
        refillRate: 0.1,
        refillInterval: 1000,
      });

      expect(checkRateLimit).toHaveBeenCalledWith(
        "admin-getDashboardMetrics:admin-456",
        expect.any(Object)
      );
    });

    it("should not check rate limit if auth fails", async () => {
      (verifyAdminAuth as jest.Mock).mockResolvedValue({
        authorized: false,
        error: "Unauthorized",
      });

      await verifyAdminAuthAndRateLimit("testAction", {
        maxTokens: 10,
        refillRate: 1,
        refillInterval: 1000,
      });

      expect(checkRateLimit).not.toHaveBeenCalled();
    });
  });
});
