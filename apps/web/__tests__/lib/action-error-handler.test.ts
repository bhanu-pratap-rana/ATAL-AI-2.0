/**
 * Tests for action-error-handler.ts
 */

import { z } from "zod";
import {
  handleZodError,
  handleUnexpectedError,
  handleDatabaseError,
  handleAuthError,
  handleRateLimitError,
  handleValidationError,
  successResponse,
} from "@/lib/action-error-handler";

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { authLogger } from "@/lib/auth-logger";

describe("action-error-handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleZodError", () => {
    it("should return error response for ZodError with first issue message", () => {
      const schema = z.object({
        email: z.string().email("Invalid email format"),
        name: z.string().min(2, "Name too short"),
      });

      try {
        schema.parse({ email: "invalid", name: "a" });
      } catch (error) {
        const result = handleZodError(error);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid email format");
      }
    });

    it("should return default message when ZodError has no issues", () => {
      const zodError = new z.ZodError([]);
      const result = handleZodError(zodError);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
    });

    it("should re-throw non-ZodError errors", () => {
      const regularError = new Error("Not a Zod error");

      expect(() => handleZodError(regularError)).toThrow("Not a Zod error");
    });

    it("should re-throw string errors", () => {
      expect(() => handleZodError("String error")).toThrow("String error");
    });
  });

  describe("handleUnexpectedError", () => {
    it("should log error and return generic error response", () => {
      const error = new Error("Something broke");
      const result = handleUnexpectedError(error, "TestAction");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred. Please try again.");
      expect(authLogger.error).toHaveBeenCalledWith(
        "[TestAction] Unexpected error",
        expect.objectContaining({ error: "Something broke" })
      );
    });

    it("should handle non-Error objects", () => {
      const result = handleUnexpectedError("String error", "TestAction");

      expect(result.success).toBe(false);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[TestAction] Unexpected error",
        expect.objectContaining({ error: "String error" })
      );
    });

    it("should include context in log message", () => {
      const error = new Error("Error");
      const context = { userId: "123", operation: "create" };
      handleUnexpectedError(error, "TestAction", context);

      expect(authLogger.error).toHaveBeenCalledWith(
        "[TestAction] Unexpected error",
        expect.objectContaining({
          error: "Error",
          userId: "123",
          operation: "create",
        })
      );
    });
  });

  describe("handleDatabaseError", () => {
    it("should log database error and return generic error response", () => {
      const error = new Error("Connection failed");
      const result = handleDatabaseError(error, "TestAction", "insert");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database operation failed. Please try again.");
      expect(authLogger.error).toHaveBeenCalledWith(
        "[TestAction] Database error during insert",
        expect.objectContaining({ error: "Connection failed" })
      );
    });

    it("should handle non-Error objects", () => {
      const result = handleDatabaseError("DB error", "TestAction", "update");

      expect(result.success).toBe(false);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[TestAction] Database error during update",
        expect.objectContaining({ error: "DB error" })
      );
    });
  });

  describe("handleAuthError", () => {
    it("should return auth error with provided reason", () => {
      const result = handleAuthError("Invalid token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid token");
    });

    it("should return default message for empty reason", () => {
      const result = handleAuthError("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Authentication failed. Please login again.");
    });
  });

  describe("handleRateLimitError", () => {
    it("should log warning and return rate limit error", () => {
      const result = handleRateLimitError("TestAction", "user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Too many requests. Please try again later.");
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[TestAction] Rate limit exceeded",
        { userId: "user-123" }
      );
    });
  });

  describe("handleValidationError", () => {
    it("should return validation error with provided message", () => {
      const result = handleValidationError("Email is required");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email is required");
    });

    it("should return error with empty message if provided", () => {
      const result = handleValidationError("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("");
    });
  });

  describe("successResponse", () => {
    it("should return success response without data", () => {
      const result = successResponse();

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it("should return success response with data", () => {
      const data = { id: "123", name: "Test" };
      const result = successResponse(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("should return success response with array data", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = successResponse(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("should return success response with primitive data", () => {
      const result = successResponse(42);

      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });
  });
});
