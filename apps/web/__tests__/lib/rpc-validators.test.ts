/**
 * Tests for rpc-validators.ts
 */

import {
  SubmitAssessmentResponseSchema,
  UpdateKnowledgeStateResponseSchema,
  UpsertStudentProfileResponseSchema,
  GetAdaptiveQuestionsResponseSchema,
  validateSubmitAssessmentResponse,
  validateUpdateKnowledgeStateResponse,
  validateUpsertStudentProfileResponse,
  validateGetAdaptiveQuestionsResponse,
} from "@/lib/rpc-validators";

describe("rpc-validators", () => {
  describe("SubmitAssessmentResponseSchema", () => {
    it("should validate minimal valid response", () => {
      const response = { success: true };
      const result = SubmitAssessmentResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it("should validate full response with all fields", () => {
      const response = {
        success: true,
        error: undefined,
        alreadySubmitted: false,
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        moduleBreakdown: { math: 90, science: 80 },
      };
      const result = SubmitAssessmentResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it("should fail for missing success field", () => {
      const response = { score: 85 };
      const result = SubmitAssessmentResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it("should fail for invalid success type", () => {
      const response = { success: "true" };
      const result = SubmitAssessmentResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });
  });

  describe("UpdateKnowledgeStateResponseSchema", () => {
    it("should validate minimal valid response", () => {
      const response = { success: true };
      const result = UpdateKnowledgeStateResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it("should validate full response with all fields", () => {
      const response = {
        success: true,
        mastery_score: 0.85,
        confidence_level: "high",
        attempts: 5,
        status: "mastered",
        time_spent_seconds: 300,
      };
      const result = UpdateKnowledgeStateResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it("should fail for mastery_score out of range", () => {
      const response = { success: true, mastery_score: 1.5 };
      const result = UpdateKnowledgeStateResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it("should fail for invalid confidence_level", () => {
      const response = { success: true, confidence_level: "very_high" };
      const result = UpdateKnowledgeStateResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it("should fail for invalid status", () => {
      const response = { success: true, status: "unknown" };
      const result = UpdateKnowledgeStateResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it("should fail for negative attempts", () => {
      const response = { success: true, attempts: -1 };
      const result = UpdateKnowledgeStateResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });
  });

  describe("UpsertStudentProfileResponseSchema", () => {
    it("should validate minimal valid response", () => {
      const response = { success: true };
      const result = UpsertStudentProfileResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it("should validate response with code", () => {
      const response = { success: true, code: "STUDENT_123" };
      const result = UpsertStudentProfileResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it("should validate error response", () => {
      const response = { success: false, error: "Profile creation failed" };
      const result = UpsertStudentProfileResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });
  });

  describe("GetAdaptiveQuestionsResponseSchema", () => {
    it("should validate minimal valid response", () => {
      const response = { success: true };
      const result = GetAdaptiveQuestionsResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it("should validate response with questions", () => {
      const response = {
        success: true,
        questions: [
          {
            id: "q1",
            itemId: "item1",
            module: "math",
            difficulty: 0.5,
            type: "mcq",
            text: "What is 2+2?",
          },
        ],
      };
      const result = GetAdaptiveQuestionsResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });

    it("should fail for question missing required fields", () => {
      const response = {
        success: true,
        questions: [{ id: "q1" }],
      };
      const result = GetAdaptiveQuestionsResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it("should validate empty questions array", () => {
      const response = { success: true, questions: [] };
      const result = GetAdaptiveQuestionsResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });
  });

  describe("validateSubmitAssessmentResponse", () => {
    it("should return success with validated data", () => {
      const response = { success: true, score: 85 };
      const result = validateSubmitAssessmentResponse(response);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(85);
      }
    });

    it("should return error for invalid response", () => {
      const response = { score: 85 }; // missing success
      const result = validateSubmitAssessmentResponse(response);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("RPC validation failed");
      }
    });

    it("should handle non-object response", () => {
      const result = validateSubmitAssessmentResponse("invalid");

      expect(result.success).toBe(false);
    });

    it("should handle null response", () => {
      const result = validateSubmitAssessmentResponse(null);

      expect(result.success).toBe(false);
    });
  });

  describe("validateUpdateKnowledgeStateResponse", () => {
    it("should return success with validated data", () => {
      const response = { success: true, mastery_score: 0.75 };
      const result = validateUpdateKnowledgeStateResponse(response);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mastery_score).toBe(0.75);
      }
    });

    it("should return error for invalid mastery score", () => {
      const response = { success: true, mastery_score: 2.0 };
      const result = validateUpdateKnowledgeStateResponse(response);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("RPC validation failed");
      }
    });

    it("should return error for invalid status enum", () => {
      const response = { success: true, status: "invalid_status" };
      const result = validateUpdateKnowledgeStateResponse(response);

      expect(result.success).toBe(false);
    });
  });

  describe("validateUpsertStudentProfileResponse", () => {
    it("should return success with validated data", () => {
      const response = { success: true, code: "ABC123" };
      const result = validateUpsertStudentProfileResponse(response);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe("ABC123");
      }
    });

    it("should return error for invalid response", () => {
      const response = { code: "ABC123" }; // missing success
      const result = validateUpsertStudentProfileResponse(response);

      expect(result.success).toBe(false);
    });
  });

  describe("validateGetAdaptiveQuestionsResponse", () => {
    it("should return success with validated data", () => {
      const response = {
        success: true,
        questions: [
          {
            id: "q1",
            itemId: "item1",
            module: "math",
            difficulty: 0.5,
            type: "mcq",
            text: "Question text",
          },
        ],
      };
      const result = validateGetAdaptiveQuestionsResponse(response);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questions?.length).toBe(1);
      }
    });

    it("should return error for invalid question structure", () => {
      const response = {
        success: true,
        questions: [{ invalid: "question" }],
      };
      const result = validateGetAdaptiveQuestionsResponse(response);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("RPC validation failed");
      }
    });

    it("should handle undefined questions", () => {
      const response = { success: true };
      const result = validateGetAdaptiveQuestionsResponse(response);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questions).toBeUndefined();
      }
    });
  });
});
