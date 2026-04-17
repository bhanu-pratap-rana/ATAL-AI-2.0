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
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });

    // Either a 3xx redirect happened (server component `redirect()`) or the
    // final URL after middleware lands on the login page.
    expect(page.url()).toContain(expectsLoginPrefix);

    // Defense-in-depth: if the route rendered anyway, the DOM should not
    // contain dashboard markers. The most distinctive chrome is BottomNav,
    // which renders only inside `/app` when an authed layout mounts.
    const hasDashboardChrome = await page
      .locator('nav[aria-label*="navigation" i], [data-testid="bottom-nav"]')
      .count();
    expect(hasDashboardChrome).toBe(0);

    // Response chain should not be 200 on the protected path itself.
    if (response) {
      const chain = [response, ...(response.request().redirectedFrom() ? [response.request().redirectedFrom()!.response()] : [])];
      for (const step of chain) {
        const awaited = await step;
        if (awaited && awaited.url().includes(path)) {
          // Request for the protected path itself should never be a plain 200.
          expect([301, 302, 303, 307, 308]).toContain(awaited.status());
        }
      }
    }
  });
}
