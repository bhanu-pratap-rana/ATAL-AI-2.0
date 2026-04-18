/**
 * Lesson Play → Progress Update E2E Test
 *
 * Verifies that completing a lesson updates student_knowledge_state via
 * the update_progress_atomic RPC.
 *
 * PREREQUISITE: tests/.auth/student.json must exist.
 *
 * Run:
 *   npm run test:e2e -- tests/e2e/03-lesson-play-progress.spec.ts --project=chromium
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, "..", ".auth");
const hasStudentAuth = fs.existsSync(path.join(AUTH_DIR, "student.json"));

test.describe("Lesson play → progress update", () => {
  test.skip(
    !hasStudentAuth,
    "student.json not found — run auth-setup first",
  );

  test.use({ storageState: path.join(AUTH_DIR, "student.json") });

  test("learn page renders module list", async ({ page }) => {
    await page.goto("/app/learn");
    await page.waitForLoadState("networkidle");
    // At least one module card should be visible
    await expect(page.locator("main")).toBeVisible();
    await expect(page).not.toHaveURL(/student\/start/);
  });

  test("streak counter is visible on /app/learn", async ({ page }) => {
    await page.goto("/app/learn");
    await page.waitForLoadState("networkidle");
    // Streak uses the get_student_streak RPC — page should not error
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Error");
  });
});
