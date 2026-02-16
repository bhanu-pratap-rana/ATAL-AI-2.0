/**
 * Tests for TTSService
 * Target: ~30 tests covering TTS synthesis, providers, and utility functions
 */

// Mock dependencies
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Store original env
const originalEnv = process.env;

import { TTSService, type TTSLanguage } from "@/lib/ai/services/tts-service";

describe("TTSService", () => {
  let service: TTSService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TTSService();
    process.env = {
      ...originalEnv,
      HUGGINGFACE_API_KEY: "test-hf-key",
      TTS_FALLBACK_URL: "https://render-fallback.example.com",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("synthesize", () => {
    it("should throw error when text is empty", async () => {
      await expect(service.synthesize("", "en")).rejects.toThrow(
        "Text is required for TTS synthesis"
      );
    });

    it("should throw error when text is only whitespace", async () => {
      await expect(service.synthesize("   ", "en")).rejects.toThrow(
        "Text is required for TTS synthesis"
      );
    });

    it("should call HuggingFace API as primary provider", async () => {
      const mockAudioBuffer = new ArrayBuffer(100);
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockAudioBuffer),
      });

      const result = await service.synthesize("Hello world", "en");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("huggingface"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-hf-key",
          }),
        })
      );
      expect(result).toBe(mockAudioBuffer);
    });

    it("should use correct voice config for English", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await service.synthesize("Hello", "en");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("en-IN-female"),
        })
      );
    });

    it("should use correct voice config for Hindi", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await service.synthesize("नमस्ते", "hi");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("hi-IN-female"),
        })
      );
    });

    it("should use correct voice config for Assamese", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await service.synthesize("নমস্কাৰ", "as");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("as-IN-female"),
        })
      );
    });

    it("should override emotion when specified in options", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await service.synthesize("Hello", "en", { emotion: "encouraging" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("encouraging"),
        })
      );
    });

    it("should fallback to Render when HuggingFace fails", async () => {
      // First call (HuggingFace) fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("HF Error"),
      });

      // Second call (Render) succeeds
      const mockAudioBuffer = new ArrayBuffer(50);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockAudioBuffer),
      });

      const result = await service.synthesize("Hello", "en");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockAudioBuffer);
    });

    it("should throw error when both providers fail", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("HF Error"),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Render Error"),
      });

      await expect(service.synthesize("Hello", "en")).rejects.toThrow();
    });

    it("should handle 503 model loading error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve("Model loading"),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const result = await service.synthesize("Hello", "en");

      expect(result).toBeDefined();
    });

    it("should throw when no fallback URL and HuggingFace fails", async () => {
      delete process.env.TTS_FALLBACK_URL;
      service = new TTSService(); // Reinitialize with no fallback

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error"),
      });

      await expect(service.synthesize("Hello", "en")).rejects.toThrow(
        "No fallback available"
      );
    });

    it("should throw when HUGGINGFACE_API_KEY is missing", async () => {
      delete process.env.HUGGINGFACE_API_KEY;
      service = new TTSService();

      // HuggingFace will throw due to missing key
      // And no fallback configured either
      delete process.env.TTS_FALLBACK_URL;
      service = new TTSService();

      await expect(service.synthesize("Hello", "en")).rejects.toThrow();
    });
  });

  describe("isAvailable", () => {
    it("should return huggingface when HuggingFace is available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const result = await service.isAvailable();

      expect(result.available).toBe(true);
      expect(result.provider).toBe("huggingface");
    });

    it("should return render when HuggingFace fails but Render is available", async () => {
      // HuggingFace fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error"),
      });

      // Render health check succeeds
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await service.isAvailable();

      expect(result.available).toBe(true);
      expect(result.provider).toBe("render");
    });

    it("should return browser when no API providers available", async () => {
      delete process.env.HUGGINGFACE_API_KEY;
      delete process.env.TTS_FALLBACK_URL;
      service = new TTSService();

      const result = await service.isAvailable();

      expect(result.available).toBe(true);
      expect(result.provider).toBe("browser");
      expect(result.error).toContain("browser Speech Synthesis");
    });

    it("should return browser when Render health check fails", async () => {
      delete process.env.HUGGINGFACE_API_KEY;
      service = new TTSService();

      // Render health check fails
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await service.isAvailable();

      expect(result.available).toBe(true);
      expect(result.provider).toBe("browser");
    });
  });

  describe("getSupportedLanguages", () => {
    it("should return all supported languages", () => {
      const languages = service.getSupportedLanguages();

      expect(languages).toContain("en");
      expect(languages).toContain("hi");
      expect(languages).toContain("as");
      expect(languages).toHaveLength(3);
    });
  });

  describe("getLanguageName", () => {
    it("should return correct name for English", () => {
      expect(service.getLanguageName("en")).toBe("English");
    });

    it("should return correct name for Hindi", () => {
      expect(service.getLanguageName("hi")).toBe("Hindi");
    });

    it("should return correct name for Assamese", () => {
      expect(service.getLanguageName("as")).toBe("Assamese");
    });

    it("should return Unknown for unsupported language", () => {
      expect(service.getLanguageName("fr" as TTSLanguage)).toBe("Unknown");
    });
  });

  describe("estimateDuration", () => {
    it("should estimate duration for English text", () => {
      const duration = service.estimateDuration("This is a test sentence", "en");

      // 5 words at 2.5 words/second = 2 seconds
      expect(duration).toBe(2);
    });

    it("should estimate duration for Hindi text", () => {
      const duration = service.estimateDuration("यह एक परीक्षण वाक्य है", "hi");

      // 5 words at 2.3 words/second ≈ 3 seconds
      expect(duration).toBeGreaterThanOrEqual(2);
    });

    it("should estimate duration for Assamese text", () => {
      const duration = service.estimateDuration("এইটো এটা পৰীক্ষা বাক্য", "as");

      // 4 words at 2.2 words/second ≈ 2 seconds
      expect(duration).toBeGreaterThanOrEqual(2);
    });

    it("should handle empty text", () => {
      const duration = service.estimateDuration("", "en");

      // Empty text = 1 "word" (empty split) / 2.5 = 1 second
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle long text", () => {
      const longText = "word ".repeat(100); // ~100 words
      const duration = service.estimateDuration(longText, "en");

      // ~100 words at 2.5 words/second ≈ 40-41 seconds (ceil rounding)
      expect(duration).toBeGreaterThanOrEqual(40);
      expect(duration).toBeLessThanOrEqual(42);
    });

    it("should use English rate for unknown language", () => {
      const duration = service.estimateDuration(
        "Test sentence",
        "fr" as TTSLanguage
      );

      // 2 words at 2.5 words/second = 1 second
      expect(duration).toBe(1);
    });
  });

  describe("voice configuration", () => {
    it("should use slower speed for Assamese", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await service.synthesize("নমস্কাৰ", "as");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("0.95"),
        })
      );
    });

    it("should allow speed override", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      await service.synthesize("Hello", "en", { speed: 1.5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("1.5"),
        })
      );
    });
  });
});
