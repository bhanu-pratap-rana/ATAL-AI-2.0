import { test, expect } from "@playwright/test";

/**
 * Task 1 regression — unauthenticated access to role-scoped routes must
 * redirect to the role-appropriate login page, never render protected content.
 *
 * These assertions run without any auth fixture; they only verify the
 * pre-render redirect path on the server component. Signed-in cross-role
 * access (student hitting /app/teacher/*) requires auth fixtures and is
 * covered in 01-auth-flow (TODO, MCP-dependent).
 */

const PROTECTED_ROUTES: readonly {
  path: string;
  expectsLoginPrefix: string;
}[] = [
  { path: "/app/teacher/dashboard", expectsLoginPrefix: "/teacher/start" },
  { path: "/app/teacher/classes", expectsLoginPrefix: "/teacher/start" },
  { path: "/app/teacher/analytics/questions", expectsLoginPrefix: "/teacher/start" },
  { path: "/app/teacher/assessments", expectsLoginPrefix: "/teacher/start" },
  { path: "/app/admin/dashboard", expectsLoginPrefix: "/admin/login" },
  { path: "/app/admin/performance", expectsLoginPrefix: "/admin/login" },
  { path: "/app/admin/schools", expectsLoginPrefix: "/admin/login" },
  { path: "/app/student/dashboard", expectsLoginPrefix: "/student/start" },
  { path: "/app/student/classes", expectsLoginPrefix: "/student/start" },
  { path: "/app/student/assessments", expectsLoginPrefix: "/student/start" },
  { path: "/app/settings", expectsLoginPrefix: "/student/start" },
];

for (const { path, expectsLoginPrefix } of PROTECTED_ROUTES) {
  test(`unauth ${path} → ${expectsLoginPrefix}`, async ({ page }) => {
    // `waitUntil: "load"` (not "domcontentloaded") lets the Next.js
    // App Router client finish parsing the RSC stream — which carries
    // the `NEXT_REDIRECT` directive emitted by the server component's
    // pre-render auth check. Without it the assertion below races the
    // first paint.
    const response = await page.goto(path, { waitUntil: "load" });

    // 15s polling — generous enough to survive dev-mode Turbopack cold
    // compilation on a route that hasn't been hit this session.
    await expect(page).toHaveURL(
      new RegExp(expectsLoginPrefix.replaceAll("/", String.raw`\/`)),
      { timeout: 15_000 },
    );

    // Defense-in-depth: if the route rendered anyway, the DOM should not
    // contain dashboard markers. The most distinctive chrome is BottomNav,
    // which renders only inside `/app` when an authed layout mounts.
    const hasDashboardChrome = await page
      .locator('nav[aria-label*="navigation" i], [data-testid="bottom-nav"]')
      .count();
    expect(hasDashboardChrome).toBe(0);

    // Response chain — must never be a 5xx. We do NOT assert 3xx here:
    // Next.js 16 App Router server-component `redirect()` returns 200
    // with the redirect target encoded in the RSC stream (rather than an
    // HTTP 30x), so the page renders no protected content but the wire
    // status is still 200. The two checks above (final URL + zero
    // dashboard chrome) are the load-bearing guarantees.
    if (response) {
      const status = response.status();
      expect(status).toBeLessThan(500);
    }
  });
}
