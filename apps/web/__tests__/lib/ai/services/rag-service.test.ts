/**
 * Tests for CurriculumRAGService
 * Target: ~35 tests covering context retrieval, multilingual search, and hybrid search
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

// Mock fetch for embedding API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Store original env
const originalEnv = process.env;

import { CurriculumRAGService, type CurriculumMatch } from "@/lib/ai/services/rag-service";

describe("CurriculumRAGService", () => {
  let service: CurriculumRAGService;

  const mockEmbedding = new Array(768).fill(0.1);

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CurriculumRAGService();
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: "test-api-key",
    };

    // Default mock for embedding API
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: { values: mockEmbedding } }),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getRelevantContext", () => {
    it("should use direct topic content when filterTopic is specified", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Topic content", content_type: "text", title: "Test" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getRelevantContext("query", { filterTopic: "topic-1" });

      expect(result).toContain("Topic content");
    });

    it("should call match_curriculum RPC for vector search", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [
          {
            id: "1",
            module_id: "m1",
            topic_id: "t1",
            language: "en",
            content_type: "text",
            title: "Test Title",
            content: "Test content",
            similarity: 0.8,
          },
        ],
        error: null,
      });

      const result = await service.getRelevantContext("query");

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("match_curriculum", {
        query_embedding: mockEmbedding,
        match_threshold: 0.7,
        match_count: 5,
        filter_language: null,
        filter_topic: null,
      });
      expect(result).toContain("Test content");
    });

    it("should use custom thresholds when provided", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });

      await service.getRelevantContext("query", {
        matchThreshold: 0.5,
        matchCount: 10,
        filterLanguage: "hi",
      });

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("match_curriculum", {
        query_embedding: mockEmbedding,
        match_threshold: 0.5,
        match_count: 10,
        filter_language: "hi",
        filter_topic: null,
      });
    });

    it("should fallback to direct topic content on RPC error", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Fallback content", title: "Fallback" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getRelevantContext("query", { filterTopic: "topic-1" });

      expect(result).toContain("Fallback content");
    });

    it("should return empty string when no results and no topic filter", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });

      const result = await service.getRelevantContext("query");

      expect(result).toBe("");
    });

    it("should fallback to direct topic content when docs is empty but filterTopic is specified", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Direct topic content", title: "Direct Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getRelevantContext("query", { filterTopic: "topic-1" });

      expect(result).toContain("Direct topic content");
    });

    it("should return empty string on RPC error without topic filter", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      });

      const result = await service.getRelevantContext("query");

      expect(result).toBe("");
    });

    it("should handle exception during getRelevantContext with topic filter fallback", async () => {
      // Make embedding fail to trigger catch block
      mockFetch.mockRejectedValue(new Error("Network error"));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Exception fallback", title: "Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getRelevantContext("query", { filterTopic: "topic-1" });

      expect(result).toContain("Exception fallback");
    });

    it("should return empty string on exception without topic filter", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await service.getRelevantContext("query");

      expect(result).toBe("");
    });
  });

  describe("getMultilingualContext", () => {
    it("should return primary language results when available", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [
          { language: "hi", content: "हिंदी सामग्री", similarity: 0.8 },
          { language: "hi", content: "अधिक सामग्री", similarity: 0.7 },
        ],
        error: null,
      });

      const result = await service.getMultilingualContext("query", "hi");

      expect(result).toContain("हिंदी सामग्री");
    });

    it("should fall back to cross-lingual search when not enough primary results", async () => {
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({
          data: [{ language: "hi", content: "एक परिणाम", similarity: 0.8 }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { language: "hi", content: "हिंदी", similarity: 0.8 },
            { language: "en", content: "English", similarity: 0.7 },
          ],
          error: null,
        });

      const result = await service.getMultilingualContext("query", "hi");

      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(2);
      expect(result).toContain("हिंदी");
    });

    it("should prioritize requested language in results", async () => {
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: [], error: null }) // No primary results
        .mockResolvedValueOnce({
          data: [
            { language: "en", content: "English", similarity: 0.9 },
            { language: "as", content: "অসমীয়া", similarity: 0.7 },
          ],
          error: null,
        });

      const result = await service.getMultilingualContext("query", "as");

      // Should prioritize 'as' even if 'en' has higher similarity
      expect(result).toContain("অসমীয়া");
    });

    it("should fallback to direct topic content on error", async () => {
      mockFetch.mockRejectedValue(new Error("Embedding failed"));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Fallback", title: "Topic" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getMultilingualContext("query", "en", {
        filterTopic: "topic-1",
      });

      expect(result).toContain("Fallback");
    });

    it("should return empty string on exception without topic filter", async () => {
      mockFetch.mockRejectedValue(new Error("Embedding failed"));

      const result = await service.getMultilingualContext("query", "en");

      expect(result).toBe("");
    });

    it("should fallback to topic content when cross-lingual search fails", async () => {
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: [], error: null }) // Primary returns empty
        .mockResolvedValueOnce({ data: null, error: { message: "Search error" } }); // Cross-lingual fails

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Cross-lingual fallback", title: "Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getMultilingualContext("query", "hi", {
        filterTopic: "topic-1",
      });

      expect(result).toContain("Cross-lingual fallback");
    });

    it("should return empty string when cross-lingual search fails without topic filter", async () => {
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: [], error: null }) // Primary returns empty
        .mockResolvedValueOnce({ data: [], error: null }); // Cross-lingual returns empty

      const result = await service.getMultilingualContext("query", "hi");

      expect(result).toBe("");
    });

    it("should fallback when sorted results is empty with topic filter", async () => {
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: [{ language: "en" }], error: null }) // Primary - 1 result (< 2)
        .mockResolvedValueOnce({ data: [], error: null }); // Cross-lingual returns empty after slice

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Sorted empty fallback", title: "Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getMultilingualContext("query", "hi", {
        filterTopic: "topic-1",
      });

      expect(result).toContain("Sorted empty fallback");
    });
  });

  describe("hybridSearch", () => {
    it("should call match_curriculum_hybrid RPC", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ content: "Hybrid result", similarity: 0.8 }],
        error: null,
      });

      const result = await service.hybridSearch("query", "search text");

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("match_curriculum_hybrid", {
        query_embedding: mockEmbedding,
        query_text: "search text",
        match_threshold: 0.5,
        match_count: 5,
        filter_language: null,
        vector_weight: 0.7,
      });
    });

    it("should use custom vector weight when provided", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });

      await service.hybridSearch("query", "text", { vectorWeight: 0.3 });

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "match_curriculum_hybrid",
        expect.objectContaining({ vector_weight: 0.3 })
      );
    });

    it("should return empty array on error", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "Hybrid search failed" },
      });

      const result = await service.hybridSearch("query", "text");

      expect(result).toEqual([]);
    });

    it("should return empty array on exception", async () => {
      mockFetch.mockRejectedValue(new Error("Embedding failed"));

      const result = await service.hybridSearch("query", "text");

      expect(result).toEqual([]);
    });
  });

  describe("getTopicContext", () => {
    it("should call get_topic_context RPC", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [
          { title: "Topic Title", content: "Topic content" },
        ],
        error: null,
      });

      const result = await service.getTopicContext("topic-1", "en", 3);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("get_topic_context", {
        p_topic_id: "topic-1",
        p_language: "en",
        p_limit: 3,
      });
      expect(result).toContain("### Topic Title");
    });

    it("should fallback to direct query when RPC returns empty", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Direct content", title: "Direct Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getTopicContext("topic-1", "en");

      expect(result).toContain("Direct content");
    });

    it("should fallback to direct query when RPC fails", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Fallback", title: "Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getTopicContext("topic-1");

      expect(result).toContain("Fallback");
    });

    it("should fallback to direct content on exception", async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error("RPC exception"));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Exception fallback", title: "Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getTopicContext("topic-1");

      expect(result).toContain("Exception fallback");
    });
  });

  describe("getEmbedding (private, tested via public methods)", () => {
    it("should return empty string when API key is missing (graceful fallback)", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      // The method catches the error and returns empty string gracefully
      const result = await service.getRelevantContext("query");
      expect(result).toBe("");
    });

    it("should handle embedding API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal error" }),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "Fallback", title: "Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getRelevantContext("query", { filterTopic: "topic-1" });

      // Should fallback to direct content
      expect(result).toContain("Fallback");
    });

    it("should use GOOGLE_GENERATIVE_AI_API_KEY as fallback", async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-key";

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ content: "Content", title: "Title", language: "en" }],
        error: null,
      });

      await service.getRelevantContext("query");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("key=google-key"),
        expect.any(Object)
      );
    });

    it("should handle embedding API error with JSON parse failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("JSON parse error")),
      });

      // This tests line 404 - the catch block when json() fails
      const result = await service.getRelevantContext("query");

      expect(result).toBe("");
    });

    it("should throw error when embedding response has no values", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedding: {} }), // Missing values
      });

      const result = await service.getRelevantContext("query");

      expect(result).toBe("");
    });

    it("should warn when embedding has unexpected dimensions", async () => {
      const { authLogger } = jest.requireMock("@/lib/auth-logger");

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedding: { values: new Array(512).fill(0.1) } }), // Wrong dimensions
      });

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ content: "Content", language: "en" }],
        error: null,
      });

      await service.getRelevantContext("query");

      expect(authLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unexpected embedding dimensions")
      );
    });
  });

  describe("formatContext", () => {
    it("should include language labels in formatted context", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [
          {
            id: "1",
            module_id: "m1",
            topic_id: "t1",
            language: "hi",
            content_type: "text",
            title: "हिंदी शीर्षक",
            content: "हिंदी सामग्री",
            similarity: 0.8,
          },
        ],
        error: null,
      });

      const result = await service.getRelevantContext("query");

      expect(result).toContain("हिंदी (Hindi)");
    });

    it("should handle content without title", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [
          {
            id: "1",
            module_id: "m1",
            topic_id: "t1",
            language: "en",
            content_type: "text",
            title: "",
            content: "Content without title",
            similarity: 0.8,
          },
        ],
        error: null,
      });

      const result = await service.getRelevantContext("query");

      expect(result).toContain("Context 1");
    });
  });

  describe("generateContentEmbedding", () => {
    it("should call embedding API with RETRIEVAL_DOCUMENT task type", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedding: { values: mockEmbedding } }),
      });

      await service.generateContentEmbedding("content to embed");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("RETRIEVAL_DOCUMENT"),
        })
      );
    });

    it("should throw error when API key is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      await expect(service.generateContentEmbedding("content")).rejects.toThrow(
        "GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is required"
      );
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Bad request" }),
      });

      await expect(service.generateContentEmbedding("content")).rejects.toThrow(
        "Embedding API error"
      );
    });
  });

  describe("getDirectTopicContent (tested via fallbacks)", () => {
    it("should fallback to English when requested language not found", async () => {
      const fromMock = jest.fn();
      mockSupabaseClient.from = fromMock;

      // First query for Hindi (empty)
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      });

      // Second query for English (has results)
      fromMock.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ content: "English fallback", title: "English Title" }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC unavailable" },
      });

      const result = await service.getTopicContext("topic-1", "hi");

      expect(result).toContain("English fallback");
      expect(result).toContain("Please respond in");
    });

    it("should return empty string when no content in any language", async () => {
      const fromMock = jest.fn();
      mockSupabaseClient.from = fromMock;

      // Both queries return empty
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      });

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC unavailable" },
      });

      const result = await service.getTopicContext("nonexistent-topic", "hi");

      expect(result).toBe("");
    });

    it("should return empty string when direct content fetch fails with error", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      // From query throws error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const result = await service.getTopicContext("topic-1");

      expect(result).toBe("");
    });
  });
});
