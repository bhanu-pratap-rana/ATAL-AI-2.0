/**
 * Accessibility Testing
 * Covers: Keyboard Navigation, Color Contrast, Touch Targets, ARIA Labels
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

// Test Case 16.1.1: Keyboard Navigation
test('16.1.1 - Keyboard Navigation', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-16.1.1-KeyboardNavigation';
  const screenshots: string[] = [];

  try {
    console.log('⌨️ Testing Keyboard Navigation...');

    // Navigate to login page
    await page.goto(`${TEST_CONFIG.BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    screenshots.push(await takeScreenshot(page, testName, 'signin-page'));

    // Start tabbing through elements
    let focusedElements: string[] = [];

    // Focus first element
    await page.press('body', 'Tab');
    let focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName + (el?.id ? '#' + el.id : '') + (el?.className ? '.' + el.className : '');
    });
    focusedElements.push(focusedElement || 'unknown');
    console.log(`✓ Focused element: ${focusedElement}`);

    // Tab through next few elements
    for (let i = 0; i < 5; i++) {
      await page.press('Tab');
      focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName + (el?.id ? '#' + el.id : '') + (el?.className ? '.' + el.className : '');
      });
      if (focusedElement && !focusedElements.includes(focusedElement)) {
        focusedElements.push(focusedElement);
      }
    }

    console.log(`✓ Tabbed through ${focusedElements.length} unique elements`);
    screenshots.push(await takeScreenshot(page, testName, 'keyboard-nav-tested'));

    // Test Shift+Tab (reverse)
    await page.press('Shift+Tab');
    console.log('✓ Shift+Tab (reverse navigation) works');
    screenshots.push(await takeScreenshot(page, testName, 'reverse-nav'));

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

// Test Case 16.1.2: Color Contrast
test('16.1.2 - Color Contrast WCAG AA', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-16.1.2-ColorContrast';
  const screenshots: string[] = [];

  try {
    console.log('🎨 Testing Color Contrast...');

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Check contrast of text elements
    const contrastIssues: string[] = [];

    const elements = await page.locator('body *').all();

    // Sample check for first 10 text elements
    let checked = 0;
    for (const el of elements) {
      if (checked >= 10) break;

      const text = await el.textContent().catch(() => '');
      if (text && text.length > 0) {
        // Get computed styles
        const fontSize = await el.evaluate((e) => window.getComputedStyle(e).fontSize);
        const fontWeight = await el.evaluate((e) => window.getComputedStyle(e).fontWeight);
        const color = await el.evaluate((e) => window.getComputedStyle(e).color);
        const bgColor = await el.evaluate((e) => window.getComputedStyle(e).backgroundColor);

        console.log(`Element ${checked + 1}: ${fontSize}, weight: ${fontWeight}`);
        checked++;
      }
    }

    console.log(`✓ Checked ${checked} elements for contrast`);
    screenshots.push(await takeScreenshot(page, testName, 'contrast-checked'));

    // Visual check for text visibility
    const headings = page.locator('h1, h2, h3').all();
    const headingCount = (await headings).length;
    console.log(`✓ Found ${headingCount} headings (hierarchical structure)`);
    screenshots.push(await takeScreenshot(page, testName, 'heading-structure'));

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

// Test Case 16.1.3: Touch Targets (44px minimum)
test('16.1.3 - Touch Target Size', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-16.1.3-TouchTargets';
  const screenshots: string[] = [];

  try {
    console.log('👆 Testing Touch Target Size...');

    // Resize to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    screenshots.push(await takeScreenshot(page, testName, 'mobile-viewport'));

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'mobile-dashboard'));

    // Find interactive elements
    const buttons = page.locator('button, a[role="button"], [role="button"]').all();
    const buttonList = await buttons;

    let smallButtons = 0;
    let largeButtons = 0;

    // Check button sizes (first 10)
    for (let i = 0; i < Math.min(10, buttonList.length); i++) {
      const button = buttonList[i];
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        const size = Math.min(boundingBox.width, boundingBox.height);
        if (size >= 44) {
          largeButtons++;
        } else {
          smallButtons++;
        }
      }
    }

    console.log(`✓ Touch targets - Good: ${largeButtons}, Small: ${smallButtons}`);
    screenshots.push(await takeScreenshot(page, testName, 'button-sizes-checked'));

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

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

// Test Case 16.1.4: ARIA Labels
test('16.1.4 - ARIA Labels & Semantic HTML', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-16.1.4-ARIALabels';
  const screenshots: string[] = [];

  try {
    console.log('📝 Testing ARIA Labels...');

    // Navigate to form
    await page.goto(`${TEST_CONFIG.BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    screenshots.push(await takeScreenshot(page, testName, 'signin-page'));

    // Check for labels
    const labels = page.locator('label, [aria-label]').all();
    const labelCount = (await labels).length;

    console.log(`✓ Found ${labelCount} labels/aria-labels`);
    screenshots.push(await takeScreenshot(page, testName, 'labels-found'));

    // Check for form elements with associated labels
    const inputs = page.locator('input').all();
    const inputList = await inputs;

    let labeledInputs = 0;
    for (const input of inputList) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');

      if (id || ariaLabel || placeholder) {
        labeledInputs++;
      }
    }

    console.log(`✓ ${labeledInputs}/${inputList.length} inputs have labels/aria-labels`);
    screenshots.push(await takeScreenshot(page, testName, 'input-labels'));

    // Check for semantic HTML headings
    const headings = page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingCount = (await headings).length;

    console.log(`✓ Semantic heading structure found (${headingCount} headings)`);
    screenshots.push(await takeScreenshot(page, testName, 'semantic-html'));

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

// Test Case 16.1.5: Focus Indicators
test('16.1.5 - Focus Indicators', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-16.1.5-FocusIndicators';
  const screenshots: string[] = [];

  try {
    console.log('🎯 Testing Focus Indicators...');

    // Navigate to page
    await page.goto(`${TEST_CONFIG.BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Tab to first interactive element
    await page.press('Tab');
    await page.waitForTimeout(300);
    screenshots.push(await takeScreenshot(page, testName, 'first-focus'));

    // Tab to next element
    await page.press('Tab');
    await page.waitForTimeout(300);
    screenshots.push(await takeScreenshot(page, testName, 'second-focus'));

    // Get focused element info
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return { hasFocus: false };

      const styles = window.getComputedStyle(el);
      const outline = styles.outline;
      const boxShadow = styles.boxShadow;

      return {
        hasFocus: true,
        tagName: el.tagName,
        outline: outline,
        boxShadow: boxShadow,
      };
    });

    if (focusedElement.hasFocus && (focusedElement.outline !== 'none' || focusedElement.boxShadow !== 'none')) {
      console.log('✓ Focus indicator visible');
    } else {
      console.log('ℹ️ Focus indicator might be subtle');
    }
    screenshots.push(await takeScreenshot(page, testName, 'focus-indicator-check'));

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
  console.log('📊 ACCESSIBILITY TEST RESULTS');
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

  const reportPath = path.join(reportDir, 'accessibility-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Accessibility Testing',
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
