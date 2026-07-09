/**
 * Communication loop — teacher creates an announcement, the student sees
 * it, then the teacher deletes it (cleanup). Tests both directions of the
 * teacher↔student communication feature against the real database.
 */
import { test, expect } from "@playwright/test";
import { STUDENT_STATE, TEACHER_STATE } from "./helpers/credentials";

const MARKER = `E2E Announcement ${Date.now()}`;

test.describe.serial("announcement create → student sees → delete", () => {
  test("teacher creates an announcement", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: TEACHER_STATE });
    const page = await ctx.newPage();
    await page.goto("/app/teacher/dashboard");
    await page.waitForLoadState("networkidle");
    const classHref = await page.locator('a[href^="/app/teacher/classes/"]').first().getAttribute("href");
    await page.goto(classHref!);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /announcement|new announcement|create announcement/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByPlaceholder(/homework due tomorrow/i).fill(MARKER);
    await page.getByPlaceholder(/write your announcement/i).fill("Automated e2e check — safe to ignore.");
    await page.getByRole("dialog").getByRole("button", { name: /create|post|publish|send/i }).click();

    await expect(page.getByText(MARKER)).toBeVisible({ timeout: 20000 });
    await ctx.close();
  });

  test("student sees the announcement in their class", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STUDENT_STATE });
    const page = await ctx.newPage();
    await page.goto("/app/student/classes");
    await page.waitForLoadState("networkidle");
    await page.locator('a[href^="/app/student/classes/"]').first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(MARKER)).toBeVisible({ timeout: 20000 });
    await ctx.close();
  });

  test("teacher deletes the announcement (cleanup)", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: TEACHER_STATE });
    const page = await ctx.newPage();
    await page.goto("/app/teacher/dashboard");
    await page.waitForLoadState("networkidle");
    const classHref = await page.locator('a[href^="/app/teacher/classes/"]').first().getAttribute("href");
    await page.goto(classHref!);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(MARKER)).toBeVisible({ timeout: 20000 });

    // Delete every e2e-created announcement (incl. leftovers from any
    // earlier aborted run). Each card has a trash button with
    // aria-label "Delete announcement" followed by a confirm dialog.
    for (let i = 0; i < 10; i++) {
      const e2eCard = page
        .locator('div[class*="card"], [class*="Card"], article, section > div', {
          hasText: /E2E Announcement/,
        })
        .locator('button[aria-label="Delete announcement"]')
        .first();
      if (!(await e2eCard.isVisible().catch(() => false))) break;
      await e2eCard.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await dialog.getByRole("button", { name: /delete/i }).click();
      await expect(dialog).toBeHidden({ timeout: 15000 });
    }

    await expect(page.getByText(MARKER)).toHaveCount(0, { timeout: 20000 });
    await ctx.close();
  });
});
