/**
 * Tests for AdaptiveLearningService
 * Target: ~40 tests covering behavior tracking, learning styles, knowledge state, and recommendations
 */

// Mock dependencies
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
};

jest.mock("@/lib/supabase-server", () => ({
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/lib/rpc-validators", () => ({
  validateUpdateKnowledgeStateResponse: jest.fn((data) => ({
    success: true,
    data: data,
  })),
}));

import {
  AdaptiveLearningService,
  type BehaviorSignal,
  type TopicPerformance,
} from "@/lib/ai/services/adaptive-service";

describe("AdaptiveLearningService", () => {
  let service: AdaptiveLearningService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdaptiveLearningService();
  });

  describe("trackBehavior", () => {
    it("should call increment_visual_score RPC for image_viewed signal", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const signal: BehaviorSignal = {
        type: "image_viewed",
        duration: 10,
      };

      await service.trackBehavior("student-123", signal);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("increment_visual_score", {
        p_student_id: "student-123",
        p_time_seconds: 10,
      });
    });

    it("should use default duration of 5 seconds for image_viewed", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const signal: BehaviorSignal = { type: "image_viewed" };

      await service.trackBehavior("student-123", signal);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("increment_visual_score", {
        p_student_id: "student-123",
        p_time_seconds: 5,
      });
    });

    it("should call increment_auditory_score RPC for voice_replay signal", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const signal: BehaviorSignal = { type: "voice_replay" };

      await service.trackBehavior("student-123", signal);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("increment_auditory_score", {
        p_student_id: "student-123",
      });
    });

    it("should call increment_text_score RPC for text_read signal", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const signal: BehaviorSignal = {
        type: "text_read",
        duration: 60,
      };

      await service.trackBehavior("student-123", signal);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("increment_text_score", {
        p_student_id: "student-123",
        p_time_seconds: 60,
      });
    });

    it("should use default duration of 30 seconds for text_read", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const signal: BehaviorSignal = { type: "text_read" };

      await service.trackBehavior("student-123", signal);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("increment_text_score", {
        p_student_id: "student-123",
        p_time_seconds: 30,
      });
    });

    it("should handle RPC errors gracefully", async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error("RPC failed"));

      const signal: BehaviorSignal = { type: "image_viewed" };

      // Should not throw
      await expect(service.trackBehavior("student-123", signal)).resolves.not.toThrow();
    });
  });

  describe("getLearningStyleProfile", () => {
    it("should return existing profile from database", async () => {
      const mockProfile = {
        student_id: "student-123",
        visual_score: 40,
        text_score: 35,
        auditory_score: 25,
        preferred_style: "visual",
        images_viewed: 10,
        voice_replays: 5,
        text_read_time_seconds: 300,
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      });

      const result = await service.getLearningStyleProfile("student-123");

      expect(result).toEqual(mockProfile);
    });

    it("should create default profile when none exists", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await service.getLearningStyleProfile("student-123");

      expect(result).toEqual(
        expect.objectContaining({
          visual_score: 33.33,
          text_score: 33.33,
          auditory_score: 33.33,
          preferred_style: "text",
        })
      );
    });

    it("should return null on database error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      const result = await service.getLearningStyleProfile("student-123");

      expect(result).toBeNull();
    });
  });

  describe("getAdaptedContent", () => {
    it("should return default adaptation when no profile exists", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await service.getAdaptedContent("student-123", "topic-1");

      // Default profile has 33.33 for all scores, which is below the 35 threshold
      expect(result.showImages).toBe(false); // 33.33 < 35
      expect(result.enableVoice).toBe(false); // 33.33 < 35
      expect(result.textComplexity).toBe("simple");
      expect(result.suggestedPace).toBe("normal");
    });

    it("should adapt based on visual score", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                visual_score: 50,
                text_score: 30,
                auditory_score: 20,
                preferred_style: "visual",
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getAdaptedContent("student-123", "topic-1");

      expect(result.showImages).toBe(true);
      expect(result.preferredStyle).toBe("visual");
    });

    it("should disable images when visual score is low", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                visual_score: 20,
                text_score: 50,
                auditory_score: 30,
                preferred_style: "text",
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getAdaptedContent("student-123", "topic-1");

      expect(result.showImages).toBe(false);
    });

    it("should enable voice when auditory score is high", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                visual_score: 30,
                text_score: 30,
                auditory_score: 40,
                preferred_style: "auditory",
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getAdaptedContent("student-123", "topic-1");

      expect(result.enableVoice).toBe(true);
    });

    it("should set detailed text complexity for high text score", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                visual_score: 25,
                text_score: 55,
                auditory_score: 20,
                preferred_style: "text",
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getAdaptedContent("student-123", "topic-1");

      expect(result.textComplexity).toBe("detailed");
    });

    it("should suggest fast pace for high mastery", async () => {
      const fromMock = jest.fn();
      mockSupabaseClient.from = fromMock;

      // First call for learning style profile
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                visual_score: 33,
                text_score: 34,
                auditory_score: 33,
                preferred_style: "text",
              },
              error: null,
            }),
          }),
        }),
      });

      // Second call for knowledge state
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  mastery_score: 85,
                  attempts: 5,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.getAdaptedContent("student-123", "topic-1");

      expect(result.suggestedPace).toBe("fast");
    });

    it("should suggest slow pace for struggling students", async () => {
      const fromMock = jest.fn();
      mockSupabaseClient.from = fromMock;

      // First call for learning style profile
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                visual_score: 33,
                text_score: 34,
                auditory_score: 33,
                preferred_style: "text",
              },
              error: null,
            }),
          }),
        }),
      });

      // Second call for knowledge state
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  mastery_score: 40,
                  attempts: 5,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.getAdaptedContent("student-123", "topic-1");

      expect(result.suggestedPace).toBe("slow");
    });
  });

  describe("getKnowledgeState", () => {
    it("should return knowledge state from database", async () => {
      const mockState = {
        topic_id: "topic-1",
        module_id: "module-1",
        mastery_score: 75,
        confidence_level: "medium",
        attempts: 3,
        time_spent_seconds: 600,
        last_attempt_at: "2024-01-15T10:00:00Z",
        status: "in_progress",
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockState, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getKnowledgeState("student-123", "topic-1");

      expect(result).toEqual(mockState);
    });

    it("should return null when no state exists", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getKnowledgeState("student-123", "topic-1");

      expect(result).toBeNull();
    });

    it("should return null on database error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          }),
        }),
      });

      const result = await service.getKnowledgeState("student-123", "topic-1");

      expect(result).toBeNull();
    });
  });

  describe("updateKnowledgeState", () => {
    it("should call RPC with correct parameters", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const performance: TopicPerformance = {
        isCorrect: true,
        responseTimeMs: 5000,
        aiHintRequested: false,
        attemptNumber: 1,
      };

      await service.updateKnowledgeState(
        "student-123",
        "module-1",
        "topic-1",
        performance
      );

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("update_knowledge_state", {
        p_student_id: "student-123",
        p_module_id: "module-1",
        p_topic_id: "topic-1",
        p_is_correct: true,
        p_response_time_ms: 5000,
        p_ai_hint_requested: false,
      });
    });

    it("should handle RPC errors gracefully", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      const performance: TopicPerformance = {
        isCorrect: true,
        responseTimeMs: 5000,
        aiHintRequested: false,
        attemptNumber: 1,
      };

      // Should not throw
      await expect(
        service.updateKnowledgeState("student-123", "module-1", "topic-1", performance)
      ).resolves.not.toThrow();
    });
  });

  describe("getNextTopic", () => {
    it("should return weakest topic with low mastery", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [{ topic_id: "weak-topic", mastery_score: 30 }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getNextTopic("student-123", "module-1");

      expect(result).toBe("weak-topic");
    });

    it("should return null when all topics are mastered", async () => {
      const fromMock = jest.fn();
      mockSupabaseClient.from = fromMock;

      // First call for weak topics (none found)
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      // Second call for all topics
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{ topic_id: "topic-1" }, { topic_id: "topic-2" }],
              error: null,
            }),
          }),
        }),
      });

      // Third call for started topics
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ topic_id: "topic-1" }, { topic_id: "topic-2" }],
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getNextTopic("student-123", "module-1");

      expect(result).toBeNull();
    });
  });

  describe("getModuleProgress", () => {
    it("should calculate progress correctly", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                { mastery_score: 90, status: "mastered" },
                { mastery_score: 85, status: "mastered" },
                { mastery_score: 60, status: "in_progress" },
                { mastery_score: 40, status: "in_progress" },
              ],
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getModuleProgress("student-123", "module-1");

      expect(result.masteredTopics).toBe(2);
      expect(result.averageMastery).toBe(68.75);
      expect(result.progressPercent).toBe(20);
      expect(result.totalTopics).toBe(10);
    });

    it("should return default progress when no data", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await service.getModuleProgress("student-123", "module-1");

      expect(result).toEqual({
        totalTopics: 10,
        masteredTopics: 0,
        averageMastery: 0,
        progressPercent: 0,
      });
    });
  });

  describe("isAtRisk", () => {
    it("should return true when student is struggling", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockResolvedValue({
                data: [
                  { mastery_score: 30, attempts: 5 },
                  { mastery_score: 25, attempts: 6 },
                  { mastery_score: 35, attempts: 4 },
                ],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.isAtRisk("student-123", "module-1");

      expect(result).toBe(true);
    });

    it("should return false when student is not struggling", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockResolvedValue({
                data: [{ mastery_score: 60, attempts: 4 }],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.isAtRisk("student-123", "module-1");

      expect(result).toBe(false);
    });

    it("should return false when no data exists", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const result = await service.isAtRisk("student-123", "module-1");

      expect(result).toBe(false);
    });

    it("should return false on database error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          }),
        }),
      });

      const result = await service.isAtRisk("student-123", "module-1");

      expect(result).toBe(false);
    });
  });
});
