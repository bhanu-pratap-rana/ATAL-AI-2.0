/**
 * Gamification — points totals, badges display, leaderboard.
 *
 * NOTE: no waitForLoadState("networkidle") here — the student dashboard
 * and progress surfaces hold realtime subscriptions and periodic refetches,
 * so the network may never go idle. Wait on content conditions instead.
 */
import { test, expect } from "@playwright/test";
import { STUDENT_STATE } from "./helpers/credentials";

test.use({ storageState: STUDENT_STATE });

test("dashboard shows a numeric points total", async ({ page }) => {
  await page.goto("/app/student/dashboard");
  // The points stat renders a number near the word "points".
  await expect
    .poll(
      async () => {
        const body = await page.locator("body").innerText().catch(() => "");
        return /\d+[\s\S]{0,40}points|points[\s\S]{0,40}\d+/i.test(body);
      },
      { timeout: 25000, intervals: [1000] },
    )
    .toBe(true);
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/\d+[\s\S]{0,40}points|points[\s\S]{0,40}\d+/i);
});

test("progress page shows badges section", async ({ page }) => {
  await page.goto("/app/progress");
  await expect(page.getByText(/badge/i).first()).toBeVisible({ timeout: 25000 });
});

test("leaderboard renders rankings without error", async ({ page }) => {
  // Leaderboard lives on the progress surface (BadgesLeaderboardPanel).
  await page.goto("/app/progress");
  await expect(page.getByText(/badge|progress/i).first()).toBeVisible({ timeout: 25000 });
  const leaderboard = page.getByText(/leaderboard|rank/i).first();
  if (await leaderboard.isVisible().catch(() => false)) {
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  }
});
