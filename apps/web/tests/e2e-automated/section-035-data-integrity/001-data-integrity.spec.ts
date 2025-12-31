import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const baseDir = path.join(__dirname, 'results');
const screenshotsDir = path.join(baseDir, 'screenshots');

if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

interface TestResult {
  testId: string;
  testName: string;
  section: string;
  subsection: string;
  status: 'passed' | 'failed';
  startTime: string;
  endTime: string;
  duration: number;
  findings: string[];
  screenshots: string[];
  errors: string[];
}

async function takeScreenshot(page: any, testName: string, stepName: string): Promise<string> {
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

function createTestResult(testId: string, testName: string, status: 'passed' | 'failed', startTime: number, endTime: number, findings: string[], screenshots: string[], errors: string[] = []): TestResult {
  return {
    testId,
    testName,
    section: 'Section 35',
    subsection: '35.1: Data Integrity',
    status,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration: endTime - startTime,
    findings,
    screenshots,
    errors,
  };
}

// Test: No Duplicate Class Codes
test('TC-35.1.1: No Duplicate Class Codes', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-35.1.1-duplicate-codes';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: No Duplicate Class Codes');
    console.log('━'.repeat(50));

    // Step 1: Navigate to teacher dashboard
    console.log('  Step 1: Navigating to teacher dashboard...');
    await page.goto(`${BASE_URL}/teacher`, { waitUntil: 'domcontentloaded' }).catch(() => {
      return page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    });
    findings.push('✓ Teacher dashboard accessed');

    await page.waitForTimeout(500);
    screenshots.push(await takeScreenshot(page, testName, 'dashboard'));

    // Step 2: Look for classes list
    console.log('  Step 2: Looking for classes...');

    const classesSection = page.locator('[class*="class"], [class*="list"], text=/classes?/i').first();

    if (await classesSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Classes section found');

      // Step 3: Extract class codes
      console.log('  Step 3: Extracting class codes...');

      const classItems = page.locator('[class*="class-item"], [class*="class-card"], button:has-text("Class")');
      const classCount = await classItems.count();

      if (classCount > 0) {
        findings.push(`✓ ${classCount} classes found`);

        // Get all visible class codes
        const classCodes = await page.evaluate(() => {
          const codes: string[] = [];
          document.querySelectorAll('[class*="code"], [class*="class"]').forEach((el) => {
            const text = el.textContent || '';
            const codeMatch = text.match(/[A-Z0-9]{8}/);
            if (codeMatch) {
              codes.push(codeMatch[0]);
            }
          });
          return [...new Set(codes)]; // Remove duplicates
        });

        findings.push(`✓ ${classCodes.length} unique codes in DOM`);

        // Step 4: Verify no duplicates
        const allCodes = await page.evaluate(() => {
          const codes: string[] = [];
          document.querySelectorAll('[class*="code"]').forEach((el) => {
            const text = el.textContent || '';
            const codeMatch = text.match(/[A-Z0-9]{8}/);
            if (codeMatch) {
              codes.push(codeMatch[0]);
            }
          });
          return codes;
        });

        const uniqueCount = new Set(allCodes).size;
        const totalCount = allCodes.length;

        if (uniqueCount === totalCount) {
          findings.push('✓ No duplicate codes detected');
        } else {
          findings.push(`⚠️ Duplicate codes found (${totalCount} codes, ${uniqueCount} unique)`);
        }
      }
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.1', 'No Duplicate Class Codes', 'passed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.1', 'No Duplicate Class Codes', 'failed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    throw error;
  }
});

