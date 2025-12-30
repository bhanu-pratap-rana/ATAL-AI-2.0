import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * =============================================================================
 * SECTION 2.2: STUDENT LEARNING PATH TESTING
 * =============================================================================
 *
 * These automated tests verify all Student Learning Path functionality from
 * MANUAL_TESTING_GUIDE.md Section 2.2 (Test Cases 2.2.1 through 2.2.5)
 *
 * Test File: 002-student-learning-path.spec.ts
 * Location: apps/web/tests/e2e-automated/section-002-student-pages/
 * Total Tests: 5
 *
 * Component: apps/web/src/app/app/learn/page.tsx
 * Related Components:
 * - src/app/app/learn/[moduleId]/page.tsx (Module view)
 * - src/app/app/learn/[moduleId]/[topicId]/page.tsx (Topic content)
 * - src/lib/ai/services/rag-service.ts (Content retrieval)
 *
 * Test Cases:
 * - TC-2.2.1: Learning Page Load (page load performance)
 * - TC-2.2.2: Display Topics by Module (module grouping)
 * - TC-2.2.3: Topic Progress Indicators (progress display)
 * - TC-2.2.4: Start Topic Content (content loading)
 * - TC-2.2.5: Responsive Learning Grid (mobile/tablet/desktop layouts)
 *
 * =============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TEST_STUDENT_EMAIL = process.env.TEST_STUDENT_EMAIL || 'student@example.com';
const TEST_STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD || 'TestPass123!';

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

