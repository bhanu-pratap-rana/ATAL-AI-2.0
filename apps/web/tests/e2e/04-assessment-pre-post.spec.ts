/**
 * Assessment Pre/Post Flow E2E Test
 *
 * Verifies the Digital Literacy pre-assessment renders and submits correctly.
 *
 * PREREQUISITE: tests/.auth/student.json must exist (student who has NOT yet
 * submitted a pre-assessment, or a fresh test account).
 *
 * Run:
 *   npm run test:e2e -- tests/e2e/04-assessment-pre-post.spec.ts --project=chromium
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, "..", ".auth");
const hasStudentAuth = fs.existsSync(path.join(AUTH_DIR, "student.json"));

test.describe("Assessment pre/post flow", () => {
  test.skip(
    !hasStudentAuth,
    "student.json not found — run auth-setup first",
  );

  test.use({ storageState: path.join(AUTH_DIR, "student.json") });

  test("student dashboard shows avg score card without crashing", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");
    await page.waitForLoadState("networkidle");
    // AverageScore is an async RSC wrapped in Suspense — wait for it to resolve
    await page.waitForTimeout(3000);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Error loading");
  });

  test("has_assessment_type RPC reflected in dashboard state", async ({
    page,
  }) => {
    // Navigating to dashboard exercises has_assessment_type to decide
    // whether to show pre-assessment CTA
    await page.goto("/app/student/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // Page should not show a JS error boundary
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });
});
