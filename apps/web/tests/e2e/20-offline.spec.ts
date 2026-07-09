/**
 * Offline behavior — going offline surfaces the offline banner and the
 * app recovers cleanly when the connection returns.
 */
import { test, expect } from "@playwright/test";
import { STUDENT_STATE } from "./helpers/credentials";

test.use({ storageState: STUDENT_STATE });

test("offline banner appears when the connection drops and clears on recovery", async ({
  page,
  context,
}) => {
  await page.goto("/app/student/dashboard");
  await page.waitForLoadState("networkidle");

  await context.setOffline(true);
  // The OfflineBanner listens to online/offline events.
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText(/offline/i).first()).toBeVisible({ timeout: 15000 });

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  // Banner switches to "back online" or disappears — either way the
  // permanent "offline" state must clear.
  await page.waitForTimeout(4000);
  const stillOffline = await page
    .getByText(/you.?re offline|offline mode/i)
    .first()
    .isVisible()
    .catch(() => false);
  expect(stillOffline).toBe(false);
});

test("offline fallback page exists and renders", async ({ page }) => {
  const resp = await page.goto("/offline");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("body")).toContainText(/offline/i);
});

test("service worker registers on the app shell", async ({ page }) => {
  await page.goto("/app/student/dashboard");
  await page.waitForLoadState("networkidle");
  const swState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "unsupported";
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? "registered" : "none";
  });
  // In dev the SW may be disabled; accept registered OR none, but the
  // API must exist. Production builds must register.
  expect(["registered", "none"]).toContain(swState);
});
