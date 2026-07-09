/**
 * Auth setup — logs in each demo role through the real UI and saves
 * storage state files that the role-scoped projects reuse.
 *
 * Runs automatically as the `setup` project before role projects
 * (see playwright.config.ts `dependencies`).
 */
import { test as setup, expect, type Page } from "@playwright/test";
import { DEMO, STUDENT_STATE, TEACHER_STATE, ADMIN_STATE } from "./helpers/credentials";

async function waitForAppShell(page: Page) {
  // All roles land somewhere under /app/** after login.
  await page.waitForURL(/\/app\//, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

setup("authenticate student", async ({ page }) => {
  await page.goto("/student/start");
  await page.getByText("Sign In", { exact: false }).first().click();
  await page.locator("#signin-email").fill(DEMO.student.email);
  await page.locator("#signin-password").fill(DEMO.student.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await waitForAppShell(page);
  await expect(page).toHaveURL(/\/app\/student\/dashboard/);
  await page.context().storageState({ path: STUDENT_STATE });
});

setup("authenticate teacher", async ({ page }) => {
  await page.goto("/teacher/start");
  await page.getByText("Login to Account").click();
  await page.locator("#login-email").fill(DEMO.teacher.email);
  await page.locator("#login-password").fill(DEMO.teacher.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await waitForAppShell(page);
  await expect(page).toHaveURL(/\/app\/teacher\//);
  await page.context().storageState({ path: TEACHER_STATE });
});

setup("authenticate admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator("#admin-email").fill(DEMO.admin.email);
  await page.locator("#admin-password").fill(DEMO.admin.password);
  await page.getByRole("button", { name: /Login as Admin/i }).click();
  await waitForAppShell(page);
  await expect(page).toHaveURL(/\/app\/admin/);
  await page.context().storageState({ path: ADMIN_STATE });
});
