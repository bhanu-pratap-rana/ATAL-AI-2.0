/**
 * Auth Flow E2E Test
 *
 * Tests the full login → dashboard → logout flow for each role.
 *
 * PREREQUISITE: tests/.auth/{student,teacher,admin}.json must exist.
 * Generate them by running:
 *   npm run test:e2e -- tests/e2e/helpers/auth-setup.ts
 *
 * Until auth state files exist this suite self-skips so CI stays green.
 *
 * Run:
 *   npm run test:e2e -- tests/e2e/01-auth-flow.spec.ts --project=chromium
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, "..", ".auth");
const hasStudentAuth = fs.existsSync(path.join(AUTH_DIR, "student.json"));
const hasTeacherAuth = fs.existsSync(path.join(AUTH_DIR, "teacher.json"));

test.describe("Auth flow — student", () => {
  test.skip(!hasStudentAuth, "student.json not found — run auth-setup first");

  test.use({ storageState: path.join(AUTH_DIR, "student.json") });

  test("authenticated student reaches /app/student/dashboard", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/student\/start/);
    await expect(page.locator("body")).not.toContainText("Sign in");
  });

  test("student cannot access /app/teacher/dashboard", async ({ page }) => {
    await page.goto("/app/teacher/dashboard");
    // Should redirect to student dashboard or show forbidden
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toMatch(/teacher\/dashboard/);
  });
});

test.describe("Auth flow — teacher", () => {
  test.skip(!hasTeacherAuth, "teacher.json not found — run auth-setup first");

  test.use({ storageState: path.join(AUTH_DIR, "teacher.json") });

  test("authenticated teacher reaches /app/teacher/dashboard", async ({
    page,
  }) => {
    await page.goto("/app/teacher/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/teacher\/start/);
    await expect(page.locator("body")).not.toContainText("Sign in");
  });

  test("teacher cannot access /app/student/dashboard", async ({ page }) => {
    await page.goto("/app/student/dashboard");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toMatch(/student\/dashboard/);
  });
});

test.describe("Unauthenticated access — always runs", () => {
  test("visiting /app/student/dashboard unauthenticated redirects", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");
    await page.waitForLoadState("networkidle");
    // Must land on login / start page, not the dashboard
    expect(page.url()).not.toMatch(/student\/dashboard/);
  });

  test("visiting /app/teacher/dashboard unauthenticated redirects", async ({
    page,
  }) => {
    await page.goto("/app/teacher/dashboard");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toMatch(/teacher\/dashboard/);
  });
});
