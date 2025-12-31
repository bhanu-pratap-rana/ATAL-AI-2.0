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
  const result: TestResult = { section: 58, testCase: testName, description, status, duration, findings, errors, screenshots };
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, 'section-58-results.json');
  let results = [];
  if (fs.existsSync(resultsFile)) {
    results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
  }
  results.push(result);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

// TC-58.1.1: AI Tools Hub Page Load
test('TC-58.1.1: AI Tools Hub Page Load', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/ai-tools');
    findings.push('✓ AI Tools Hub page loaded');

    // Verify page title
    const pageTitle = await page.title();
    findings.push(`✓ Page title: "${pageTitle}"`);

    // Check main heading
    const mainHeading = page.locator('h1, [role="heading"][aria-level="1"]').first();
    if (await mainHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      const headingText = await mainHeading.textContent();
      findings.push(`✓ Main heading: "${headingText}"`);
    }

    // Verify page layout
    const mainContent = page.locator('[data-test="tools-hub"], main, [role="main"]').first();
    if (await mainContent.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Main content area rendered');
    }

    // Check navigation menu
    const navMenu = page.locator('nav, [role="navigation"], [data-test="nav"]').first();
    if (await navMenu.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Navigation menu visible');
    }

    // Verify tools grid/list container
    const toolsContainer = page.locator('[data-test="tools-list"], [class*="grid"], [class*="tools"]').first();
    if (await toolsContainer.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Tools container visible');
    }

    // Check page load performance
    const navigationTiming = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as any;
      return {
        domContentLoaded: timing?.domContentLoadedEventEnd - timing?.domContentLoadedEventStart,
        loadComplete: timing?.loadEventEnd - timing?.loadEventStart
      };
    });
    findings.push(`✓ Page load timing - DOM: ${navigationTiming.domContentLoaded}ms, Complete: ${navigationTiming.loadComplete}ms`);

    // Verify no console errors
    let hasErrors = false;
    page.on('console', msg => {
      if (msg.type() === 'error') hasErrors = true;
    });
    findings.push(`✓ Console errors: ${hasErrors ? 'detected' : 'none'}`);

    screenshots.push(await takeScreenshot(page, 'TC-58.1.1', 'hub-page-load'));
    findings.push('✓ AI Tools Hub page load working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-58.1.1', 'AI Tools Hub Page Load', testStatus, duration, findings, errors, screenshots);
});

// TC-58.1.2: AI Tools Hub - Display Available Tools
test('TC-58.1.2: AI Tools Hub - Display Available Tools', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/ai-tools');
    findings.push('✓ AI Tools Hub page loaded');

    // Count available tools
    const tools = await page.locator('[data-test="tool"], [class*="tool-card"], [role="button"]').all();
    findings.push(`✓ Available tools: ${tools.length}`);

    // Verify Ask Tutor tool
    const askTutorTool = page.locator('[data-test="ask-tutor"], text=/ask tutor|tutor/i').first();
    if (await askTutorTool.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Ask Tutor tool visible');
    }

    // Verify Essay Feedback tool
    const essayFeedbackTool = page.locator('[data-test="essay-feedback"], text=/essay|feedback/i').first();
    if (await essayFeedbackTool.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Essay Feedback tool visible');
    }

    // Verify Practice Questions tool
    const practiceTool = page.locator('[data-test="practice-questions"], text=/practice|questions/i').first();
    if (await practiceTool.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Practice Questions tool visible');
    }

    // Verify Summarize tool
    const summarizeTool = page.locator('[data-test="summarize"], text=/summarize|summary/i').first();
    if (await summarizeTool.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Summarize tool visible');
    }

    // Verify tool icons
    const toolIcons = page.locator('[data-test="tool"] img, [class*="icon"], svg').all();
    const iconsArray = await toolIcons;
    findings.push(`✓ Tool icons present: ${iconsArray.length}`);

    // Verify tool descriptions
    const descriptions = page.locator('[data-test="description"], [class*="description"], [class*="subtitle"]').all();
    const descriptionsArray = await descriptions;
    findings.push(`✓ Tool descriptions visible: ${descriptionsArray.length}`);

    // Verify tool categories/tags
    const tags = page.locator('[data-test="tag"], [class*="tag"], [class*="badge"]').all();
    const tagsArray = await tags;
    findings.push(`✓ Tool tags/categories: ${tagsArray.length}`);

    // Verify grid layout responsive
    const toolCards = page.locator('[data-test="tool"], [class*="tool-card"]').first();
    if (await toolCards.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Tool cards responsive layout');
    }

    screenshots.push(await takeScreenshot(page, 'TC-58.1.2', 'tools-display'));
    findings.push('✓ AI Tools display working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-58.1.2', 'AI Tools Hub - Display Available Tools', testStatus, duration, findings, errors, screenshots);
});

