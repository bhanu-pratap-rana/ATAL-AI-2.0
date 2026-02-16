/**
 * Tests for check-auth-config API route
 * Target: ~20 tests covering authentication, rate limiting, and config retrieval
 */

// Polyfill Request/Response for Next.js server testing
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock next/server before importing route
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
}));

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
    ipBased: { tokensPerInterval: 60, interval: 60000 },
  },
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Store original env
const originalEnv = process.env;

import { GET } from "@/app/api/check-auth-config/route";

describe("GET /api/check-auth-config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    };
    mockCheckRateLimit.mockResolvedValue(true);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should proceed when user is authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ external: {}, disable_signup: false }),
      });

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });

  describe("rate limiting", () => {
    it("should return 429 when rate limit exceeded", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockCheckRateLimit.mockResolvedValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Too many requests. Please try again later.");
    });

    it("should call checkRateLimit with user-specific key", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-456" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await GET();

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "auth-config:user-456",
        expect.any(Object)
      );
    });

    it("should proceed when rate limit allows", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockCheckRateLimit.mockResolvedValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const response = await GET();

      expect(response.status).toBe(200);
    });
  });

  describe("environment configuration", () => {
    it("should return 500 when SUPABASE_URL is missing", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server configuration error");
    });

    it("should return 500 when ANON_KEY is missing", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server configuration error");
    });
  });

  describe("Supabase API call", () => {
    it("should fetch auth settings from Supabase", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ external: {} }),
      });

      await GET();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.supabase.co/auth/v1/settings",
        expect.objectContaining({
          headers: expect.objectContaining({
            apikey: "test-anon-key",
            Authorization: "Bearer test-anon-key",
          }),
        })
      );
    });

    it("should return 500 when Supabase API fails", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch auth settings");
    });
  });

  describe("successful response", () => {
    it("should return filtered settings on success", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            external: { google: true },
            disable_signup: false,
            autoconfirm: true,
            mailer_autoconfirm: false,
            phone_autoconfirm: true,
            smtp_host: "smtp.example.com",
          }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("success");
      expect(data.settings.external).toEqual({ google: true });
      expect(data.settings.disable_signup).toBe(false);
      expect(data.settings.autoconfirm).toBe(true);
      expect(data.hasAnonKey).toBe(true);
    });

    it("should indicate email provider configured when smtp_host exists", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            smtp_host: "smtp.example.com",
          }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.settings.email_provider_configured).toBe(true);
    });

    it("should indicate email provider configured when mailer_provider exists", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            mailer_provider: "sendgrid",
          }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.settings.email_provider_configured).toBe(true);
    });

    it("should indicate no email provider when neither smtp_host nor mailer_provider exists", async () => {
      mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.settings.email_provider_configured).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should return 500 on unexpected error", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Database connection failed"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });

    it("should handle non-Error throws", async () => {
      mockGetCurrentUser.mockRejectedValue("String error");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An unexpected error occurred");
    });
  });
});
