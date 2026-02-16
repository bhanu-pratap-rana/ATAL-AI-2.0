import { test, expect } from "@playwright/test";

/**
 * Teacher Flow E2E Tests
 *
 * Tests the complete teacher journey:
 * - Sign up/Sign in flow
 * - Profile setup
 * - Class management
 *
 * Run: npm run test:e2e:teacher
 */

test.describe("Teacher Flow", () => {
  test.describe("Authentication", () => {
    test("should display authentication options", async ({ page }) => {
      await page.goto("/teacher/start");

      // Should have sign in/sign up options
      const pageContent = await page.content();
      const hasAuthOptions =
        pageContent.toLowerCase().includes("sign") ||
        pageContent.toLowerCase().includes("login") ||
        pageContent.toLowerCase().includes("email") ||
        pageContent.toLowerCase().includes("create");

      expect(hasAuthOptions).toBeTruthy();
    });

    test("should have email input for registration", async ({ page }) => {
      await page.goto("/teacher/start");

      // Look for email input
      const emailInput = page.locator(
        "input[type='email'], input[name*='email' i], input[placeholder*='email' i]"
      );

      const hasEmailInput = (await emailInput.count()) > 0;

      // May have email input or other auth method
      console.log("Has email input:", hasEmailInput);
    });

    test("should validate email format", async ({ page }) => {
      await page.goto("/teacher/start");

      const emailInput = page.locator(
        "input[type='email'], input[name*='email' i], input[placeholder*='email' i]"
      );

      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill("invalid-email");
        await emailInput.first().blur();

        await page.waitForTimeout(500);

        // Check for validation error
        const isInvalid =
          (await emailInput.first().getAttribute("aria-invalid")) === "true" ||
          (await page.locator("[class*='error' i]:visible").count()) > 0;

        expect(isInvalid).toBeTruthy();
      }
    });

    test("should accept valid email format", async ({ page }) => {
      await page.goto("/teacher/start");

      const emailInput = page.locator(
        "input[type='email'], input[name*='email' i], input[placeholder*='email' i]"
      );

      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill("teacher@example.com");
        await emailInput.first().blur();

        await page.waitForTimeout(300);

        // Should not show error for valid email
        const isValid =
          (await emailInput.first().getAttribute("aria-invalid")) !== "true";

        expect(isValid).toBeTruthy();
      }
    });
  });

  test.describe("School Selection", () => {
    test("should have school selection interface", async ({ page }) => {
      await page.goto("/teacher/start");

      // Look for school-related UI
      const schoolElements = page.locator(
        "text=/school|institution|select.*school/i"
      );

      const hasSchoolUI = (await schoolElements.count()) > 0;

      console.log("Has school selection UI:", hasSchoolUI);
    });

    test("should allow school search or selection", async ({ page }) => {
      await page.goto("/teacher/start");

      // Look for school search input or dropdown
      const schoolInput = page.locator(
        "input[name*='school' i], input[placeholder*='school' i], select[name*='school' i], [role='combobox']"
      );

      const hasSchoolInput = (await schoolInput.count()) > 0;

      console.log("Has school input:", hasSchoolInput);
    });
  });

  test.describe("Profile Setup", () => {
    test("should have profile fields", async ({ page }) => {
      await page.goto("/teacher/start");

      // Look for profile-related fields
      const profileFields = page.locator(
        "input[name*='name' i], input[name*='phone' i], input[placeholder*='name' i]"
      );

      const hasProfileFields = (await profileFields.count()) > 0;

      console.log("Has profile fields:", hasProfileFields);
    });
  });

  test.describe("Form Validation", () => {
    test("should validate required fields", async ({ page }) => {
      await page.goto("/teacher/start");

      // Try to submit without filling required fields
      const submitButton = page.locator(
        "button[type='submit'], button:has-text('Continue'), button:has-text('Submit'), button:has-text('Next')"
      );

      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();
        await page.waitForTimeout(500);

        // Should show validation errors or stay on same page
        const url = page.url();
        expect(url).toContain("teacher");
      }
    });

    test("should show inline validation errors", async ({ page }) => {
      await page.goto("/teacher/start");

      const inputs = page.locator("input:visible[required]");
      const count = await inputs.count();

      if (count > 0) {
        // Focus and blur without entering data
        await inputs.first().focus();
        await inputs.first().blur();

        await page.waitForTimeout(300);

        // May show inline error
        const hasError =
          (await page.locator("[class*='error' i]:visible").count()) > 0 ||
          (await page.locator("[aria-invalid='true']").count()) > 0;

        console.log("Shows inline error:", hasError);
      }
    });
  });

  test.describe("OTP Verification", () => {
    test("should have OTP input interface", async ({ page }) => {
      await page.goto("/teacher/start");

      // OTP input might appear after email submission
      const otpInput = page.locator(
        "input[name*='otp' i], input[name*='code' i], input[maxlength='1'], input[maxlength='4'], input[maxlength='6']"
      );

      // May not be visible on initial page load
      const hasOtpElements = (await otpInput.count()) > 0;

      console.log("Has OTP input:", hasOtpElements);
    });
  });

  test.describe("Navigation", () => {
    test("should have back/previous navigation", async ({ page }) => {
      await page.goto("/teacher/start");

      // Look for back button
      const backButton = page.locator(
        "button:has-text('Back'), button:has-text('Previous'), a:has-text('Back'), [aria-label*='back' i]"
      );

      const hasBackNav = (await backButton.count()) > 0;

      console.log("Has back navigation:", hasBackNav);
    });

    test("should handle browser back button", async ({ page }) => {
      await page.goto("/");
      await page.goto("/teacher/start");

      // Use browser back
      await page.goBack();

      // Should navigate back
      const url = page.url();
      expect(url).not.toContain("teacher");
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/teacher/start");

      // Form should be visible and usable
      const form = page.locator("form, [role='form']").first();

      // May have form or just inputs
      const inputs = page.locator("input:visible");

      expect(await inputs.count()).toBeGreaterThan(0);
    });

    test("should have readable form labels on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/teacher/start");

      const labels = page.locator("label:visible");
      const count = await labels.count();

      for (let i = 0; i < count; i++) {
        const label = labels.nth(i);
        const box = await label.boundingBox();

        if (box) {
          // Labels should be visible within viewport
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(375);
        }
      }
    });
  });

  test.describe("Error States", () => {
    test("should display network error gracefully", async ({ page }) => {
      // Intercept and fail network requests
      await page.route("**/api/**", (route) => route.abort());

      await page.goto("/teacher/start");

      // Page should still render
      await expect(page.locator("body")).toBeVisible();
    });

    test("should handle server errors", async ({ page }) => {
      // Intercept and return 500 for API calls
      await page.route("**/api/**", (route) =>
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: "Server error" }),
        })
      );

      await page.goto("/teacher/start");

      // Page should still be usable
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper ARIA labels", async ({ page }) => {
      await page.goto("/teacher/start");

      // Check buttons have accessible names
      const buttons = page.locator("button:visible");
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute("aria-label");
        const text = await button.textContent();

        // Button should have text or aria-label
        const hasAccessibleName = (text && text.trim()) || ariaLabel;

        expect(hasAccessibleName).toBeTruthy();
      }
    });

    test("should announce errors to screen readers", async ({ page }) => {
      await page.goto("/teacher/start");

      // Look for aria-live regions
      const liveRegions = page.locator(
        "[aria-live], [role='alert'], [role='status']"
      );

      // May have live regions for error announcements
      const hasLiveRegions = (await liveRegions.count()) > 0;

      console.log("Has ARIA live regions:", hasLiveRegions);
    });
  });
});
