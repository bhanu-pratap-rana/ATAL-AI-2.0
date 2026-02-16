/**
 * Tests for TutorService
 * Target: ~35 tests covering chat, feedback, hints, and session history
 */

// Mock dependencies
const mockSupabaseClient = {
  from: jest.fn(),
};

jest.mock("@/lib/supabase-server", () => ({
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock RAG service
const mockRagService = {
  getRelevantContext: jest.fn(),
  getTopicContext: jest.fn(),
};
jest.mock("@/lib/ai/services/rag-service", () => ({
  CurriculumRAGService: jest.fn(() => mockRagService),
  ragService: mockRagService,
}));

// Mock adaptive service
const mockAdaptiveService = {
  getAdaptedContent: jest.fn(),
};
jest.mock("@/lib/ai/services/adaptive-service", () => ({
  AdaptiveLearningService: jest.fn(() => mockAdaptiveService),
  adaptiveService: mockAdaptiveService,
}));

// Mock AI providers
const mockGetAIModel = jest.fn();
jest.mock("@/lib/ai/providers", () => ({
  getAIModel: () => mockGetAIModel(),
  MODEL_CONFIGS: {
    tutor: { maxTokens: 1000 },
    assessment: { maxTokens: 500 },
    retrieval: { maxTokens: 300 },
  },
}));

// Mock prompts
jest.mock("@/lib/ai/prompts/socratic-tutor", () => ({
  buildSystemPrompt: jest.fn(() => "Mock system prompt"),
  getFeedbackPrompt: jest.fn(() => "Mock feedback prompt"),
}));

// Mock circuit breaker
const mockBreaker = {
  execute: jest.fn((fn) => fn()),
};
jest.mock("@/lib/circuit-breaker", () => ({
  aiProviderBreakers: {
    getBreaker: jest.fn(() => mockBreaker),
  },
}));

// Mock form utils
jest.mock("@/lib/form-utils", () => ({
  getLanguageLabelForAI: jest.fn((lang) => {
    const labels: Record<string, string> = { en: "English", hi: "Hindi", as: "Assamese" };
    return labels[lang] || lang;
  }),
}));

// Mock AI SDK
const mockStreamText = jest.fn();
const mockGenerateText = jest.fn();
jest.mock("ai", () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

import { TutorService, type TutorChatRequest, type TutorLanguage } from "@/lib/ai/services/tutor-service";

describe("TutorService", () => {
  let service: TutorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TutorService();

    // Default mocks
    mockRagService.getRelevantContext.mockResolvedValue("Mock context");
    mockRagService.getTopicContext.mockResolvedValue("Mock topic context");
    mockAdaptiveService.getAdaptedContent.mockResolvedValue({
      preferredStyle: "visual",
      showImages: true,
    });
    mockGenerateText.mockResolvedValue({
      text: "Mock AI response",
      usage: { totalTokens: 100 },
    });
    mockStreamText.mockReturnValue({
      toDataStreamResponse: () => ({}),
    });
    mockSupabaseClient.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
  });

  describe("generateResponse", () => {
    const defaultRequest: TutorChatRequest = {
      message: "What is photosynthesis?",
      sessionId: "session-123",
      studentId: "student-456",
      language: "en" as TutorLanguage,
    };

    it("should generate a response with RAG context", async () => {
      const result = await service.generateResponse(defaultRequest);

      expect(mockRagService.getRelevantContext).toHaveBeenCalledWith(
        "What is photosynthesis?",
        expect.any(Object)
      );
      expect(result.content).toBe("Mock AI response");
    });

    it("should get student learning profile", async () => {
      await service.generateResponse(defaultRequest);

      expect(mockAdaptiveService.getAdaptedContent).toHaveBeenCalledWith(
        "student-456",
        "general"
      );
    });

    it("should use topicId for adaptive content when provided", async () => {
      await service.generateResponse({
        ...defaultRequest,
        topicId: "topic-789",
      });

      expect(mockAdaptiveService.getAdaptedContent).toHaveBeenCalledWith(
        "student-456",
        "topic-789"
      );
    });

    it("should include response metadata", async () => {
      const result = await service.generateResponse(defaultRequest);

      expect(result.tokensUsed).toBe(100);
      expect(result.provider).toBe("gemini");
      expect(result.responseTimeMs).toBeDefined();
      expect(result.context).toBeDefined();
    });

    it("should log interaction after response", async () => {
      await service.generateResponse(defaultRequest);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("ai_tutor_interactions");
    });

    it("should handle conversation history", async () => {
      await service.generateResponse({
        ...defaultRequest,
        conversationHistory: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "user", content: "Hello" }),
            expect.objectContaining({ role: "assistant", content: "Hi there!" }),
            expect.objectContaining({ role: "user", content: "What is photosynthesis?" }),
          ]),
        })
      );
    });

    it("should use circuit breaker for AI calls", async () => {
      await service.generateResponse(defaultRequest);

      expect(mockBreaker.execute).toHaveBeenCalled();
    });
  });

  describe("streamChat", () => {
    const defaultRequest: TutorChatRequest = {
      message: "Explain gravity",
      sessionId: "session-123",
      studentId: "student-456",
      language: "hi" as TutorLanguage,
      topicId: "topic-physics",
    };

    it("should stream response with topic-specific context", async () => {
      await service.streamChat(defaultRequest);

      expect(mockRagService.getRelevantContext).toHaveBeenCalledWith(
        "Explain gravity",
        expect.objectContaining({
          filterTopic: "topic-physics",
          matchCount: 3,
        })
      );
    });

    it("should stream response without topic", async () => {
      await service.streamChat({
        ...defaultRequest,
        topicId: undefined,
      });

      expect(mockRagService.getRelevantContext).toHaveBeenCalledWith(
        "Explain gravity",
        expect.objectContaining({
          matchCount: 5,
        })
      );
    });

    it("should return streaming result", async () => {
      const result = await service.streamChat(defaultRequest);

      expect(result).toBeDefined();
      expect(mockStreamText).toHaveBeenCalled();
    });

    it("should use circuit breaker protection", async () => {
      await service.streamChat(defaultRequest);

      expect(mockBreaker.execute).toHaveBeenCalled();
    });
  });

  describe("generateFeedback", () => {
    it("should generate feedback for correct answer", async () => {
      const result = await service.generateFeedback({
        studentId: "student-123",
        question: "What is 2+2?",
        studentAnswer: "4",
        correctAnswer: "4",
        isCorrect: true,
        language: "en",
      });

      expect(result).toBe("Mock AI response");
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Was it correct? Yes"),
            }),
          ]),
        })
      );
    });

    it("should generate feedback for incorrect answer", async () => {
      await service.generateFeedback({
        studentId: "student-123",
        question: "What is 2+2?",
        studentAnswer: "5",
        correctAnswer: "4",
        isCorrect: false,
        language: "en",
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Was it correct? No"),
            }),
          ]),
        })
      );
    });

    it("should include partial answer hint for incorrect answers", async () => {
      await service.generateFeedback({
        studentId: "student-123",
        question: "What is photosynthesis?",
        studentAnswer: "Wrong answer",
        correctAnswer: "The process by which plants convert light energy",
        isCorrect: false,
        language: "en",
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Correct answer hint"),
            }),
          ]),
        })
      );
    });

    it("should use circuit breaker", async () => {
      await service.generateFeedback({
        studentId: "student-123",
        question: "Test",
        studentAnswer: "Test",
        correctAnswer: "Test",
        isCorrect: true,
        language: "en",
      });

      expect(mockBreaker.execute).toHaveBeenCalled();
    });
  });

  describe("generateHint", () => {
    it("should generate a gentle nudge for first attempt", async () => {
      await service.generateHint({
        studentId: "student-123",
        topicId: "topic-123",
        question: "What is gravity?",
        previousAttempts: 1,
        language: "en",
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("gentle nudge"),
        })
      );
    });

    it("should generate more specific hint for second attempt", async () => {
      await service.generateHint({
        studentId: "student-123",
        topicId: "topic-123",
        question: "What is gravity?",
        previousAttempts: 2,
        language: "en",
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("more specific hint"),
        })
      );
    });

    it("should generate clear guidance for multiple attempts", async () => {
      await service.generateHint({
        studentId: "student-123",
        topicId: "topic-123",
        question: "What is gravity?",
        previousAttempts: 4,
        language: "en",
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("clear guidance"),
        })
      );
    });

    it("should fetch topic context for hints", async () => {
      await service.generateHint({
        studentId: "student-123",
        topicId: "topic-123",
        question: "What is gravity?",
        previousAttempts: 1,
        language: "as",
      });

      expect(mockRagService.getTopicContext).toHaveBeenCalledWith(
        "topic-123",
        "as",
        2
      );
    });

    it("should use circuit breaker", async () => {
      await service.generateHint({
        studentId: "student-123",
        topicId: "topic-123",
        question: "Test",
        previousAttempts: 1,
        language: "en",
      });

      expect(mockBreaker.execute).toHaveBeenCalled();
    });
  });

  describe("getSessionHistory", () => {
    it("should return session messages", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                { message_role: "user", message_content: "Hello" },
                { message_role: "assistant", message_content: "Hi there!" },
              ],
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getSessionHistory("session-123");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ role: "user", content: "Hello" });
      expect(result[1]).toEqual({ role: "assistant", content: "Hi there!" });
    });

    it("should return empty array on error", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      const result = await service.getSessionHistory("session-123");

      expect(result).toEqual([]);
    });

    it("should return empty array when no history exists", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getSessionHistory("session-123");

      expect(result).toEqual([]);
    });

    it("should query with correct session ID", async () => {
      const mockEq = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      await service.getSessionHistory("session-xyz");

      expect(mockEq).toHaveBeenCalledWith("session_id", "session-xyz");
    });
  });
});
