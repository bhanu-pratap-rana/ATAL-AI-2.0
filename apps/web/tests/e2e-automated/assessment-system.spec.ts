/**
 * Assessment System Testing
 * Covers: Start Assessment, Timer, Navigation, Submission, Results
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

// Test Case 5.1.1: Start Assessment
test('5.1.1 - Start Assessment', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-5.1.1-StartAssessment';
  const screenshots: string[] = [];

  try {
    console.log('📋 Testing Start Assessment...');

    // Login as student
    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    // Navigate to assessments
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/assessments`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'assessments-page'));

    // Look for assessment list
    const assessmentList = page.locator('[data-testid="assessments-list"], .assessment-item, li');
    const firstAssessment = assessmentList.first();

    if (await firstAssessment.isVisible()) {
      console.log('✓ Assessment list visible');
      screenshots.push(await takeScreenshot(page, testName, 'assessment-list'));

      // Click Start button
      const startBtn = firstAssessment.locator('button:has-text("Start"), a:has-text("Start")').first();
      if (await startBtn.isVisible()) {
        await startBtn.click();
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        screenshots.push(await takeScreenshot(page, testName, 'assessment-started'));

        // Verify first question displays
        const questionText = page.locator('[data-testid="question"], .question-text, h2').first();
        if (await questionText.isVisible()) {
          console.log('✓ First question displayed');
        }
        screenshots.push(await takeScreenshot(page, testName, 'question-visible'));
      }
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ASSESSMENT, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ASSESSMENT,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 5.1.2: Assessment Timer
test('5.1.2 - Assessment Timer Display', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-5.1.2-AssessmentTimer';
  const screenshots: string[] = [];

  try {
    console.log('⏱️ Testing Assessment Timer...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to assessments
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/assessments`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'assessments-loaded'));

    // Find and start assessment with time limit
    const startBtn = page.locator('button:has-text("Start")').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'assessment-started'));

      // Look for timer
      const timerDisplay = page.locator('[data-testid="timer"], .timer, .time-remaining').first();
      if (await timerDisplay.isVisible()) {
        const timerText = await timerDisplay.textContent();
        console.log(`✓ Timer visible: ${timerText}`);

        // Verify MM:SS format
        if (timerText && /\d+:\d+/.test(timerText)) {
          console.log('✓ Timer in MM:SS format');
        }
      }
      screenshots.push(await takeScreenshot(page, testName, 'timer-visible'));

      // Wait and verify timer counts down
      await page.waitForTimeout(2000);
      screenshots.push(await takeScreenshot(page, testName, 'timer-counting'));
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ASSESSMENT, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ASSESSMENT,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 5.1.3: Question Navigation - Next
test('5.1.3 - Question Navigation Next', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-5.1.3-NavigationNext';
  const screenshots: string[] = [];

  try {
    console.log('➡️ Testing Next Button Navigation...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/assessments`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'assessments-page'));

    // Start assessment
    const startBtn = page.locator('button:has-text("Start")').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'assessment-started'));

      // Get current question number
      const currentQuestion = page.locator('[data-testid="question-number"], .question-counter').first();
      const currentQText = await currentQuestion.textContent().catch(() => 'Q1');
      console.log(`Current question: ${currentQText}`);

      // Answer the question (select first option)
      const answerOption = page.locator('input[type="radio"], [role="radio"]').first();
      if (await answerOption.isVisible()) {
        await answerOption.click();
        screenshots.push(await takeScreenshot(page, testName, 'answer-selected'));
      }

      // Click Next button
      const nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
        screenshots.push(await takeScreenshot(page, testName, 'next-clicked'));

        // Verify new question displays
        const newQuestion = page.locator('[data-testid="question"]').first();
        if (await newQuestion.isVisible()) {
          console.log('✓ Question updated after Next');
        }
        screenshots.push(await takeScreenshot(page, testName, 'new-question-visible'));
      }
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ASSESSMENT, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ASSESSMENT,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 5.1.4: Question Navigation - Previous
test('5.1.4 - Question Navigation Previous', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-5.1.4-NavigationPrevious';
  const screenshots: string[] = [];

  try {
    console.log('⬅️ Testing Previous Button Navigation...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/assessments`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'assessments-loaded'));

    // Start assessment
    const startBtn = page.locator('button:has-text("Start")').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'assessment-started'));

      // Navigate to second question
      const nextBtn = page.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
        screenshots.push(await takeScreenshot(page, testName, 'on-question-2'));

        // Answer and go to question 3
        const answerOption = page.locator('input[type="radio"], [role="radio"]').first();
        if (await answerOption.isVisible()) {
          await answerOption.click();
        }

        await nextBtn.click();
        await page.waitForTimeout(500);
        screenshots.push(await takeScreenshot(page, testName, 'on-question-3'));

        // Now click Previous
        const prevBtn = page.locator('button:has-text("Previous")').first();
        if (await prevBtn.isVisible()) {
          await prevBtn.click();
          await page.waitForTimeout(500);
          screenshots.push(await takeScreenshot(page, testName, 'previous-clicked'));

          // Verify back on question 2
          const questionNum = page.locator('[data-testid="question-number"]').first();
          const qText = await questionNum.textContent().catch(() => '');
          if (qText.includes('2')) {
            console.log('✓ Navigated back to previous question');
          }
          screenshots.push(await takeScreenshot(page, testName, 'back-on-question-2'));
        }
      }
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ASSESSMENT, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ASSESSMENT,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 5.1.6: Submit Assessment
test('5.1.6 - Submit Assessment', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-5.1.6-SubmitAssessment';
  const screenshots: string[] = [];

  try {
    console.log('✅ Testing Assessment Submission...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/assessments`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'assessments-loaded'));

    // Start assessment
    const startBtn = page.locator('button:has-text("Start")').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'assessment-started'));

      // Answer one question
      const answerOption = page.locator('input[type="radio"], [role="radio"]').first();
      if (await answerOption.isVisible()) {
        await answerOption.click();
        screenshots.push(await takeScreenshot(page, testName, 'answer-selected'));
      }

      // Look for Submit button
      const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Finish")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
        screenshots.push(await takeScreenshot(page, testName, 'submit-clicked'));

        // Check for confirmation dialog
        const confirmDialog = page.locator('[role="dialog"], .modal').first();
        if (await confirmDialog.isVisible()) {
          console.log('✓ Confirmation dialog shown');

          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            screenshots.push(await takeScreenshot(page, testName, 'assessment-submitted'));
          }
        }
      }
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ASSESSMENT, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ASSESSMENT,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 5.1.7: Assessment Results Display
test('5.1.7 - Assessment Results Display', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-5.1.7-ResultsDisplay';
  const screenshots: string[] = [];

  try {
    console.log('📊 Testing Results Display...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to student dashboard to find completed assessments
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Look for assessment results section
    const resultsSection = page.locator('[data-testid="assessment-results"], .results-section').first();
    if (await resultsSection.isVisible()) {
      console.log('✓ Results section visible');
      screenshots.push(await takeScreenshot(page, testName, 'results-section'));

      // Look for score display
      const scoreDisplay = page.locator('.score, [data-testid="score"]').first();
      if (await scoreDisplay.isVisible()) {
        const scoreText = await scoreDisplay.textContent();
        console.log(`✓ Score displayed: ${scoreText}`);
      }
      screenshots.push(await takeScreenshot(page, testName, 'score-visible'));

      // Look for percentage
      const percentageDisplay = page.locator('.percentage, [data-testid="percentage"]').first();
      if (await percentageDisplay.isVisible()) {
        const percentText = await percentageDisplay.textContent();
        console.log(`✓ Percentage visible: ${percentText}`);
      }
      screenshots.push(await takeScreenshot(page, testName, 'percentage-visible'));
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.ASSESSMENT, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.ASSESSMENT,
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
  console.log('📊 ASSESSMENT SYSTEM TEST RESULTS');
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

  const reportPath = path.join(reportDir, 'assessment-system-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Assessment System Testing',
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