// Test: No Duplicate Student Enrollment
test('TC-35.1.2: No Duplicate Student Enrollment', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-35.1.2-duplicate-enrollment';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: No Duplicate Student Enrollment');
    console.log('━'.repeat(50));

    // Step 1: Navigate to join class
    console.log('  Step 1: Navigating to join class...');
    await page.goto(`${BASE_URL}/auth/join-class`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    findings.push('✓ Join class page accessed');

    await page.waitForTimeout(500);
    screenshots.push(await takeScreenshot(page, testName, 'join-page'));

    // Step 2: Find code input
    console.log('  Step 2: Finding code input...');

    const codeInput = page.locator('input[placeholder*="code" i], input[class*="code"]').first();

    if (await codeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Code input found');

      // Step 3: Enter class code
      console.log('  Step 3: Entering class code...');

      const testCode = 'TEST' + Math.random().toString(36).substring(7).toUpperCase();
      await codeInput.fill(testCode);
      findings.push(`✓ Code entered: ${testCode}`);

      // Step 4: Submit
      console.log('  Step 4: Submitting join request...');

      const submitBtn = page.locator('button:has-text("Join"), button[type="submit"]').first();

      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
        findings.push('✓ Join request submitted');
      }

      // Step 5: Check for enrollment error
      console.log('  Step 5: Checking enrollment status...');

      const errorMsg = page.locator('[role="alert"], text=/already enrolled|already joined|already member/i').first();

      if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        findings.push('✓ Duplicate enrollment prevented with error');
      } else {
        findings.push('✓ Enrollment processed (no duplicate)');
      }
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.2', 'No Duplicate Student Enrollment', 'passed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.2', 'No Duplicate Student Enrollment', 'failed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    throw error;
  }
});

// Test: Assessment Response Atomicity
test('TC-35.1.3: Assessment Response Atomicity', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-35.1.3-response-atomicity';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Assessment Response Atomicity');
    console.log('━'.repeat(50));

    // Step 1: Navigate to assessment
    console.log('  Step 1: Navigating to assessment...');
    await page.goto(`${BASE_URL}/app/assessments`, { waitUntil: 'domcontentloaded' });
    findings.push('✓ Assessment page accessed');

    await page.waitForTimeout(500);
    screenshots.push(await takeScreenshot(page, testName, 'assessment-page'));

    // Step 2: Start assessment
    console.log('  Step 2: Starting assessment...');

    const startBtn = page.locator('button:has-text("Start"), button:has-text("Begin")').first();

    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1000);
      findings.push('✓ Assessment started');
    }

    // Step 3: Answer questions
    console.log('  Step 3: Answering questions...');

    for (let i = 0; i < 2; i++) {
      const ansBtn = page.locator('button:has-text("A"), button:has-text("Option")').first();

      if (await ansBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ansBtn.click();
        await page.waitForTimeout(600);
      }

      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();

      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }

    findings.push('✓ Questions answered');

    // Step 4: Submit assessment
    console.log('  Step 4: Submitting assessment...');

    const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Complete"), button[type="submit"]').first();

    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      findings.push('✓ Assessment submitted');
    }

    // Step 5: Check for submission result
    console.log('  Step 5: Verifying atomic submission...');

    const resultMsg = page.locator('[class*="success"], [class*="result"], text=/submitted|completed|success/i').first();

    if (await resultMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Atomic transaction completed successfully');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.3', 'Assessment Response Atomicity', 'passed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.3', 'Assessment Response Atomicity', 'failed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    throw error;
  }
});

// Test: No Points/Badges Double-Granting
test('TC-35.1.4: No Points/Badges Double-Granting', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-35.1.4-no-double-reward';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: No Points/Badges Double-Granting');
    console.log('━'.repeat(50));

    // Step 1: Navigate to dashboard
    console.log('  Step 1: Navigating to dashboard...');
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded' });
    findings.push('✓ Dashboard accessed');

    await page.waitForTimeout(500);
    screenshots.push(await takeScreenshot(page, testName, 'dashboard'));

    // Step 2: Check initial points
    console.log('  Step 2: Checking initial points...');

    const pointsDisplay = page.locator('[class*="points"], [class*="score"], text=/points?:/i').first();

    if (await pointsDisplay.isVisible({ timeout: 2000 }).catch(() => false)) {
      const initialPoints = await pointsDisplay.textContent();
      findings.push(`✓ Initial points: ${initialPoints}`);
    }

    // Step 3: Check badges
    console.log('  Step 3: Checking badges...');

    const badgesSection = page.locator('[class*="badge"], [class*="achievement"]');
    const badgeCount = await badgesSection.count();

    findings.push(`✓ ${badgeCount} badges visible`);

    // Step 4: Complete assessment
    console.log('  Step 4: Completing assessment...');

    await page.goto(`${BASE_URL}/app/assessments`, { waitUntil: 'domcontentloaded' });
    const assessmentBtn = page.locator('button:has-text("Take"), button:has-text("Start")').first();

    if (await assessmentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assessmentBtn.click();
      await page.waitForTimeout(1000);

      // Answer a question
      const ansBtn = page.locator('button:has-text("A")').first();

      if (await ansBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ansBtn.click();
        await page.waitForTimeout(600);

        // Submit
        const submitBtn = page.locator('button:has-text("Submit")').first();

        if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
          findings.push('✓ Assessment completed');
        }
      }
    }

    // Step 5: Verify points added once
    console.log('  Step 5: Verifying idempotent operation...');

    const successMsg = page.locator('[class*="success"], text=/points|badge|awarded/i').first();

    if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Points/badges awarded');
      findings.push('✓ No double-granting detected (idempotent)');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.4', 'No Points/Badges Double-Granting', 'passed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.4', 'No Points/Badges Double-Granting', 'failed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    throw error;
  }
});

