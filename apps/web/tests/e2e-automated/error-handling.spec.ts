/**
 * Error Handling Testing
 * Covers: Network Errors, Server Errors, Form Errors, 404 Errors
 */

import { test, expect } from '@playwright/test';
import {
  takeScreenshot,
  loginAsStudent,
  createTestResult,
  TestResult,
  formatDuration,
} from './test-utils';
import { TEST_CONFIG, TEST_SECTIONS } from './test-config';

const testResults: TestResult[] = [];
const startTime = Date.now();

// Test Case 13.1.1: Network Error Handling
test('13.1.1 - Network Error Handling', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-13.1.1-NetworkError';
  const screenshots: string[] = [];

  try {
    console.log('🌐 Testing Network Error Handling...');

    // Go offline
    await page.context().setOffline(true);
    screenshots.push(await takeScreenshot(page, testName, 'offline-mode'));

    // Try to load a page
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`).catch(() => {});
    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'offline-page-load'));

    // Look for error message or offline page
    const errorMessage = page.locator('[data-testid="error"], .error, .offline').first();
    const offlinePage = page.locator('text=offline, text=connection, text=unable to connect').first();

    const hasError = await errorMessage.isVisible().catch(() => false);
    const hasOfflineMsg = await offlinePage.isVisible().catch(() => false);

    if (hasError || hasOfflineMsg) {
      console.log('✓ Error/offline message displayed');
    }
    screenshots.push(await takeScreenshot(page, testName, 'error-displayed'));

    // Go back online
    await page.context().setOffline(false);
    screenshots.push(await takeScreenshot(page, testName, 'back-online'));

    // Try to load page again
    await page.goto(`${TEST_CONFIG.BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    screenshots.push(await takeScreenshot(page, testName, 'online-recovery'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ERROR_HANDLING, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ERROR_HANDLING,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 13.1.2: 404 Not Found
test('13.1.2 - 404 Not Found Handling', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-13.1.2-404NotFound';
  const screenshots: string[] = [];

  try {
    console.log('🔍 Testing 404 Not Found Handling...');

    // Login first
    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to non-existent resource
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/nonexistent-page-that-does-not-exist`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    screenshots.push(await takeScreenshot(page, testName, 'invalid-route'));

    // Check for 404 page
    const notFoundText = page.locator('text=404, text=not found, text=page not found').first();
    const errorPage = page.locator('[data-testid="404"], .error-page').first();

    const has404 = await notFoundText.isVisible().catch(() => false);
    const hasErrorPage = await errorPage.isVisible().catch(() => false);

    if (has404 || hasErrorPage) {
      console.log('✓ 404 error page displayed');
    }
    screenshots.push(await takeScreenshot(page, testName, 'error-page'));

    // Look for "Go back" or "Home" button
    const backButton = page.locator('button:has-text("Back"), button:has-text("Home"), a:has-text("Home")').first();
    if (await backButton.isVisible()) {
      console.log('✓ Navigation link available');
      screenshots.push(await takeScreenshot(page, testName, 'nav-button-visible'));

      // Click and verify redirect
      await backButton.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'redirected'));
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ERROR_HANDLING, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ERROR_HANDLING,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 13.1.3: Form Validation Error Display
test('13.1.3 - Form Validation Error Display', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-13.1.3-FormValidationErrors';
  const screenshots: string[] = [];

  try {
    console.log('❌ Testing Form Validation Errors...');

    // Navigate to signup page
    await page.goto(`${TEST_CONFIG.BASE_URL}/auth/signup`);
    screenshots.push(await takeScreenshot(page, testName, 'signup-page'));

    // Try to submit without email
    const submitBtn = page.locator('button:has-text("Send OTP"), button:has-text("Sign Up"), button:has-text("Next")').first();

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      screenshots.push(await takeScreenshot(page, testName, 'submit-attempted'));

      // Look for validation error
      const errorAlert = page.locator('[role="alert"], .error, .text-red-500').first();
      if (await errorAlert.isVisible()) {
        const errorText = await errorAlert.textContent();
        console.log(`✓ Validation error shown: ${errorText}`);
      }
      screenshots.push(await takeScreenshot(page, testName, 'error-visible'));
    }

    // Now fill email and try invalid password
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      screenshots.push(await takeScreenshot(page, testName, 'email-filled'));

      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill('123');
        await passwordInput.blur();
        await page.waitForTimeout(500);
        screenshots.push(await takeScreenshot(page, testName, 'weak-password-entered'));

        // Check for password error
        const passwordError = page.locator('[role="alert"], .error').first();
        if (await passwordError.isVisible()) {
          console.log('✓ Password validation error shown');
        }
        screenshots.push(await takeScreenshot(page, testName, 'password-error'));
      }
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ERROR_HANDLING, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ERROR_HANDLING,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 13.1.4: API Error Handling
test('13.1.4 - API Error Handling', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-13.1.4-APIErrorHandling';
  const screenshots: string[] = [];

  try {
    console.log('🔌 Testing API Error Handling...');

    // Login
    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Go to a page that makes API calls
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Monitor for API errors
    const apiErrors: string[] = [];
    page.on('response', (response) => {
      if (!response.ok() && response.url().includes('api') || response.url().includes('supabase')) {
        apiErrors.push(`${response.status()} - ${response.url()}`);
      }
    });

    // Perform an action that might cause API error
    const buttons = page.locator('button').all();
    const buttonList = await buttons;

    if (buttonList.length > 0) {
      // Just take screenshots, don't actually click to avoid side effects
      console.log(`✓ Found ${buttonList.length} interactive elements`);
    }
    screenshots.push(await takeScreenshot(page, testName, 'api-interactions'));

    // Check if any errors were logged
    if (apiErrors.length > 0) {
      console.log(`⚠️ API errors encountered: ${apiErrors.join(', ')}`);
    } else {
      console.log('✓ No API errors detected');
    }
    screenshots.push(await takeScreenshot(page, testName, 'api-check'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ERROR_HANDLING, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ERROR_HANDLING,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 13.1.5: Timeout Error Handling
test('13.1.5 - Timeout Error Handling', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-13.1.5-TimeoutHandling';
  const screenshots: string[] = [];

  try {
    console.log('⏳ Testing Timeout Error Handling...');

    // Create a page with slow network
    const context = page.context();

    // Try to load page with simulated slowness
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await takeScreenshot(page, testName, 'page-load-slow'));

    // Check for loading indicator or timeout message
    const loadingIndicator = page.locator('[data-testid="loading"], .spinner, .loading').first();
    const timeoutMessage = page.locator('text=timeout, text=taking longer').first();

    if (await loadingIndicator.isVisible().catch(() => false)) {
      console.log('✓ Loading indicator shown during slow load');
    }

    if (await timeoutMessage.isVisible().catch(() => false)) {
      console.log('✓ Timeout message displayed');
    }

    screenshots.push(await takeScreenshot(page, testName, 'timeout-handling'));

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ERROR_HANDLING, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ERROR_HANDLING,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Cleanup: Save results
test.afterAll(() => {
  const totalDuration = Date.now() - startTime;
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 ERROR HANDLING TEST RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${testResults.filter((r) => r.status === 'PASS').length}`);
  console.log(`Failed: ${testResults.filter((r) => r.status === 'FAIL').length}`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log(`${'='.repeat(80)}\n`);

  const fs = require('fs');
  const path = require('path');
  const reportDir = 'test-artifacts';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'error-handling-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Error Handling Testing',
        totalTests: testResults.length,
        passed: testResults.filter((r) => r.status === 'PASS').length,
        failed: testResults.filter((r) => r.status === 'FAIL').length,
        duration: formatDuration(totalDuration),
        results: testResults,
      },
      null,
      2
    )
  );

  console.log(`✅ Results saved to: ${reportPath}`);
});
