/**
 * Smoke Tests — verify the app boots and public pages respond correctly.
 *
 * These tests run against a live dev/preview server (configured in
 * playwright.config.ts via the webServer option) and require NO auth.
 * They are intentionally lightweight: if anything here fails, the build
 * is broken and no further tests need to run.
 *
 * Run:  npm run test:e2e:smoke
 */

import { test, expect } from "@playwright/test";

// ─── Student start (login) page ───────────────────────────────────────────────
test("student start page — loads with correct title", async ({ page }) => {
  await page.goto("/student/start");
  await expect(page).toHaveTitle(/ATAL AI/i);
});

test("student start page — sign-in / create-account options are visible", async ({ page }) => {
  await page.goto("/student/start");
  // The Playful-Bento Sign In button nests a label + sub-label inside the
  // accessible button — use `.first()` to avoid strict-mode multi-match on
  // the inner spans that also satisfy the regex.
  const signInElement = page
    .getByRole("button", { name: /sign.?in|log.?in/i })
    .first();
  await expect(signInElement).toBeVisible();
});

// ─── Admin login page ─────────────────────────────────────────────────────────
test("admin login page — loads", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page).toHaveTitle(/ATAL AI/i);
  // Some form element should be present
  await expect(page.locator("form, input").first()).toBeVisible();
});

// ─── Join class page ──────────────────────────────────────────────────────────
test("join class page — loads with invite link", async ({ page }) => {
  // The page redirects to /student/start if not via invite and not authenticated
  await page.goto("/join?via=invite");
  await expect(page).toHaveTitle(/ATAL AI/i);
  await expect(page.getByText(/join class/i).first()).toBeVisible();
});

// ─── Teacher start page ───────────────────────────────────────────────────────
test("teacher start page — loads", async ({ page }) => {
  await page.goto("/teacher/start");
  await expect(page).toHaveTitle(/ATAL AI/i);
});

// ─── Protected routes redirect unauthenticated users ─────────────────────────
test("student dashboard — redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/app/student/dashboard");
  // Should end up on the student start (login) page
  await expect(page).toHaveURL(/\/student\/start/);
});

test("teacher dashboard — redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/app/teacher/dashboard");
  await expect(page).toHaveURL(/\/student\/start|\/teacher\/start/);
});

// ─── 404 handling ─────────────────────────────────────────────────────────────
test("non-existent route — returns 404 or redirects gracefully", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist-xyzabc");
  // Accept a 404 response OR a redirect to an existing page (Next.js notFound())
  const status = response?.status() ?? 0;
  expect([200, 404]).toContain(status);
  // Either way, no 500 error
  expect(status).not.toBe(500);
});

// ─── No JS console errors on public pages ─────────────────────────────────────
test("student start page — no uncaught JS errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/student/start");
  await page.waitForLoadState("networkidle");

  // Filter out known non-fatal warnings
  const fatal = errors.filter(
    (e) =>
      !e.includes("Warning:") &&
      !e.includes("ResizeObserver loop") &&
      !e.includes("Non-passive event listener"),
  );
  expect(fatal).toHaveLength(0);
});
