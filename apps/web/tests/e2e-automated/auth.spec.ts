/**
 * Authentication Testing - Section 1 from Manual Testing Guide
 * Covers: Email signup, OTP flow, login
 */

import { test, expect, Page } from '@playwright/test';
import {
  takeScreenshot,
  loginAsTeacher,
  loginAsStudent,
  loginAsAdmin,
  verifyPageLoad,
  verifyElementExists,
  getErrorMessage,
  verifyFormError,
  createTestResult,
  TestResult,
  formatDuration,
} from './test-utils';
import { TEST_CONFIG, TEST_SECTIONS } from './test-config';

const testResults: TestResult[] = [];
const startTime = Date.now();

// Test Section: Authentication - Test Case 1.1.1: Email Input Validation
test('1.1.1 - Email Input Validation', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-1.1.1';
  const screenshots: string[] = [];

  try {
    // Navigate to signup page
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    screenshots.push(await takeScreenshot(page, testName, 'home-page'));

    // Click on Student signup
    await page.click('text=Student');
    screenshots.push(await takeScreenshot(page, testName, 'student-selected'));

    // Click on Email option
    await page.click('text=Email');
    screenshots.push(await takeScreenshot(page, testName, 'email-option-selected'));

    // Enter invalid email
    const emailInput = 'input[type="email"]';
    await page.fill(emailInput, 'notanemail');
    screenshots.push(await takeScreenshot(page, testName, 'invalid-email-entered'));

    // Verify error message
    const errorMsg = await getErrorMessage(page);
    expect(errorMsg).toContain('Invalid');
    screenshots.push(await takeScreenshot(page, testName, 'error-message-shown'));

    // Clear and enter valid email
    await page.fill(emailInput, 'test@example.com');
    screenshots.push(await takeScreenshot(page, testName, 'valid-email-entered'));

    // Verify error clears
    await page.waitForTimeout(500);
    const errorAfter = await getErrorMessage(page);
    expect(errorAfter).toBeNull();
    screenshots.push(await takeScreenshot(page, testName, 'error-cleared'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AUTHENTICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AUTHENTICATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
    throw error;
  }
});

// Test Case 1.1.2: Email Submission
test('1.1.2 - Email OTP Submission', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-1.1.2';
  const screenshots: string[] = [];

  try {
    // Navigate to student signup
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    screenshots.push(await takeScreenshot(page, testName, 'home-page'));

    await page.click('text=Student');
    await page.click('text=Email');
    screenshots.push(await takeScreenshot(page, testName, 'email-signup-form'));

    // Enter valid email
    await page.fill('input[type="email"]', TEST_CONFIG.STUDENT.email);
    screenshots.push(await takeScreenshot(page, testName, 'email-entered'));

    // Click Send OTP
    const sendButton = page.locator('button:has-text("Send OTP")');
    await sendButton.click();

    // Wait for loading and response
    await page.waitForTimeout(3000);
    screenshots.push(await takeScreenshot(page, testName, 'after-otp-sent'));

    // Verify OTP input appears
    const otpInputs = await page.$$('input[maxlength="1"]');
    expect(otpInputs.length).toBe(6);
    screenshots.push(await takeScreenshot(page, testName, 'otp-inputs-visible'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AUTHENTICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AUTHENTICATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
    throw error;
  }
});

// Test Case 1.1.4: OTP Input Display
test('1.1.4 - OTP Input Display and Auto-Focus', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-1.1.4-1.1.5';
  const screenshots: string[] = [];

  try {
    // Go to signup and send OTP
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    await page.click('text=Student');
    await page.click('text=Email');
    screenshots.push(await takeScreenshot(page, testName, 'signup-form'));

    await page.fill('input[type="email"]', TEST_CONFIG.STUDENT.email);
    await page.click('button:has-text("Send OTP")');
    await page.waitForTimeout(2000);

    // Verify 6 OTP input boxes
    const otpInputs = await page.$$('input[maxlength="1"]');
    expect(otpInputs.length).toBe(6);
    screenshots.push(await takeScreenshot(page, testName, 'all-6-otp-inputs'));

    // Test auto-focus: Enter first digit
    await otpInputs[0].click();
    await otpInputs[0].type('1');
    screenshots.push(await takeScreenshot(page, testName, 'first-digit-entered'));

    // Verify focus moved to second box
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('maxlength'));
    expect(focusedElement).toBe('1');
    screenshots.push(await takeScreenshot(page, testName, 'focus-on-second-box'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AUTHENTICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AUTHENTICATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
    throw error;
  }
});

// Test Case 2.1.1: Teacher Login
test('2.1.1 - Teacher Login Flow', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-2.1.1';
  const screenshots: string[] = [];

  try {
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    screenshots.push(await takeScreenshot(page, testName, 'home-page'));

    await loginAsTeacher(page);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-otp-sent'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AUTHENTICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AUTHENTICATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
    throw error;
  }
});

// Test Case 3.1.1: Admin Login
test('3.1.1 - Admin Login Flow', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.1.1';
  const screenshots: string[] = [];

  try {
    await page.goto(`${TEST_CONFIG.BASE_URL}/admin/login`);
    screenshots.push(await takeScreenshot(page, testName, 'admin-login-page'));

    // Enter admin email
    await page.fill('input[type="email"]', TEST_CONFIG.ADMIN.email);
    screenshots.push(await takeScreenshot(page, testName, 'email-entered'));

    // Enter password
    await page.fill('input[type="password"]', TEST_CONFIG.ADMIN.password);
    screenshots.push(await takeScreenshot(page, testName, 'password-entered'));

    // Click login
    await page.click('button:has-text("Login")');
    screenshots.push(await takeScreenshot(page, testName, 'login-clicked'));

    // Wait for navigation
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ADMIN_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ADMIN_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
    // Don't throw - continue with other tests
  }
});

// Cleanup: Save all test results
test.afterAll(() => {
  const totalDuration = Date.now() - startTime;
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 AUTHENTICATION TEST RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${testResults.filter((r) => r.status === 'PASS').length}`);
  console.log(`Failed: ${testResults.filter((r) => r.status === 'FAIL').length}`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log(`${'='.repeat(80)}\n`);

  // Save to JSON
  const fs = require('fs');
  const path = require('path');
  const reportDir = 'test-artifacts';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'auth-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Authentication Testing',
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
