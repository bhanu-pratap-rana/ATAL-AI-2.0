/**
 * Admin journey — dashboard metrics, schools, PIN management, performance.
 */
import { test, expect } from "@playwright/test";
import { ADMIN_STATE } from "./helpers/credentials";

test.use({ storageState: ADMIN_STATE });

test("admin dashboard shows live metrics (never the inconsistent-zeros state)", async ({ page }) => {
  await page.goto("/app/admin/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/school/i).first()).toBeVisible({ timeout: 30000 });
  const body = await page.locator("body").innerText();
  // Metrics must contain at least one non-zero count.
  expect(body).toMatch(/[1-9]\d*/);
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});

test("schools page renders school list", async ({ page }) => {
  await page.goto("/app/admin/schools");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/school/i).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});

test("PIN management page renders", async ({ page }) => {
  await page.goto("/app/admin/pins");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/pin/i).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});

test("performance page renders", async ({ page }) => {
  await page.goto("/app/admin/performance");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/performance|quer/i).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});
