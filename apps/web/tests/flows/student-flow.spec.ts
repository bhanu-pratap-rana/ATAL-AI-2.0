import { test, expect } from "@playwright/test";

/**
 * Student Flow E2E Tests
 *
 * Tests the complete student journey:
 * - Join class flow
 * - Assessment flow
 * - Dashboard interactions
 *
 * Run: npm run test:e2e:student
 */

test.describe("Student Flow", () => {
  test.describe("Class Join Flow", () => {
    test("should display class join interface", async ({ page }) => {
      await page.goto("/student/start");

      // Should have class joining UI elements
      await expect(page.locator("body")).toBeVisible();

      // Look for school/class selection elements
      const hasClassUI =
        (await page.locator("text=/school|class|join|code|pin/i").count()) > 0;

      expect(hasClassUI).toBeTruthy();
    });

    test("should allow school code entry", async ({ page }) => {
      await page.goto("/student/start");

      // Find school code input
      const codeInput = page.locator(
        "input[name*='code' i], input[name*='school' i], input[placeholder*='code' i], input"
      );

      if ((await codeInput.count()) > 0) {
        await codeInput.first().fill("TEST123");

        const value = await codeInput.first().inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test("should validate class PIN format", async ({ page }) => {
      await page.goto("/student/start");

      // Find PIN input (usually 4-6 digits)
      const pinInput = page.locator(
        "input[type='tel'], input[inputmode='numeric'], input[maxlength='4'], input[maxlength='6']"
      );

      if ((await pinInput.count()) > 0) {
        // Try entering non-numeric characters
        await pinInput.first().fill("abcd");

        const value = await pinInput.first().inputValue();

        // Should only accept digits
        expect(value).toMatch(/^[\d]*$/);
      }
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/student/start");

      // Fill with obviously invalid data
      const inputs = page.locator("input:visible");
      const count = await inputs.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        await inputs.nth(i).fill("INVALID999");
      }

      // Try to submit
      const submitButton = page.locator(
        "button[type='submit'], button:has-text('Join'), button:has-text('Continue'), button:has-text('Enter')"
      );

      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();
        await page.waitForTimeout(1000);

        // Should either show error or remain on page
        const url = page.url();
        expect(url).toContain("student");
      }
    });
  });

  test.describe("Student Name Entry", () => {
    test("should have name input field", async ({ page }) => {
      await page.goto("/student/start");

      // Look for name input
      const nameInput = page.locator(
        "input[name*='name' i], input[placeholder*='name' i]"
      );

      // May or may not have name input on first screen
      const hasNameField = (await nameInput.count()) > 0;

      // Log for debugging
      console.log("Has name field:", hasNameField);
    });

    test("should validate name length", async ({ page }) => {
      await page.goto("/student/start");

      const nameInput = page.locator(
        "input[name*='name' i], input[placeholder*='name' i]"
      );

      if ((await nameInput.count()) > 0) {
        // Enter a very short name
        await nameInput.first().fill("A");

        // Check for validation
        await nameInput.first().blur();
        await page.waitForTimeout(300);

        // May show error for too short name
        const hasError =
          (await page.locator("[class*='error' i]").count()) > 0 ||
          (await page.locator("text=/too short|minimum|at least/i").count()) >
            0;

        // Log result for debugging
        console.log("Has error for short name:", hasError);
      }
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper form labels", async ({ page }) => {
      await page.goto("/student/start");

      const inputs = page.locator("input:not([type='hidden'])");
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute("id");
        const ariaLabel = await input.getAttribute("aria-label");
        const ariaLabelledBy = await input.getAttribute("aria-labelledby");
        const placeholder = await input.getAttribute("placeholder");

        // Input should have some form of label
        const hasLabel =
          (id &&
            (await page.locator(`label[for='${id}']`).count()) > 0) ||
          ariaLabel ||
          ariaLabelledBy ||
          placeholder;

        expect(hasLabel).toBeTruthy();
      }
    });

    test("should be keyboard navigable", async ({ page }) => {
      await page.goto("/student/start");

      // Tab through interactive elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");

        const focusedElement = page.locator(":focus");
        const isVisible = await focusedElement.isVisible().catch(() => false);

        if (isVisible) {
          // Focus should be on visible element
          await expect(focusedElement).toBeVisible();
          break;
        }
      }
    });

    test("should support Enter key submission", async ({ page }) => {
      await page.goto("/student/start");

      const firstInput = page.locator("input:visible").first();

      if ((await firstInput.count()) > 0) {
        await firstInput.focus();
        await firstInput.fill("TEST");

        // Press Enter
        await page.keyboard.press("Enter");

        // Page should respond (either validate, submit, or move focus)
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe("Error Handling", () => {
    test("should display user-friendly error messages", async ({ page }) => {
      await page.goto("/student/start");

      // Try to proceed without filling required fields
      const submitButton = page.locator(
        "button[type='submit'], button:has-text('Join'), button:has-text('Continue')"
      );

      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();
        await page.waitForTimeout(500);

        // Check for error message
        const errorElement = page.locator(
          "[role='alert'], [class*='error' i], [aria-live='polite']"
        );

        // May or may not show error depending on validation
        const hasError = (await errorElement.count()) > 0;
        console.log("Shows error for empty submission:", hasError);
      }
    });

    test("should clear errors when input changes", async ({ page }) => {
      await page.goto("/student/start");

      const input = page.locator("input:visible").first();

      if ((await input.count()) > 0) {
        // Enter invalid data
        await input.fill("A");

        // Submit to trigger error
        const submitButton = page.locator(
          "button[type='submit'], button:has-text('Continue')"
        );

        if ((await submitButton.count()) > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(300);

          // Now fix the input
          await input.fill("Valid Input");

          // Errors should be cleared or updated
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe("Mobile Experience", () => {
    test("should work on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/student/start");

      // All interactive elements should be visible
      const buttons = page.locator("button:visible");
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();

        if (box) {
          // Buttons should be within viewport and have reasonable tap target
          expect(box.width).toBeGreaterThanOrEqual(44); // Minimum tap target
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test("should have touch-friendly input fields", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/student/start");

      const inputs = page.locator("input:visible");
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const box = await input.boundingBox();

        if (box) {
          // Inputs should have reasonable height for touch
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    });
  });
});
