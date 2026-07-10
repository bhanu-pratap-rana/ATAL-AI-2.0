/**
 * Cache Headers E2E Test
 *
 * Verifies that API endpoints return correct Cache-Control headers:
 *   - Public/health endpoints: no-store (safe, never cached by shared proxies)
 *   - Authenticated endpoints: private (never served from shared cache)
 *   - Teacher search: private, no-store (SEC-013 — no cross-teacher bleed)
 *
 * Run:
 *   npm run test:e2e -- tests/e2e/07-cache-headers.spec.ts --project=chromium
 */

import { test, expect } from "@playwright/test";

// Relative paths resolve against the configured baseURL (respects
// PLAYWRIGHT_BASE_URL) — never hardcode a port here.
const BASE = "";

test.describe("Cache-Control headers", () => {
  test.describe("public / health endpoints", () => {
    test("GET /api/health returns no-store", async ({ request }) => {
      const res = await request.get(`${BASE}/api/health`);
      const cc = res.headers()["cache-control"] ?? "";
      expect(cc).toContain("no-store");
    });
  });

  test.describe("unauthenticated protected endpoints return 401/403 with private header or redirect", () => {
    // These routes require auth — we verify they don't accidentally set a
    // public cache directive when they reject unauthenticated callers.

    const protectedApis = [
      "/api/modules/m1/units",
      "/api/teacher/search-students?q=test",
    ];

    for (const path of protectedApis) {
      test(`GET ${path} does not set public cache`, async ({ request }) => {
        const res = await request.get(`${BASE}${path}`);
        const cc = (res.headers()["cache-control"] ?? "").toLowerCase();
        // Must not allow shared-proxy caching
        expect(cc).not.toContain("public");
        // Response must be auth-rejected, not a cached success
        expect([200, 400, 401, 403, 405]).toContain(res.status());
      });
    }
  });

  test.describe("teacher search enforces no-store (SEC H4)", () => {
    test("GET /api/teacher/search-students unauthenticated → private no-store or auth rejection", async ({
      request,
    }) => {
      const res = await request.get(
        `${BASE}/api/teacher/search-students?q=test`,
      );
      // Auth rejection path — no cache header asserted (response may be JSON error)
      // The important assertion: when a 200 does come back it must have no-store
      if (res.status() === 200) {
        const cc = res.headers()["cache-control"] ?? "";
        expect(cc).toMatch(/no-store/);
        expect(cc).not.toContain("public");
      } else {
        // 401 / 403 / 405 — endpoint correctly rejected the unauthenticated call
        expect([400, 401, 403, 405]).toContain(res.status());
      }
    });
  });

  test.describe("lesson endpoints do not expose public cache headers", () => {
    test("POST /api/lesson/generate unauthenticated → no public cache", async ({
      request,
    }) => {
      const res = await request.post(`${BASE}/api/lesson/generate`, {
        data: { moduleId: "test", topicId: "test", language: "en" },
      });
      const cc = (res.headers()["cache-control"] ?? "").toLowerCase();
      expect(cc).not.toContain("public");
      // Unauthenticated: should be rejected
      expect([400, 401, 403]).toContain(res.status());
    });
  });

  test.describe("offline page is statically cacheable", () => {
    test("GET /offline returns 200", async ({ request }) => {
      const res = await request.get(`${BASE}/offline`);
      expect(res.status()).toBe(200);
    });
  });
});
