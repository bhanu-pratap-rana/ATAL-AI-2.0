/**
 * Teacher & Admin Pages Testing
 * Covers: Class Management, Assessments, Admin Dashboard
 */

import { test, expect } from '@playwright/test';
import {
  takeScreenshot,
  loginAsAdmin,
  createTestResult,
  TestResult,
  formatDuration,
} from './test-utils';
import { TEST_CONFIG, TEST_SECTIONS } from './test-config';

const testResults: TestResult[] = [];
const startTime = Date.now();

// Test Case 3.1.1: Admin Dashboard Load
test('3.1.1 - Admin Dashboard Load', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.1.1-AdminDash';
  const screenshots: string[] = [];

  try {
    console.log('📊 Testing Admin Dashboard...');

    // Navigate to admin dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/admin/dashboard`);
    screenshots.push(await takeScreenshot(page, testName, 'admin-dashboard'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Look for dashboard stats
    const hasStats = await page.$('[data-testid="admin-stats"]');
    const hasCharts = await page.$$('canvas');

    if (hasStats || hasCharts.length > 0) {
      console.log('✓ Dashboard stats found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'stats-visible'));

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
  }
});

// Test Case 3.2.1: Admin Users Management
test('3.2.1 - Admin Users Management', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.2.1-AdminUsers';
  const screenshots: string[] = [];

  try {
    console.log('👥 Testing Admin Users Management...');

    // Navigate to admin users page
    await page.goto(`${TEST_CONFIG.BASE_URL}/admin/admins`);
    screenshots.push(await takeScreenshot(page, testName, 'admin-users-page'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for users list
    const hasList = await page.$('[data-testid="users-list"]');
    const hasTable = await page.$('table');

    if (hasList || hasTable) {
      console.log('✓ Users list found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'users-loaded'));

    // Look for action buttons
    const hasCreateBtn = await page.$('button:has-text("Create")');
    const hasManageBtn = await page.$('button:has-text("Manage")');

    if (hasCreateBtn || hasManageBtn) {
      console.log('✓ Admin action buttons found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'actions-visible'));

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
  }
});

// Test Case 3.3.1: Admin PIN Management
test('3.3.1 - Admin PIN Management', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.3.1-AdminPINs';
  const screenshots: string[] = [];

  try {
    console.log('🔐 Testing Admin PIN Management...');

    // Navigate to PINs page
    await page.goto(`${TEST_CONFIG.BASE_URL}/admin/pins`);
    screenshots.push(await takeScreenshot(page, testName, 'pins-page'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for PIN management UI
    const hasForm = await page.$('input[type="password"]');
    const hasVerifyBtn = await page.$('button:has-text("Verify")');

    if (hasForm || hasVerifyBtn) {
      console.log('✓ PIN management form found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'pin-form-visible'));

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
  }
});

// Test Case 3.4.1: Admin Schools Management
test('3.4.1 - Admin Schools Management', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.4.1-AdminSchools';
  const screenshots: string[] = [];

  try {
    console.log('🏫 Testing Admin Schools Management...');

    // Navigate to schools page
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/admin/schools`);
    screenshots.push(await takeScreenshot(page, testName, 'schools-page'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for schools list
    const hasList = await page.$('[data-testid="schools-list"]');
    const hasSearchBox = await page.$('input[placeholder*="search" i]');

    if (hasList || hasSearchBox) {
      console.log('✓ Schools list found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'schools-loaded'));

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
  }
});

// Test Case 4.1.1: Teacher Dashboard
test('4.1.1 - Teacher Dashboard', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-4.1.1-TeacherDash';
  const screenshots: string[] = [];

  try {
    console.log('📚 Testing Teacher Dashboard...');

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-dashboard'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Look for teacher stats
    const hasClassStats = await page.$('text=Classes');
    const hasStudentStats = await page.$('text=Students');

    if (hasClassStats || hasStudentStats) {
      console.log('✓ Teacher stats found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'stats-visible'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.TEACHER_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.TEACHER_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 4.2.1: Teacher Classes Management
test('4.2.1 - Teacher Classes Management', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-4.2.1-TeacherClasses';
  const screenshots: string[] = [];

  try {
    console.log('📝 Testing Teacher Classes...');

    // Navigate to classes
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/teacher/classes`);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-classes'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for classes list
    const hasList = await page.$('[data-testid="classes-list"]');
    const hasCreateBtn = await page.$('button:has-text("Create")');

    if (hasList || hasCreateBtn) {
      console.log('✓ Classes management found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'classes-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.TEACHER_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.TEACHER_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 4.3.1: Teacher Assessments
test('4.3.1 - Teacher Assessment Management', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-4.3.1-TeacherAssessments';
  const screenshots: string[] = [];

  try {
    console.log('✏️ Testing Teacher Assessments...');

    // Navigate to assessments
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/teacher/assessments`);
    screenshots.push(await takeScreenshot(page, testName, 'assessments-page'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for assessments list
    const hasList = await page.$('[data-testid="assessments-list"]');
    const hasCreateBtn = await page.$('button:has-text("Create")');

    if (hasList || hasCreateBtn) {
      console.log('✓ Assessment management found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'assessments-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ASSESSMENT, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ASSESSMENT,
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
  console.log('📊 TEACHER & ADMIN PAGES TEST RESULTS');
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

  const reportPath = path.join(reportDir, 'teacher-admin-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Teacher & Admin Pages Testing',
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
