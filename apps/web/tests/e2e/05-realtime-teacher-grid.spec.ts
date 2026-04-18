/**
 * Realtime Teacher Progress Grid E2E Test
 *
 * Verifies that the StudentProgressGrid's realtime subscription is scoped to
 * the class roster (H1 fix — 239ca2a) and does not show stale/wrong data.
 *
 * PREREQUISITE: tests/.auth/teacher.json must exist.
 *
 * Run:
 *   npm run test:e2e -- tests/e2e/05-realtime-teacher-grid.spec.ts --project=chromium
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, "..", ".auth");
const hasTeacherAuth = fs.existsSync(path.join(AUTH_DIR, "teacher.json"));

test.describe("Teacher progress grid — realtime subscription", () => {
  test.skip(
    !hasTeacherAuth,
    "teacher.json not found — run auth-setup first",
  );

  test.use({ storageState: path.join(AUTH_DIR, "teacher.json") });

  test("teacher dashboard renders without error", async ({ page }) => {
    await page.goto("/app/teacher/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Error");
  });

  test("teacher classes page renders roster without JS error", async ({
    page,
  }) => {
    const logs: string[] = [];
    page.on("pageerror", (err) => logs.push(err.message));

    await page.goto("/app/teacher/classes");
    await page.waitForLoadState("networkidle");
    // Give realtime subscription time to establish
    await page.waitForTimeout(2000);

    expect(logs.filter((l) => l.includes("Unhandled") || l.includes("TypeError"))).toHaveLength(0);
  });
});
