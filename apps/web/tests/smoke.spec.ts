import { test, expect } from "@playwright/test";

/**
 * Smoke Tests for Atal AI
 *
 * Quick sanity checks for core functionality:
 * - Page loads correctly
 * - Critical navigation works
 * - Essential elements are visible
 *
 * Run: npm run test:e2e:smoke
 */

test.describe("Smoke Tests", () => {
  test.describe("Home Page", () => {
    test("should load the home page", async ({ page }) => {
      await page.goto("/");

      // Verify page title
      await expect(page).toHaveTitle(/Atal|ATAL/i);
    });

    test("should display main navigation elements", async ({ page }) => {
      await page.goto("/");

      // Check for common navigation elements
      const nav = page.locator("nav").first();
      await expect(nav).toBeVisible();
    });

    test("should be responsive", async ({ page }) => {
      await page.goto("/");

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator("body")).toBeVisible();

      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Authentication Pages", () => {
    test("should load student login page", async ({ page }) => {
      await page.goto("/student/start");

      // Verify student auth page loads
      await expect(page).toHaveURL(/student/);
      await expect(page.locator("body")).toBeVisible();
    });

    test("should load teacher login page", async ({ page }) => {
      await page.goto("/teacher/start");

      // Verify teacher auth page loads
      await expect(page).toHaveURL(/teacher/);
      await expect(page.locator("body")).toBeVisible();
    });

    test("should load admin login page", async ({ page }) => {
      await page.goto("/admin/login");

      // Verify admin login page loads
      await expect(page).toHaveURL(/admin/);
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Error Handling", () => {
    test("should show 404 page for invalid routes", async ({ page }) => {
      const response = await page.goto("/this-page-does-not-exist-123456");

      // Should either be a 404 or redirect to home
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe("Accessibility", () => {
    test("should have no missing alt text on images", async ({ page }) => {
      await page.goto("/");

      // Check all images have alt text
      const images = page.locator("img");
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute("alt");
        const role = await img.getAttribute("role");

        // Image should have alt text or be decorative (role="presentation" or aria-hidden)
        const ariaHidden = await img.getAttribute("aria-hidden");
        const isDecorativeOrHasAlt =
          (alt && alt.length > 0) ||
          role === "presentation" ||
          ariaHidden === "true";

        expect(isDecorativeOrHasAlt).toBeTruthy();
      }
    });

    test("should have proper focus management", async ({ page }) => {
      await page.goto("/");

      // Tab through the page and ensure focus is visible
      await page.keyboard.press("Tab");
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe("Performance", () => {
    test("should load within acceptable time", async ({ page }) => {
      const startTime = Date.now();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const loadTime = Date.now() - startTime;

      // Page should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });
  });
});