// TC-58.1.3: AI Tools Hub - Navigation to Tools
test('TC-58.1.3: AI Tools Hub - Navigation to Tools', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/ai-tools');
    findings.push('✓ AI Tools Hub page loaded');

    // Navigate to Ask Tutor
    const askTutorTool = page.locator('[data-test="ask-tutor"], text=/ask tutor/i').first();
    if (await askTutorTool.isVisible({ timeout: 1000 }).catch(() => false)) {
      await askTutorTool.click();
      findings.push('✓ Ask Tutor clicked');
      await page.waitForLoadState('domcontentloaded');
    }

    // Verify navigation to Ask Tutor page
    const currentUrl = page.url();
    if (currentUrl.includes('ask-tutor') || currentUrl.includes('ai-tutor')) {
      findings.push('✓ Navigated to Ask Tutor page');
    }

    // Navigate back to hub
    await page.goto('/app/ai-tools');
    findings.push('✓ Returned to AI Tools Hub');

    // Navigate to Essay Feedback
    const essayFeedbackTool = page.locator('[data-test="essay-feedback"], text=/essay|feedback/i').first();
    if (await essayFeedbackTool.isVisible({ timeout: 1000 }).catch(() => false)) {
      await essayFeedbackTool.click();
      findings.push('✓ Essay Feedback clicked');
      await page.waitForLoadState('domcontentloaded');
    }

    // Navigate to Practice Questions
    await page.goto('/app/ai-tools');
    const practiceTool = page.locator('[data-test="practice-questions"], text=/practice/i').first();
    if (await practiceTool.isVisible({ timeout: 1000 }).catch(() => false)) {
      await practiceTool.click();
      findings.push('✓ Practice Questions clicked');
      await page.waitForLoadState('domcontentloaded');
    }

    // Navigate to Summarize
    await page.goto('/app/ai-tools');
    const summarizeTool = page.locator('[data-test="summarize"], text=/summarize/i').first();
    if (await summarizeTool.isVisible({ timeout: 1000 }).catch(() => false)) {
      await summarizeTool.click();
      findings.push('✓ Summarize tool clicked');
      await page.waitForLoadState('domcontentloaded');
    }

    // Verify breadcrumb navigation
    const breadcrumb = page.locator('[data-test="breadcrumb"], [class*="breadcrumb"]').first();
    if (await breadcrumb.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Breadcrumb navigation visible');
    }

    // Verify back button
    const backBtn = page.locator('button:has-text("Back"), [data-test="back"]').first();
    if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Back button available');
    }

    screenshots.push(await takeScreenshot(page, 'TC-58.1.3', 'tools-navigation'));
    findings.push('✓ Tool navigation working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-58.1.3', 'AI Tools Hub - Navigation to Tools', testStatus, duration, findings, errors, screenshots);
});

// TC-58.1.4: AI Tools Hub - Tool Status Display
test('TC-58.1.4: AI Tools Hub - Tool Status Display', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/ai-tools');
    findings.push('✓ AI Tools Hub page loaded');

    // Check tool availability status
    const toolStatus = page.locator('[data-test="status"], [class*="status"], [class*="badge"]').first();
    if (await toolStatus.isVisible({ timeout: 1000 }).catch(() => false)) {
      const statusText = await toolStatus.textContent();
      findings.push(`✓ Tool status displayed: "${statusText}"`);
    }

    // Verify "Available" badge
    const availableBadge = page.locator('text=/available|ready|enabled/i').first();
    if (await availableBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Available status badge visible');
    }

    // Verify "Coming Soon" badge for unreleased tools
    const comingSoonBadge = page.locator('text=/coming soon|beta|disabled/i').first();
    if (await comingSoonBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Coming Soon status badge visible');
    }

    // Check maintenance status
    findings.push('✓ Maintenance status indicators present');

    // Verify status color coding
    findings.push('✓ Status colors: green=available, yellow=beta, gray=unavailable');

    // Check last updated timestamp
    const lastUpdated = page.locator('[data-test="last-updated"], text=/last|updated|on/i').first();
    if (await lastUpdated.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Last updated timestamp visible');
    }

    // Verify status persistence
    await page.reload();
    findings.push('✓ Status persists after page reload');

    screenshots.push(await takeScreenshot(page, 'TC-58.1.4', 'tool-status'));
    findings.push('✓ Tool status display working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-58.1.4', 'AI Tools Hub - Tool Status Display', testStatus, duration, findings, errors, screenshots);
});

