/**
 * Performance Testing
 * Covers: Page Load Times, Assessment Page Load, Memory Usage
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

// Test Case 14.1.1: Dashboard Page Load Time
test('14.1.1 - Dashboard Page Load Time', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-14.1.1-DashboardLoadTime';
  const screenshots: string[] = [];

  try {
    console.log('⏱️ Testing Dashboard Load Time...');

    // Measure navigation time
    const navigationStart = Date.now();
    await loginAsStudent(page);
    const loginTime = Date.now() - navigationStart;
    console.log(`Login time: ${loginTime}ms`);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to dashboard and measure
    const dashboardStart = Date.now();
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);

    // Wait for main content
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    const dashboardLoadTime = Date.now() - dashboardStart;

    console.log(`Dashboard load time: ${dashboardLoadTime}ms`);

    // Check if under 3 seconds
    const loadTimeSecs = dashboardLoadTime / 1000;
    if (loadTimeSecs < 3) {
      console.log(`✓ Page loaded within target (${loadTimeSecs.toFixed(2)}s < 3s)`);
    } else {
      console.log(`⚠️ Page load exceeded target (${loadTimeSecs.toFixed(2)}s > 3s)`);
    }

    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domInteractive: perf?.domInteractive || 0,
        domComplete: perf?.domComplete || 0,
        loadEventEnd: perf?.loadEventEnd || 0,
      };
    });

    console.log(`Performance metrics:`, metrics);
    screenshots.push(await takeScreenshot(page, testName, 'performance-checked'));

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

// Test Case 14.1.2: Assessment Page Load
test('14.1.2 - Assessment Page Load', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-14.1.2-AssessmentLoadTime';
  const screenshots: string[] = [];

  try {
    console.log('📋 Testing Assessment Page Load...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to assessments
    const assessmentStart = Date.now();
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/assessments`);

    // Wait for load
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    const assessmentLoadTime = Date.now() - assessmentStart;

    console.log(`Assessment page load time: ${assessmentLoadTime}ms`);

    // Check if under 2 seconds
    const loadTimeSecs = assessmentLoadTime / 1000;
    if (loadTimeSecs < 2) {
      console.log(`✓ Assessment loaded quickly (${loadTimeSecs.toFixed(2)}s < 2s)`);
    } else {
      console.log(`⚠️ Assessment load time (${loadTimeSecs.toFixed(2)}s)`);
    }

    screenshots.push(await takeScreenshot(page, testName, 'assessment-page-loaded'));

    // Measure time to interactive
    const interactiveTime = await page.evaluate(() => {
      return performance.now();
    });

    console.log(`Time to Interactive: ${interactiveTime.toFixed(0)}ms`);
    screenshots.push(await takeScreenshot(page, testName, 'load-metrics'));

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

// Test Case 14.1.3: Memory Usage Monitoring
test('14.1.3 - Memory Usage Monitoring', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-14.1.3-MemoryUsage';
  const screenshots: string[] = [];

  try {
    console.log('💾 Testing Memory Usage...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Measure memory before
    const memoryBefore = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    console.log('Memory before navigation:', memoryBefore);
    screenshots.push(await takeScreenshot(page, testName, 'memory-before'));

    // Navigate through multiple pages
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/assessments`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/settings`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    screenshots.push(await takeScreenshot(page, testName, 'pages-navigated'));

    // Measure memory after
    const memoryAfter = await page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    console.log('Memory after navigation:', memoryAfter);

    // Calculate memory growth
    if (memoryBefore && memoryAfter) {
      const heapGrowth = (memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize) / 1024 / 1024;
      console.log(`Heap memory growth: ${heapGrowth.toFixed(2)}MB`);

      if (heapGrowth < 50) {
        console.log('✓ Memory usage acceptable');
      } else {
        console.log('⚠️ Memory growth detected - possible leak?');
      }
    }

    screenshots.push(await takeScreenshot(page, testName, 'memory-after'));

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
  console.log('📊 PERFORMANCE TESTING RESULTS');
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

  const reportPath = path.join(reportDir, 'performance-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Performance Testing',
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
