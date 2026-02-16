/**
 * Tests for middleware.ts
 * Target: ~18 tests covering CORS, auth, and routing logic
 */

// Mock global Response for OPTIONS handling
class MockResponse {
  status: number;
  headers: Map<string, string>;

  constructor(body: null, init: { status: number; headers: Record<string, string> }) {
    this.status = init.status;
    this.headers = new Map(Object.entries(init.headers));
  }
}
// @ts-expect-error - Mock Response for jsdom
global.Response = MockResponse;

// Mock NextResponse before importing middleware
const mockNextResponseHeaders = new Map<string, string>();
const mockNextResponse = {
  status: 200,
  headers: {
    get: (key: string) => mockNextResponseHeaders.get(key),
    set: (key: string, value: string) => mockNextResponseHeaders.set(key, value),
  },
  cookies: {
    set: jest.fn(),
  },
};

const mockRedirectResponse = {
  status: 307,
  headers: new Map([["location", ""]]),
};

jest.mock("next/server", () => ({
  NextResponse: {
    next: jest.fn(() => mockNextResponse),
    redirect: jest.fn((url: URL) => {
      mockRedirectResponse.headers.set("location", url.toString());
      return {
        status: 307,
        headers: {
          get: (key: string) => mockRedirectResponse.headers.get(key),
        },
      };
    }),
  },
}));

// Mock dependencies before imports
const mockGetUser = jest.fn();
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
};

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock("@/lib/cors", () => ({
  createCORSHeaders: jest.fn((origin) => ({
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  })),
}));

// Set env variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

import { middleware, config } from "@/middleware";
import { createCORSHeaders } from "@/lib/cors";

describe("middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createMockRequest(options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
  }): any {
    const { url, method = "GET", headers = {} } = options;
    const fullUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;

    return {
      method,
      url: fullUrl,
      nextUrl: new URL(fullUrl),
      headers: new Headers(headers),
      cookies: {
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      },
    };
  }

  describe("CORS Handling", () => {
    it("should handle OPTIONS preflight requests", async () => {
      const request = createMockRequest({
        url: "/api/test",
        method: "OPTIONS",
        headers: { origin: "https://example.com" },
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(createCORSHeaders).toHaveBeenCalledWith("https://example.com");
    });

    it("should add CORS headers to regular responses", async () => {
      const request = createMockRequest({
        url: "/app/dashboard",
        method: "GET",
        headers: { origin: "https://app.example.com" },
      });
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });

      const response = await middleware(request);

      expect(createCORSHeaders).toHaveBeenCalledWith("https://app.example.com");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "https://app.example.com"
      );
    });

    it("should handle requests without origin header", async () => {
      const request = createMockRequest({
        url: "/app/dashboard",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });

      const response = await middleware(request);

      expect(createCORSHeaders).toHaveBeenCalledWith(null);
    });
  });

  describe("Server Action Bypass", () => {
    it("should bypass for POST with form-urlencoded content type", async () => {
      const request = createMockRequest({
        url: "/app/some-action",
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      });

      const response = await middleware(request);

      // Should refresh token but not redirect
      expect(mockGetUser).toHaveBeenCalled();
      expect(response.status).not.toBe(307); // Not a redirect
    });

    it("should bypass for POST with next-action header", async () => {
      const request = createMockRequest({
        url: "/app/some-action",
        method: "POST",
        headers: {
          "next-action": "action-id-123",
        },
      });

      const response = await middleware(request);

      expect(mockGetUser).toHaveBeenCalled();
      expect(response.status).not.toBe(307);
    });
  });

  describe("Protected Routes", () => {
    it("should redirect unauthenticated users from /app routes", async () => {
      const request = createMockRequest({
        url: "/app/dashboard",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/student/start");
    });

    it("should allow authenticated users to access /app routes", async () => {
      const request = createMockRequest({
        url: "/app/dashboard",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
      });

      const response = await middleware(request);

      expect(response.status).not.toBe(307);
    });

    it("should redirect unauthenticated users from nested /app routes", async () => {
      const request = createMockRequest({
        url: "/app/assessment/history",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/student/start");
    });
  });

  describe("Admin Login Route", () => {
    it("should allow access to admin login without authentication", async () => {
      const request = createMockRequest({
        url: "/admin/login",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(request);

      expect(response.status).not.toBe(307);
    });

    it("should allow authenticated users to access admin login", async () => {
      const request = createMockRequest({
        url: "/admin/login",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      });

      const response = await middleware(request);

      expect(response.status).not.toBe(307);
    });
  });

  describe("Auth Page Redirection", () => {
    it("should redirect authenticated users from /student/start to dashboard", async () => {
      const request = createMockRequest({
        url: "/student/start",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({
        data: { user: { id: "student-123" } },
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/app/dashboard");
    });

    it("should redirect authenticated users from /teacher/start to dashboard", async () => {
      const request = createMockRequest({
        url: "/teacher/start",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({
        data: { user: { id: "teacher-123" } },
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/app/dashboard");
    });

    it("should allow unauthenticated users to access /student/start", async () => {
      const request = createMockRequest({
        url: "/student/start",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(request);

      expect(response.status).not.toBe(307);
    });

    it("should allow unauthenticated users to access /teacher/start", async () => {
      const request = createMockRequest({
        url: "/teacher/start",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const response = await middleware(request);

      expect(response.status).not.toBe(307);
    });
  });

  describe("Join Route", () => {
    it("should not redirect authenticated users from /join route", async () => {
      const request = createMockRequest({
        url: "/join",
        method: "GET",
      });
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const response = await middleware(request);

      // Join routes handle their own logic
      expect(response.status).not.toBe(307);
    });
  });

  describe("Config Matcher", () => {
    it("should have correct matcher patterns", () => {
      expect(config.matcher).toContain("/app/:path*");
      expect(config.matcher).toContain("/admin/login");
      expect(config.matcher).toContain("/student/start");
      expect(config.matcher).toContain("/teacher/start");
      expect(config.matcher).toContain("/join");
    });
  });
});
