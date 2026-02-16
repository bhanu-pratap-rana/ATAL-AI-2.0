/**
 * Tests for School Utilities
 *
 * Tests utility functions for school actions including:
 * - School code normalization
 * - Zod validation error handling
 */

import { z } from "zod";
import {
  normalizeSchoolCode,
  handleZodValidationError,
} from "@/app/actions/school/school-utils";

describe("school-utils", () => {
  describe("normalizeSchoolCode", () => {
    it("should convert to uppercase", () => {
      expect(normalizeSchoolCode("school")).toBe("SCHOOL");
    });

    it("should trim whitespace", () => {
      expect(normalizeSchoolCode("  SCHOOL  ")).toBe("SCHOOL");
    });

    it("should handle mixed case and whitespace", () => {
      expect(normalizeSchoolCode("  ScHoOl  ")).toBe("SCHOOL");
    });

    it("should handle alphanumeric codes", () => {
      expect(normalizeSchoolCode("sch001")).toBe("SCH001");
    });

    it("should handle already normalized code", () => {
      expect(normalizeSchoolCode("SCHOOL")).toBe("SCHOOL");
    });

    it("should handle empty string", () => {
      expect(normalizeSchoolCode("")).toBe("");
    });

    it("should handle code with leading zeros", () => {
      expect(normalizeSchoolCode("001abc")).toBe("001ABC");
    });
  });

  describe("handleZodValidationError", () => {
    it("should extract first error message from ZodError", () => {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
      });

      try {
        schema.parse({ name: "" });
      } catch (error) {
        const result = handleZodValidationError(error);
        expect(result.success).toBe(false);
        expect(result.error).toBe("Name is required");
      }
    });

    it("should return generic message for non-Zod errors", () => {
      const result = handleZodValidationError(new Error("Some error"));

      expect(result.success).toBe(false);
      expect(result.error).toBe("Validation failed");
    });

    it("should return generic message for string errors", () => {
      const result = handleZodValidationError("string error");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Validation failed");
    });

    it("should return generic message for null/undefined", () => {
      expect(handleZodValidationError(null).error).toBe("Validation failed");
      expect(handleZodValidationError(undefined).error).toBe("Validation failed");
    });

    it("should handle multiple validation errors", () => {
      const schema = z.object({
        name: z.string().min(1, "Name required"),
        email: z.string().email("Invalid email"),
      });

      try {
        schema.parse({ name: "", email: "invalid" });
      } catch (error) {
        const result = handleZodValidationError(error);
        expect(result.success).toBe(false);
        // Should return first error
        expect(result.error).toBeDefined();
      }
    });

    it("should always return success: false", () => {
      const result = handleZodValidationError(new Error());
      expect(result.success).toBe(false);
    });
  });
});
