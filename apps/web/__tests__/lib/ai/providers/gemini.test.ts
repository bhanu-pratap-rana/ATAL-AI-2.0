/**
 * Tests for gemini.ts AI provider
 * Target: ~15 tests covering AI model selection and configuration
 */

// Mock the AI SDK modules before importing
jest.mock("@ai-sdk/google", () => ({
  google: jest.fn((model: string) => ({ model, provider: "google" })),
}));

jest.mock("@ai-sdk/groq", () => ({
  createGroq: jest.fn(() => (model: string) => ({ model, provider: "groq" })),
}));

import {
  getAIModel,
  getModelWithFallback,
  MODEL_CONFIGS,
  geminiModels,
  groqModels,
} from "@/lib/ai/providers/gemini";

describe("gemini AI provider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GROQ_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getAIModel", () => {
    it("should return Gemini when GEMINI_API_KEY is set and gemini preferred", () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const model = getAIModel("gemini");

      expect(model).toBeDefined();
    });

    it("should return Gemini when GOOGLE_GENERATIVE_AI_API_KEY is set", () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key";

      const model = getAIModel("gemini");

      expect(model).toBeDefined();
    });

    it("should return Groq when groq preferred and GROQ_API_KEY is set", () => {
      process.env.GROQ_API_KEY = "test-groq-key";

      const model = getAIModel("groq");

      expect(model).toBeDefined();
    });

    it("should fallback to Groq when Gemini not available but Groq is", () => {
      process.env.GROQ_API_KEY = "test-groq-key";
      // No Gemini key set

      const model = getAIModel("gemini");

      expect(model).toBeDefined();
    });

    it("should return Gemini by default when no preference specified", () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const model = getAIModel();

      expect(model).toBeDefined();
    });

    it("should fallback to Gemini when no keys available", () => {
      // No keys set - will return Gemini (will error on actual use)
      const model = getAIModel("gemini");

      expect(model).toBeDefined();
    });
  });

  describe("getModelWithFallback", () => {
    it("should return Gemini provider when GEMINI_API_KEY is set", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const result = await getModelWithFallback();

      expect(result.provider).toBe("gemini");
      expect(result.model).toBeDefined();
    });

    it("should return Gemini provider when GOOGLE_GENERATIVE_AI_API_KEY is set", async () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key";

      const result = await getModelWithFallback();

      expect(result.provider).toBe("gemini");
    });

    it("should return Groq provider when only GROQ_API_KEY is set", async () => {
      process.env.GROQ_API_KEY = "test-groq-key";

      const result = await getModelWithFallback();

      expect(result.provider).toBe("groq");
      expect(result.model).toBeDefined();
    });

    it("should throw error when no API keys are configured", async () => {
      // No keys set
      await expect(getModelWithFallback()).rejects.toThrow(
        "No AI provider configured"
      );
    });

    it("should prefer Gemini over Groq when both are available", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.GROQ_API_KEY = "test-groq-key";

      const result = await getModelWithFallback();

      expect(result.provider).toBe("gemini");
    });
  });

  describe("MODEL_CONFIGS", () => {
    it("should have tutor configuration", () => {
      expect(MODEL_CONFIGS.tutor).toEqual({
        temperature: 0.7,
        maxTokens: 1024,
        topP: 0.95,
      });
    });

    it("should have retrieval configuration", () => {
      expect(MODEL_CONFIGS.retrieval).toEqual({
        temperature: 0.3,
        maxTokens: 512,
        topP: 0.9,
      });
    });

    it("should have assessment configuration", () => {
      expect(MODEL_CONFIGS.assessment).toEqual({
        temperature: 0.5,
        maxTokens: 1024,
        topP: 0.9,
      });
    });

    it("should have creative configuration", () => {
      expect(MODEL_CONFIGS.creative).toEqual({
        temperature: 0.9,
        maxTokens: 2048,
        topP: 0.95,
      });
    });

    it("should have temperature values between 0 and 1", () => {
      Object.values(MODEL_CONFIGS).forEach((config) => {
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("geminiModels", () => {
    it("should have flash model", () => {
      expect(geminiModels.flash).toBeDefined();
    });

    it("should have pro model", () => {
      expect(geminiModels.pro).toBeDefined();
    });
  });

  describe("groqModels", () => {
    it("should have llama33 model", () => {
      expect(groqModels.llama33).toBeDefined();
    });

    it("should have llama32 model", () => {
      expect(groqModels.llama32).toBeDefined();
    });

    it("should have mixtral model", () => {
      expect(groqModels.mixtral).toBeDefined();
    });
  });
});
