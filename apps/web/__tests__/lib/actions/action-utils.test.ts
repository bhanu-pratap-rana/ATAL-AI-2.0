/**
 * Tests for lib/actions/action-utils.ts
 * Server action utilities for auth and query execution
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  executeAction,
  verifyAuth,
  verifyRole,
  validateRequired,
  executeQuery,
} from "@/lib/actions/action-utils";
import { createClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";

const mockCreateClient = createClient as jest.Mock;

describe("lib/actions/action-utils", () => {
  let mockSupabaseClient: {
    auth: {
      getUser: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };

    mockCreateClient.mockResolvedValue(mockSupabaseClient);
  });

  describe("executeAction", () => {
    it("should return success with data when handler succeeds", async () => {
      const handler = jest.fn().mockResolvedValue({ id: "123", name: "Test" });

      const result = await executeAction(handler, "[testAction]");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "123", name: "Test" });
      expect(result.error).toBeUndefined();
    });

    it("should return success with array data", async () => {
      const handler = jest.fn().mockResolvedValue([1, 2, 3]);

      const result = await executeAction(handler, "[testAction]");

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it("should return success with null data", async () => {
      const handler = jest.fn().mockResolvedValue(null);

      const result = await executeAction(handler, "[testAction]");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should return error when handler throws Error", async () => {
      const handler = jest.fn().mockRejectedValue(new Error("Database error"));

      const result = await executeAction(handler, "[testAction]");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testAction] - Action failed",
        expect.any(Object)
      );
    });

    it("should return 'Unknown error' for non-Error throws", async () => {
      const handler = jest.fn().mockRejectedValue("string error");

      const result = await executeAction(handler, "[testAction]");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should include context in error log", async () => {
      const handler = jest.fn().mockRejectedValue(new Error("test"));

      await executeAction(handler, "[myContext]");

      expect(authLogger.error).toHaveBeenCalledWith(
        "[myContext] - Action failed",
        expect.any(Object)
      );
    });
  });

  describe("verifyAuth", () => {
    it("should return success with user when authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      const result = await verifyAuth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe("user-123");
        expect(result.user.email).toBe("test@example.com");
      }
    });

    it("should return error when user is null", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await verifyAuth();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized");
      }
    });

    it("should return error when getUser returns error", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session expired" },
      });

      const result = await verifyAuth();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized");
      }
    });

    it("should return error when exception occurs", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const result = await verifyAuth();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Authentication check failed");
      }
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle user without email", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await verifyAuth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe("user-123");
        expect(result.user.email).toBeUndefined();
      }
    });
  });

  describe("verifyRole", () => {
    it("should return success when user has correct admin role", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "admin@example.com",
            app_metadata: { role: "admin" },
          },
        },
        error: null,
      });

      const result = await verifyRole("admin");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe("user-123");
      }
    });

    it("should return success when user has correct teacher role", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            app_metadata: { role: "teacher" },
          },
        },
        error: null,
      });

      const result = await verifyRole("teacher");

      expect(result.success).toBe(true);
    });

    it("should return success when user has correct student role", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            app_metadata: { role: "student" },
          },
        },
        error: null,
      });

      const result = await verifyRole("student");

      expect(result.success).toBe(true);
    });

    it("should return error when user has wrong role", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            app_metadata: { role: "student" },
          },
        },
        error: null,
      });

      const result = await verifyRole("admin");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Requires admin role");
      }
    });

    it("should return error when user has no role", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            app_metadata: {},
          },
        },
        error: null,
      });

      const result = await verifyRole("teacher");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Requires teacher role");
      }
    });

    it("should return error when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await verifyRole("admin");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized");
      }
    });

    it("should handle exception and log error", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Network error")
      );

      const result = await verifyRole("admin");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Role verification failed");
      }
      expect(authLogger.error).toHaveBeenCalledWith(
        "[verifyRole:admin] Exception",
        expect.any(Error)
      );
    });
  });

  describe("validateRequired", () => {
    it("should return true when all required fields are present", () => {
      const data = { name: "John", email: "john@example.com", age: 25 };

      const result = validateRequired(data, ["name", "email"]);

      expect(result).toBe(true);
    });

    it("should return false when a required field is missing", () => {
      const data = { name: "John" };

      const result = validateRequired(data, ["name", "email"]);

      expect(result).toBe(false);
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[validateRequired] Missing field",
        { field: "email" }
      );
    });

    it("should return false when required field is undefined", () => {
      const data = { name: "John", email: undefined };

      const result = validateRequired(data, ["name", "email"]);

      expect(result).toBe(false);
    });

    it("should return false when required field is null", () => {
      const data = { name: "John", email: null };

      const result = validateRequired(data, ["name", "email"]);

      expect(result).toBe(false);
    });

    it("should return false when required field is empty string", () => {
      const data = { name: "John", email: "" };

      const result = validateRequired(data, ["name", "email"]);

      expect(result).toBe(false);
    });

    it("should return true when no required fields specified", () => {
      const data = {};

      const result = validateRequired(data, []);

      expect(result).toBe(true);
    });

    it("should log warning for first missing field", () => {
      const data = {};

      validateRequired(data, ["field1", "field2"]);

      expect(authLogger.warn).toHaveBeenCalledTimes(1);
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[validateRequired] Missing field",
        { field: "field1" }
      );
    });
  });

  describe("executeQuery", () => {
    it("should return data when query succeeds", async () => {
      const queryFn = jest.fn().mockResolvedValue({
        data: [{ id: 1, name: "Test" }],
        error: null,
      });

      const result = await executeQuery(queryFn, "[testQuery]");

      expect(result).toEqual([{ id: 1, name: "Test" }]);
    });

    it("should throw error when query returns error", async () => {
      const queryFn = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Connection failed" },
      });

      await expect(executeQuery(queryFn, "[testQuery]")).rejects.toThrow(
        "Connection failed"
      );
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testQuery] - Query failed",
        expect.any(Object)
      );
    });

    it("should throw error when data is null", async () => {
      const queryFn = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(executeQuery(queryFn, "[testQuery]")).rejects.toThrow(
        "No data returned from database"
      );
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[testQuery] - No data returned"
      );
    });

    it("should use generic message when error has no message", async () => {
      const queryFn = jest.fn().mockResolvedValue({
        data: null,
        error: {},
      });

      await expect(executeQuery(queryFn, "[testQuery]")).rejects.toThrow(
        "Database query failed"
      );
    });

    it("should return empty array as valid data", async () => {
      const queryFn = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await executeQuery(queryFn, "[testQuery]");

      expect(result).toEqual([]);
    });

    it("should include context in error log", async () => {
      const queryFn = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "test error" },
      });

      try {
        await executeQuery(queryFn, "[myContext]");
      } catch {
        // expected
      }

      expect(authLogger.error).toHaveBeenCalledWith(
        "[myContext] - Query failed",
        expect.any(Object)
      );
    });
  });
});