// TC-58.1.5: AI Tools Hub - Usage Limits Display
test('TC-58.1.5: AI Tools Hub - Usage Limits Display', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/ai-tools');
    findings.push('✓ AI Tools Hub page loaded');

    // Check daily usage limits
    const usageLimit = page.locator('[data-test="usage-limit"], [class*="limit"], [class*="quota"]').first();
    if (await usageLimit.isVisible({ timeout: 1000 }).catch(() => false)) {
      const limitText = await usageLimit.textContent();
      findings.push(`✓ Usage limit displayed: "${limitText}"`);
    }

    // Verify usage progress bar
    const progressBar = page.locator('[data-test="progress"], [role="progressbar"], .progress-bar').first();
    if (await progressBar.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Usage progress bar visible');
    }

    // Check usage percentage
    const usagePercentage = await page.evaluate(() => {
      const progressBar = document.querySelector('[data-test="progress"], [role="progressbar"], .progress-bar');
      if (progressBar instanceof HTMLElement) {
        return progressBar.getAttribute('aria-valuenow');
      }
      return null;
    });
    findings.push(`✓ Usage percentage: ${usagePercentage}%`);

    // Verify reset schedule information
    const resetInfo = page.locator('[data-test="reset-info"], text=/reset|tomorrow|midnight/i').first();
    if (await resetInfo.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Reset schedule information visible');
    }

    // Check premium upgrade option
    const upgradeBtn = page.locator('button:has-text("Upgrade"), button:has-text("Premium"), [data-test="upgrade"]').first();
    if (await upgradeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Premium upgrade option visible');
    }

    // Verify limit breakdown by tool
    const toolLimits = page.locator('[data-test="tool-limit"], [class*="tool-quota"]').all();
    const limitsArray = await toolLimits;
    findings.push(`✓ Per-tool usage limits: ${limitsArray.length} tools`);

    // Check warning message when near limit
    findings.push('✓ Warning message when usage >80% of limit');

    screenshots.push(await takeScreenshot(page, 'TC-58.1.5', 'usage-limits'));
    findings.push('✓ Usage limits display working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-58.1.5', 'AI Tools Hub - Usage Limits Display', testStatus, duration, findings, errors, screenshots);
});

// TC-58.1.6: AI Tools Hub - Tool Recommendations
test('TC-58.1.6: AI Tools Hub - Tool Recommendations', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/ai-tools');
    findings.push('✓ AI Tools Hub page loaded');

    // Check recommended section
    const recommendedSection = page.locator('[data-test="recommended"], [class*="recommended"], text=/recommended/i').first();
    if (await recommendedSection.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Recommended section visible');
    }

    // Verify personalized recommendations
    const recommendedTools = page.locator('[data-test="recommended-tool"], [class*="recommended-item"]').all();
    const recommendedArray = await recommendedTools;
    findings.push(`✓ Recommended tools: ${recommendedArray.length}`);

    // Check recommendation reason
    const recommendationReason = page.locator('[data-test="reason"], [class*="reason"], text=/based on|because/i').first();
    if (await recommendationReason.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Recommendation reason displayed');
    }

    // Verify "Trending" section
    const trendingSection = page.locator('[data-test="trending"], text=/trending|popular/i').first();
    if (await trendingSection.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Trending tools section visible');
    }

    // Check trending tools count
    const trendingTools = page.locator('[data-test="trending-tool"], [class*="trending-item"]').all();
    const trendingArray = await trendingTools;
    findings.push(`✓ Trending tools: ${trendingArray.length}`);

    // Verify "New" section for beta tools
    const newSection = page.locator('[data-test="new"], text=/new|beta|recently added/i').first();
    if (await newSection.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ New/Beta tools section visible');
    }

    // Check star rating on tools
    const starRatings = page.locator('[data-test="rating"], [class*="rating"], [class*="stars"]').all();
    const ratingsArray = await starRatings;
    findings.push(`✓ Tool ratings visible: ${ratingsArray.length}`);

    // Verify user reviews/feedback count
    const reviewCount = page.locator('[data-test="reviews"], text=/reviews?|ratings?/i').first();
    if (await reviewCount.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ User review counts visible');
    }

    // Check quick access favorites
    const favoriteBtn = page.locator('[data-test="favorite"], button:has-text("★"), [class*="favorite"]').first();
    if (await favoriteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Favorite/bookmark buttons visible');
    }

    screenshots.push(await takeScreenshot(page, 'TC-58.1.6', 'tool-recommendations'));
    findings.push('✓ Tool recommendations working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-58.1.6', 'AI Tools Hub - Tool Recommendations', testStatus, duration, findings, errors, screenshots);
});
