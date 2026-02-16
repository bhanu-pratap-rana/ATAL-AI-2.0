/**
 * Tests for assessment-submission.ts server actions
 * Target: ~30 tests covering calculateIRTScore, startAssessment, submitAssessment
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  createClient: jest.fn(),
  verifyStudentAuth: jest.fn(),
}));

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn(() => true),
}));

jest.mock("@/lib/rpc-validators", () => ({
  validateSubmitAssessmentResponse: jest.fn(() => ({
    success: true,
    data: { success: true },
  })),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
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

// Mock IRT models
jest.mock("@/app/actions/assessment/irt-models", () => ({
  updateTheta: jest.fn(() => ({ theta: 0.5, se: 0.2 })),
  CATEGORIES: ["computation", "application", "reasoning"],
}));

import {
  calculateIRTScore,
  startAssessment,
  submitAssessment,
} from "@/app/actions/assessment/assessment-submission";
import { createClient, verifyStudentAuth } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { validateSubmitAssessmentResponse } from "@/lib/rpc-validators";
import { revalidatePath } from "next/cache";

// Helper to create mock Supabase client
function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
    ...overrides,
    _mockQueryBuilder: mockQueryBuilder,
  };
}

describe("assessment-submission", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const validSessionId = "660e8400-e29b-41d4-a716-446655440001";
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (verifyStudentAuth as jest.Mock).mockResolvedValue({
      authorized: true,
      user: { id: validUUID, email: "student@test.com" },
    });
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
    (validateSubmitAssessmentResponse as jest.Mock).mockReturnValue({
      success: true,
      data: { success: true },
    });
  });

  describe("calculateIRTScore", () => {
    const sampleResponses = [
      {
        itemId: "item-1",
        isCorrect: true,
        difficulty: 0.5,
        discrimination: 1.0,
        guessing: 0.25,
        category: "computation",
      },
      {
        itemId: "item-2",
        isCorrect: false,
        difficulty: 1.0,
        discrimination: 1.2,
        guessing: 0.25,
        category: "reasoning",
      },
      {
        itemId: "item-3",
        isCorrect: true,
        difficulty: 0.0,
        discrimination: 0.8,
        guessing: 0.25,
        category: "application",
      },
    ];

    it("should calculate overall theta and score", async () => {
      const result = await calculateIRTScore(sampleResponses);

      expect(result).toHaveProperty("overallTheta");
      expect(result).toHaveProperty("overallScore");
      expect(typeof result.overallTheta).toBe("number");
      expect(typeof result.overallScore).toBe("number");
    });

    it("should calculate standard error", async () => {
      const result = await calculateIRTScore(sampleResponses);

      expect(result).toHaveProperty("standardError");
      expect(typeof result.standardError).toBe("number");
    });

    it("should return proficiency level", async () => {
      const result = await calculateIRTScore(sampleResponses);

      expect(result).toHaveProperty("proficiencyLevel");
      expect(typeof result.proficiencyLevel).toBe("string");
    });

    it("should calculate category scores", async () => {
      const result = await calculateIRTScore(sampleResponses);

      expect(result).toHaveProperty("categoryScores");
      expect(typeof result.categoryScores).toBe("object");
    });

    it("should handle empty responses", async () => {
      const result = await calculateIRTScore([]);

      expect(result).toHaveProperty("overallTheta");
      expect(result).toHaveProperty("overallScore");
    });

    it("should convert theta to percentage correctly", async () => {
      const result = await calculateIRTScore(sampleResponses);

      // Score should be between 0 and 100
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe("startAssessment", () => {
    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyStudentAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authenticated" },
        });

        const result = await startAssessment();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });

      it("should call verifyStudentAuth with correct action name", async () => {
        await startAssessment();

        expect(verifyStudentAuth).toHaveBeenCalledWith("startAssessment");
      });
    });

    describe("Session Creation", () => {
      it("should create session successfully without classId", async () => {
        mockSupabase._mockQueryBuilder.single.mockResolvedValue({
          data: { id: validSessionId },
          error: null,
        });

        const result = await startAssessment();

        expect(result.success).toBe(true);
        expect(result.sessionId).toBe(validSessionId);
      });

      it("should create session with classId", async () => {
        mockSupabase._mockQueryBuilder.single.mockResolvedValue({
          data: { id: validSessionId },
          error: null,
        });

        const result = await startAssessment(validUUID);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith("assessment_sessions");
      });

      it("should handle database error", async () => {
        mockSupabase._mockQueryBuilder.single.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await startAssessment();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Database error");
      });
    });

    describe("Error Handling", () => {
      it("should handle unexpected errors", async () => {
        (createClient as jest.Mock).mockRejectedValue(new Error("Connection failed"));

        const result = await startAssessment();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Connection failed");
      });
    });
  });

  describe("submitAssessment", () => {
    const validResponses = [
      {
        itemId: "item-1",
        module: "math",
        isCorrect: true,
        rtMs: 5000,
        focusBlurCount: 0,
        chosenOption: "A",
      },
      {
        itemId: "item-2",
        module: "math",
        isCorrect: false,
        rtMs: 8000,
        focusBlurCount: 1,
        chosenOption: "B",
      },
    ];

    describe("Authorization", () => {
      it("should reject unauthorized users", async () => {
        (verifyStudentAuth as jest.Mock).mockResolvedValue({
          authorized: false,
          error: { success: false, error: "Not authenticated" },
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Not authenticated");
      });
    });

    describe("Input Validation", () => {
      it("should reject invalid session ID format", async () => {
        const result = await submitAssessment("invalid-id", validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject empty session ID", async () => {
        const result = await submitAssessment("", validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject empty responses array", async () => {
        const result = await submitAssessment(validSessionId, []);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue(false);

        // Need valid session in database
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { user_id: validUUID },
          error: null,
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many assessment submissions");
      });
    });

    describe("Session Verification", () => {
      it("should reject when session not found", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Session not found");
      });

      it("should reject when session belongs to different user", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { user_id: "different-user-id" },
          error: null,
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Unauthorized");
      });

      it("should handle session lookup error", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to verify session");
      });
    });

    describe("RPC Submission", () => {
      beforeEach(() => {
        // Setup valid session
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { user_id: validUUID },
          error: null,
        });
      });

      it("should call submit_assessment RPC with correct params", async () => {
        await submitAssessment(validSessionId, validResponses);

        expect(mockSupabase.rpc).toHaveBeenCalledWith("submit_assessment", {
          p_session_id: validSessionId,
          p_user_id: validUUID,
          p_responses: expect.arrayContaining([
            expect.objectContaining({
              itemId: "item-1",
              module: "math",
              isCorrect: true,
            }),
          ]),
        });
      });

      it("should handle RPC error", async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: { message: "RPC failed" },
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to submit assessment. Please try again.");
      });

      it("should handle RPC response validation failure", async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: { invalid: "response" },
          error: null,
        });
        (validateSubmitAssessmentResponse as jest.Mock).mockReturnValue({
          success: false,
          error: "Invalid response format",
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to submit assessment. Please try again.");
      });

      it("should handle RPC returning error status", async () => {
        (validateSubmitAssessmentResponse as jest.Mock).mockReturnValue({
          success: true,
          data: { success: false, error: "Assessment already submitted" },
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Assessment already submitted");
      });

      it("should return score on successful submission", async () => {
        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(true);
        expect(result.score).toBeDefined();
        expect(result.level).toBeDefined();
      });

      it("should revalidate paths on success", async () => {
        await submitAssessment(validSessionId, validResponses);

        expect(revalidatePath).toHaveBeenCalledWith("/app/dashboard");
        expect(revalidatePath).toHaveBeenCalledWith("/app/progress");
      });
    });

    describe("Error Handling", () => {
      it("should handle RPC returning unknown error", async () => {
        mockSupabase._mockQueryBuilder.maybeSingle.mockResolvedValue({
          data: { user_id: validUUID },
          error: null,
        });
        (validateSubmitAssessmentResponse as jest.Mock).mockReturnValue({
          success: true,
          data: { success: false }, // No error message provided
        });

        const result = await submitAssessment(validSessionId, validResponses);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Unknown error during assessment submission");
      });
    });
  });
});
