/**
 * Sign-out — runs LAST (fresh login inside the test; signing out revokes
 * the demo account's sessions, which would invalidate the shared storage
 * states used by every other suite).
 */
import { test, expect } from "@playwright/test";
import { DEMO } from "./helpers/credentials";

test("student can sign out and is returned to the public flow", async ({ page }) => {
  // Fresh login (do not reuse the shared storage state).
  await page.goto("/student/start");
  await page.getByText("Sign In", { exact: false }).first().click();
  await page.locator("#signin-email").fill(DEMO.student.email);
  await page.locator("#signin-password").fill(DEMO.student.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL(/\/app\//, { timeout: 30000 });

  // Sign out via the header control.
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForLoadState("networkidle");

  // Confirm the session is gone: protected page must not render.
  await page.goto("/app/student/dashboard");
  await page.waitForLoadState("networkidle");
  expect(page.url()).not.toContain("/app/student/dashboard");
});
