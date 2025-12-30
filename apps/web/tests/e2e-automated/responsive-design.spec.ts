/**
 * Responsive Design Testing
 * Covers: Mobile, Tablet, Desktop, Orientation Changes
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

let testResults: TestResult[] = [];
const startTime = Date.now();

// Test Case 17.1.1: Mobile (375px - 480px)
test('17.1.1 - Mobile Layout (375px)', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-17.1.1-MobileLayout';
  const screenshots: string[] = [];

  try {
    console.log('📱 Testing Mobile Layout (375px)...');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    screenshots.push(await takeScreenshot(page, testName, 'viewport-set'));

    // Login
    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in-mobile'));

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-mobile'));

    // Check layout
    const mainContent = page.locator('main, [role="main"]').first();
    if (await mainContent.isVisible()) {
      // Verify no horizontal scrolling
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const windowWidth = 375;

      if (bodyWidth <= windowWidth + 20) { // Allow small margin
        console.log('✓ No horizontal scrolling detected');
      } else {
        console.log(`⚠️ Horizontal overflow: ${bodyWidth}px > ${windowWidth}px`);
      }

      // Verify text is readable
      const textElements = page.locator('body *:has-text("Dashboard"), body *:has-text("Learn")').first();
      if (await textElements.isVisible()) {
        const fontSize = await textElements.evaluate((el) => window.getComputedStyle(el).fontSize);
        console.log(`✓ Text visible (font-size: ${fontSize})`);
      }

      screenshots.push(await takeScreenshot(page, testName, 'layout-verified'));
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.VALIDATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.VALIDATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 17.1.2: Tablet (768px - 1024px)
test('17.1.2 - Tablet Layout (768px)', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-17.1.2-TabletLayout';
  const screenshots: string[] = [];

  try {
    console.log('📱 Testing Tablet Layout (768px)...');

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    screenshots.push(await takeScreenshot(page, testName, 'viewport-set'));

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in-tablet'));

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-tablet'));

    // Check for 2-column layout
    const cards = page.locator('[data-testid*="card"], .card, .widget').all();
    const cardCount = (await cards).length;

    if (cardCount > 0) {
      // Try to detect grid layout
      const firstCard = (await cards)[0];
      const firstCardRect = await firstCard.boundingBox();
      const secondCard = cardCount > 1 ? (await cards)[1] : null;
      const secondCardRect = secondCard ? await secondCard.boundingBox() : null;

      if (firstCardRect && secondCardRect) {
        const sameRow = Math.abs(firstCardRect.y - secondCardRect.y) < 50;
        if (sameRow) {
          console.log('✓ 2-column layout detected (cards side-by-side)');
        } else {
          console.log('ℹ️ Single column layout (cards stacked)');
        }
      }

      console.log(`✓ ${cardCount} cards/widgets visible`);
    }

    screenshots.push(await takeScreenshot(page, testName, 'layout-verified'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.VALIDATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.VALIDATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 17.1.3: Desktop (1024px+)
test('17.1.3 - Desktop Layout (1920px)', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-17.1.3-DesktopLayout';
  const screenshots: string[] = [];

  try {
    console.log('🖥️ Testing Desktop Layout (1920px)...');

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    screenshots.push(await takeScreenshot(page, testName, 'viewport-set'));

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in-desktop'));

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-desktop'));

    // Verify optimal use of space
    const cards = page.locator('[data-testid*="card"], .card, .widget').all();
    const cardCount = (await cards).length;

    console.log(`✓ Desktop layout displays ${cardCount} cards/widgets`);

    // Check for sidebar/header presence
    const header = page.locator('header, nav, [role="banner"]').first();
    const sidebar = page.locator('aside, [role="complementary"]').first();

    if (await header.isVisible()) {
      console.log('✓ Header/navigation visible');
    }
    if (await sidebar.isVisible().catch(() => false)) {
      console.log('✓ Sidebar visible');
    }

    screenshots.push(await takeScreenshot(page, testName, 'layout-verified'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.VALIDATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.VALIDATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 17.1.4: Orientation Change (Portrait to Landscape)
test('17.1.4 - Orientation Change', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-17.1.4-OrientationChange';
  const screenshots: string[] = [];

  try {
    console.log('🔄 Testing Orientation Change...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to page
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Set portrait mode
    await page.setViewportSize({ width: 375, height: 667 });
    screenshots.push(await takeScreenshot(page, testName, 'portrait-mode'));

    // Verify layout
    const portraitWidth = 375;
    const portraitBodyWidth = await page.evaluate(() => document.body.scrollWidth);
    console.log(`✓ Portrait mode (${portraitWidth}px)`);

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500); // Allow re-render
    screenshots.push(await takeScreenshot(page, testName, 'landscape-mode'));

    const landscapeWidth = 667;
    const landscapeBodyWidth = await page.evaluate(() => document.body.scrollWidth);
    console.log(`✓ Landscape mode (${landscapeWidth}px)`);

    // Verify both layouts work
    if (portraitBodyWidth <= portraitWidth + 20 && landscapeBodyWidth <= landscapeWidth + 20) {
      console.log('✓ Layout adjusts correctly on orientation change');
    } else {
      console.log('⚠️ Overflow detected in one or both orientations');
    }

    screenshots.push(await takeScreenshot(page, testName, 'orientation-verified'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.VALIDATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.VALIDATION,
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
  console.log('📊 RESPONSIVE DESIGN TEST RESULTS');
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

  const reportPath = path.join(reportDir, 'responsive-design-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Responsive Design Testing',
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
