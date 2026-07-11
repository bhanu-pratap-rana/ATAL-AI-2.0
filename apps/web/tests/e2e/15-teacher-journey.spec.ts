/**
 * Teacher journey — dashboard, students list, class detail (roster,
 * realtime progress grid, AI activity, CSV exports incl. BOM),
 * assessments, question analytics.
 */
import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import { TEACHER_STATE } from "./helpers/credentials";

test.use({ storageState: TEACHER_STATE });

/**
 * Class-detail links live on the teacher dashboard ("Open class →").
 * NOTE: no networkidle waits anywhere in this file — the teacher pages hold
 * realtime subscriptions, so the network may never go idle. Wait on content.
 */
async function openFirstClassDetail(page: Page) {
  await page.goto("/app/teacher/dashboard", { timeout: 45000 });
  const classLink = page.locator('a[href^="/app/teacher/classes/"]').first();
  await expect(classLink).toBeVisible({ timeout: 25000 });
  const href = await classLink.getAttribute("href");
  await page.goto(href!, { timeout: 45000 });
  await expect(page.getByText(/student|progress|class/i).first()).toBeVisible({ timeout: 25000 });
}

test("teacher dashboard shows profile, stats and realtime grid", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/app/teacher/dashboard", { timeout: 45000 });
  await expect(page.getByText("Demo Teacher").first()).toBeVisible({ timeout: 25000 });
  await expect(page.getByText(/Total Students/i).first()).toBeVisible();
  await expect(page.getByText(/Real-time/i).first()).toBeVisible();
});

test("students list page shows enrolled students", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/app/teacher/classes", { timeout: 45000 });
  await expect(page.getByText(/My Students/i).first()).toBeVisible({ timeout: 25000 });
  await expect(page.getByText(/Demo Student/).first()).toBeVisible();
});

test("class detail shows progress and AI activity", async ({ page }) => {
  test.setTimeout(90000);
  await openFirstClassDetail(page);
  await expect(page.getByText(/progress/i).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/AI Tutor Activity/i).first()).toBeVisible();
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});

test("CSV exports download with BOM and headers", async ({ page }) => {
  test.setTimeout(120000);
  await openFirstClassDetail(page);

  const exportButtons = page.getByRole("button", { name: /export csv/i });
  await expect(exportButtons.first()).toBeVisible({ timeout: 20000 });
  const count = await exportButtons.count();
  expect(count).toBeGreaterThanOrEqual(2);

  for (let i = 0; i < count; i++) {
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await exportButtons.nth(i).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    const content = fs.readFileSync(filePath!, "utf8");
    // UTF-8 BOM so Excel renders Hindi/Assamese correctly.
    expect(content.charCodeAt(0)).toBe(0xfeff);
    // Header row present.
    expect(content.split("\n")[0].length).toBeGreaterThan(5);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  }
});

test("assessments overview and question analytics render", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/app/teacher/assessments", { timeout: 45000 });
  await expect(page.getByText(/assessment/i).first()).toBeVisible({ timeout: 25000 });
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

  await page.goto("/app/teacher/analytics/questions", { timeout: 45000 });
  await expect(page.getByText(/question/i).first()).toBeVisible({ timeout: 25000 });
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});
