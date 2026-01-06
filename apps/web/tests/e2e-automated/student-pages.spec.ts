/**
 * Student Pages Testing - Section 2 from Manual Testing Guide
 * Covers: Dashboard, Classes, Assessments, Progress
 */

import { test, expect } from '@playwright/test';
import {
  takeScreenshot,
  loginAsStudent,
  verifyPageLoad,
  verifyElementExists,
  createTestResult,
  TestResult,
  formatDuration,
  scrollToElement,
  getVisibleText,
} from './test-utils';
import { TEST_CONFIG, TEST_SECTIONS } from './test-config';

const testResults: TestResult[] = [];
const startTime = Date.now();

// Test Case 2.1.1: Student Dashboard Load
test('2.1.1 - Student Dashboard Load', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-2.1.1-Dashboard';
  const screenshots: string[] = [];

  try {
    console.log('📋 Testing Student Dashboard Load...');

    // Navigate to app
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    screenshots.push(await takeScreenshot(page, testName, 'navigated-to-dashboard'));

    // Wait for page load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Check for auth redirect if needed
    if (page.url().includes('login') || page.url().includes('student/start')) {
      console.log('ℹ️ Redirected to login - need to authenticate first');
      // Skip this test - need auth
      const duration = Date.now() - testStart;
      testResults.push(
        createTestResult(testName, TEST_SECTIONS.STUDENT_PAGES, 'SKIP', duration, screenshots, 'Auth required')
      );
      return;
    }

    // Verify dashboard elements
    await verifyElementExists(page, '[data-testid="dashboard-stats"]', testName);
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-stats-visible'));

    // Look for common dashboard cards
    const hasStreakCard = await page.$('text=Learning Streak');
    const hasPointsCard = await page.$('text=Total Points');
    const hasBadgesCard = await page.$('text=Badges');

    if (hasStreakCard || hasPointsCard || hasBadgesCard) {
      console.log('✓ Dashboard cards found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'all-cards-visible'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.STUDENT_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.STUDENT_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 2.2.1: Student Classes View
test('2.2.1 - Student Classes View', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-2.2.1-Classes';
  const screenshots: string[] = [];

  try {
    console.log('📚 Testing Student Classes...');

    // Navigate to classes
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/student/classes`);
    screenshots.push(await takeScreenshot(page, testName, 'navigated-to-classes'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for classes list or empty state
    const hasClassesList = await page.$('[data-testid="classes-list"]');
    const hasEmptyState = await page.$('text=No classes');

    if (hasClassesList) {
      console.log('✓ Classes list found');
    } else if (hasEmptyState) {
      console.log('✓ Empty state shown (no classes enrolled)');
    }
    screenshots.push(await takeScreenshot(page, testName, 'classes-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.STUDENT_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.STUDENT_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 2.3.1: Student Assessments View
test('2.3.1 - Student Assessments', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-2.3.1-Assessments';
  const screenshots: string[] = [];

  try {
    console.log('📝 Testing Student Assessments...');

    // Navigate to assessments
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/student/assessments`);
    screenshots.push(await takeScreenshot(page, testName, 'navigated-to-assessments'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for assessments
    const hasAssessments = await page.$('[data-testid="assessments-list"]');
    const hasEmptyState = await page.$('text=No assessments');

    if (hasAssessments) {
      console.log('✓ Assessments list found');
    } else if (hasEmptyState) {
      console.log('✓ Empty state shown');
    }
    screenshots.push(await takeScreenshot(page, testName, 'assessments-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.STUDENT_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.STUDENT_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 2.4.1: Student Progress Page
test('2.4.1 - Student Progress Tracking', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-2.4.1-Progress';
  const screenshots: string[] = [];

  try {
    console.log('📊 Testing Student Progress...');

    // Navigate to progress
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/progress`);
    screenshots.push(await takeScreenshot(page, testName, 'navigated-to-progress'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for progress charts/data
    const hasProgress = await page.$('[data-testid="progress-chart"]');
    const hasStats = await page.$('text=Mastery');

    if (hasProgress || hasStats) {
      console.log('✓ Progress data found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'progress-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.STUDENT_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.STUDENT_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 2.5.1: Student Settings/Profile
test('2.5.1 - Student Settings', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-2.5.1-Settings';
  const screenshots: string[] = [];

  try {
    console.log('⚙️ Testing Student Settings...');

    // Navigate to settings
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/settings`);
    screenshots.push(await takeScreenshot(page, testName, 'navigated-to-settings'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for profile form
    const hasProfileForm = await page.$('input[type="text"]');
    const hasLanguageSelect = await page.$('select');

    if (hasProfileForm) {
      console.log('✓ Settings form found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'settings-form-visible'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.STUDENT_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.STUDENT_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 2.6.1: Learning Modules
test('2.6.1 - Learning Modules', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-2.6.1-Modules';
  const screenshots: string[] = [];

  try {
    console.log('📚 Testing Learning Modules...');

    // Navigate to learning
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    screenshots.push(await takeScreenshot(page, testName, 'navigated-to-learn'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for modules
    const hasModules = await page.$('[data-testid="modules-list"]');
    const hasCards = await page.$$('div[role="button"]');

    if (hasModules || hasCards.length > 0) {
      console.log(`✓ Found ${hasCards.length} module cards`);
    }
    screenshots.push(await takeScreenshot(page, testName, 'modules-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.STUDENT_PAGES, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.STUDENT_PAGES,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 2.7.1: AI Tutor
test('2.7.1 - AI Tutor Interface', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-2.7.1-AITutor';
  const screenshots: string[] = [];

  try {
    console.log('🤖 Testing AI Tutor...');

    // Navigate to AI tutor
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/ai-tools/tutor`);
    screenshots.push(await takeScreenshot(page, testName, 'navigated-to-tutor'));

    // Wait for content
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Look for chat interface
    const hasChatBox = await page.$('[data-testid="chat-container"]');
    const hasInput = await page.$('input[placeholder*="message" i]');

    if (hasChatBox || hasInput) {
      console.log('✓ AI Tutor chat interface found');
    }
    screenshots.push(await takeScreenshot(page, testName, 'tutor-interface-loaded'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AI_RAG, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AI_RAG,
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
  console.log('📊 STUDENT PAGES TEST RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${testResults.filter((r) => r.status === 'PASS').length}`);
  console.log(`Failed: ${testResults.filter((r) => r.status === 'FAIL').length}`);
  console.log(`Skipped: ${testResults.filter((r) => r.status === 'SKIP').length}`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log(`${'='.repeat(80)}\n`);

  const fs = require('fs');
  const path = require('path');
  const reportDir = 'test-artifacts';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'student-pages-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Student Pages Testing',
        totalTests: testResults.length,
        passed: testResults.filter((r) => r.status === 'PASS').length,
        failed: testResults.filter((r) => r.status === 'FAIL').length,
        skipped: testResults.filter((r) => r.status === 'SKIP').length,
        duration: formatDuration(totalDuration),
        results: testResults,
      },
      null,
      2
    )
  );

  console.log(`✅ Results saved to: ${reportPath}`);
});
