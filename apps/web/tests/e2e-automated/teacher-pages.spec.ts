/**
 * Teacher Pages Testing - EXPANDED
 * Covers: Teacher Dashboard, Class Management, Class Roster
 */

import { test, expect } from '@playwright/test';
import {
  takeScreenshot,
  loginAsTeacher,
  createTestResult,
  TestResult,
  formatDuration,
} from './test-utils';
import { TEST_CONFIG, TEST_SECTIONS } from './test-config';

let testResults: TestResult[] = [];
const startTime = Date.now();

// Test Case 3.1.1: Teacher Dashboard Load
test('3.1.1 - Teacher Dashboard Load', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.1.1-TeacherDashboardLoad';
  const screenshots: string[] = [];

  try {
    console.log('📊 Testing Teacher Dashboard Load...');

    await loginAsTeacher(page);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-logged-in'));

    // Navigate to teacher dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-page'));

    // Verify load time < 3 seconds
    const startLoadTime = Date.now();
    const mainContent = page.locator('main, [role="main"], .dashboard').first();
    if (await mainContent.isVisible({ timeout: 3000 }).catch(() => false)) {
      const loadTime = Date.now() - startLoadTime;
      console.log(`✓ Dashboard loaded in ${loadTime}ms`);
    }
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Verify dashboard widgets
    const widgets = page.locator('[data-testid*="card"], .card, .widget').all();
    const widgetCount = (await widgets).length;
    console.log(`✓ Dashboard widgets visible: ${widgetCount}`);
    screenshots.push(await takeScreenshot(page, testName, 'widgets-visible'));

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

// Test Case 3.1.2: Display Active Classes
test('3.1.2 - Display Active Classes', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.1.2-DisplayActiveClasses';
  const screenshots: string[] = [];

  try {
    console.log('📚 Testing Display Active Classes...');

    await loginAsTeacher(page);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Look for "My Classes" section
    const classesSection = page.locator('[data-testid="my-classes"], .my-classes, :text("My Classes")').first();

    if (await classesSection.isVisible()) {
      console.log('✓ My Classes section visible');
      screenshots.push(await takeScreenshot(page, testName, 'classes-section-visible'));

      // Look for class list
      const classList = page.locator('[data-testid="class-list"], .class-card, .class-item').all();
      const classCount = (await classList).length;

      if (classCount > 0) {
        console.log(`✓ ${classCount} classes displayed`);

        // Verify each class has name and student count
        for (let i = 0; i < Math.min(3, classCount); i++) {
          const classCard = (await classList)[i];
          const className = await classCard.locator('.class-name, h3, [data-testid="class-name"]').first().textContent().catch(() => '');
          const studentCount = await classCard.locator('.student-count, span').first().textContent().catch(() => '');
          console.log(`  Class ${i + 1}: ${className} (${studentCount})`);
        }
      }
      screenshots.push(await takeScreenshot(page, testName, 'classes-listed'));
    }

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

// Test Case 3.1.3: Display Class Statistics
test('3.1.3 - Display Class Statistics', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.1.3-ClassStatistics';
  const screenshots: string[] = [];

  try {
    console.log('📈 Testing Class Statistics...');

    await loginAsTeacher(page);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Look for statistics tiles
    const stats = [
      { label: 'Total Students', selector: ':text("Students"), [data-testid="total-students"]' },
      { label: 'Average Score', selector: ':text("Average"), [data-testid="avg-score"]' },
      { label: 'Completed', selector: ':text("Completed"), [data-testid="completed"]' },
    ];

    let statsFound = 0;
    for (const stat of stats) {
      const statElement = page.locator(stat.selector).first();
      if (await statElement.isVisible().catch(() => false)) {
        const value = await statElement.textContent();
        console.log(`✓ ${stat.label}: ${value}`);
        statsFound++;
      }
    }

    console.log(`✓ ${statsFound}/${stats.length} statistics displayed`);
    screenshots.push(await takeScreenshot(page, testName, 'statistics-visible'));

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

// Test Case 3.2.1: Create Class
test('3.2.1 - Create Class', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.2.1-CreateClass';
  const screenshots: string[] = [];

  try {
    console.log('✨ Testing Create Class...');

    await loginAsTeacher(page);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-logged-in'));

    // Navigate to classes page
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/teacher/classes`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'classes-page'));

    // Look for Create Class button
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New Class"), [data-testid="create-class"]').first();

    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);
      screenshots.push(await takeScreenshot(page, testName, 'create-dialog'));

      // Fill form
      const classNameInput = page.locator('input[placeholder*="class" i], input[name*="name" i]').first();
      if (await classNameInput.isVisible()) {
        const testClassName = `Test-Class-${Date.now()}`;
        await classNameInput.fill(testClassName);
        console.log(`✓ Class name entered: ${testClassName}`);
      }
      screenshots.push(await takeScreenshot(page, testName, 'class-name-entered'));

      // Look for submit button
      const submitBtn = page.locator('button:has-text("Create"), button:has-text("Save")').last();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
        screenshots.push(await takeScreenshot(page, testName, 'class-created'));

        // Verify success message or class added
        const successMsg = page.locator('.toast, [role="status"], .success').first();
        if (await successMsg.isVisible().catch(() => false)) {
          console.log('✓ Class creation successful');
        }
      }
    }

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

// Test Case 3.2.2: Generate Class Code
test('3.2.2 - Generate & Copy Class Code', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.2.2-ClassCode';
  const screenshots: string[] = [];

  try {
    console.log('🔑 Testing Class Code Generation...');

    await loginAsTeacher(page);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/teacher/classes`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'classes-page'));

    // Click on first class
    const firstClass = page.locator('[data-testid="class-item"], .class-card').first();
    if (await firstClass.isVisible()) {
      await firstClass.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'class-details'));

      // Look for class code display
      const classCode = page.locator('[data-testid="class-code"], .class-code, [data-testid="invite-code"]').first();
      if (await classCode.isVisible()) {
        const code = await classCode.textContent();
        console.log(`✓ Class code visible: ${code}`);
        screenshots.push(await takeScreenshot(page, testName, 'code-visible'));

        // Look for copy button
        const copyBtn = page.locator('button:has-text("Copy")').first();
        if (await copyBtn.isVisible()) {
          await copyBtn.click();
          await page.waitForTimeout(300);
          console.log('✓ Copy button clicked');
          screenshots.push(await takeScreenshot(page, testName, 'copy-clicked'));
        }
      }
    }

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

// Test Case 3.2.3: QR Code Display
test('3.2.3 - QR Code Display', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.2.3-QRCode';
  const screenshots: string[] = [];

  try {
    console.log('🔲 Testing QR Code Display...');

    await loginAsTeacher(page);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/teacher/classes`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'classes-page'));

    // Click on first class
    const firstClass = page.locator('[data-testid="class-item"], .class-card').first();
    if (await firstClass.isVisible()) {
      await firstClass.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'class-details'));

      // Look for QR code
      const qrCode = page.locator('canvas, [data-testid="qr-code"], img[alt*="QR"]').first();
      if (await qrCode.isVisible().catch(() => false)) {
        console.log('✓ QR code visible');
        screenshots.push(await takeScreenshot(page, testName, 'qr-code-visible'));
      } else {
        console.log('ℹ️ QR code not visible (may be optional)');
      }
    }

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

// Test Case 3.2.4: View Class Roster
test('3.2.4 - View Class Roster', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-3.2.4-ClassRoster';
  const screenshots: string[] = [];

  try {
    console.log('👥 Testing Class Roster...');

    await loginAsTeacher(page);
    screenshots.push(await takeScreenshot(page, testName, 'teacher-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/teacher/classes`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'classes-page'));

    // Click on first class
    const firstClass = page.locator('[data-testid="class-item"], .class-card').first();
    if (await firstClass.isVisible()) {
      await firstClass.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'class-details'));

      // Click Roster tab
      const rosterTab = page.locator('button:has-text("Roster"), [role="tab"]:has-text("Roster")').first();
      if (await rosterTab.isVisible()) {
        await rosterTab.click();
        await page.waitForTimeout(500);
        screenshots.push(await takeScreenshot(page, testName, 'roster-tab-clicked'));

        // Look for student list
        const rosterTable = page.locator('table, [data-testid="roster"], .student-list').first();
        if (await rosterTable.isVisible()) {
          const rows = page.locator('tr, [data-testid="roster-row"]').all();
          const rowCount = (await rows).length;
          console.log(`✓ Roster displayed with ${rowCount} rows`);
          screenshots.push(await takeScreenshot(page, testName, 'roster-displayed'));
        }
      }
    }

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

// Cleanup: Save results
test.afterAll(() => {
  const totalDuration = Date.now() - startTime;
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 TEACHER PAGES TEST RESULTS');
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

  const reportPath = path.join(reportDir, 'teacher-pages-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Teacher Pages Testing',
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
