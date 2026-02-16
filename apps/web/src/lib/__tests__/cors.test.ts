/**
 * @jest-environment jsdom
 */

// Mock Request and Response for tests
class MockHeaders {
  private headers: Map<string, string> = new Map();

  constructor(init?: Record<string, string>) {
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) ?? null;
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }
}

class MockRequest {
  method: string;
  url: string;
  headers: MockHeaders;

  constructor(url: string, init?: { method?: string; headers?: Record<string, string> }) {
    this.url = url;
    this.method = init?.method ?? "GET";
    this.headers = new MockHeaders(init?.headers);
  }
}

class MockResponse {
  status: number;
  headers: MockHeaders;
  body: string | null;

  constructor(body: string | null, init?: { status?: number; headers?: Record<string, string> }) {
    this.body = body;
    this.status = init?.status ?? 200;
    this.headers = new MockHeaders(init?.headers);
  }
}

// Polyfill global Request and Response
global.Request = MockRequest as unknown as typeof Request;
global.Response = MockResponse as unknown as typeof Response;

describe("cors", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear production URL to test default behavior
    delete process.env.NEXT_PUBLIC_PRODUCTION_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("isOriginAllowed", () => {
    it("returns false for undefined origin", async () => {
      const { isOriginAllowed } = await import("../cors");
      expect(isOriginAllowed(undefined)).toBe(false);
    });

    it("returns false for null origin", async () => {
      const { isOriginAllowed } = await import("../cors");
      expect(isOriginAllowed(null)).toBe(false);
    });

    it("returns true for default localhost origin", async () => {
      const { isOriginAllowed } = await import("../cors");
      expect(isOriginAllowed("http://localhost:3000")).toBe(true);
    });

    it("returns true for custom APP_URL origin", async () => {
      jest.resetModules();
      process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
      const { isOriginAllowed } = await import("../cors");
      expect(isOriginAllowed("https://app.example.com")).toBe(true);
    });

    it("returns false for non-allowed origin", async () => {
      const { isOriginAllowed } = await import("../cors");
      expect(isOriginAllowed("https://malicious.com")).toBe(false);
    });

    it("returns true for production URL when configured", async () => {
      jest.resetModules();
      process.env.NEXT_PUBLIC_PRODUCTION_URL = "https://production.example.com";
      const { isOriginAllowed } = await import("../cors");
      expect(isOriginAllowed("https://production.example.com")).toBe(true);
    });
  });

  describe("createCORSHeaders", () => {
    it("returns empty CORS headers for non-allowed origin", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders("https://malicious.com");

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(headers["Vary"]).toBe("Origin");
    });

    it("returns full CORS headers for allowed origin", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders("http://localhost:3000");

      expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:3000");
      expect(headers["Access-Control-Allow-Methods"]).toBe(
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      expect(headers["Access-Control-Allow-Headers"]).toBe(
        "Content-Type, Authorization, Accept"
      );
      expect(headers["Access-Control-Expose-Headers"]).toBe(
        "Content-Length, Content-Range"
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
      expect(headers["Access-Control-Max-Age"]).toBe("86400");
      expect(headers["Vary"]).toBe("Origin");
    });

    it("uses custom methods when provided", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders("http://localhost:3000", {
        methods: ["GET", "POST"],
      });

      expect(headers["Access-Control-Allow-Methods"]).toBe("GET, POST");
    });

    it("uses custom allowedHeaders when provided", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders("http://localhost:3000", {
        allowedHeaders: ["X-Custom-Header", "Content-Type"],
      });

      expect(headers["Access-Control-Allow-Headers"]).toBe(
        "X-Custom-Header, Content-Type"
      );
    });

    it("uses custom exposedHeaders when provided", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders("http://localhost:3000", {
        exposedHeaders: ["X-Total-Count"],
      });

      expect(headers["Access-Control-Expose-Headers"]).toBe("X-Total-Count");
    });

    it("omits credentials header when credentials is false", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders("http://localhost:3000", {
        credentials: false,
      });

      expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
    });

    it("uses custom maxAge when provided", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders("http://localhost:3000", {
        maxAge: 3600,
      });

      expect(headers["Access-Control-Max-Age"]).toBe("3600");
    });

    it("handles undefined origin", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders(undefined);

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(headers["Vary"]).toBe("Origin");
    });

    it("handles null origin", async () => {
      const { createCORSHeaders } = await import("../cors");
      const headers = createCORSHeaders(null);

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(headers["Vary"]).toBe("Origin");
    });
  });

  describe("handleCORSPreflight", () => {
    it("returns 200 for OPTIONS request with allowed origin", async () => {
      const { handleCORSPreflight } = await import("../cors");
      const request = new Request("https://api.example.com/test", {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const response = handleCORSPreflight(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3000"
      );
    });

    it("returns 200 for OPTIONS request with non-allowed origin", async () => {
      const { handleCORSPreflight } = await import("../cors");
      const request = new Request("https://api.example.com/test", {
        method: "OPTIONS",
        headers: {
          origin: "https://malicious.com",
        },
      });

      const response = handleCORSPreflight(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("returns 405 for non-OPTIONS request", async () => {
      const { handleCORSPreflight } = await import("../cors");
      const request = new Request("https://api.example.com/test", {
        method: "GET",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const response = handleCORSPreflight(request);

      expect(response.status).toBe(405);
    });

    it("includes CORS headers in 405 response", async () => {
      const { handleCORSPreflight } = await import("../cors");
      const request = new Request("https://api.example.com/test", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const response = handleCORSPreflight(request);

      expect(response.headers.get("Vary")).toBe("Origin");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3000"
      );
    });

    it("uses custom CORS options", async () => {
      const { handleCORSPreflight } = await import("../cors");
      const request = new Request("https://api.example.com/test", {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost:3000",
        },
      });

      const response = handleCORSPreflight(request, {
        methods: ["GET"],
        maxAge: 1800,
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET");
      expect(response.headers.get("Access-Control-Max-Age")).toBe("1800");
    });

    it("handles request without origin header", async () => {
      const { handleCORSPreflight } = await import("../cors");
      const request = new Request("https://api.example.com/test", {
        method: "OPTIONS",
      });

      const response = handleCORSPreflight(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });
  });

  describe("production environment", () => {
    it("throws error in production without NEXT_PUBLIC_PRODUCTION_URL", async () => {
      jest.resetModules();
      process.env.NODE_ENV = "production";
      delete process.env.NEXT_PUBLIC_PRODUCTION_URL;

      await expect(import("../cors")).rejects.toThrow(
        "NEXT_PUBLIC_PRODUCTION_URL environment variable must be set in production"
      );
    });

    it("does not throw in production with NEXT_PUBLIC_PRODUCTION_URL", async () => {
      jest.resetModules();
      process.env.NODE_ENV = "production";
      process.env.NEXT_PUBLIC_PRODUCTION_URL = "https://production.example.com";

      await expect(import("../cors")).resolves.toBeDefined();
    });
  });
});
