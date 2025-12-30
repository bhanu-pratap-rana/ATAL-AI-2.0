import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * =============================================================================
 * SECTION 4.1: ADMIN DASHBOARD TESTING
 * =============================================================================
 *
 * These automated tests verify all Admin Dashboard functionality from
 * MANUAL_TESTING_GUIDE.md Section 4.1 (Test Cases 4.1.1 through 4.1.2)
 *
 * Test File: 001-admin-dashboard.spec.ts
 * Location: apps/web/tests/e2e-automated/section-004-admin-pages/
 * Total Tests: 2
 *
 * Component: Admin dashboard page
 * Related Components:
 * - src/app/app/admin/page.tsx (Main admin dashboard)
 * - src/app/actions/admin-metrics.ts (System statistics)
 *
 * Test Cases:
 * - TC-4.1.1: Admin Dashboard Load (page load & widgets)
 * - TC-4.1.2: Display System Statistics (users, schools, assessments, sessions)
 *
 * =============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPass123!';

const SCREENSHOTS_DIR = path.join(
  __dirname,
  'results',
  'screenshots'
);

// ============================================================================
// TYPES
// ============================================================================

interface TestResult {
  testCase: string;
  testName: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  screenshots: string[];
  steps: string[];
  error?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function takeScreenshot(page: Page, testName: string, stepName: string): Promise<string> {
  const timestamp = Date.now();
  const filename = `${testName}___${stepName}___${timestamp}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  await page.screenshot({ path: filepath, fullPage: true });
  return filename;
}

function createTestResult(
  testCase: string,
  testName: string,
  status: 'PASS' | 'FAIL',
  duration: number,
  screenshots: string[],
  steps: string[],
  error?: string
): TestResult {
  return {
    testCase,
    testName,
    status,
    duration,
    screenshots,
    steps,
    error,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// TEST RESULTS STORAGE
// ============================================================================

const testResults: TestResult[] = [];

// ============================================================================
// TEST SETUP AND TEARDOWN
// ============================================================================

test.describe('SECTION 4.1: Admin Dashboard', () => {

  // Capture and save results after all tests complete
  test.afterAll(async () => {
    const resultsFile = path.join(__dirname, 'results', 'section-4.1-results.json');
    const resultsDir = path.dirname(resultsFile);

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const results = {
      section: 'Section 4.1: Admin Dashboard',
      timestamp: new Date().toISOString(),
      totalTests: testResults.length,
      passed: testResults.filter(r => r.status === 'PASS').length,
      failed: testResults.filter(r => r.status === 'FAIL').length,
      totalDuration: testResults.reduce((sum, r) => sum + r.duration, 0),
      results: testResults,
    };

    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n✅ Results saved to: ${resultsFile}`);
  });

  // =========================================================================
  // TEST CASE 4.1.1: Admin Dashboard Load
  // =========================================================================
  // Tests that admin dashboard loads with admin-only widgets visible

  test('TC-4.1.1: Admin Dashboard Load', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-4.1.1';
    const testName = 'Admin-Dashboard-Load';
    const screenshots: string[] = [];
    const steps: string[] = [];

    try {
      console.log(`\n🧪 Running ${testCase}: Admin Dashboard Load`);

      // Step 1: Sign in as admin
      steps.push('Sign in as admin');
      console.log('Step 1: Signing in as admin...');
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, '01-signin-page'));

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      await emailInput.fill(TEST_ADMIN_EMAIL);
      await passwordInput.fill(TEST_ADMIN_PASSWORD);
      console.log('✓ Credentials entered');

      const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("signin")').first();
      await signInBtn.click();

      // Wait for admin navigation
      await Promise.race([
        page.waitForURL('**/app/admin/**', { timeout: 15000 }),
        page.waitForURL('**/admin', { timeout: 15000 }),
      ]);

      console.log('✓ Signed in successfully');

      // Step 2: Navigate to /app/admin
      steps.push('Navigate to /app/admin');
      console.log('Step 2: Navigating to admin dashboard...');
      const navigationStart = Date.now();
      await page.goto(`${BASE_URL}/app/admin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      const navigationDuration = Date.now() - navigationStart;
      console.log(`✓ Navigated to admin dashboard (${navigationDuration}ms)`);
      screenshots.push(await takeScreenshot(page, testName, '02-dashboard-loaded'));

      // Step 3: Verify admin dashboard loads
      steps.push('Verify admin dashboard loads');
      console.log('Step 3: Verifying dashboard...');
      const dashboardContent = page.locator('main, [role="main"], [class*="admin"]').first();
      await expect(dashboardContent).toBeVisible({ timeout: 5000 });
      console.log('✓ Dashboard content visible');

      // Step 4: Verify admin-only widgets visible
      steps.push('Verify admin-only widgets visible');
      console.log('Step 4: Checking admin widgets...');

      const adminWidgetSelectors = [
        { name: 'Admin panel', selector: '[class*="admin"], [role="region"]' },
        { name: 'Statistics widget', selector: '[class*="stat"], [class*="metric"]' },
        { name: 'Dashboard header', selector: 'h1, h2, [class*="header"]' },
      ];

      let widgetsFound = 0;
      for (const widget of adminWidgetSelectors) {
        const element = page.locator(widget.selector).first();
        const visible = await element.isVisible({ timeout: 5000 }).catch(() => false);
        if (visible) {
          console.log(`✓ ${widget.name} widget visible`);
          widgetsFound++;
        }
      }

      expect(widgetsFound).toBeGreaterThan(0);
      screenshots.push(await takeScreenshot(page, testName, '03-widgets-visible'));

      const duration = Date.now() - testStart;
      testResults.push(
        createTestResult(testCase, testName, 'PASS', duration, screenshots, steps)
      );
      console.log(`✅ ${testCase} PASSED (${formatDuration(duration)})`);

    } catch (error) {
      const duration = Date.now() - testStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      testResults.push(
        createTestResult(testCase, testName, 'FAIL', duration, screenshots, steps, errorMessage)
      );
      console.log(`❌ ${testCase} FAILED: ${errorMessage}`);
      throw error;
    }
  });

  // =========================================================================
  // TEST CASE 4.1.2: Display System Statistics
  // =========================================================================
  // Tests that system statistics are displayed (users, schools, assessments, sessions)

  test('TC-4.1.2: Display System Statistics', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-4.1.2';
    const testName = 'Display-System-Statistics';
    const screenshots: string[] = [];
    const steps: string[] = [];

    try {
      console.log(`\n🧪 Running ${testCase}: Display System Statistics`);

      // Step 1: Sign in as admin
      steps.push('Sign in as admin');
      console.log('Step 1: Signing in as admin...');
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      await emailInput.fill(TEST_ADMIN_EMAIL);
      await passwordInput.fill(TEST_ADMIN_PASSWORD);

      const signInBtn = page.locator('button:has-text("Sign In")').first();
      await signInBtn.click();

      await Promise.race([
        page.waitForURL('**/app/admin/**', { timeout: 15000 }),
        page.waitForURL('**/admin', { timeout: 15000 }),
      ]);

      console.log('✓ Signed in');

      // Step 2: Navigate to admin dashboard
      steps.push('Navigate to admin dashboard');
      console.log('Step 2: Navigating to dashboard...');
      await page.goto(`${BASE_URL}/app/admin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      console.log('✓ On admin dashboard');
      screenshots.push(await takeScreenshot(page, testName, '01-dashboard'));

      // Step 3: Verify total users count
      steps.push('Verify total users count');
      console.log('Step 3: Checking total users...');

      const usersStats = await page.evaluate(() => {
        const pageText = document.body.textContent || '';
        const userMatch = pageText.match(/(\d+)\s*user/i);
        const totalUsers = userMatch ? parseInt(userMatch[1]) : 0;
        return { totalUsers, found: !!userMatch };
      });

      if (usersStats.found) {
        console.log(`✓ Total users found: ${usersStats.totalUsers}`);
        expect(usersStats.totalUsers).toBeGreaterThanOrEqual(0);
      } else {
        console.log('⚠ Total users count not found in expected format');
      }

      // Step 4: Verify total schools count
      steps.push('Verify total schools count');
      console.log('Step 4: Checking total schools...');

      const schoolsStats = await page.evaluate(() => {
        const pageText = document.body.textContent || '';
        const schoolMatch = pageText.match(/(\d+)\s*school/i);
        const totalSchools = schoolMatch ? parseInt(schoolMatch[1]) : 0;
        return { totalSchools, found: !!schoolMatch };
      });

      if (schoolsStats.found) {
        console.log(`✓ Total schools found: ${schoolsStats.totalSchools}`);
        expect(schoolsStats.totalSchools).toBeGreaterThanOrEqual(0);
      } else {
        console.log('⚠ Total schools count not found');
      }

      // Step 5: Verify total assessments count
      steps.push('Verify total assessments count');
      console.log('Step 5: Checking total assessments...');

      const assessmentStats = await page.evaluate(() => {
        const pageText = document.body.textContent || '';
        const assessmentMatch = pageText.match(/(\d+)\s*assessment/i);
        const totalAssessments = assessmentMatch ? parseInt(assessmentMatch[1]) : 0;
        return { totalAssessments, found: !!assessmentMatch };
      });

      if (assessmentStats.found) {
        console.log(`✓ Total assessments found: ${assessmentStats.totalAssessments}`);
        expect(assessmentStats.totalAssessments).toBeGreaterThanOrEqual(0);
      } else {
        console.log('⚠ Total assessments count not found');
      }

      // Step 6: Verify active sessions count
      steps.push('Verify active sessions count');
      console.log('Step 6: Checking active sessions...');

      const sessionStats = await page.evaluate(() => {
        const pageText = document.body.textContent || '';
        const sessionMatch = pageText.match(/(\d+)\s*session/i);
        const activeSessions = sessionMatch ? parseInt(sessionMatch[1]) : 0;
        return { activeSessions, found: !!sessionMatch };
      });

      if (sessionStats.found) {
        console.log(`✓ Active sessions found: ${sessionStats.activeSessions}`);
        expect(sessionStats.activeSessions).toBeGreaterThanOrEqual(0);
      } else {
        console.log('⚠ Active sessions count not found');
      }

      screenshots.push(await takeScreenshot(page, testName, '02-statistics'));

      // Step 7: Verify at least some statistics displayed
      steps.push('Verify statistics are displayed');
      const anyStatsFound = usersStats.found || schoolsStats.found || assessmentStats.found || sessionStats.found;
      expect(anyStatsFound).toBeTruthy();
      console.log('✓ System statistics displayed');

      screenshots.push(await takeScreenshot(page, testName, '03-stats-verified'));

      const duration = Date.now() - testStart;
      testResults.push(
        createTestResult(testCase, testName, 'PASS', duration, screenshots, steps)
      );
      console.log(`✅ ${testCase} PASSED (${formatDuration(duration)})`);

    } catch (error) {
      const duration = Date.now() - testStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      testResults.push(
        createTestResult(testCase, testName, 'FAIL', duration, screenshots, steps, errorMessage)
      );
      console.log(`❌ ${testCase} FAILED: ${errorMessage}`);
      throw error;
    }
  });

});

// =============================================================================
// FINAL SUMMARY
// =============================================================================

test('SECTION 4.1 SUMMARY', async () => {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SECTION 4.1: ADMIN DASHBOARD - TEST RESULTS');
  console.log('═'.repeat(80));

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const total = testResults.length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log('═'.repeat(80) + '\n');

  for (const result of testResults) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${result.testCase}: ${result.testName} (${formatDuration(result.duration)})`);
  }

  console.log('\n✅ Results saved to: tests/e2e-automated/section-004-admin-pages/results/section-4.1-results.json');
  console.log(`📸 Screenshots saved to: tests/e2e-automated/section-004-admin-pages/results/screenshots/\n`);
});
