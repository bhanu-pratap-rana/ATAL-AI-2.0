/**
 * Tests for ai-service.ts - Core AI Service
 * Target: ~35 tests covering AI providers, tutor, essay feedback, practice questions, and summarization
 */

// Mock dependencies before imports
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/lib/constants/ai-config", () => ({
  AI_DEFAULTS: {
    temperature: 0.7,
    maxTokens: 2048,
  },
  AI_FEATURES: {
    tutor: { temperature: 0.7, maxTokens: 1024 },
    essayFeedback: { temperature: 0.5, maxTokens: 2048 },
    practiceQuestions: { temperature: 0.8, maxTokens: 1500 },
    summarization: { temperature: 0.5, maxTokens: 1024 },
  },
  AI_PROVIDERS: {
    groq: {
      baseUrl: "https://api.groq.com/openai/v1",
      defaultModel: "llama-3.3-70b-versatile",
    },
    ollama: {
      baseUrl: "http://localhost:11434",
      defaultModel: "cogito:14b",
    },
    openai: {
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-4o-mini",
    },
  },
}));

jest.mock("@/lib/form-utils", () => ({
  getLanguageLabelForAI: jest.fn((lang: string) => {
    const labels: Record<string, string> = {
      en: "English",
      hi: "Hindi",
      as: "Assamese",
    };
    return labels[lang] || "English";
  }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  askTutor,
  getEssayFeedback,
  generatePracticeQuestions,
  summarizeContent,
  checkAIService,
} from "@/lib/ai-service";
import { authLogger } from "@/lib/auth-logger";

describe("ai-service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();

    // Set default environment variables for Groq provider
    process.env = {
      ...originalEnv,
      AI_PROVIDER: "groq",
      GROQ_API_KEY: "test-groq-key",
      GROQ_MODEL: "llama-3.3-70b-versatile",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("askTutor", () => {
    it("should call AI provider with tutor prompt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Here is the answer..." } }],
          usage: { total_tokens: 100 },
        }),
      });

      const result = await askTutor("What is the internet?");

      expect(result.success).toBe(true);
      expect(result.content).toBe("Here is the answer...");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("groq.com"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-groq-key",
          }),
        })
      );
    });

    it("should include subject context in prompt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Answer about computers" } }],
        }),
      });

      await askTutor("What is a CPU?", { subject: "Computer Basics" });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("Computer Basics");
    });

    it("should include topic context in prompt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Topic answer" } }],
        }),
      });

      await askTutor("Explain this", { topic: "Hardware Components" });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("Hardware Components");
    });

    it("should adapt to beginner level", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Simple explanation" } }],
        }),
      });

      await askTutor("What is RAM?", { studentLevel: "beginner" });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("simple language");
    });

    it("should adapt to advanced level", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Technical explanation" } }],
        }),
      });

      await askTutor("Explain memory management", { studentLevel: "advanced" });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("technical language");
    });

    it("should respond in Hindi when requested", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "हिंदी में जवाब" } }],
        }),
      });

      await askTutor("इंटरनेट क्या है?", { language: "hi" });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("Hindi");
    });

    it("should respond in Assamese when requested", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "অসমীয়াত উত্তৰ" } }],
        }),
      });

      await askTutor("ইণ্টাৰনেট কি?", { language: "as" });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("Assamese");
    });

    it("should include previous messages for context", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Follow-up answer" } }],
        }),
      });

      await askTutor("And what about storage?", {
        previousMessages: [
          { role: "user", content: "What is RAM?" },
          { role: "assistant", content: "RAM is temporary memory..." },
        ],
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages).toHaveLength(4); // system + 2 previous + new question
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
        json: jest.fn().mockResolvedValue({ error: { message: "Server error" } }),
      });

      const result = await askTutor("Question");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Server error");
      expect(authLogger.error).toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network failed"));

      const result = await askTutor("Question");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network failed");
    });
  });

  describe("getEssayFeedback", () => {
    const validFeedback = {
      overallScore: 7,
      grammar: { score: 8, issues: ["Minor punctuation"] },
      clarity: { score: 7, suggestions: ["Be more specific"] },
      structure: { score: 7, feedback: "Good organization" },
      content: { score: 6, feedback: "Add more details" },
      improvements: ["Add examples", "Expand conclusion"],
    };

    it("should analyze essay and return feedback", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(validFeedback) } }],
        }),
      });

      const result = await getEssayFeedback(
        "This is my essay about digital literacy...",
        "Digital Literacy"
      );

      expect(result.success).toBe(true);
      expect(result.feedback).toBeDefined();
      expect(result.feedback?.overallScore).toBe(7);
    });

    it("should extract JSON from markdown code block", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: `Here is the feedback:\n\`\`\`json\n${JSON.stringify(validFeedback)}\n\`\`\``,
              },
            },
          ],
        }),
      });

      const result = await getEssayFeedback("My essay content...");

      expect(result.success).toBe(true);
      expect(result.feedback).toBeDefined();
    });

    it("should extract JSON from response without code block", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: `Analysis complete: ${JSON.stringify(validFeedback)}`,
              },
            },
          ],
        }),
      });

      const result = await getEssayFeedback("Essay text...");

      expect(result.success).toBe(true);
      expect(result.feedback).toBeDefined();
    });

    it("should handle invalid JSON response gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Not valid JSON response" } }],
        }),
      });

      const result = await getEssayFeedback("Essay...");

      expect(result.success).toBe(true);
      expect(result.feedback).toBeUndefined();
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[AI] Essay feedback JSON parsing failed",
        expect.any(Object)
      );
    });

    it("should pass language parameter to prompt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(validFeedback) } }],
        }),
      });

      await getEssayFeedback("निबंध का पाठ...", "डिजिटल साक्षरता", "hi");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("Hindi");
    });
  });

  describe("generatePracticeQuestions", () => {
    const validQuestions = [
      {
        id: "q1",
        question: "What is the internet?",
        options: ["A network", "A computer", "A phone", "A printer"],
        correctAnswer: "A",
        explanation: "The internet is a global network",
        difficulty: "easy",
      },
      {
        id: "q2",
        question: "What is WiFi?",
        options: ["Wired connection", "Wireless connection", "A device", "An app"],
        correctAnswer: "B",
        explanation: "WiFi enables wireless connectivity",
        difficulty: "easy",
      },
    ];

    it("should generate practice questions", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(validQuestions) } }],
        }),
      });

      const result = await generatePracticeQuestions("Internet Basics", 2, "easy");

      expect(result.success).toBe(true);
      expect(result.questions).toBeDefined();
      expect(result.questions).toHaveLength(2);
    });

    it("should request specified number of questions", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(validQuestions) } }],
        }),
      });

      await generatePracticeQuestions("Topic", 5);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const userMessage = body.messages.find(
        (m: { role: string }) => m.role === "user"
      );
      expect(userMessage.content).toContain("5");
    });

    it("should specify difficulty level in prompt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(validQuestions) } }],
        }),
      });

      await generatePracticeQuestions("Topic", 3, "hard");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const userMessage = body.messages.find(
        (m: { role: string }) => m.role === "user"
      );
      expect(userMessage.content).toContain("hard");
    });

    it("should extract JSON from markdown array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: `Here are the questions:\n\`\`\`json\n${JSON.stringify(validQuestions)}\n\`\`\``,
              },
            },
          ],
        }),
      });

      const result = await generatePracticeQuestions("Topic");

      expect(result.success).toBe(true);
      expect(result.questions).toBeDefined();
    });

    it("should handle invalid JSON array gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Invalid response without JSON" } }],
        }),
      });

      const result = await generatePracticeQuestions("Topic");

      expect(result.success).toBe(true);
      expect(result.questions).toBeUndefined();
      expect(authLogger.warn).toHaveBeenCalledWith(
        "[AI] Practice questions JSON parsing failed",
        expect.any(Object)
      );
    });

    it("should support Hindi language", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(validQuestions) } }],
        }),
      });

      await generatePracticeQuestions("इंटरनेट", 3, "medium", "hi");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("Hindi");
    });

    it("should support Assamese language", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(validQuestions) } }],
        }),
      });

      await generatePracticeQuestions("ইণ্টাৰনেট", 3, "medium", "as");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("Assamese");
    });
  });

  describe("summarizeContent", () => {
    it("should summarize content as notes", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "Key points:\n- Point 1\n- Point 2\n- Point 3",
              },
            },
          ],
        }),
      });

      const result = await summarizeContent(
        "Long article about digital literacy and its importance...",
        "notes"
      );

      expect(result.success).toBe(true);
      expect(result.content).toContain("Key points");
    });

    it("should create flashcards format", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "Q: What is the internet? | A: A global network",
              },
            },
          ],
        }),
      });

      await summarizeContent("Content...", "flashcards");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("flashcard");
    });

    it("should create outline format", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "I. Introduction\n  A. Overview\nII. Main Points",
              },
            },
          ],
        }),
      });

      await summarizeContent("Content...", "outline");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("outline");
    });

    it("should support Hindi summarization", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "हिंदी में सारांश" } }],
        }),
      });

      await summarizeContent("सामग्री...", "notes", "hi");

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const systemMessage = body.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("Hindi");
    });
  });

  describe("checkAIService", () => {
    it("should return available when API responds", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "OK" } }],
        }),
      });

      const result = await checkAIService();

      expect(result.available).toBe(true);
      expect(result.provider).toBe("groq");
    });

    it("should return unavailable when API fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: "Service Unavailable",
        json: jest.fn().mockResolvedValue({ error: { message: "Down" } }),
      });

      const result = await checkAIService();

      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return unavailable on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await checkAIService();

      expect(result.available).toBe(false);
      expect(result.error).toContain("Connection refused");
    });
  });

  describe("Provider Configuration", () => {
    it("should use Ollama provider when configured", async () => {
      process.env.AI_PROVIDER = "ollama";
      process.env.OLLAMA_BASE_URL = "http://localhost:11434";
      process.env.OLLAMA_MODEL = "cogito:14b";

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: { content: "Ollama response" },
        }),
      });

      const result = await askTutor("Question");

      expect(result.provider).toBe("ollama");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("localhost:11434"),
        expect.any(Object)
      );
    });

    it("should use OpenAI provider when configured", async () => {
      process.env.AI_PROVIDER = "openai";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.OPENAI_MODEL = "gpt-4o-mini";

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "OpenAI response" } }],
        }),
      });

      const result = await askTutor("Question");

      expect(result.provider).toBe("openai");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("openai.com"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-openai-key",
          }),
        })
      );
    });

    it("should throw error for unknown provider", async () => {
      process.env.AI_PROVIDER = "unknown";

      // getAIConfig throws before try-catch in callAI
      await expect(askTutor("Question")).rejects.toThrow("Unknown AI provider");
    });

    it("should include token usage in response when available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Response" } }],
          usage: { total_tokens: 150 },
        }),
      });

      const result = await askTutor("Question");

      expect(result.tokensUsed).toBe(150);
    });
  });
});
