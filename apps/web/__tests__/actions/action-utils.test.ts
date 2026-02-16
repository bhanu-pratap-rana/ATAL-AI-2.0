/**
 * Tests for Server Action Utilities
 *
 * Tests utility functions for server actions including:
 * - Zod validation handling
 * - Error response creation
 * - Success response creation
 * - Error handling
 */

import { z } from "zod";
import {
  validateInput,
  createErrorResponse,
  createSuccessResponse,
  handleActionError,
} from "@/app/actions/action-utils";

// Mock auth logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe("action-utils", () => {
  describe("validateInput", () => {
    const TestSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email format"),
      age: z.number().min(0, "Age must be positive"),
    });

    it("should return success with valid data", () => {
      const input = { name: "John", email: "john@example.com", age: 25 };
      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
      expect(result.error).toBeUndefined();
    });

    it("should return error for invalid data", () => {
      const input = { name: "", email: "john@example.com", age: 25 };
      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
      expect(result.data).toBeUndefined();
    });

    it("should return first error message for multiple invalid fields", () => {
      const input = { name: "", email: "invalid", age: -1 };
      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle email validation errors", () => {
      const input = { name: "John", email: "invalid-email", age: 25 };
      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid email format");
    });

    it("should handle number validation errors", () => {
      const input = { name: "John", email: "john@example.com", age: -5 };
      const result = validateInput(input, TestSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Age must be positive");
    });

    it("should return 'Invalid input' for generic zod errors", () => {
      const BrokenSchema = z.string().refine(() => false);
      const result = validateInput("test", BrokenSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should rethrow non-Zod errors", () => {
      const ErrorSchema = {
        parse: () => {
          throw new TypeError("Not a Zod error");
        },
      };

      expect(() =>
        validateInput("test", ErrorSchema as unknown as z.ZodSchema)
      ).toThrow(TypeError);
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response with message", () => {
      const result = createErrorResponse("Something went wrong");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Something went wrong");
    });

    it("should not include data in error response", () => {
      const result = createErrorResponse("Error occurred");

      expect(result.data).toBeUndefined();
    });
  });

  describe("createSuccessResponse", () => {
    it("should create success response without data", () => {
      const result = createSuccessResponse();

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it("should create success response with data", () => {
      const result = createSuccessResponse({ id: "123", name: "Test" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "123", name: "Test" });
    });

    it("should preserve data types", () => {
      const data = { count: 42, active: true, items: [1, 2, 3] };
      const result = createSuccessResponse(data);

      expect(result.data).toEqual(data);
    });
  });

  describe("handleActionError", () => {
    it("should return generic error message", () => {
      const result = handleActionError("TestContext", new Error("Secret error"));

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should not expose error details in response", () => {
      const sensitiveError = new Error("Database connection failed: password=secret");
      const result = handleActionError("DbAction", sensitiveError);

      expect(result.error).not.toContain("password");
      expect(result.error).not.toContain("secret");
    });

    it("should handle non-Error objects", () => {
      const result = handleActionError("TestContext", "string error");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });

    it("should handle null/undefined errors", () => {
      const result = handleActionError("TestContext", null);

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });
});
