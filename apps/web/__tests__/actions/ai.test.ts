/**
 * Tests for actions/ai.ts - AI Server Actions
 * Target: ~30 tests covering authentication, rate limiting, validation, and AI calls
 */

// Mock dependencies before imports
jest.mock("@/lib/supabase-server", () => ({
  getCurrentUser: jest.fn(),
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

jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/lib/ai-service", () => ({
  askTutor: jest.fn(),
  getEssayFeedback: jest.fn(),
  generatePracticeQuestions: jest.fn(),
  summarizeContent: jest.fn(),
  checkAIService: jest.fn(),
}));

jest.mock("@/lib/constants/validation-limits", () => ({
  AI_CONTENT_LIMITS: {
    questionMinLength: 5,
    questionMaxLength: 1000,
    essayMinLength: 50,
    essayMaxLength: 10000,
    topicMinLength: 3,
    practiceQuestionsMin: 1,
    practiceQuestionsMax: 20,
    contentMinLength: 20,
    contentMaxLength: 50000,
  },
}));

import {
  askAITutor,
  getAIEssayFeedback,
  generateAIPracticeQuestions,
  summarizeStudyContent,
  checkAIServiceStatus,
} from "@/app/actions/ai";
import { getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import {
  askTutor,
  getEssayFeedback,
  generatePracticeQuestions,
  summarizeContent,
  checkAIService,
} from "@/lib/ai-service";

describe("AI Server Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: authenticated user
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    // Default: rate limit not exceeded
    (checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe("askAITutor", () => {
    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await askAITutor("What is the internet?");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Authentication required");
        expect(askTutor).not.toHaveBeenCalled();
      });

      it("should accept authenticated users", async () => {
        (askTutor as jest.Mock).mockResolvedValue({
          success: true,
          content: "Answer here",
          provider: "groq",
          model: "llama-3.3-70b",
        });

        const result = await askAITutor("What is the internet?");

        expect(result.success).toBe(true);
        expect(askTutor).toHaveBeenCalled();
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await askAITutor("Question?");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
        expect(authLogger.warn).toHaveBeenCalledWith(
          "[askAITutor] Rate limit exceeded",
          expect.any(Object)
        );
      });

      it("should call rate limiter with correct key", async () => {
        (askTutor as jest.Mock).mockResolvedValue({
          success: true,
          content: "OK",
          provider: "groq",
          model: "test",
        });

        await askAITutor("Question?");

        expect(checkRateLimit).toHaveBeenCalledWith(
          "ai:tutor:user-123",
          expect.any(Object)
        );
      });
    });

    describe("Input Validation", () => {
      it("should reject empty question", async () => {
        const result = await askAITutor("");

        expect(result.success).toBe(false);
        expect(result.error).toContain("valid question");
      });

      it("should reject question shorter than minimum", async () => {
        const result = await askAITutor("Hi"); // Less than 5 chars

        expect(result.success).toBe(false);
        expect(result.error).toContain("valid question");
      });

      it("should reject question longer than maximum", async () => {
        const longQuestion = "a".repeat(1001); // More than 1000 chars

        const result = await askAITutor(longQuestion);

        expect(result.success).toBe(false);
        expect(result.error).toContain("too long");
      });

      it("should accept valid question", async () => {
        (askTutor as jest.Mock).mockResolvedValue({
          success: true,
          content: "Answer",
          provider: "groq",
          model: "test",
        });

        const result = await askAITutor("What is WiFi?");

        expect(result.success).toBe(true);
      });
    });

    describe("AI Service Integration", () => {
      it("should pass question to askTutor", async () => {
        (askTutor as jest.Mock).mockResolvedValue({
          success: true,
          content: "Answer",
          provider: "groq",
          model: "test",
        });

        await askAITutor("What is a computer?");

        expect(askTutor).toHaveBeenCalledWith(
          "What is a computer?",
          undefined // No context passed
        );
      });

      it("should pass context to askTutor", async () => {
        (askTutor as jest.Mock).mockResolvedValue({
          success: true,
          content: "Answer",
          provider: "groq",
          model: "test",
        });

        await askAITutor("Question?", { subject: "Digital Literacy" });

        expect(askTutor).toHaveBeenCalledWith(
          "Question?",
          expect.objectContaining({ subject: "Digital Literacy" })
        );
      });

      it("should handle AI service failure", async () => {
        (askTutor as jest.Mock).mockResolvedValue({
          success: false,
          error: "AI model unavailable",
          provider: "groq",
          model: "test",
        });

        const result = await askAITutor("Question?");

        expect(result.success).toBe(false);
        expect(result.error).toContain("AI model unavailable");
      });

      it("should handle unexpected errors", async () => {
        (askTutor as jest.Mock).mockRejectedValue(new Error("Network error"));

        const result = await askAITutor("Question?");

        expect(result.success).toBe(false);
        expect(result.error).toContain("unexpected error");
        expect(authLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe("getAIEssayFeedback", () => {
    const validEssay = "This is a valid essay about digital literacy that meets the minimum length requirement for testing purposes.";

    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await getAIEssayFeedback(validEssay);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Authentication required");
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await getAIEssayFeedback(validEssay);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });

      it("should use essay rate limit key", async () => {
        (getEssayFeedback as jest.Mock).mockResolvedValue({
          success: true,
          content: "Feedback",
          provider: "groq",
          model: "test",
        });

        await getAIEssayFeedback(validEssay);

        expect(checkRateLimit).toHaveBeenCalledWith(
          "ai:essay:user-123",
          expect.any(Object)
        );
      });
    });

    describe("Input Validation", () => {
      it("should reject essay shorter than minimum", async () => {
        const result = await getAIEssayFeedback("Too short");

        expect(result.success).toBe(false);
        expect(result.error).toContain("at least");
      });

      it("should reject essay longer than maximum", async () => {
        const longEssay = "a".repeat(10001);

        const result = await getAIEssayFeedback(longEssay);

        expect(result.success).toBe(false);
        expect(result.error).toContain("too long");
      });
    });

    describe("AI Service Integration", () => {
      it("should pass essay to getEssayFeedback", async () => {
        (getEssayFeedback as jest.Mock).mockResolvedValue({
          success: true,
          content: "Feedback",
          feedback: { overallScore: 7 },
          provider: "groq",
          model: "test",
        });

        await getAIEssayFeedback(validEssay, "Digital Literacy", "en");

        expect(getEssayFeedback).toHaveBeenCalledWith(
          validEssay.trim(),
          "Digital Literacy",
          "en"
        );
      });

      it("should return feedback data on success", async () => {
        const mockFeedback = {
          overallScore: 8,
          grammar: { score: 9, issues: [] },
        };
        (getEssayFeedback as jest.Mock).mockResolvedValue({
          success: true,
          content: "Feedback",
          feedback: mockFeedback,
          provider: "groq",
          model: "test",
        });

        const result = await getAIEssayFeedback(validEssay);

        expect(result.success).toBe(true);
        expect(result.data?.feedback).toEqual(mockFeedback);
      });
    });
  });

  describe("generateAIPracticeQuestions", () => {
    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await generateAIPracticeQuestions("Internet");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Authentication required");
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await generateAIPracticeQuestions("Internet");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });

      it("should use practice rate limit key", async () => {
        (generatePracticeQuestions as jest.Mock).mockResolvedValue({
          success: true,
          content: "[]",
          questions: [],
          provider: "groq",
          model: "test",
        });

        await generateAIPracticeQuestions("Topic");

        expect(checkRateLimit).toHaveBeenCalledWith(
          "ai:practice:user-123",
          expect.any(Object)
        );
      });
    });

    describe("Input Validation", () => {
      it("should reject topic shorter than minimum", async () => {
        const result = await generateAIPracticeQuestions("ab"); // Less than 3 chars

        expect(result.success).toBe(false);
        expect(result.error).toContain("valid topic");
      });

      it("should reject invalid question count (too few)", async () => {
        const result = await generateAIPracticeQuestions("Topic", 0);

        expect(result.success).toBe(false);
        expect(result.error).toContain("between");
      });

      it("should reject invalid question count (too many)", async () => {
        const result = await generateAIPracticeQuestions("Topic", 25);

        expect(result.success).toBe(false);
        expect(result.error).toContain("between");
      });

      it("should accept valid parameters", async () => {
        (generatePracticeQuestions as jest.Mock).mockResolvedValue({
          success: true,
          content: "[]",
          questions: [],
          provider: "groq",
          model: "test",
        });

        const result = await generateAIPracticeQuestions("Internet Basics", 5, "medium");

        expect(result.success).toBe(true);
      });
    });

    describe("AI Service Integration", () => {
      it("should pass all parameters to generatePracticeQuestions", async () => {
        (generatePracticeQuestions as jest.Mock).mockResolvedValue({
          success: true,
          content: "[]",
          questions: [],
          provider: "groq",
          model: "test",
        });

        await generateAIPracticeQuestions("WiFi", 3, "hard", "hi");

        expect(generatePracticeQuestions).toHaveBeenCalledWith("WiFi", 3, "hard", "hi");
      });

      it("should return questions on success", async () => {
        const mockQuestions = [
          { id: "q1", question: "What is WiFi?", difficulty: "easy" },
        ];
        (generatePracticeQuestions as jest.Mock).mockResolvedValue({
          success: true,
          content: JSON.stringify(mockQuestions),
          questions: mockQuestions,
          provider: "groq",
          model: "test",
        });

        const result = await generateAIPracticeQuestions("WiFi");

        expect(result.success).toBe(true);
        expect(result.data?.questions).toEqual(mockQuestions);
      });
    });
  });

  describe("summarizeStudyContent", () => {
    const validContent = "This is a longer piece of content that needs to be summarized for study purposes.";

    describe("Authentication", () => {
      it("should reject unauthenticated users", async () => {
        (getCurrentUser as jest.Mock).mockResolvedValue(null);

        const result = await summarizeStudyContent(validContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Authentication required");
      });
    });

    describe("Rate Limiting", () => {
      it("should reject when rate limit exceeded", async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue(false);

        const result = await summarizeStudyContent(validContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Too many requests");
      });

      it("should use summarize rate limit key", async () => {
        (summarizeContent as jest.Mock).mockResolvedValue({
          success: true,
          content: "Summary",
          provider: "groq",
          model: "test",
        });

        await summarizeStudyContent(validContent);

        expect(checkRateLimit).toHaveBeenCalledWith(
          "ai:summarize:user-123",
          expect.any(Object)
        );
      });
    });

    describe("Input Validation", () => {
      it("should reject content shorter than minimum", async () => {
        const result = await summarizeStudyContent("Too short");

        expect(result.success).toBe(false);
        expect(result.error).toContain("at least");
      });

      it("should reject content longer than maximum", async () => {
        const longContent = "a".repeat(50001);

        const result = await summarizeStudyContent(longContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain("too long");
      });
    });

    describe("AI Service Integration", () => {
      it("should pass all parameters to summarizeContent", async () => {
        (summarizeContent as jest.Mock).mockResolvedValue({
          success: true,
          content: "Summary",
          provider: "groq",
          model: "test",
        });

        await summarizeStudyContent(validContent, "flashcards", "hi");

        expect(summarizeContent).toHaveBeenCalledWith(
          validContent.trim(),
          "flashcards",
          "hi"
        );
      });

      it("should use default format when not specified", async () => {
        (summarizeContent as jest.Mock).mockResolvedValue({
          success: true,
          content: "Summary",
          provider: "groq",
          model: "test",
        });

        await summarizeStudyContent(validContent);

        expect(summarizeContent).toHaveBeenCalledWith(
          validContent.trim(),
          "notes",
          "en"
        );
      });
    });
  });

  describe("checkAIServiceStatus", () => {
    it("should not require authentication", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);
      (checkAIService as jest.Mock).mockResolvedValue({
        available: true,
        provider: "groq",
        model: "llama-3.3-70b",
      });

      const result = await checkAIServiceStatus();

      expect(result.success).toBe(true);
      expect(checkAIService).toHaveBeenCalled();
    });

    it("should return service status on success", async () => {
      (checkAIService as jest.Mock).mockResolvedValue({
        available: true,
        provider: "groq",
        model: "llama-3.3-70b",
      });

      const result = await checkAIServiceStatus();

      expect(result.success).toBe(true);
      expect(result.data?.available).toBe(true);
      expect(result.data?.provider).toBe("groq");
      expect(result.data?.model).toBe("llama-3.3-70b");
    });

    it("should return unavailable status when service is down", async () => {
      (checkAIService as jest.Mock).mockResolvedValue({
        available: false,
        provider: "groq",
        model: "llama-3.3-70b",
        error: "Service unavailable",
      });

      const result = await checkAIServiceStatus();

      expect(result.success).toBe(true);
      expect(result.data?.available).toBe(false);
    });

    it("should handle unexpected errors", async () => {
      (checkAIService as jest.Mock).mockRejectedValue(new Error("Connection failed"));

      const result = await checkAIServiceStatus();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to check");
      expect(authLogger.error).toHaveBeenCalled();
    });
  });
});
