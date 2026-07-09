/**
 * Auth + role gating — wrong-password errors, unauthenticated redirects,
 * and cross-role URL guards for all three roles.
 *
 * Run: npx playwright test tests/e2e/10-auth-and-gating.spec.ts --project=chromium
 * (run --project=setup first to generate storage states)
 */
import { test, expect } from "@playwright/test";
import { DEMO, STUDENT_STATE, TEACHER_STATE, ADMIN_STATE } from "./helpers/credentials";

test.describe("login validation", () => {
  test("student login with wrong password shows an error, no redirect", async ({ page }) => {
    await page.goto("/student/start");
    await page.getByText("Sign In", { exact: false }).first().click();
    await page.locator("#signin-email").fill(DEMO.student.email);
    await page.locator("#signin-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    // Error surfaces as a toast; URL must not change to the app shell.
    await expect(page.getByText(/login failed|invalid/i).first()).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toContain("/app/");
  });

  test("teacher login with wrong password shows an error", async ({ page }) => {
    await page.goto("/teacher/start");
    await page.getByText("Login to Account").click();
    await page.locator("#login-email").fill(DEMO.teacher.email);
    await page.locator("#login-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByText(/failed|invalid|incorrect/i).first()).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toContain("/app/");
  });

  test("admin login with wrong password shows an error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#admin-email").fill(DEMO.admin.email);
    await page.locator("#admin-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /Login as Admin/i }).click();
    await expect(page.getByText(/failed|invalid|incorrect|denied/i).first()).toBeVisible({ timeout: 15000 });
    expect(page.url()).not.toContain("/app/");
  });
});

test.describe("unauthenticated redirects", () => {
  for (const path of [
    "/app/student/dashboard",
    "/app/teacher/dashboard",
    "/app/admin/dashboard",
    "/app/learn",
    "/app/progress",
    "/app/settings",
  ]) {
    test(`unauthenticated ${path} does not render the protected page`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(page.url()).not.toContain(path);
    });
  }
});

test.describe("cross-role guards — student session", () => {
  test.use({ storageState: STUDENT_STATE });

  test("student is redirected away from teacher and admin areas", async ({ page }) => {
    await page.goto("/app/teacher/dashboard");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/app/teacher/");

    await page.goto("/app/admin/dashboard");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/app/admin/");
  });

  test("logged-in student visiting /student/start is routed into the app", async ({ page }) => {
    await page.goto("/student/start");
    await page.waitForURL(/\/app\//, { timeout: 20000 });
    await expect(page).toHaveURL(/\/app\/student\/dashboard/);
  });
});

test.describe("cross-role guards — teacher session", () => {
  test.use({ storageState: TEACHER_STATE });

  test("teacher is redirected away from admin area", async ({ page }) => {
    await page.goto("/app/admin/dashboard");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/app/admin/");
  });

  test("teacher visiting /student/start is routed to their own home", async ({ page }) => {
    await page.goto("/student/start");
    // Two-hop redirect: /student/start → /app/dashboard (role router) → teacher home.
    await page.waitForURL(/\/app\/teacher\//, { timeout: 20000 });
    expect(page.url()).toContain("/app/teacher/");
  });
});

test.describe("cross-role guards — admin session", () => {
  test.use({ storageState: ADMIN_STATE });

  test("admin reaches the admin dashboard", async ({ page }) => {
    await page.goto("/app/admin/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/app\/admin/);
  });
});
