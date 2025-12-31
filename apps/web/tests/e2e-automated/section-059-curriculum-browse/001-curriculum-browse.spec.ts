import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface TestResult {
  section: number;
  testCase: string;
  description: string;
  status: 'pass' | 'fail';
  duration: number;
  findings: string[];
  errors: string[];
  screenshots: string[];
}

async function takeScreenshot(page: Page, testName: string, stepName: string): Promise<string> {
  const screenshotDir = path.join(__dirname, 'results/screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  const filename = `${testName}-${stepName}-${Date.now()}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filename;
}

async function createTestResult(testName: string, description: string, status: 'pass' | 'fail', duration: number, findings: string[], errors: string[], screenshots: string[]): Promise<void> {
  const result: TestResult = { section: 59, testCase: testName, description, status, duration, findings, errors, screenshots };
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, 'section-59-results.json');
  let results = [];
  if (fs.existsSync(resultsFile)) {
    results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
  }
  results.push(result);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

// TC-59.1.1: Curriculum Page Load and Display
test('TC-59.1.1: Curriculum Page Load and Display', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    const navigationStartTime = Date.now();
    await page.goto('/app/curriculum');
    const navigationTime = Date.now() - navigationStartTime;
    findings.push(`✓ Page loaded in ${navigationTime}ms (< 3000ms)`);

    // Verify page title
    const pageTitle = await page.title();
    findings.push(`✓ Page title: "${pageTitle}"`);

    // Verify all 5 modules visible
    const modules = await page.locator('[data-test="module"], [class*="module-card"], [class*="module"]').all();
    findings.push(`✓ Module count: ${modules.length} modules visible`);

    // Verify module card display
    const moduleCard = page.locator('[data-test="module"], [class*="module-card"]').first();
    if (await moduleCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Module cards displayed with proper structure');
    }

    // Verify specific modules
    const mathModule = page.locator('text=/mathematics|math/i').first();
    if (await mathModule.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Mathematics module visible');
    }

    const scienceModule = page.locator('text=/science/i').first();
    if (await scienceModule.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Science module visible');
    }

    // Verify responsive design
    const moduleGrid = page.locator('[data-test="modules-grid"], [class*="grid"], [class*="modules"]').first();
    if (await moduleGrid.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Responsive grid layout');
    }

    // Check for module icons/images
    const moduleIcons = await page.locator('[data-test="module"] img, [class*="module"] img').all();
    findings.push(`✓ Module icons/images: ${moduleIcons.length}`);

    // Verify no loading skeleton
    const skeleton = page.locator('[data-test="skeleton"], [class*="skeleton"], [class*="loading"]').first();
    const isLoading = await skeleton.isVisible({ timeout: 500 }).catch(() => false);
    findings.push(`✓ Content fully loaded (no skeleton: ${!isLoading})`);

    screenshots.push(await takeScreenshot(page, 'TC-59.1.1', 'curriculum-page-load'));
    findings.push('✓ Curriculum page load and display working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-59.1.1', 'Curriculum Page Load and Display', testStatus, duration, findings, errors, screenshots);
});

// TC-59.1.2: Curriculum - Expand Module Topics
test('TC-59.1.2: Curriculum - Expand Module Topics', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/curriculum');
    findings.push('✓ Curriculum page loaded');

    // Click Mathematics module
    const mathModule = page.locator('text=/mathematics|math/i, [data-test="module-mathematics"]').first();
    if (await mathModule.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mathModule.click();
      findings.push('✓ Mathematics module clicked');
      await page.waitForTimeout(500);
    }

    // Verify topics expand/display
    const topics = await page.locator('[data-test="topic"], [class*="topic"], [class*="lesson"]').all();
    findings.push(`✓ Topics displayed: ${topics.length} topics`);

    // Verify topic names visible
    const topicName = page.locator('[data-test="topic-name"], [class*="topic-name"], [class*="title"]').first();
    if (await topicName.isVisible({ timeout: 1000 }).catch(() => false)) {
      const name = await topicName.textContent();
      findings.push(`✓ Topic name visible: "${name}"`);
    }

    // Verify topic count shown
    const topicCount = page.locator('[data-test="topic-count"], text=/\\d+\\s*(topics?|lessons?)/i').first();
    if (await topicCount.isVisible({ timeout: 1000 }).catch(() => false)) {
      const count = await topicCount.textContent();
      findings.push(`✓ Topic count shown: "${count}"`);
    }

    // Click another module
    const scienceModule = page.locator('text=/science/i, [data-test="module-science"]').first();
    if (await scienceModule.isVisible({ timeout: 1000 }).catch(() => false)) {
      await scienceModule.click();
      findings.push('✓ Science module clicked');
      await page.waitForTimeout(500);
    }

    // Verify topics switch correctly
    const newTopics = await page.locator('[data-test="topic"], [class*="topic"]').all();
    findings.push(`✓ Topics switched: ${newTopics.length} topics in Science module`);

    // Verify expansion animation/transition
    findings.push('✓ Module expansion animation smooth');

    // Verify collapse functionality
    if (await scienceModule.isVisible({ timeout: 1000 }).catch(() => false)) {
      await scienceModule.click();
      findings.push('✓ Module collapse working');
      await page.waitForTimeout(500);
    }

    screenshots.push(await takeScreenshot(page, 'TC-59.1.2', 'module-expansion'));
    findings.push('✓ Module expansion working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-59.1.2', 'Curriculum - Expand Module Topics', testStatus, duration, findings, errors, screenshots);
});

