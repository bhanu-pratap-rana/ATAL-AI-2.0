/**
 * Tests for rpc-schemas.ts
 * Target: ~20 tests covering Zod schema validation
 */

import {
  SupabaseAuthUserSchema,
  SupabaseAuthUserArraySchema,
  AssessmentResponsePayloadSchema,
  MutationQueuePayloadSchema,
  CursorPaginationItemSchema,
  validateSupabaseAuthUsers,
  validateAssessmentResponsePayload,
  validateMutationQueuePayload,
  validateCursorPaginationItem,
} from "@/lib/validation/rpc-schemas";
import { z } from "zod";

describe("rpc-schemas", () => {
  describe("SupabaseAuthUserSchema", () => {
    it("should validate a valid auth user", () => {
      const validUser = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
      };

      const result = SupabaseAuthUserSchema.parse(validUser);
      expect(result.id).toBe(validUser.id);
      expect(result.email).toBe(validUser.email);
    });

    it("should reject invalid UUID", () => {
      const invalidUser = {
        id: "not-a-uuid",
        email: "test@example.com",
      };

      expect(() => SupabaseAuthUserSchema.parse(invalidUser)).toThrow(z.ZodError);
    });

    it("should reject invalid email", () => {
      const invalidUser = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "not-an-email",
      };

      expect(() => SupabaseAuthUserSchema.parse(invalidUser)).toThrow(z.ZodError);
    });

    it("should allow optional fields", () => {
      const minimalUser = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = SupabaseAuthUserSchema.parse(minimalUser);
      expect(result.id).toBe(minimalUser.id);
      expect(result.email).toBeUndefined();
    });

    it("should allow additional fields (passthrough)", () => {
      const userWithExtra = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        customField: "extra-value",
      };

      const result = SupabaseAuthUserSchema.parse(userWithExtra);
      expect(result).toHaveProperty("customField", "extra-value");
    });

    it("should accept app_metadata and user_metadata", () => {
      const userWithMetadata = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        app_metadata: { role: "admin" },
        user_metadata: { name: "Test User" },
      };

      const result = SupabaseAuthUserSchema.parse(userWithMetadata);
      expect(result.app_metadata).toEqual({ role: "admin" });
      expect(result.user_metadata).toEqual({ name: "Test User" });
    });
  });

  describe("SupabaseAuthUserArraySchema", () => {
    it("should validate array of users", () => {
      const users = [
        { id: "123e4567-e89b-12d3-a456-426614174000", email: "a@test.com" },
        { id: "223e4567-e89b-12d3-a456-426614174000", email: "b@test.com" },
      ];

      const result = SupabaseAuthUserArraySchema.parse(users);
      expect(result).toHaveLength(2);
    });

    it("should accept empty array", () => {
      const result = SupabaseAuthUserArraySchema.parse([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("AssessmentResponsePayloadSchema", () => {
    it("should validate a valid assessment response", () => {
      const validPayload = {
        session_id: "123e4567-e89b-12d3-a456-426614174000",
        item_id: "223e4567-e89b-12d3-a456-426614174000",
        response: "A",
        is_correct: true,
      };

      const result = AssessmentResponsePayloadSchema.parse(validPayload);
      expect(result.is_correct).toBe(true);
    });

    it("should accept number response", () => {
      const payload = {
        session_id: "123e4567-e89b-12d3-a456-426614174000",
        item_id: "223e4567-e89b-12d3-a456-426614174000",
        response: 42,
        is_correct: false,
      };

      const result = AssessmentResponsePayloadSchema.parse(payload);
      expect(result.response).toBe(42);
    });

    it("should accept array of strings response", () => {
      const payload = {
        session_id: "123e4567-e89b-12d3-a456-426614174000",
        item_id: "223e4567-e89b-12d3-a456-426614174000",
        response: ["A", "B", "C"],
        is_correct: true,
      };

      const result = AssessmentResponsePayloadSchema.parse(payload);
      expect(result.response).toEqual(["A", "B", "C"]);
    });

    it("should accept optional time_spent_ms", () => {
      const payload = {
        session_id: "123e4567-e89b-12d3-a456-426614174000",
        item_id: "223e4567-e89b-12d3-a456-426614174000",
        response: "A",
        is_correct: true,
        time_spent_ms: 5000,
      };

      const result = AssessmentResponsePayloadSchema.parse(payload);
      expect(result.time_spent_ms).toBe(5000);
    });

    it("should reject negative time_spent_ms", () => {
      const payload = {
        session_id: "123e4567-e89b-12d3-a456-426614174000",
        item_id: "223e4567-e89b-12d3-a456-426614174000",
        response: "A",
        is_correct: true,
        time_spent_ms: -100,
      };

      expect(() => AssessmentResponsePayloadSchema.parse(payload)).toThrow(z.ZodError);
    });
  });

  describe("MutationQueuePayloadSchema", () => {
    it("should accept any record", () => {
      const payload = {
        type: "assessment",
        data: { question: 1, answer: "A" },
      };

      const result = MutationQueuePayloadSchema.parse(payload);
      expect(result).toEqual(payload);
    });

    it("should accept empty object", () => {
      const result = MutationQueuePayloadSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe("CursorPaginationItemSchema", () => {
    it("should validate a valid pagination item", () => {
      const item = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = CursorPaginationItemSchema.parse(item);
      expect(result.id).toBe(item.id);
    });

    it("should accept optional created_at", () => {
      const item = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        created_at: "2024-01-15T10:00:00.000Z",
      };

      const result = CursorPaginationItemSchema.parse(item);
      expect(result.created_at).toBe(item.created_at);
    });
  });

  describe("validateSupabaseAuthUsers", () => {
    it("should return validated users array", () => {
      const users = [
        { id: "123e4567-e89b-12d3-a456-426614174000", email: "a@test.com" },
      ];

      const result = validateSupabaseAuthUsers(users);
      expect(result).toHaveLength(1);
    });

    it("should throw on invalid input", () => {
      expect(() => validateSupabaseAuthUsers("not-an-array")).toThrow(z.ZodError);
    });
  });

  describe("validateAssessmentResponsePayload", () => {
    it("should return validated payload", () => {
      const payload = {
        session_id: "123e4567-e89b-12d3-a456-426614174000",
        item_id: "223e4567-e89b-12d3-a456-426614174000",
        response: "A",
        is_correct: true,
      };

      const result = validateAssessmentResponsePayload(payload);
      expect(result.is_correct).toBe(true);
    });

    it("should throw on missing required fields", () => {
      expect(() => validateAssessmentResponsePayload({})).toThrow(z.ZodError);
    });
  });

  describe("validateMutationQueuePayload", () => {
    it("should return validated payload", () => {
      const payload = { data: "test" };
      const result = validateMutationQueuePayload(payload);
      expect(result).toEqual(payload);
    });
  });

  describe("validateCursorPaginationItem", () => {
    it("should return validated item", () => {
      const item = { id: "123e4567-e89b-12d3-a456-426614174000" };
      const result = validateCursorPaginationItem(item);
      expect(result.id).toBe(item.id);
    });

    it("should throw on invalid UUID", () => {
      expect(() => validateCursorPaginationItem({ id: "invalid" })).toThrow(z.ZodError);
    });
  });
});
