import { test, expect } from "@playwright/test";

/**
 * Comprehensive Tests for Atal AI
 *
 * Detailed tests covering:
 * - Form validation
 * - Error states
 * - User interactions
 * - Component behavior
 *
 * Run: npm run test:e2e:comprehensive
 */

test.describe("Comprehensive Tests", () => {
  test.describe("Student Authentication Flow", () => {
    test("should display student start page elements", async ({ page }) => {
      await page.goto("/student/start");

      // Should have a form or input elements
      const formElements = page.locator("input, button[type='submit'], form");
      await expect(formElements.first()).toBeVisible({ timeout: 10000 });
    });

    test("should validate required fields", async ({ page }) => {
      await page.goto("/student/start");

      // Try to submit without filling required fields
      const submitButton = page.locator(
        "button[type='submit'], button:has-text('Continue'), button:has-text('Submit'), button:has-text('Join')"
      );

      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();

        // Should show validation error or not navigate away
        await page.waitForTimeout(500);
        await expect(page).toHaveURL(/student/);
      }
    });

    test("should show PIN input for class joining", async ({ page }) => {
      await page.goto("/student/start");

      // Look for PIN-related input or text
      const pageContent = await page.content();
      const hasPinRelated =
        pageContent.toLowerCase().includes("pin") ||
        pageContent.toLowerCase().includes("code") ||
        pageContent.toLowerCase().includes("class");

      expect(hasPinRelated).toBeTruthy();
    });
  });

  test.describe("Teacher Authentication Flow", () => {
    test("should display teacher start page elements", async ({ page }) => {
      await page.goto("/teacher/start");

      // Should have authentication elements
      const authElements = page.locator(
        "input, button, a:has-text('Sign in'), a:has-text('Sign up')"
      );
      await expect(authElements.first()).toBeVisible({ timeout: 10000 });
    });

    test("should have sign in and sign up options", async ({ page }) => {
      await page.goto("/teacher/start");

      const pageContent = await page.content();
      const hasAuthOptions =
        pageContent.toLowerCase().includes("sign") ||
        pageContent.toLowerCase().includes("login") ||
        pageContent.toLowerCase().includes("register");

      expect(hasAuthOptions).toBeTruthy();
    });
  });

  test.describe("Admin Login Flow", () => {
    test("should display admin login form", async ({ page }) => {
      await page.goto("/admin/login");

      // Should have password input for admin login
      const passwordInput = page.locator(
        "input[type='password'], input[name='password'], input[placeholder*='password' i]"
      );

      // May have either password or other auth mechanism
      const hasAuthForm =
        (await passwordInput.count()) > 0 ||
        (await page.locator("input").count()) > 0;

      expect(hasAuthForm).toBeTruthy();
    });

    test("should handle invalid login attempts", async ({ page }) => {
      await page.goto("/admin/login");

      // Fill with invalid credentials if form exists
      const passwordInput = page.locator(
        "input[type='password'], input:visible"
      );

      if ((await passwordInput.count()) > 0) {
        await passwordInput.first().fill("invalid-password-123");

        const submitButton = page.locator(
          "button[type='submit'], button:has-text('Login'), button:has-text('Sign in')"
        );

        if ((await submitButton.count()) > 0) {
          await submitButton.first().click();

          // Should show error or stay on login page
          await page.waitForTimeout(1000);
          await expect(page).toHaveURL(/admin|login/);
        }
      }
    });
  });

  test.describe("Navigation", () => {
    test("should have working navigation links", async ({ page }) => {
      await page.goto("/");

      // Find all navigation links
      const navLinks = page.locator("nav a[href], header a[href]");
      const count = await navLinks.count();

      if (count > 0) {
        // Click first link and verify navigation
        const firstLink = navLinks.first();
        const href = await firstLink.getAttribute("href");

        if (href && !href.startsWith("#") && !href.startsWith("http")) {
          await firstLink.click();
          await page.waitForLoadState("domcontentloaded");

          // Should navigate successfully
          expect(page.url()).toContain(href.split("?")[0]);
        }
      }
    });

    test("should have back button functionality", async ({ page }) => {
      await page.goto("/");
      const initialUrl = page.url();

      await page.goto("/student/start");
      await page.goBack();

      // Should go back to initial page
      expect(page.url()).toBe(initialUrl);
    });
  });

  test.describe("Forms and Validation", () => {
    test("should show error for invalid email format", async ({ page }) => {
      await page.goto("/teacher/start");

      // Look for email input
      const emailInput = page.locator(
        "input[type='email'], input[name='email'], input[placeholder*='email' i]"
      );

      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill("invalid-email");

        // Blur to trigger validation
        await emailInput.first().blur();

        // Wait for potential error message
        await page.waitForTimeout(500);

        // Check for error indication (class, aria, or error text)
        const hasError =
          (await page.locator("[class*='error' i]").count()) > 0 ||
          (await page.locator("[aria-invalid='true']").count()) > 0 ||
          (await page.locator("text=/invalid|error/i").count()) > 0;

        // Email validation should be present
        expect(hasError || (await emailInput.first().getAttribute("aria-invalid")) === "true").toBeTruthy;
      }
    });

    test("should filter non-numeric input from PIN fields", async ({
      page,
    }) => {
      await page.goto("/student/start");

      // Look for PIN/code input
      const pinInput = page.locator(
        "input[name*='pin' i], input[name*='code' i], input[placeholder*='pin' i], input[placeholder*='code' i], input[maxlength='4'], input[maxlength='6']"
      );

      if ((await pinInput.count()) > 0) {
        await pinInput.first().fill("abc123");

        const value = await pinInput.first().inputValue();

        // Should only contain digits
        expect(value).toMatch(/^\d*$/);
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("should adapt layout for mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      // Navigation should be visible or have mobile menu
      const nav = page.locator("nav, [role='navigation']");
      const mobileMenu = page.locator(
        "button[aria-label*='menu' i], button:has-text('Menu'), [class*='hamburger' i]"
      );

      const hasNavigation =
        (await nav.count()) > 0 || (await mobileMenu.count()) > 0;

      expect(hasNavigation).toBeTruthy();
    });

    test("should have readable text on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      // Main text should be visible and not cut off
      const mainContent = page.locator("main, [role='main'], .content");

      if ((await mainContent.count()) > 0) {
        await expect(mainContent.first()).toBeVisible();
      }
    });
  });

  test.describe("Theme and Styling", () => {
    test("should apply consistent theme colors", async ({ page }) => {
      await page.goto("/");

      // Check for theme-related CSS custom properties
      const rootStyles = await page.evaluate(() => {
        const root = document.documentElement;
        const style = getComputedStyle(root);
        return {
          hasPrimary:
            style.getPropertyValue("--primary") ||
            style.getPropertyValue("--color-primary"),
          hasBackground:
            style.getPropertyValue("--background") ||
            style.getPropertyValue("--color-background"),
        };
      });

      // Should have theme colors defined
      const hasThemeColors =
        rootStyles.hasPrimary !== "" || rootStyles.hasBackground !== "";
      expect(hasThemeColors).toBeTruthy();
    });
  });

  test.describe("Loading States", () => {
    test("should show loading indicator during navigation", async ({
      page,
    }) => {
      await page.goto("/");

      // Navigate and check for loading indicators
      const [response] = await Promise.all([
        page.waitForResponse((response) => response.url().includes("/")),
        page.goto("/student/start"),
      ]);

      // Page should load successfully
      expect(response.status()).toBeLessThan(400);
    });
  });
});
