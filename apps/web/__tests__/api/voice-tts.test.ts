/**
 * Tests for voice/tts API route
 * Target: ~25 tests covering TTS endpoint functionality
 */

// Polyfill for Next.js server testing
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

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

  get headers() {
    return new Map(Object.entries(this.options.headers || {}));
  }

  async text() {
    return typeof this.body === "string" ? this.body : "";
  }

  async json() {
    return typeof this.body === "object" ? this.body : JSON.parse(this.body as string);
  }

  static json(data: unknown, init?: { status?: number }) {
    return new MockResponse(data, init);
  }
}

global.Response = MockResponse as unknown as typeof Response;

// Mock dependencies
const mockGetCurrentUser = jest.fn();
jest.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockCheckRateLimit = jest.fn();
jest.mock("@/lib/rate-limiter-distributed", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock("@/lib/constants/rate-limits", () => ({
  RATE_LIMITS: {
    tts: { tokensPerInterval: 10, interval: 60000 },
  },
}));

jest.mock("@/lib/constants/validation-limits", () => ({
  AI_CONTENT_LIMITS: {
    ttsMaxLength: 500,
  },
}));

const mockTtsService = {
  synthesize: jest.fn(),
  isAvailable: jest.fn(),
  getSupportedLanguages: jest.fn(),
};
jest.mock("@/lib/ai/services/tts-service", () => ({
  ttsService: mockTtsService,
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { POST, GET } from "@/app/api/voice/tts/route";

// Helper to create mock request
function createMockRequest(body: object): Request {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

describe("POST /api/voice/tts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(true);
    mockTtsService.synthesize.mockResolvedValue(new ArrayBuffer(100));
  });

  describe("authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const request = createMockRequest({ text: "Hello" });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });

    it("should proceed when user is authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });

      const request = createMockRequest({ text: "Hello" });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limit exceeded", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockCheckRateLimit.mockResolvedValue(false);

      const request = createMockRequest({ text: "Hello" });
      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(await response.text()).toContain("Rate limit exceeded");
    });

    it("should call checkRateLimit with user-specific key", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-456" });

      const request = createMockRequest({ text: "Hello" });
      await POST(request);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "tts:user-456",
        expect.any(Object)
      );
    });
  });

  describe("input validation", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    });

    it("should return 400 when text is missing", async () => {
      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Text is required");
    });

    it("should return 400 when text is not a string", async () => {
      const request = createMockRequest({ text: 123 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Text is required");
    });

    it("should return 400 when text exceeds max length", async () => {
      const longText = "a".repeat(501);
      const request = createMockRequest({ text: longText });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Text is too long");
    });

    it("should return 400 for unsupported language", async () => {
      const request = createMockRequest({ text: "Hello", language: "fr" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Unsupported language");
    });

    it("should accept supported languages", async () => {
      const languages = ["en", "hi", "as"];
      for (const language of languages) {
        mockTtsService.synthesize.mockResolvedValue(new ArrayBuffer(100));
        const request = createMockRequest({ text: "Hello", language });
        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe("TTS synthesis", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    });

    it("should call ttsService.synthesize with correct parameters", async () => {
      const request = createMockRequest({
        text: "Hello world",
        language: "en",
        emotion: "friendly",
      });
      await POST(request);

      expect(mockTtsService.synthesize).toHaveBeenCalledWith(
        "Hello world",
        "en",
        { emotion: "friendly" }
      );
    });

    it("should use default language when not specified", async () => {
      const request = createMockRequest({ text: "Hello" });
      await POST(request);

      expect(mockTtsService.synthesize).toHaveBeenCalledWith(
        "Hello",
        "en",
        expect.any(Object)
      );
    });

    it("should return audio buffer with correct headers", async () => {
      const audioBuffer = new ArrayBuffer(1024);
      mockTtsService.synthesize.mockResolvedValue(audioBuffer);

      const request = createMockRequest({ text: "Hello" });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("audio/wav");
      expect(response.headers.get("Content-Length")).toBe("1024");
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
    });

    it("should return 503 when model is loading", async () => {
      mockTtsService.synthesize.mockRejectedValue(new Error("model is loading"));

      const request = createMockRequest({ text: "Hello" });
      const response = await POST(request);

      expect(response.status).toBe(503);
      expect(await response.text()).toContain("TTS model is loading");
    });

    it("should return 500 on general error", async () => {
      mockTtsService.synthesize.mockRejectedValue(new Error("Unknown error"));

      const request = createMockRequest({ text: "Hello" });
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe("TTS generation failed");
    });
  });
});

describe("GET /api/voice/tts (health check)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return available status when service is up", async () => {
    mockTtsService.isAvailable.mockResolvedValue({
      available: true,
      provider: "ai4bharat",
    });
    mockTtsService.getSupportedLanguages.mockReturnValue(["en", "hi", "as"]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
    expect(data.provider).toBe("ai4bharat");
    expect(data.supportedLanguages).toEqual(["en", "hi", "as"]);
  });

  it("should return unavailable status when service is down", async () => {
    mockTtsService.isAvailable.mockResolvedValue({
      available: false,
      error: "Service unavailable",
    });
    mockTtsService.getSupportedLanguages.mockReturnValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.available).toBe(false);
    expect(data.error).toBe("Service unavailable");
  });

  it("should return 500 on health check error", async () => {
    mockTtsService.isAvailable.mockRejectedValue(new Error("Health check failed"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.available).toBe(false);
    expect(data.error).toBe("Health check failed");
  });
});
