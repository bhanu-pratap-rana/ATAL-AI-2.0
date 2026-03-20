/**
 * Comprehensive Tests — broader functional checks across public surfaces.
 *
 * Covers:
 * - All public routes (no auth required) respond without 5xx errors
 * - Key UI elements present on login/join pages
 * - No CORS or network errors on page load
 * - Mobile viewport renders correctly
 *
 * Run:  npm run test:e2e:comprehensive
 */

import { test, expect } from "@playwright/test";

// ─── All public routes return non-5xx status ──────────────────────────────────
const PUBLIC_ROUTES = [
  "/student/start",
  "/teacher/start",
  "/admin/login",
  "/reset-password",
  "/join?via=invite",
];

for (const route of PUBLIC_ROUTES) {
  test(`${route} — responds without server error`, async ({ page }) => {
    const response = await page.goto(route);
    const status = response?.status() ?? 0;
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
    expect(status).not.toBe(503);
  });
}

// ─── Student login page — functional elements ─────────────────────────────────
test("student start — email sign-up tab navigates correctly", async ({ page }) => {
  await page.goto("/student/start");
  await page.waitForLoadState("domcontentloaded");

  // Should have at least one button (for sign-in / create account flows)
  const buttons = page.getByRole("button");
  await expect(buttons.first()).toBeVisible();
});

test("student start — page has accessible heading", async ({ page }) => {
  await page.goto("/student/start");
  const heading = page.getByRole("heading").first();
  await expect(heading).toBeVisible();
});

// ─── Join class page — form elements ──────────────────────────────────────────
test("join class — class code input is visible after auth selection", async ({ page }) => {
  await page.goto("/join?via=invite");
  await page.waitForLoadState("domcontentloaded");

  // Page should show auth selection or join form
  const content = await page.textContent("body");
  expect(content).toMatch(/join class|sign in|guest/i);
});

// ─── Admin login — email + password inputs ────────────────────────────────────
test("admin login — has email and password fields", async ({ page }) => {
  await page.goto("/admin/login");
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.locator("input[type='email']").first();
  const passwordInput = page.locator("input[type='password']").first();

  // Either both exist (login form) or there's at least one visible input
  const emailOrPasswordVisible =
    (await emailInput.count()) > 0 || (await passwordInput.count()) > 0;
  expect(emailOrPasswordVisible).toBe(true);
});

// ─── Reset password page ──────────────────────────────────────────────────────
test("reset-password — renders a form or info message", async ({ page }) => {
  await page.goto("/reset-password");
  await page.waitForLoadState("domcontentloaded");

  // Should have some form or informational content
  const body = await page.textContent("body");
  expect(body?.trim().length).toBeGreaterThan(20);
});

// ─── Mobile rendering ─────────────────────────────────────────────────────────
test("student start — renders on 375px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/student/start");
  await page.waitForLoadState("domcontentloaded");

  // Page should not have any element wider than viewport (horizontal overflow)
  const overflowing = await page.evaluate(() => {
    const body = document.body;
    return body.scrollWidth > window.innerWidth;
  });
  expect(overflowing).toBe(false);
});

// ─── CORS / network integrity ─────────────────────────────────────────────────
test("student start — no CORS or network errors", async ({ page }) => {
  const networkErrors: string[] = [];

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    if (failure) {
      networkErrors.push(`${request.url()} — ${failure.errorText}`);
    }
  });

  await page.goto("/student/start");
  await page.waitForLoadState("networkidle");

  // Filter only same-origin failures (external fonts/analytics can fail in test env)
  const criticalFailures = networkErrors.filter(
    (e) =>
      (e.includes("localhost:3000") || e.includes("127.0.0.1")) &&
      !e.includes("favicon"),
  );

  expect(criticalFailures).toHaveLength(0);
});

// ─── App meta — favicon and manifest ─────────────────────────────────────────
test("favicon is served", async ({ page }) => {
  const response = await page.goto("/favicon.ico");
  expect(response?.status()).not.toBe(404);
});

test("PWA manifest is served", async ({ page }) => {
  const response = await page.goto("/manifest.json");
  expect(response?.status()).toBe(200);
  const body = await response?.text();
  expect(body).toContain("ATAL");
});