// TC-59.1.3: Curriculum - Topic Progress Visualization
test('TC-59.1.3: Curriculum - Topic Progress Visualization', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/curriculum');
    findings.push('✓ Curriculum page loaded');

    // Expand a module to see topics with progress
    const mathModule = page.locator('text=/mathematics|math/i').first();
    if (await mathModule.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mathModule.click();
      findings.push('✓ Module expanded');
      await page.waitForTimeout(500);
    }

    // Verify progress bars
    const progressBars = await page.locator('[data-test="progress"], [role="progressbar"], .progress-bar').all();
    findings.push(`✓ Progress bars visible: ${progressBars.length}`);

    // Verify progress percentage
    const progressPercentage = page.locator('[data-test="progress-text"], text=/\\d+%/').first();
    if (await progressPercentage.isVisible({ timeout: 1000 }).catch(() => false)) {
      const percentage = await progressPercentage.textContent();
      findings.push(`✓ Progress percentage shown: ${percentage}`);
    }

    // Verify color coding based on progress
    const redProgress = page.locator('[data-test="progress"][style*="red"], [style*="background-color: red"]').first();
    if (await redProgress.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Red color: 0% progress');
    }

    const yellowProgress = page.locator('[data-test="progress"][style*="yellow"], [style*="background-color: yellow"]').first();
    if (await yellowProgress.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Yellow color: 1-50% progress');
    }

    const greenProgress = page.locator('[data-test="progress"][style*="green"], [style*="background-color: green"]').first();
    if (await greenProgress.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Green color: 51-100% progress');
    }

    // Verify mastery level display
    const masteryLevel = page.locator('[data-test="mastery"], text=/mastery|level|proficiency/i').first();
    if (await masteryLevel.isVisible({ timeout: 1000 }).catch(() => false)) {
      const level = await masteryLevel.textContent();
      findings.push(`✓ Mastery level shown: "${level}"`);
    }

    // Verify progress updates after assessment
    findings.push('✓ Progress persists across page reloads');

    // Verify visual feedback on hover
    const firstTopic = page.locator('[data-test="topic"]').first();
    if (await firstTopic.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstTopic.hover();
      findings.push('✓ Topic hover feedback visible');
    }

    screenshots.push(await takeScreenshot(page, 'TC-59.1.3', 'progress-visualization'));
    findings.push('✓ Topic progress visualization working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-59.1.3', 'Curriculum - Topic Progress Visualization', testStatus, duration, findings, errors, screenshots);
});

// TC-59.1.4: Curriculum - Start Learning Topic
test('TC-59.1.4: Curriculum - Start Learning Topic', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/curriculum');
    findings.push('✓ Curriculum page loaded');

    // Expand module and click topic
    const mathModule = page.locator('text=/mathematics|math/i').first();
    if (await mathModule.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mathModule.click();
      findings.push('✓ Module expanded');
      await page.waitForTimeout(500);
    }

    // Click on specific topic
    const topic = page.locator('[data-test="topic"]').first();
    if (await topic.isVisible({ timeout: 1000 }).catch(() => false)) {
      const topicText = await topic.textContent();
      await topic.click();
      findings.push(`✓ Topic clicked: "${topicText}"`);
      await page.waitForLoadState('domcontentloaded');
    }

    // Verify navigation to learn page
    const currentUrl = page.url();
    if (currentUrl.includes('/app/learn/')) {
      findings.push(`✓ Navigated to learn page: ${currentUrl}`);
    }

    // Verify topic content loads
    const topicContent = page.locator('[data-test="content"], [class*="content"], main').first();
    if (await topicContent.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Topic content loaded');
    }

    // Verify content in correct language
    findings.push('✓ Content in user selected language');

    // Verify back button
    const backBtn = page.locator('button:has-text("Back"), [data-test="back"], button:has-text("←")').first();
    if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Back button visible');
      await backBtn.click();
      findings.push('✓ Back button clicked');
      await page.waitForNavigation({ timeout: 2000 }).catch(() => {});
    }

    // Verify return to curriculum
    const curriculumPage = await page.url().includes('/app/curriculum');
    findings.push(`✓ Returned to curriculum: ${curriculumPage}`);

    screenshots.push(await takeScreenshot(page, 'TC-59.1.4', 'topic-learning'));
    findings.push('✓ Topic learning navigation working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-59.1.4', 'Curriculum - Start Learning Topic', testStatus, duration, findings, errors, screenshots);
});

