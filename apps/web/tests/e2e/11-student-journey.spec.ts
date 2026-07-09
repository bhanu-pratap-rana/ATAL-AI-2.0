/**
 * Student journey — dashboard, learn, lesson player, progress,
 * classes (incl. teacher name + Leave Class dialog), settings.
 */
import { test, expect } from "@playwright/test";
import { STUDENT_STATE } from "./helpers/credentials";

test.use({ storageState: STUDENT_STATE });

test("dashboard renders greeting, points and badges surfaces", async ({ page }) => {
  await page.goto("/app/student/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1").first()).toContainText(/Hi,/);
  await expect(page.getByText(/points/i).first()).toBeVisible();
  await expect(page.getByText(/badge/i).first()).toBeVisible();
});

test("learn page lists modules and opens a module", async ({ page }) => {
  await page.goto("/app/learn");
  await page.waitForLoadState("networkidle");
  const moduleLink = page.locator('a[href^="/app/learn/M"]').first();
  await expect(moduleLink).toBeVisible({ timeout: 20000 });
  const href = await moduleLink.getAttribute("href");
  await moduleLink.click();
  await page.waitForURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
    timeout: 20000,
  });
  expect(page.url()).toMatch(/\/app\/learn\/M/);
});

test("lesson player loads content and navigates chunks", async ({ page }) => {
  await page.goto("/app/learn/M1/T1.1");
  // Lesson may be served from cache (fast) or generated (slow).
  await expect(page.locator("h1").first()).not.toBeEmpty({ timeout: 90000 });
  await page.waitForLoadState("networkidle");

  // Advance through the chunked player if a Next/Continue control exists.
  const next = page.getByRole("button", { name: /next|continue/i }).first();
  if (await next.isVisible().catch(() => false)) {
    const before = await page.locator("body").innerText();
    await next.click();
    await expect
      .poll(async () => (await page.locator("body").innerText()) !== before, {
        timeout: 10000,
      })
      .toBe(true);
  }
});

test("progress page shows mastery data", async ({ page }) => {
  await page.goto("/app/progress");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1").first()).toContainText(/progress/i);
  await expect(page.getByText(/%|mastery|topics/i).first()).toBeVisible();
});

test("classes list shows enrolled class with teacher name", async ({ page }) => {
  await page.goto("/app/student/classes");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Demo Teacher/).first()).toBeVisible({ timeout: 20000 });
});

test("class detail shows teacher, stats, and a working Leave Class dialog", async ({ page }) => {
  await page.goto("/app/student/classes");
  await page.waitForLoadState("networkidle");
  // Open the first class card.
  await page.locator('a[href^="/app/student/classes/"]').first().click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText(/Teacher: .+/).first()).toBeVisible();
  await expect(page.getByText(/Teacher: Not available/)).toHaveCount(0);
  await expect(page.getByText(/announcements/i).first()).toBeVisible();
  await expect(page.getByText(/materials/i).first()).toBeVisible();

  // Leave Class opens a confirm dialog; cancel must close it without leaving.
  await page.getByRole("button", { name: /leave class/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(/rejoin anytime/i);
  await page.getByRole("button", { name: /^cancel$/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(page.url()).toMatch(/\/app\/student\/classes\//);
});

test("settings page renders profile editor", async ({ page }) => {
  await page.goto("/app/settings");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/settings|profile/i).first()).toBeVisible();
});
