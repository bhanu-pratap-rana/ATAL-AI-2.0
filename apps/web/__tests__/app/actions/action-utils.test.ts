/**
 * Tests for app/actions/action-utils.ts
 * Shared utilities for server actions validation
 */

import { z } from "zod";

// Mock auth logger before imports
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  validateInput,
  createErrorResponse,
  createSuccessResponse,
  handleActionError,
} from "@/app/actions/action-utils";
import { authLogger } from "@/lib/auth-logger";

describe("action-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateInput", () => {
    const TestSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
      age: z.number().min(0, "Age must be positive").optional(),
    });

    it("should return success with data for valid input", () => {
      const input = { name: "John Doe", email: "john@example.com" };

      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
      expect(result.error).toBeUndefined();
    });

    it("should return success with transformed data", () => {
      const TrimSchema = z.object({
        name: z.string().trim(),
      });
      const input = { name: "  John  " };

      const result = validateInput(input, TrimSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: "John" });
    });

    it("should return error for invalid input", () => {
      const input = { name: "", email: "invalid-email" };

      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it("should return first error message from Zod", () => {
      const input = { name: "", email: "invalid" };

      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
    });

    it("should handle missing required fields", () => {
      const input = {};

      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle wrong type inputs", () => {
      const input = { name: 123, email: "test@test.com" };

      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(false);
    });

    it("should pass optional fields correctly", () => {
      const input = { name: "John", email: "john@example.com", age: 25 };

      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(true);
      expect(result.data?.age).toBe(25);
    });

    it("should handle nested schema validation", () => {
      const NestedSchema = z.object({
        user: z.object({
          name: z.string(),
        }),
      });
      const input = { user: { name: "John" } };

      const result = validateInput(input, NestedSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });

    it("should handle array schema validation", () => {
      const ArraySchema = z.object({
        tags: z.array(z.string()).min(1, "At least one tag required"),
      });

      const result = validateInput({ tags: [] }, ArraySchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe("At least one tag required");
    });

    it("should re-throw non-Zod errors", () => {
      const ThrowingSchema = {
        parse: () => {
          throw new Error("Custom error");
        },
      } as unknown as z.ZodSchema;

      expect(() => validateInput({}, ThrowingSchema)).toThrow("Custom error");
    });

    it("should handle null input", () => {
      const result = validateInput(null, TestSchema);

      expect(result.success).toBe(false);
    });

    it("should handle undefined input", () => {
      const result = validateInput(undefined, TestSchema);

      expect(result.success).toBe(false);
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response with message", () => {
      const result = createErrorResponse("Something went wrong");

      expect(result).toEqual({
        success: false,
        error: "Something went wrong",
      });
    });

    it("should create error response with empty message", () => {
      const result = createErrorResponse("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("");
    });

    it("should not include data property", () => {
      const result = createErrorResponse("Error");

      expect(result).not.toHaveProperty("data");
    });
  });

  describe("createSuccessResponse", () => {
    it("should create success response without data", () => {
      const result = createSuccessResponse();

      expect(result).toEqual({
        success: true,
        data: undefined,
      });
    });

    it("should create success response with data", () => {
      const data = { id: "123", name: "Test" };

      const result = createSuccessResponse(data);

      expect(result).toEqual({
        success: true,
        data,
      });
    });

    it("should create success response with array data", () => {
      const data = [1, 2, 3];

      const result = createSuccessResponse(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it("should create success response with null data", () => {
      const result = createSuccessResponse(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should not include error property", () => {
      const result = createSuccessResponse({ test: true });

      expect(result).not.toHaveProperty("error");
    });
  });

  describe("handleActionError", () => {
    it("should log error and return generic response", () => {
      const error = new Error("Database connection failed");

      const result = handleActionError("testAction", error);

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testAction] Unexpected error",
        error
      );
    });

    it("should handle string error", () => {
      const result = handleActionError("testAction", "String error");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle null error", () => {
      const result = handleActionError("testAction", null);

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should handle undefined error", () => {
      const result = handleActionError("testAction", undefined);

      expect(result.success).toBe(false);
    });

    it("should handle object error", () => {
      const result = handleActionError("testAction", { code: "ERR001" });

      expect(result.success).toBe(false);
      expect(authLogger.error).toHaveBeenCalledWith(
        "[testAction] Unexpected error",
        { code: "ERR001" }
      );
    });

    it("should include context in log message", () => {
      handleActionError("createUser", new Error("test"));

      expect(authLogger.error).toHaveBeenCalledWith(
        "[createUser] Unexpected error",
        expect.any(Error)
      );
    });
  });
});