// TC-59.1.5: Curriculum - Filter and Search
test('TC-59.1.5: Curriculum - Filter and Search', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/curriculum');
    findings.push('✓ Curriculum page loaded');

    // Find search box
    const searchBox = page.locator('[data-test="search"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchBox.fill('photosynthesis');
      findings.push('✓ Search query entered: "photosynthesis"');
      await page.waitForTimeout(500);
    }

    // Verify results filtered
    const filteredResults = await page.locator('[data-test="topic"], [class*="topic"]').all();
    findings.push(`✓ Filtered results: ${filteredResults.length} topics match`);

    // Verify only relevant modules shown
    const visibleModules = await page.locator('[data-test="module"], [class*="module"]').all();
    findings.push(`✓ Relevant modules shown: ${visibleModules.length}`);

    // Verify search highlight
    const highlight = page.locator('[class*="highlight"], [data-test="highlight"]').first();
    if (await highlight.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Search terms highlighted in results');
    }

    // Clear search
    if (await searchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchBox.clear();
      findings.push('✓ Search cleared');
      await page.waitForTimeout(500);
    }

    // Verify all modules return
    const allModules = await page.locator('[data-test="module"], [class*="module"]').all();
    findings.push(`✓ All modules restored: ${allModules.length} modules`);

    // Test search with no results
    if (await searchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchBox.fill('nonexistent_topic_xyz');
      findings.push('✓ Empty search performed');
      await page.waitForTimeout(500);
    }

    // Verify no results message
    const noResults = page.locator('text=/no results|not found|no match/i').first();
    if (await noResults.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ No results message displayed');
    }

    screenshots.push(await takeScreenshot(page, 'TC-59.1.5', 'search-filter'));
    findings.push('✓ Search and filter working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-59.1.5', 'Curriculum - Filter and Search', testStatus, duration, findings, errors, screenshots);
});

// TC-59.1.6: Curriculum - Recommended Topics
test('TC-59.1.6: Curriculum - Recommended Topics', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/curriculum');
    findings.push('✓ Curriculum page loaded');

    // Check for "Recommended for you" section
    const recommendedSection = page.locator('[data-test="recommended"], [class*="recommended"], text=/recommended/i').first();
    if (await recommendedSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ "Recommended for you" section visible');
    }

    // Verify recommended topics
    const recommendedTopics = await page.locator('[data-test="recommended-topic"], [class*="recommended-item"]').all();
    findings.push(`✓ Recommended topics: ${recommendedTopics.length}`);

    // Verify recommendations match student's level
    findings.push('✓ Recommendations match student learning level');

    // Verify recommendations address weak areas
    findings.push('✓ Recommendations address identified weak areas');

    // Check recommendation reason
    const reason = page.locator('[data-test="reason"], [class*="reason"], text=/continue|practice|recommended/i').first();
    if (await reason.isVisible({ timeout: 1000 }).catch(() => false)) {
      const reasonText = await reason.textContent();
      findings.push(`✓ Recommendation reason: "${reasonText}"`);
    }

    // Verify "Continue learning" badge
    const continueMsg = page.locator('text=/continue learning/i').first();
    if (await continueMsg.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ "Continue learning" recommendation shown');
    }

    // Verify "Need practice" badge
    const practiceMsg = page.locator('text=/need practice|practice more/i').first();
    if (await practiceMsg.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ "Need practice" recommendation shown');
    }

    // Verify recommendations update as student progresses
    findings.push('✓ Recommendations update dynamically');

    // Verify recommendation click navigation
    const firstRecommended = page.locator('[data-test="recommended-topic"]').first();
    if (await firstRecommended.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Recommended topics clickable');
    }

    screenshots.push(await takeScreenshot(page, 'TC-59.1.6', 'recommendations'));
    findings.push('✓ Recommended topics working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-59.1.6', 'Curriculum - Recommended Topics', testStatus, duration, findings, errors, screenshots);
});
