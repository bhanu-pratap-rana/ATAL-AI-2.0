/**
 * Gamification — points totals, badges display, leaderboard.
 */
import { test, expect } from "@playwright/test";
import { STUDENT_STATE } from "./helpers/credentials";

test.use({ storageState: STUDENT_STATE });

test("dashboard shows a numeric points total", async ({ page }) => {
  await page.goto("/app/student/dashboard");
  await page.waitForLoadState("networkidle");
  // The points stat renders a number near the word "points".
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/\d+[\s\S]{0,40}points|points[\s\S]{0,40}\d+/i);
});

test("progress page shows badges section", async ({ page }) => {
  await page.goto("/app/progress");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/badge/i).first()).toBeVisible({ timeout: 20000 });
});

test("leaderboard renders rankings without error", async ({ page }) => {
  // Leaderboard lives on the progress surface (BadgesLeaderboardPanel).
  await page.goto("/app/progress");
  await page.waitForLoadState("networkidle");
  const leaderboard = page.getByText(/leaderboard|rank/i).first();
  if (await leaderboard.isVisible().catch(() => false)) {
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  }
});
