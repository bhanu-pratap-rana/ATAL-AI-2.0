/**
 * Tests for tutor/chat API route
 * Target: ~25 tests covering AI tutor chat functionality
 */

// Polyfill for Next.js server testing
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock crypto for UUID generation
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "test-uuid-12345",
  },
});

// Mock Response globally
class MockResponse {
  private body: unknown;
  private options: { status?: number; headers?: Record<string, string> };

  constructor(body: unknown, options?: { status?: number; headers?: Record<string, string> }) {
    this.body = body;
    this.options = options || {};
  }

  get status() {
    return this.options.status ?? 200;
  }

  async text() {
    return typeof this.body === "string" ? this.body : "";
  }

  async json() {
    if (typeof this.body === "string") {
      try {
        return JSON.parse(this.body);
      } catch {
        return this.body;
      }
    }
    return this.body;
  }
}

global.Response = MockResponse as unknown as typeof Response;

// Mock dependencies
const mockGetCurrentUser = jest.fn();
const mockCreateClient = jest.fn();
jest.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  createClient: () => mockCreateClient(),
}));

const mockCheckRateLimit = jest.fn();
jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock("@/lib/constants/rate-limits", () => ({
  RATE_LIMITS: {
    aiTutorChat: { tokensPerInterval: 20, interval: 60000 },
  },
}));

const mockGetAIModel = jest.fn();
jest.mock("@/lib/ai/providers", () => ({
  getAIModel: (...args: unknown[]) => mockGetAIModel(...args),
  MODEL_CONFIGS: {
    tutor: { maxTokens: 1000 },
  },
}));

const mockRagService = {
  getMultilingualContext: jest.fn(),
};
jest.mock("@/lib/ai/services/rag-service", () => ({
  ragService: mockRagService,
}));

const mockAdaptiveService = {
  getAdaptedContent: jest.fn(),
};
jest.mock("@/lib/ai/services/adaptive-service", () => ({
  adaptiveService: mockAdaptiveService,
}));

const mockBuildSystemPrompt = jest.fn();
jest.mock("@/lib/ai/prompts/socratic-tutor", () => ({
  buildSystemPrompt: (...args: unknown[]) => mockBuildSystemPrompt(...args),
}));

const mockStreamText = jest.fn();
jest.mock("ai", () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { POST } from "@/app/api/tutor/chat/route";

// Helper to create mock request
function createMockRequest(body: object): Request {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

describe("POST /api/tutor/chat", () => {
  const mockSupabaseClient = {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(true);
    mockCreateClient.mockResolvedValue(mockSupabaseClient);
    mockRagService.getMultilingualContext.mockResolvedValue("Test context");
    mockAdaptiveService.getAdaptedContent.mockResolvedValue({
      preferredStyle: "visual",
      showImages: true,
    });
    mockBuildSystemPrompt.mockReturnValue("System prompt");
    mockGetAIModel.mockReturnValue({});
    mockStreamText.mockReturnValue({
      toDataStreamResponse: () => new MockResponse("stream data"),
    });
  });

  describe("authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });

    it("should proceed when user is authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });

      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limit exceeded", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockCheckRateLimit.mockResolvedValue(false);

      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(await response.text()).toContain("Rate limit exceeded");
    });

    it("should call checkRateLimit with user-specific key", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-456" });

      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      await POST(request);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "ai:chat:user-456",
        expect.any(Object)
      );
    });
  });

  describe("request validation", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    });

    it("should return 400 when messages array is empty", async () => {
      const request = createMockRequest({ messages: [] });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 when message content is empty", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 when message content exceeds max length", async () => {
      const longContent = "a".repeat(5001);
      const request = createMockRequest({
        messages: [{ role: "user", content: longContent }],
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 when messages exceed max count", async () => {
      const messages = Array.from({ length: 101 }, (_, i) => ({
        role: "user" as const,
        content: `Message ${i}`,
      }));
      const request = createMockRequest({ messages });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid role", async () => {
      const request = createMockRequest({
        messages: [{ role: "invalid", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should accept valid roles", async () => {
      const roles = ["user", "assistant", "system"];
      for (const role of roles) {
        const request = createMockRequest({
          messages: [{ role, content: "Hello" }],
        });
        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it("should accept valid languages", async () => {
      const languages = ["en", "hi", "as"];
      for (const language of languages) {
        const request = createMockRequest({
          messages: [{ role: "user", content: "Hello" }],
          language,
        });
        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it("should default to 'en' language when not specified", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      await POST(request);

      expect(mockRagService.getMultilingualContext).toHaveBeenCalledWith(
        "Hello",
        "en",
        expect.any(Object)
      );
    });
  });

  describe("RAG context retrieval", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    });

    it("should call RAG service with user query", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "What is photosynthesis?" }],
        language: "en",
      });
      await POST(request);

      expect(mockRagService.getMultilingualContext).toHaveBeenCalledWith(
        "What is photosynthesis?",
        "en",
        expect.any(Object)
      );
    });

    it("should pass topic filter to RAG when topicId is provided", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
        topicId: "topic-123",
      });
      await POST(request);

      expect(mockRagService.getMultilingualContext).toHaveBeenCalledWith(
        "Hello",
        "en",
        expect.objectContaining({
          filterTopic: "topic-123",
          matchCount: 3,
        })
      );
    });

    it("should use higher match count when no topic filter", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      await POST(request);

      expect(mockRagService.getMultilingualContext).toHaveBeenCalledWith(
        "Hello",
        "en",
        expect.objectContaining({
          filterTopic: null,
          matchCount: 5,
        })
      );
    });
  });

  describe("adaptive content", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    });

    it("should fetch student learning profile", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
        topicId: "topic-123",
      });
      await POST(request);

      expect(mockAdaptiveService.getAdaptedContent).toHaveBeenCalledWith(
        "user-123",
        "topic-123"
      );
    });

    it("should use 'general' topic when topicId not provided", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      await POST(request);

      expect(mockAdaptiveService.getAdaptedContent).toHaveBeenCalledWith(
        "user-123",
        "general"
      );
    });
  });

  describe("system prompt building", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    });

    it("should build system prompt with correct parameters", async () => {
      mockAdaptiveService.getAdaptedContent.mockResolvedValue({
        preferredStyle: "auditory",
        showImages: false,
      });
      mockRagService.getMultilingualContext.mockResolvedValue("Retrieved context");

      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
        language: "hi",
        topicId: "topic-123",
        moduleId: "module-456",
      });
      await POST(request);

      expect(mockBuildSystemPrompt).toHaveBeenCalledWith({
        language: "hi",
        context: "Retrieved context",
        learningStyle: "auditory",
        showImages: false,
        topic: "topic-123",
        module: "module-456",
      });
    });
  });

  describe("AI streaming", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    });

    it("should call streamText with correct parameters", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      await POST(request);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "System prompt",
          messages: [{ role: "user", content: "Hello" }],
        })
      );
    });

    it("should use default AI model (Groq)", async () => {
      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      await POST(request);

      // getAIModel() is called without arguments, using default (groq)
      expect(mockGetAIModel).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should return 500 on unexpected error", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Database error"));

      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("An error occurred");
    });

    it("should return generic error message to client", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockRagService.getMultilingualContext.mockRejectedValue(
        new Error("Sensitive database error details")
      );

      const request = createMockRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);
      const data = await response.json();

      // Should not expose internal error details
      expect(data.error).not.toContain("Sensitive");
      expect(data.error).toContain("An error occurred");
    });
  });
});
