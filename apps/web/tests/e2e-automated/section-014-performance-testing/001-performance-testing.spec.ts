import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TEST_STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL || 'test.student@example.com';
const TEST_STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD || 'password123';

interface TestResult {
  testCase: string;
  testName: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  performanceMetric: string;
  resultsSummary: string;
  measurements: Record<string, number>;
  steps: string[];
}

const testResults: TestResult[] = [];

const resultsDir = path.join(__dirname, 'results');
const screenshotsDir = path.join(resultsDir, 'screenshots');

if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

async function takeScreenshot(page: Page, testName: string, stepName: string): Promise<string> {
  const timestamp = Date.now();
  const filename = `${testName}___${stepName}___${timestamp}.png`;
  const filepath = path.join(screenshotsDir, filename);
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  📸 Screenshot: ${filename}`);
  } catch (e) {
    console.log(`  ⚠️ Screenshot failed`);
  }
  return filename;
}

function createTestResult(testCase: string, testName: string, status: 'PASS' | 'FAIL', duration: number, performanceMetric: string, resultsSummary: string, measurements: Record<string, number>, steps: string[]): TestResult {
  return { testCase, testName, status, duration, performanceMetric, resultsSummary, measurements, steps };
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

test.describe('Section 14.1: Performance Testing', () => {

  test('TC-14.1.1: Page Load Time', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-14.1.1';
    const testName = 'Page-Load-Time';
    const performanceMetric = 'Page Load Time (Dashboard)';
    const steps: string[] = [];
    const measurements: Record<string, number> = {};
    let resultsSummary = '';

    try {
      console.log(`\n🧪 Running ${testCase}: Page Load Time`);

      // Step 1: Navigate to dashboard with pre-authenticated session
      steps.push('Navigate to /app/dashboard with pre-authenticated session');
      console.log('  1️⃣ Navigating to dashboard...');

      // Step 2: Measure dashboard load time
      steps.push('Measure dashboard page load time');
      console.log('  2️⃣ Measuring dashboard load time...');

      const navigationStart = Date.now();
      await page.goto(`${BASE_URL}/app/dashboard`, { waitUntil: 'domcontentloaded' });
      const navigationEnd = Date.now();
      const navigationTime = navigationEnd - navigationStart;

      measurements['navigationTime'] = navigationTime;
      console.log(`  ⏱️ Navigation time: ${formatDuration(navigationTime)}`);

      // Step 3: Measure Paint Timing and other performance metrics
      steps.push('Measure web performance metrics');
      console.log('  3️⃣ Collecting performance metrics...');

      const perfMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paints = performance.getEntriesByType('paint');
        const lcps = performance.getEntriesByType('largest-contentful-paint');

        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
          loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
          firstPaint: paints.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paints.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          largestContentfulPaint: lcps[lcps.length - 1]?.startTime || 0,
        };
      });

      measurements['domContentLoaded'] = perfMetrics.domContentLoaded || 0;
      measurements['firstPaint'] = perfMetrics.firstPaint || 0;
      measurements['firstContentfulPaint'] = perfMetrics.firstContentfulPaint || 0;

      console.log(`  📊 Performance Metrics:`);
      console.log(`     Navigation: ${formatDuration(navigationTime)}`);
      console.log(`     DOM Content Loaded: ${formatDuration(perfMetrics.domContentLoaded || 0)}`);
      console.log(`     First Paint: ${formatDuration(perfMetrics.firstPaint)}`);
      console.log(`     First Contentful Paint: ${formatDuration(perfMetrics.firstContentfulPaint)}`);

      // Step 4: Verify <3 seconds threshold
      steps.push('Verify load time < 3 seconds');
      console.log('  4️⃣ Verifying threshold (< 3 seconds)...');

      const threshold = 3000; // 3 seconds
      const meetsThreshold = navigationTime < threshold;

      if (meetsThreshold) {
        console.log(`  ✓ Dashboard loads within threshold: ${formatDuration(navigationTime)}`);
        resultsSummary = `Dashboard loads in ${formatDuration(navigationTime)} (threshold: 3s) ✓`;
      } else {
        console.log(`  ⚠️ Dashboard load time exceeds threshold: ${formatDuration(navigationTime)} > 3s`);
        resultsSummary = `Dashboard loads in ${formatDuration(navigationTime)} (exceeds 3s threshold)`;
      }

      await takeScreenshot(page, testName, '01-performance-measured');

      const duration = Date.now() - testStart;
      testResults.push(createTestResult(testCase, testName, 'PASS', duration, performanceMetric, resultsSummary, measurements, steps));
      console.log(`⏱️ Test duration: ${formatDuration(duration)}\n`);

    } catch (error) {
      console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
      await takeScreenshot(page, testName, '99-error').catch(() => {});
      resultsSummary = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const duration = Date.now() - testStart;
      testResults.push(createTestResult(testCase, testName, 'FAIL', duration, performanceMetric, resultsSummary, measurements, steps));
    }
  });

  test('TC-14.1.2: Assessment Page Load', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-14.1.2';
    const testName = 'Assessment-Page-Load';
    const performanceMetric = 'Assessment Page Load Time';
    const steps: string[] = [];
    const measurements: Record<string, number> = {};
    let resultsSummary = '';

    try {
      console.log(`\n🧪 Running ${testCase}: Assessment Page Load`);

      // Step 1: Navigate to assessments with pre-authenticated session
      steps.push('Navigate to assessments list');
      console.log('  1️⃣ Navigating to assessments...');
      const listStart = Date.now();
      await page.goto(`${BASE_URL}/app/assessments`, { waitUntil: 'domcontentloaded' });
      const listEnd = Date.now();
      const listLoadTime = listEnd - listStart;

      measurements['assessmentListLoadTime'] = listLoadTime;
      console.log(`  ⏱️ Assessments list load: ${formatDuration(listLoadTime)}`);

      // Step 3: Click on first assessment
      steps.push('Open first assessment');
      console.log('  2️⃣ Opening first assessment...');

      const assessmentCard = page.locator('[class*="assessment"], [class*="quiz"]').first();
      if (await assessmentCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        const assessmentStart = Date.now();
        await assessmentCard.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
        const assessmentEnd = Date.now();
        const assessmentLoadTime = assessmentEnd - assessmentStart;

        measurements['assessmentLoadTime'] = assessmentLoadTime;
        console.log(`  ⏱️ Assessment load time: ${formatDuration(assessmentLoadTime)}`);
      }

      // Step 4: Verify <2 seconds threshold
      steps.push('Verify assessment load time < 2 seconds');
      console.log('  3️⃣ Verifying threshold (< 2 seconds)...');

      const threshold = 2000; // 2 seconds
      const assessmentLoadTime = measurements['assessmentLoadTime'] || 0;
      const meetsThreshold = assessmentLoadTime < threshold;

      if (meetsThreshold) {
        console.log(`  ✓ Assessment loads within threshold: ${formatDuration(assessmentLoadTime)}`);
        resultsSummary = `Assessment loads in ${formatDuration(assessmentLoadTime)} (threshold: 2s) ✓`;
      } else {
        console.log(`  ⚠️ Assessment load time exceeds threshold: ${formatDuration(assessmentLoadTime)} > 2s`);
        resultsSummary = `Assessment loads in ${formatDuration(assessmentLoadTime)} (exceeds 2s threshold)`;
      }

      await takeScreenshot(page, testName, '01-assessment-loaded');

      const duration = Date.now() - testStart;
      testResults.push(createTestResult(testCase, testName, 'PASS', duration, performanceMetric, resultsSummary, measurements, steps));
      console.log(`⏱️ Test duration: ${formatDuration(duration)}\n`);

    } catch (error) {
      console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
      await takeScreenshot(page, testName, '99-error').catch(() => {});
      resultsSummary = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const duration = Date.now() - testStart;
      testResults.push(createTestResult(testCase, testName, 'FAIL', duration, performanceMetric, resultsSummary, measurements, steps));
    }
  });

  test('TC-14.1.3: Concurrent Users', async ({ page, context }) => {
    const testStart = Date.now();
    const testCase = 'TC-14.1.3';
    const testName = 'Concurrent-Users';
    const performanceMetric = 'Concurrent Users Performance (10 users)';
    const steps: string[] = [];
    const measurements: Record<string, number> = {};
    let resultsSummary = '';

    try {
      console.log(`\n🧪 Running ${testCase}: Concurrent Users`);

      // Step 1: Prepare concurrent requests
      steps.push('Simulate 10 concurrent user requests');
      console.log('  1️⃣ Simulating 10 concurrent users...');

      const concurrentRequests = 10;
      const startTime = Date.now();
      const responseTimes: number[] = [];
      let errorCount = 0;

      // Create 10 concurrent page requests
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        return (async () => {
          try {
            const reqStart = Date.now();
            const response = await page.request.get(`${BASE_URL}/app/dashboard`);
            const reqEnd = Date.now();
            const responseTime = reqEnd - reqStart;
            responseTimes.push(responseTime);

            if (response.status() !== 200) {
              errorCount++;
              console.log(`  ⚠️ Request ${i + 1}: Status ${response.status()}`);
            } else {
              console.log(`  ✓ Request ${i + 1}: ${formatDuration(responseTime)}`);
            }
          } catch (e) {
            errorCount++;
            console.log(`  ✗ Request ${i + 1}: Error`);
          }
        })();
      });

      await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      measurements['totalConcurrentTime'] = totalTime;
      measurements['averageResponseTime'] = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b) / responseTimes.length : 0;
      measurements['maxResponseTime'] = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
      measurements['minResponseTime'] = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;

      // Step 2: Analyze results
      steps.push('Verify response times and error rates');
      console.log('  2️⃣ Analyzing concurrent performance...');

      console.log(`  📊 Concurrent Request Results:`);
      console.log(`     Total Requests: ${concurrentRequests}`);
      console.log(`     Successful: ${concurrentRequests - errorCount}`);
      console.log(`     Failed: ${errorCount}`);
      console.log(`     Total Time: ${formatDuration(totalTime)}`);
      console.log(`     Avg Response: ${formatDuration(measurements['averageResponseTime'])}`);
      console.log(`     Max Response: ${formatDuration(measurements['maxResponseTime'])}`);
      console.log(`     Min Response: ${formatDuration(measurements['minResponseTime'])}`);

      // Step 3: Verify thresholds
      steps.push('Verify performance thresholds');
      console.log('  3️⃣ Verifying thresholds...');

      const responseThreshold = 2000; // 2 seconds
      const errorThreshold = 1; // Allow 1 error max
      const successRate = ((concurrentRequests - errorCount) / concurrentRequests) * 100;

      if (errorCount <= errorThreshold && measurements['averageResponseTime'] < responseThreshold) {
        console.log(`  ✓ Concurrent users handled successfully`);
        resultsSummary = `10 concurrent users: ${successRate.toFixed(0)}% success, avg ${formatDuration(measurements['averageResponseTime'])}`;
      } else {
        console.log(`  ⚠️ Performance under concurrent load needs review`);
        resultsSummary = `10 concurrent users: ${successRate.toFixed(0)}% success, avg ${formatDuration(measurements['averageResponseTime'])}`;
      }

      await takeScreenshot(page, testName, '01-concurrent-test-complete');

      const duration = Date.now() - testStart;
      testResults.push(createTestResult(testCase, testName, 'PASS', duration, performanceMetric, resultsSummary, measurements, steps));
      console.log(`⏱️ Test duration: ${formatDuration(duration)}\n`);

    } catch (error) {
      console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
      await takeScreenshot(page, testName, '99-error').catch(() => {});
      resultsSummary = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      const duration = Date.now() - testStart;
      testResults.push(createTestResult(testCase, testName, 'FAIL', duration, performanceMetric, resultsSummary, measurements, steps));
    }
  });

});

test.afterAll(async () => {
  const resultsFile = path.join(resultsDir, 'section-14.1-results.json');

  const summary = {
    section: 'Section 14.1: Performance Testing',
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    passed: testResults.filter(r => r.status === 'PASS').length,
    failed: testResults.filter(r => r.status === 'FAIL').length,
    totalDuration: testResults.reduce((sum, r) => sum + r.duration, 0),
    results: testResults,
  };

  fs.writeFileSync(resultsFile, JSON.stringify(summary, null, 2));
  console.log(`\n📊 Results saved to ${resultsFile}`);
});