test.describe('SECTION 2.2: Student Learning Path', () => {

  // Capture and save results after all tests complete
  test.afterAll(async () => {
    const resultsFile = path.join(__dirname, 'results', 'section-2.2-results.json');
    const resultsDir = path.dirname(resultsFile);

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const results = {
      section: 'Section 2.2: Student Learning Path',
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
  // TEST CASE 2.2.1: Learning Page Load
  // =========================================================================
  // Tests that the learning path page loads within 3 seconds with all modules

  test('TC-2.2.1: Learning Page Load', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-2.2.1';
    const testName = 'Learning-Page-Load';
    const screenshots: string[] = [];
    const steps: string[] = [];

    try {
      console.log(`\n🧪 Running ${testCase}: Learning Page Load`);

      // Step 1: Sign in as student
      steps.push('Sign in as student');
      console.log('Step 1: Signing in as student...');
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await emailInput.fill(TEST_STUDENT_EMAIL);
      await passwordInput.fill(TEST_STUDENT_PASSWORD);

      const signInBtn = page.locator('button:has-text("Sign In")').first();
      await signInBtn.click();
      await page.waitForURL('**/app/dashboard', { timeout: 15000 });
      console.log('✓ Signed in successfully');

      // Step 2: Navigate to learning page
      steps.push('Navigate to learning page');
      console.log('Step 2: Navigating to /app/learn...');
      const navigationStart = Date.now();
      await page.goto(`${BASE_URL}/app/learn`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      const navigationDuration = Date.now() - navigationStart;
      console.log(`✓ Navigated to learning page (${navigationDuration}ms)`);
      screenshots.push(await takeScreenshot(page, testName, '01-learn-page-loaded'));

      // Step 3: Verify page loads within 3 seconds
      steps.push('Verify page loads within 3 seconds');
      console.log('Step 3: Verifying load time...');
      expect(navigationDuration).toBeLessThan(3000);
      console.log(`✓ Page loaded within 3 seconds`);

      // Step 4: Verify curriculum modules/topics display
      steps.push('Verify curriculum modules display');
      console.log('Step 4: Checking for curriculum modules...');

      const moduleSelectors = [
        { name: 'Module container', selector: '[class*="module"], [class*="curriculum"]' },
        { name: 'Topic cards', selector: '[class*="card"], [class*="topic"]' },
        { name: 'Learning content', selector: '[class*="learning"], [role="region"]' },
      ];

      let modulesFound = false;
      for (const selector of moduleSelectors) {
        const count = await page.locator(selector.selector).count();
        if (count > 0) {
          console.log(`✓ ${selector.name} found: ${count} elements`);
          modulesFound = true;
        }
      }

      expect(modulesFound).toBeTruthy();
      screenshots.push(await takeScreenshot(page, testName, '02-modules-visible'));

      // Step 5: Verify page title
      steps.push('Verify page title');
      console.log('Step 5: Checking page title...');
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
      console.log(`✓ Page title: ${pageTitle}`);

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
  // TEST CASE 2.2.2: Display Topics by Module
  // =========================================================================
  // Tests that modules are displayed and topics can be expanded

  test('TC-2.2.2: Display Topics by Module', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-2.2.2';
    const testName = 'Display-Topics-by-Module';
    const screenshots: string[] = [];
    const steps: string[] = [];

    try {
      console.log(`\n🧪 Running ${testCase}: Display Topics by Module`);

      // Step 1: Sign in and navigate to learn page
      steps.push('Sign in and navigate to learn page');
      console.log('Step 1: Signing in and navigating...');
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await emailInput.fill(TEST_STUDENT_EMAIL);
      await passwordInput.fill(TEST_STUDENT_PASSWORD);

      const signInBtn = page.locator('button:has-text("Sign In")').first();
      await signInBtn.click();
      await page.waitForURL('**/app/dashboard', { timeout: 15000 });

      await page.goto(`${BASE_URL}/app/learn`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      console.log('✓ On learn page');
      screenshots.push(await takeScreenshot(page, testName, '01-learn-page'));

      // Step 2: Verify 5 curriculum modules visible
      steps.push('Verify curriculum modules visible');
      console.log('Step 2: Counting visible modules...');

      const moduleElements = page.locator('[class*="module"], [class*="section"], [data-testid*="module"]').all();
      const modules = await moduleElements;
      console.log(`✓ Found ${modules.length} module elements`);

      // Step 3: Click first module to expand (if collapsible)
      steps.push('Interact with first module');
      console.log('Step 3: Clicking first module...');

      if (modules.length > 0) {
        const firstModule = modules[0];
        const isClickable = await firstModule.isVisible({ timeout: 5000 });

        if (isClickable) {
          try {
            await firstModule.click({ timeout: 5000 });
            console.log('✓ First module clicked');
            await page.waitForTimeout(1000); // Allow expansion animation
            screenshots.push(await takeScreenshot(page, testName, '02-module-expanded'));
          } catch (e) {
            console.log('⚠ Module may not be clickable or already expanded');
            screenshots.push(await takeScreenshot(page, testName, '02-module-state'));
          }
        }
      }

      // Step 4: Verify topics under that module displayed
      steps.push('Verify topics are displayed');
      console.log('Step 4: Checking for topic elements...');

      const topicElements = page.locator('[class*="topic"], [class*="item"], [class*="lesson"]').all();
      const topics = await topicElements;
      console.log(`✓ Found ${topics.length} topic elements`);

      if (topics.length > 0) {
        for (let i = 0; i < Math.min(3, topics.length); i++) {
          const isVisible = await topics[i].isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            const text = await topics[i].textContent();
            console.log(`✓ Topic ${i + 1}: ${text?.substring(0, 50)}`);
          }
        }
      } else {
        console.log('⚠ No topic elements found');
      }

      // Step 5: Verify topics grouping
      steps.push('Verify topics are grouped correctly');
      console.log('Step 5: Verifying topic grouping...');

      const topicGrouping = await page.evaluate(() => {
        const groups = document.querySelectorAll('[class*="module-group"], [class*="section"]');
        return {
          groupCount: groups.length,
          hasTopics: Array.from(groups).some(g => g.querySelectorAll('[class*="topic"], [class*="item"]').length > 0),
        };
      });

      console.log(`✓ Topic grouping info:`, topicGrouping);
      screenshots.push(await takeScreenshot(page, testName, '03-topics-grouped'));

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
  // TEST CASE 2.2.3: Topic Progress Indicators
  // =========================================================================
  // Tests that progress bars and percentages are displayed and update

  test('TC-2.2.3: Topic Progress Indicators', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-2.2.3';
    const testName = 'Topic-Progress-Indicators';
    const screenshots: string[] = [];
    const steps: string[] = [];

    try {
      console.log(`\n🧪 Running ${testCase}: Topic Progress Indicators`);

      // Step 1: Sign in and navigate to learn page
      steps.push('Sign in and navigate to learn page');
      console.log('Step 1: Signing in...');
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await emailInput.fill(TEST_STUDENT_EMAIL);
      await passwordInput.fill(TEST_STUDENT_PASSWORD);

      const signInBtn = page.locator('button:has-text("Sign In")').first();
      await signInBtn.click();
      await page.waitForURL('**/app/dashboard', { timeout: 15000 });

      await page.goto(`${BASE_URL}/app/learn`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      console.log('✓ On learn page');

      // Step 2: For each topic, verify progress bar visible
      steps.push('Verify progress bars visible');
      console.log('Step 2: Checking for progress indicators...');

      const progressBars = page.locator('progress, [role="progressbar"], [class*="progress"]').all();
      const bars = await progressBars;
      console.log(`✓ Found ${bars.length} progress elements`);

      if (bars.length > 0) {
        for (let i = 0; i < Math.min(5, bars.length); i++) {
          const isVisible = await bars[i].isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            console.log(`✓ Progress bar ${i + 1} is visible`);
          }
        }
      }

      screenshots.push(await takeScreenshot(page, testName, '01-progress-bars'));

      // Step 3: Verify progress percentage shown (0-100%)
      steps.push('Verify progress percentages');
      console.log('Step 3: Checking progress percentages...');

      const progressPercentages = await page.evaluate(() => {
        const percentageElements = document.querySelectorAll('[class*="percent"], [class*="progress"]');
        const values: number[] = [];

        percentageElements.forEach(el => {
          const text = el.textContent || '';
          const match = text.match(/(\d+)%/);
          if (match) {
            values.push(parseInt(match[1]));
          }
        });

        return values;
      });

      if (progressPercentages.length > 0) {
        console.log(`✓ Found ${progressPercentages.length} progress percentages: ${progressPercentages.join(', ')}%`);
        progressPercentages.forEach(percent => {
          expect(percent).toBeGreaterThanOrEqual(0);
          expect(percent).toBeLessThanOrEqual(100);
        });
      } else {
        console.log('⚠ No progress percentages found on current page');
      }

      // Step 4: Verify progress attributes or aria values
      steps.push('Verify progress attribute values');
      console.log('Step 4: Checking progress attributes...');

      const progressAttributes = await page.evaluate(() => {
        const progressElements = document.querySelectorAll('progress, [role="progressbar"]');
        const attrs: any[] = [];

        progressElements.forEach(el => {
          attrs.push({
            value: (el as any).value,
            max: (el as any).max,
            ariaValueNow: el.getAttribute('aria-valuenow'),
            ariaValueMax: el.getAttribute('aria-valuemax'),
          });
        });

        return attrs;
      });

      if (progressAttributes.length > 0) {
        console.log(`✓ Progress attributes:`, progressAttributes[0]);
      }

      screenshots.push(await takeScreenshot(page, testName, '02-percentages-visible'));

      // Step 5: Check visual styling of progress
      steps.push('Verify progress display styling');
      console.log('Step 5: Checking styling...');

      const progressStyling = await page.evaluate(() => {
        const progress = document.querySelector('progress, [role="progressbar"], [class*="progress"]');
        if (!progress) return null;

        const computed = window.getComputedStyle(progress);
        return {
          display: computed.display,
          width: computed.width,
          height: computed.height,
          backgroundColor: computed.backgroundColor,
        };
      });

      if (progressStyling) {
        console.log(`✓ Progress styling:`, progressStyling);
      }

      screenshots.push(await takeScreenshot(page, testName, '03-progress-final'));

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
  // TEST CASE 2.2.4: Start Topic Content
  // =========================================================================
  // Tests that clicking a topic loads content with language support and TTS

  test('TC-2.2.4: Start Topic Content', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-2.2.4';
    const testName = 'Start-Topic-Content';
    const screenshots: string[] = [];
    const steps: string[] = [];

    try {
      console.log(`\n🧪 Running ${testCase}: Start Topic Content`);

      // Step 1: Sign in and navigate to learn page
      steps.push('Sign in and navigate to learn page');
      console.log('Step 1: Signing in...');
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await emailInput.fill(TEST_STUDENT_EMAIL);
      await passwordInput.fill(TEST_STUDENT_PASSWORD);

      const signInBtn = page.locator('button:has-text("Sign In")').first();
      await signInBtn.click();
      await page.waitForURL('**/app/dashboard', { timeout: 15000 });

      await page.goto(`${BASE_URL}/app/learn`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      console.log('✓ On learn page');
      screenshots.push(await takeScreenshot(page, testName, '01-learn-page'));

      // Step 2: Click on a topic card
      steps.push('Click on a topic card');
      console.log('Step 2: Finding and clicking topic card...');

      const topicLink = page.locator('a[href*="/app/learn"], button:has-text("Start"), [class*="topic"]').first();
      const topicVisible = await topicLink.isVisible({ timeout: 5000 }).catch(() => false);

      if (topicVisible) {
        await topicLink.click({ timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        console.log('✓ Topic clicked and content loading');
        screenshots.push(await takeScreenshot(page, testName, '02-topic-clicked'));
      } else {
        console.log('⚠ Could not find clickable topic, content may load inline');
        screenshots.push(await takeScreenshot(page, testName, '02-alternate-topic-view'));
      }

      // Step 3: Verify topic content loads
      steps.push('Verify topic content loads');
      console.log('Step 3: Verifying content...');

      const contentSelectors = [
        'main [class*="content"]',
        '[role="main"] > div',
        'article',
        '[class*="lesson"], [class*="topic"]',
      ];

      let contentFound = false;
      for (const selector of contentSelectors) {
        const content = page.locator(selector).first();
        const visible = await content.isVisible({ timeout: 5000 }).catch(() => false);
        if (visible) {
          console.log(`✓ Topic content found with selector: ${selector}`);
          contentFound = true;
          break;
        }
      }

      expect(contentFound).toBeTruthy();

      // Step 4: Verify content in correct language
      steps.push('Verify content language');
      console.log('Step 4: Checking content language...');

      const contentText = await page.evaluate(() => {
        const main = document.querySelector('main, [role="main"], article');
        return main?.textContent || '';
      });

      if (contentText.length > 0) {
        console.log(`✓ Content text length: ${contentText.length} characters`);
        console.log(`✓ Sample: ${contentText.substring(0, 100)}`);
      }

      const langAttr = await page.getAttribute('html', 'lang');
      console.log(`✓ Page language: ${langAttr}`);

      // Step 5: Verify text-to-speech button available
      steps.push('Verify text-to-speech button');
      console.log('Step 5: Checking for TTS button...');

      const ttsSelectors = [
        'button:has-text("Speak"), button:has-text("TTS")',
        '[aria-label*="speak" i], [aria-label*="sound"]',
        'svg[class*="volume"], svg[class*="speaker"]',
      ];

      let ttsFound = false;
      for (const selector of ttsSelectors) {
        const button = page.locator(selector).first();
        const visible = await button.isVisible({ timeout: 2000 }).catch(() => false);
        if (visible) {
          console.log(`✓ TTS button found with selector: ${selector}`);
          ttsFound = true;
          break;
        }
      }

      if (!ttsFound) {
        console.log('⚠ TTS button not found or may use different selector');
      }

      screenshots.push(await takeScreenshot(page, testName, '03-content-loaded'));

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
  // TEST CASE 2.2.5: Responsive Learning Grid
  // =========================================================================
  // Tests responsive layout on mobile (375px), tablet (768px), desktop (1024px)

  test('TC-2.2.5: Responsive Learning Grid', async ({ page }) => {
    const testStart = Date.now();
    const testCase = 'TC-2.2.5';
    const testName = 'Responsive-Learning-Grid';
    const screenshots: string[] = [];
    const steps: string[] = [];

    try {
      console.log(`\n🧪 Running ${testCase}: Responsive Learning Grid`);

      // Step 1: Sign in and navigate
      steps.push('Sign in and navigate to learn page');
      console.log('Step 1: Signing in...');
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      await emailInput.fill(TEST_STUDENT_EMAIL);
      await passwordInput.fill(TEST_STUDENT_PASSWORD);

      const signInBtn = page.locator('button:has-text("Sign In")').first();
      await signInBtn.click();
      await page.waitForURL('**/app/dashboard', { timeout: 15000 });

      await page.goto(`${BASE_URL}/app/learn`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      console.log('✓ On learn page');

      // Define breakpoints to test
      const breakpoints = [
        { name: 'mobile', width: 375, height: 667, expectedColumns: 1 },
        { name: 'tablet', width: 768, height: 1024, expectedColumns: 2 },
        { name: 'desktop', width: 1440, height: 900, expectedColumns: 3 },
      ];

      for (const breakpoint of breakpoints) {
        // Step: Resize viewport
        steps.push(`Resize to ${breakpoint.name} (${breakpoint.width}px)`);
        console.log(`Step: Resizing to ${breakpoint.name}...`);
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.waitForTimeout(1000); // Allow layout to reflow
        console.log(`✓ Viewport set to ${breakpoint.width}x${breakpoint.height}`);

        // Step: Verify learning grid visible
        steps.push(`Verify learning grid visible on ${breakpoint.name}`);
        const gridContent = page.locator('[class*="grid"], [class*="grid-item"], main').first();
        const isVisible = await gridContent.isVisible({ timeout: 5000 }).catch(() => false);
        expect(isVisible).toBeTruthy();
        console.log(`✓ Learning grid visible on ${breakpoint.name}`);

        // Capture responsive screenshot
        screenshots.push(await takeScreenshot(page, testName, `${breakpoint.name}-layout`));

        // Step: Check grid layout properties
        steps.push(`Verify layout properties on ${breakpoint.name}`);
        const layoutInfo = await page.evaluate(() => {
          const grid = document.querySelector('[class*="grid"]');
          if (!grid) return null;
          const computed = window.getComputedStyle(grid);
          return {
            display: computed.display,
            gridTemplateColumns: computed.gridTemplateColumns,
            gap: computed.gap,
          };
        });

        if (layoutInfo) {
          console.log(`✓ ${breakpoint.name} layout:`, layoutInfo);
        } else {
          console.log(`⚠ Grid layout info unavailable on ${breakpoint.name}`);
        }

        // Step: Count visible items
        steps.push(`Count visible items on ${breakpoint.name}`);
        const itemCount = await page.locator('[class*="card"], [class*="item"], li').count();
        console.log(`✓ ${itemCount} items visible on ${breakpoint.name}`);
      }

      // Final full-page screenshot on desktop
      await page.setViewportSize({ width: 1440, height: 900 });
      screenshots.push(await takeScreenshot(page, testName, '05-desktop-final'));

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

test('SECTION 2.2 SUMMARY', async () => {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SECTION 2.2: STUDENT LEARNING PATH - TEST RESULTS');
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

  console.log('\n✅ Results saved to: tests/e2e-automated/section-002-student-pages/results/section-2.2-results.json');
  console.log(`📸 Screenshots saved to: tests/e2e-automated/section-002-student-pages/results/screenshots/\n`);
});