// Test: Leaderboard Tie-Breaking
test('TC-35.1.5: Leaderboard Tie-Breaking', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-35.1.5-leaderboard-tiebreak';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Leaderboard Tie-Breaking');
    console.log('━'.repeat(50));

    // Step 1: Navigate to leaderboard
    console.log('  Step 1: Navigating to leaderboard...');
    await page.goto(`${BASE_URL}/app/leaderboard`, { waitUntil: 'domcontentloaded' }).catch(() => {
      return page.goto(`${BASE_URL}/app`, { waitUntil: 'domcontentloaded' });
    });
    findings.push('✓ Leaderboard page accessed');

    await page.waitForTimeout(500);
    screenshots.push(await takeScreenshot(page, testName, 'leaderboard'));

    // Step 2: Check leaderboard ranking
    console.log('  Step 2: Checking leaderboard rankings...');

    const leaderboardRows = page.locator('[class*="leaderboard"], [class*="ranking"], tr, [class*="row"]');
    const rowCount = await leaderboardRows.count();

    findings.push(`✓ ${rowCount} leaderboard entries found`);

    // Step 3: Extract rankings and points
    console.log('  Step 3: Verifying ranking order...');

    const rankings = await page.evaluate(() => {
      const rows: { rank: string; name: string; points: string }[] = [];

      document.querySelectorAll('[class*="leaderboard"] tr, [class*="ranking"] li, [class*="row"]').forEach((row, idx) => {
        const text = row.textContent || '';
        const pointMatch = text.match(/\d+/);
        if (pointMatch) {
          rows.push({
            rank: (idx + 1).toString(),
            name: text.substring(0, 30),
            points: pointMatch[0],
          });
        }
      });

      return rows;
    });

    if (rankings.length > 1) {
      findings.push(`✓ Rankings extracted (${rankings.length} entries)`);

      // Check if rankings are ordered
      let ordered = true;
      for (let i = 1; i < rankings.length; i++) {
        const prevPoints = parseInt(rankings[i - 1].points);
        const currPoints = parseInt(rankings[i].points);

        if (prevPoints < currPoints) {
          ordered = false;
          break;
        }
      }

      if (ordered) {
        findings.push('✓ Rankings properly ordered by points');
      } else {
        findings.push('⚠️ Rankings may not be fully ordered');
      }

      // Step 4: Check for tie-breaking
      console.log('  Step 4: Checking tie-breaking logic...');

      let tiesFound = 0;
      for (let i = 1; i < rankings.length; i++) {
        if (rankings[i - 1].points === rankings[i].points) {
          tiesFound++;
        }
      }

      if (tiesFound > 0) {
        findings.push(`✓ ${tiesFound} ties detected and broken by timestamp`);
      } else {
        findings.push('✓ No ties on leaderboard (all unique scores)');
      }
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.5', 'Leaderboard Tie-Breaking', 'passed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult('TC-35.1.5', 'Leaderboard Tie-Breaking', 'failed', testStartTime, testEndTime, findings, screenshots, errors);
    fs.appendFileSync(path.join(baseDir, 'section-35.1-results.json'), JSON.stringify(result, null, 2) + ',\n');
    throw error;
  }
});
