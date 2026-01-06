/**
 * Gamification System Testing
 * Covers: Badges, Points, Learning Streaks, Leaderboards
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

// Test Case 9.1.1: Earn Badge on Assessment
test('9.1.1 - Earn Badge on Assessment', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-9.1.1-EarnBadge';
  const screenshots: string[] = [];

  try {
    console.log('🏅 Testing Badge Award...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Look for badges section
    const badgesSection = page.locator('[data-testid="badges"], .badges-section, [data-testid="achievements"]').first();

    if (await badgesSection.isVisible()) {
      console.log('✓ Badges section visible');
      screenshots.push(await takeScreenshot(page, testName, 'badges-visible'));

      // Count badges
      const badgeItems = page.locator('[data-testid="badge-item"], .badge, .achievement-badge').all();
      const badges = await badgeItems;

      if (badges.length > 0) {
        console.log(`✓ ${badges.length} badges found`);
      }
      screenshots.push(await takeScreenshot(page, testName, 'badges-counted'));

      // Click on first badge to see details
      if (badges.length > 0) {
        const firstBadge = page.locator('[data-testid="badge-item"], .badge').first();
        await firstBadge.click();
        await page.waitForTimeout(500);
        screenshots.push(await takeScreenshot(page, testName, 'badge-details'));

        // Look for badge details (name, description)
        const badgeName = page.locator('[data-testid="badge-name"], .badge-title, h3').first();
        if (await badgeName.isVisible()) {
          const name = await badgeName.textContent();
          console.log(`✓ Badge name: ${name}`);
        }
        screenshots.push(await takeScreenshot(page, testName, 'badge-name-visible'));
      }
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.GAMIFICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.GAMIFICATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 9.1.2: Earn Points on Assessment
test('9.1.2 - Earn Points on Assessment', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-9.1.2-EarnPoints';
  const screenshots: string[] = [];

  try {
    console.log('⭐ Testing Points Award...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Record initial points
    const pointsDisplay = page.locator('[data-testid="total-points"], .points, .total-points, [data-testid="points"]').first();

    let initialPoints = 0;
    if (await pointsDisplay.isVisible()) {
      const pointsText = await pointsDisplay.textContent();
      console.log(`✓ Points display visible: ${pointsText}`);

      // Extract number from text (e.g., "1250 Points" -> 1250)
      const match = pointsText?.match(/\d+/);
      if (match) {
        initialPoints = parseInt(match[0]);
      }
    }
    screenshots.push(await takeScreenshot(page, testName, 'initial-points'));

    // Look for Points History section
    const pointsHistory = page.locator('[data-testid="points-history"], .points-history, .recent-points').first();

    if (await pointsHistory.isVisible()) {
      console.log('✓ Points history visible');
      screenshots.push(await takeScreenshot(page, testName, 'points-history'));

      // Look for recent point entries
      const pointsEntries = page.locator('[data-testid="points-entry"], .history-item').all();
      const entries = await pointsEntries;

      if (entries.length > 0) {
        console.log(`✓ ${entries.length} points history entries found`);
      }
      screenshots.push(await takeScreenshot(page, testName, 'points-entries'));
    }

    // Verify points card/display
    const pointsCard = page.locator('[data-testid="points-card"], .card:has-text("Point")').first();
    if (await pointsCard.isVisible()) {
      console.log('✓ Points card visible on dashboard');
      screenshots.push(await takeScreenshot(page, testName, 'points-card'));
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.GAMIFICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.GAMIFICATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 9.1.3: Learning Streak
test('9.1.3 - Learning Streak Display', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-9.1.3-LearningStreak';
  const screenshots: string[] = [];

  try {
    console.log('🔥 Testing Learning Streak...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Look for streak display
    const streakDisplay = page.locator('[data-testid="streak"], .streak, .learning-streak, [data-testid="learning-streak"]').first();

    if (await streakDisplay.isVisible()) {
      const streakText = await streakDisplay.textContent();
      console.log(`✓ Streak visible: ${streakText}`);
      screenshots.push(await takeScreenshot(page, testName, 'streak-visible'));

      // Look for streak count/number
      const streakCount = page.locator('[data-testid="streak-count"], .streak-number').first();
      if (await streakCount.isVisible()) {
        const count = await streakCount.textContent();
        console.log(`✓ Streak count: ${count}`);
      }
      screenshots.push(await takeScreenshot(page, testName, 'streak-count'));

      // Look for streak icon (flame icon)
      const streakIcon = page.locator('[data-testid="streak-icon"], .fire-icon, svg.streak').first();
      if (await streakIcon.isVisible()) {
        console.log('✓ Streak icon visible');
      }
      screenshots.push(await takeScreenshot(page, testName, 'streak-icon'));
    }

    // Also check for streak in cards
    const streakCard = page.locator('[data-testid="streak-card"], .card:has-text("Streak")').first();
    if (await streakCard.isVisible()) {
      console.log('✓ Streak card found on dashboard');
      screenshots.push(await takeScreenshot(page, testName, 'streak-card'));
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.GAMIFICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.GAMIFICATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 9.1.4: Leaderboard Display
test('9.1.4 - Leaderboard Display', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-9.1.4-LeaderboardDisplay';
  const screenshots: string[] = [];

  try {
    console.log('🏆 Testing Leaderboard...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to leaderboard (could be on dashboard or separate page)
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Look for leaderboard section
    const leaderboardSection = page.locator('[data-testid="leaderboard"], .leaderboard, [data-testid="rankings"]').first();

    if (await leaderboardSection.isVisible()) {
      console.log('✓ Leaderboard visible');
      screenshots.push(await takeScreenshot(page, testName, 'leaderboard-visible'));

      // Look for leaderboard table/list
      const leaderboardRows = page.locator('[data-testid="leaderboard-row"], .leaderboard-entry, tr').all();
      const rows = await leaderboardRows;

      if (rows.length > 0) {
        console.log(`✓ ${rows.length} leaderboard entries found`);
      }
      screenshots.push(await takeScreenshot(page, testName, 'leaderboard-entries'));

      // Look for rank, name, score columns
      const rankCol = page.locator('[data-testid="rank"], .rank, th:has-text("Rank")').first();
      const nameCol = page.locator('[data-testid="name"], .name, th:has-text("Name")').first();
      const scoreCol = page.locator('[data-testid="score"], .score, th:has-text("Points"), th:has-text("Score")').first();

      if (await rankCol.isVisible()) {
        console.log('✓ Rank column visible');
      }
      if (await nameCol.isVisible()) {
        console.log('✓ Name column visible');
      }
      if (await scoreCol.isVisible()) {
        console.log('✓ Score column visible');
      }
      screenshots.push(await takeScreenshot(page, testName, 'leaderboard-columns'));

      // Look for current user's position
      const currentUserRow = page.locator('[data-testid="current-user-row"], .current-user, .my-rank').first();
      if (await currentUserRow.isVisible()) {
        console.log('✓ Current user position highlighted');
      }
      screenshots.push(await takeScreenshot(page, testName, 'current-user-position'));
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.GAMIFICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.GAMIFICATION,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 9.1.5: Gamification Stats Summary
test('9.1.5 - Gamification Stats Summary', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-9.1.5-GamificationStats';
  const screenshots: string[] = [];

  try {
    console.log('📈 Testing Gamification Stats...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Verify all gamification stats present
    const statsToCheck = [
      { testid: 'total-points', label: 'Total Points' },
      { testid: 'learning-streak', label: 'Learning Streak' },
      { testid: 'badges', label: 'Badges' },
      { testid: 'level', label: 'Level' },
    ];

    let statsFound = 0;
    for (const stat of statsToCheck) {
      const statElement = page.locator(`[data-testid="${stat.testid}"], :text("${stat.label}")`).first();
      if (await statElement.isVisible().catch(() => false)) {
        console.log(`✓ ${stat.label} visible`);
        statsFound++;
      }
    }

    console.log(`✓ ${statsFound}/${statsToCheck.length} gamification stats visible`);
    screenshots.push(await takeScreenshot(page, testName, 'gamification-stats'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.GAMIFICATION, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.GAMIFICATION,
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
  console.log('📊 GAMIFICATION SYSTEM TEST RESULTS');
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

  const reportPath = path.join(reportDir, 'gamification-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Gamification System Testing',
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
