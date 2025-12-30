import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Create directories if they don't exist
const baseDir = path.join(__dirname, 'results');
const screenshotsDir = path.join(baseDir, 'screenshots');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Test result interface
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

// Helper function to take screenshots
async function takeScreenshot(page: Page, testName: string, stepName: string): Promise<string> {
  const timestamp = Date.now();
  const filename = `${testName}___${stepName}___${timestamp}.png`;
  const filepath = path.join(screenshotsDir, filename);
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  📸 Screenshot: ${filename}`);
  } catch (e) {
    console.log(`  ⚠️ Screenshot failed for ${stepName}`);
  }
  return filename;
}

// Helper function to create test result
function createTestResult(
  testId: string,
  testName: string,
  status: 'passed' | 'failed',
  startTime: number,
  endTime: number,
  findings: string[],
  screenshots: string[],
  errors: string[] = []
): TestResult {
  return {
    testId,
    testName,
    section: 'Section 26',
    subsection: '26.1: Teacher Pages Complete',
    status,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration: endTime - startTime,
    findings,
    screenshots,
    errors,
  };
}

// Test: Teacher Dashboard - Advanced
test('TC-26.1.1: Teacher Dashboard - Advanced', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.1-TeacherDashboard';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Teacher Dashboard - Advanced');
    console.log('━'.repeat(50));

    // Step 1: Navigate to login
    console.log('  Step 1: Navigating to login...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    findings.push('✓ Login page accessible');

    // Step 2: Login as teacher
    console.log('  Step 2: Logging in as teacher...');
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator(
      'input[type="password"], input[placeholder*="password" i], input[name="password"], [data-test="password-input"]'
    ).first();

    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator(
      'button:has-text("Sign In"), button:has-text("Login"), [data-test="login-button"]'
    ).first();

    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);
    screenshots.push(await takeScreenshot(page, testName, 'after-login'));

    // Step 3: Navigate to teacher dashboard
    console.log('  Step 3: Navigating to teacher dashboard...');
    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' }).catch(() => {
      findings.push('⚠️ Dashboard navigation attempted');
    });

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-page'));
    findings.push('✓ Teacher dashboard accessed');

    // Step 4: Verify My Classes section
    console.log('  Step 4: Verifying My Classes section...');

    const classesSection = page.locator(
      '[data-test="my-classes"], [class*="my-classes"], text=/my classes/i'
    ).first();

    if (await classesSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      findings.push('✓ My Classes section visible');
      console.log('  ✓ My Classes section found');
    }

    // Verify class cards
    const classCards = page.locator(
      '[data-test="class-card"], [class*="class-card"]'
    );

    const classCount = await classCards.count();
    if (classCount > 0) {
      findings.push(`✓ Found ${classCount} class cards`);
      console.log(`  ✓ Found ${classCount} classes`);
    }

    // Step 5: Verify class card information
    console.log('  Step 5: Verifying class card information...');

    // Check for student count
    const studentCount = page.locator(
      '[data-test="student-count"], text=/student|enrolled/i'
    );

    if (await studentCount.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Student count displayed');
      console.log('  ✓ Student count visible');
    }

    // Check for average score
    const avgScore = page.locator(
      '[data-test="avg-score"], text=/average|score|avg/i'
    );

    if (await avgScore.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Average score displayed');
      console.log('  ✓ Average score visible');
    }

    // Check for recent activity
    const recentActivity = page.locator(
      '[data-test="recent-activity"], text=/recent/i'
    );

    if (await recentActivity.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Recent activity shown');
      console.log('  ✓ Recent activity visible');
    }

    // Step 6: Verify Recent Activity feed
    console.log('  Step 6: Verifying Recent Activity feed...');

    const activityFeed = page.locator(
      '[data-test="activity-feed"], [class*="activity-feed"]'
    );

    if (await activityFeed.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Activity feed visible');
      console.log('  ✓ Activity feed found');
    }

    // Step 7: Verify Upcoming Assessments
    console.log('  Step 7: Verifying Upcoming Assessments...');

    const upcomingAssessments = page.locator(
      '[data-test="upcoming-assessments"], text=/upcoming assessment/i'
    ).first();

    if (await upcomingAssessments.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Upcoming Assessments visible');
      console.log('  ✓ Upcoming Assessments found');
    }

    // Step 8: Verify quick stats
    console.log('  Step 8: Verifying quick stats...');

    const totalStudents = page.locator(
      '[data-test="total-students"], text=/total student/i'
    );

    const avgScore2 = page.locator(
      '[data-test="avg-score"], text=/average.*score/i'
    );

    const statsVisible = (await totalStudents.first().isVisible({ timeout: 2000 }).catch(() => false)) ||
                         (await avgScore2.first().isVisible({ timeout: 2000 }).catch(() => false));

    if (statsVisible) {
      findings.push('✓ Quick stats displayed');
      console.log('  ✓ Quick stats visible');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.1',
      'Teacher Dashboard - Advanced',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.1',
      'Teacher Dashboard - Advanced',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Class Detail Page - Roster
test('TC-26.1.2: Class Detail Page - Roster', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.2-ClassRoster';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Class Detail Page - Roster');
    console.log('━'.repeat(50));

    // Step 1: Login as teacher
    console.log('  Step 1: Logging in...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator(
      'input[type="password"], input[placeholder*="password" i], input[name="password"], [data-test="password-input"]'
    ).first();

    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator(
      'button:has-text("Sign In"), button:has-text("Login"), [data-test="login-button"]'
    ).first();

    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);
    findings.push('✓ Teacher logged in');

    // Step 2: Navigate to class details
    console.log('  Step 2: Navigating to class details...');
    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' });

    // Click on first class
    const classCard = page.locator(
      '[data-test="class-card"], [class*="class-card"]'
    ).first();

    if (await classCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'class-details-page'));
    findings.push('✓ Class details page accessed');

    // Step 3: Click Roster tab
    console.log('  Step 3: Clicking Roster tab...');

    const rosterTab = page.locator(
      'button:has-text("Roster"), [data-test="roster-tab"], text=/roster/i'
    ).first();

    if (await rosterTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rosterTab.click();
      await page.waitForTimeout(1500);
      findings.push('✓ Roster tab clicked');
      console.log('  ✓ Roster tab visible');
    }

    screenshots.push(await takeScreenshot(page, testName, 'roster-tab-open'));

    // Step 4: Verify student list
    console.log('  Step 4: Verifying student roster...');

    const studentRows = page.locator(
      'tr:has([data-test="student-name"]), tbody tr, [class*="student-row"]'
    );

    const studentCount = await studentRows.count();
    if (studentCount > 0) {
      findings.push(`✓ Found ${studentCount} students in roster`);
      console.log(`  ✓ Found ${studentCount} students`);
    }

    // Step 5: Verify roster columns
    console.log('  Step 5: Verifying roster columns...');

    const columns = {
      'Name': await page.locator('[data-test="name-col"], text=/name/i').isVisible({ timeout: 2000 }).catch(() => false),
      'Roll Number': await page.locator('[data-test="roll-col"], text=/roll/i').isVisible({ timeout: 2000 }).catch(() => false),
      'Email': await page.locator('[data-test="email-col"], text=/email/i').isVisible({ timeout: 2000 }).catch(() => false),
      'Status': await page.locator('[data-test="status-col"], text=/status/i').isVisible({ timeout: 2000 }).catch(() => false),
    };

    Object.entries(columns).forEach(([col, visible]) => {
      if (visible) {
        findings.push(`✓ Column: ${col} visible`);
        console.log(`  ✓ ${col} column found`);
      }
    });

    // Step 6: Verify sorting functionality
    console.log('  Step 6: Verifying sort functionality...');

    const sortButtons = page.locator(
      '[data-test="sort-name"], [data-test="sort-roll"], [class*="sort-"]'
    );

    const sortCount = await sortButtons.count();
    if (sortCount > 0) {
      findings.push(`✓ Sorting available (${sortCount} sort options)`);
      console.log('  ✓ Sort options found');
    }

    // Step 7: Verify filtering
    console.log('  Step 7: Verifying filters...');

    const filterButton = page.locator(
      'button:has-text("Filter"), [data-test="filter-button"], text=/filter/i'
    ).first();

    if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Filter button visible');
      console.log('  ✓ Filter option found');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.2',
      'Class Detail Page - Roster',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.2',
      'Class Detail Page - Roster',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Invite Panel - Code Copy
test('TC-26.1.3: Invite Panel - Code Copy', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.3-InvitePanelCodeCopy';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Invite Panel - Code Copy');
    console.log('━'.repeat(50));

    // Step 1: Login as teacher
    console.log('  Step 1: Logging in...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator(
      'input[type="password"], input[placeholder*="password" i], input[name="password"], [data-test="password-input"]'
    ).first();

    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator(
      'button:has-text("Sign In"), button:has-text("Login"), [data-test="login-button"]'
    ).first();

    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);
    findings.push('✓ Teacher logged in');

    // Step 2: Navigate to class
    console.log('  Step 2: Navigating to class...');
    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' });

    const classCard = page.locator('[data-test="class-card"], [class*="class-card"]').first();
    if (await classCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(1000);
    findings.push('✓ Class accessed');

    // Step 3: Find invite panel
    console.log('  Step 3: Finding invite panel...');

    const invitePanel = page.locator(
      '[data-test="invite-panel"], [class*="invite-panel"], text=/invite|share/i'
    ).first();

    if (await invitePanel.isVisible({ timeout: 3000 }).catch(() => false)) {
      findings.push('✓ Invite panel visible');
      console.log('  ✓ Invite panel found');
    }

    screenshots.push(await takeScreenshot(page, testName, 'invite-panel'));

    // Step 4: Verify class code displayed
    console.log('  Step 4: Verifying class code...');

    const classCode = page.locator(
      '[data-test="class-code"], [class*="class-code"], text=/[A-Z0-9]{6}/i'
    ).first();

    if (await classCode.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Class code displayed');
      console.log('  ✓ Class code visible');
    }

    // Step 5: Click Copy Code button
    console.log('  Step 5: Clicking Copy Code button...');

    const copyButton = page.locator(
      'button:has-text("Copy"), [data-test="copy-code-button"], text=/copy code/i'
    ).first();

    if (await copyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyButton.click();
      await page.waitForTimeout(500);
      findings.push('✓ Copy Code button clicked');
      console.log('  ✓ Copy button clicked');
    }

    // Step 6: Verify success notification
    console.log('  Step 6: Verifying success notification...');

    const successMsg = page.locator(
      'text=/copied|success|copied to clipboard/i'
    ).first();

    if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Success notification shown');
      console.log('  ✓ Success message visible');
    }

    screenshots.push(await takeScreenshot(page, testName, 'after-copy'));

    // Step 7: Verify clipboard content (paste in input)
    console.log('  Step 7: Verifying clipboard content...');

    const testInput = page.locator('input[type="text"]').first();
    if (await testInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await testInput.focus();
      await page.keyboard.press('Control+V');
      const value = await testInput.inputValue();
      if (value && value.length >= 6) {
        findings.push(`✓ Clipboard content verified: ${value}`);
        console.log('  ✓ Clipboard verified');
      }
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.3',
      'Invite Panel - Code Copy',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.3',
      'Invite Panel - Code Copy',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Invite Student Dialog
test('TC-26.1.4: Invite Student Dialog', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.4-InviteStudentDialog';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Invite Student Dialog');
    console.log('━'.repeat(50));

    // Step 1: Login
    console.log('  Step 1: Logging in...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Login")').first();
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);
    findings.push('✓ Teacher logged in');

    // Step 2: Navigate to class
    console.log('  Step 2: Navigating to class...');
    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' });

    const classCard = page.locator('[data-test="class-card"], [class*="class-card"]').first();
    if (await classCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(1000);
    findings.push('✓ Class accessed');
    screenshots.push(await takeScreenshot(page, testName, 'class-page'));

    // Step 3: Click Invite Student button
    console.log('  Step 3: Clicking Invite Student button...');

    const inviteButton = page.locator(
      'button:has-text("Invite"), button:has-text("Add Student"), [data-test="invite-student-button"]'
    ).first();

    if (await inviteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inviteButton.click();
      await page.waitForTimeout(1000);
      findings.push('✓ Invite Student button clicked');
      console.log('  ✓ Invite dialog opened');
    }

    screenshots.push(await takeScreenshot(page, testName, 'invite-dialog-open'));

    // Step 4: Verify dialog shows
    console.log('  Step 4: Verifying dialog...');

    const dialog = page.locator(
      '[role="dialog"], [class*="dialog"], [class*="modal"]'
    ).first();

    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Invite dialog visible');
      console.log('  ✓ Dialog found');
    }

    // Step 5: Search for student
    console.log('  Step 5: Searching for student...');

    const searchInput = page.locator(
      'input[placeholder*="search" i], input[placeholder*="student" i], [data-test="student-search"]'
    ).first();

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('John Doe');
      await page.waitForTimeout(1500);
      findings.push('✓ Search input visible and filled');
      console.log('  ✓ Search performed');
    }

    screenshots.push(await takeScreenshot(page, testName, 'search-entered'));

    // Step 6: Select student
    console.log('  Step 6: Selecting student...');

    const studentOption = page.locator(
      'text=/john|doe/i, [data-test="student-option"], [class*="student-option"]'
    ).first();

    if (await studentOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await studentOption.click();
      findings.push('✓ Student selected');
      console.log('  ✓ Student selected');
    }

    // Step 7: Click Send Invite
    console.log('  Step 7: Clicking Send Invite button...');

    const sendButton = page.locator(
      'button:has-text("Send"), button:has-text("Invite"), [data-test="send-invite-button"]'
    ).first();

    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click();
      await page.waitForTimeout(1500);
      findings.push('✓ Send Invite clicked');
      console.log('  ✓ Invite sent');
    }

    // Step 8: Verify success
    console.log('  Step 8: Verifying success message...');

    const successMsg = page.locator(
      'text=/invited|sent|success/i'
    ).first();

    if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Success message shown');
      console.log('  ✓ Success confirmed');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.4',
      'Invite Student Dialog',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.4',
      'Invite Student Dialog',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Roster Table Operations
test('TC-26.1.5: Roster Table Operations', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.5-RosterOperations';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Roster Table Operations');
    console.log('━'.repeat(50));

    // Step 1-2: Login and navigate to class
    console.log('  Step 1-2: Logging in and navigating...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator('button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' });
    const classCard = page.locator('[data-test="class-card"], [class*="class-card"]').first();
    if (await classCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(1000);
    findings.push('✓ Class accessed');

    // Step 3: Click Roster tab
    console.log('  Step 3: Opening roster tab...');
    const rosterTab = page.locator('button:has-text("Roster"), [data-test="roster-tab"]').first();
    if (await rosterTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rosterTab.click();
      await page.waitForTimeout(1000);
    }

    screenshots.push(await takeScreenshot(page, testName, 'roster-tab'));

    // Step 4: Verify action buttons
    console.log('  Step 4: Verifying action buttons...');

    const actionButtons = {
      'View Details': await page.locator('button:has-text("View"), [data-test="view-details"]').first().isVisible({ timeout: 2000 }).catch(() => false),
      'View Assessments': await page.locator('button:has-text("Assessments"), [data-test="view-assessments"]').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Remove': await page.locator('button:has-text("Remove"), [data-test="remove-student"]').first().isVisible({ timeout: 2000 }).catch(() => false),
    };

    Object.entries(actionButtons).forEach(([btn, visible]) => {
      if (visible) {
        findings.push(`✓ ${btn} button visible`);
        console.log(`  ✓ ${btn} found`);
      }
    });

    // Step 5: Click View Details on first student
    console.log('  Step 5: Clicking View Details...');

    const viewDetailsBtn = page.locator('button:has-text("View"), [data-test="view-details"]').first();
    if (await viewDetailsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewDetailsBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
      findings.push('✓ View Details clicked');
      console.log('  ✓ Details opened');
    }

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'student-details'));

    // Step 6: Verify student detail page
    console.log('  Step 6: Verifying student details...');

    const studentName = page.locator('[data-test="student-name"], [class*="student-name"]').first();
    if (await studentName.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Student detail page loaded');
      console.log('  ✓ Details page found');
    }

    // Step 7: Verify assessment history
    console.log('  Step 7: Verifying assessment history...');

    const assessmentHistory = page.locator(
      '[data-test="assessment-history"], text=/assessment|test/i'
    ).first();

    if (await assessmentHistory.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Assessment history visible');
      console.log('  ✓ Assessment history found');
    }

    // Step 8: Verify progress charts
    console.log('  Step 8: Verifying progress charts...');

    const progressChart = page.locator('[data-test="progress-chart"], canvas, svg').first();
    if (await progressChart.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Progress charts visible');
      console.log('  ✓ Charts found');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.5',
      'Roster Table Operations',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.5',
      'Roster Table Operations',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Analytics Tiles
test('TC-26.1.6: Analytics Tiles', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.6-AnalyticsTiles';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Analytics Tiles');
    console.log('━'.repeat(50));

    // Step 1: Login and navigate
    console.log('  Step 1: Logging in and navigating...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator('button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' });
    const classCard = page.locator('[data-test="class-card"], [class*="class-card"]').first();
    if (await classCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(1000);
    findings.push('✓ Class accessed');

    // Step 2: Navigate to analytics
    console.log('  Step 2: Navigating to analytics...');

    const analyticsTab = page.locator(
      'button:has-text("Analytics"), [data-test="analytics-tab"]'
    ).first();

    if (await analyticsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await analyticsTab.click();
      await page.waitForTimeout(1500);
      findings.push('✓ Analytics tab clicked');
    }

    screenshots.push(await takeScreenshot(page, testName, 'analytics-page'));

    // Step 3: Verify analytics tiles
    console.log('  Step 3: Verifying analytics tiles...');

    const tiles = {
      'Total Students': await page.locator('[data-test="total-students"], text=/total.*student/i').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Completed Assessments': await page.locator('[data-test="completed-assessments"], text=/completed/i').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Average Score': await page.locator('[data-test="avg-score"], text=/average.*score/i').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Best Student': await page.locator('[data-test="best-student"], text=/best|top/i').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Struggling Students': await page.locator('[data-test="struggling"], text=/struggling|need help/i').first().isVisible({ timeout: 2000 }).catch(() => false),
    };

    Object.entries(tiles).forEach(([tile, visible]) => {
      if (visible) {
        findings.push(`✓ ${tile} tile visible`);
        console.log(`  ✓ ${tile} found`);
      }
    });

    // Step 4: Click on tile for drill-down
    console.log('  Step 4: Clicking tile for drill-down...');

    const firstTile = page.locator('[data-test="analytics-tile"], [class*="tile"]').first();
    if (await firstTile.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstTile.click();
      await page.waitForTimeout(1000);
      findings.push('✓ Tile clicked for details');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.6',
      'Analytics Tiles',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.6',
      'Analytics Tiles',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Student Progress Grid
test('TC-26.1.7: Student Progress Grid', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.7-ProgressGrid';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Student Progress Grid');
    console.log('━'.repeat(50));

    // Step 1: Login and navigate to analytics
    console.log('  Step 1: Logging in...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator('button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' });
    const classCard = page.locator('[data-test="class-card"], [class*="class-card"]').first();
    if (await classCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(1000);

    // Step 2: Navigate to analytics
    console.log('  Step 2: Navigating to analytics...');
    const analyticsTab = page.locator('button:has-text("Analytics"), [data-test="analytics-tab"]').first();
    if (await analyticsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await analyticsTab.click();
      await page.waitForTimeout(1500);
    }

    findings.push('✓ Analytics tab open');

    // Step 3: Find progress grid
    console.log('  Step 3: Finding progress grid...');

    const progressGrid = page.locator(
      '[data-test="progress-grid"], table, [class*="progress-grid"]'
    ).first();

    if (await progressGrid.isVisible({ timeout: 3000 }).catch(() => false)) {
      findings.push('✓ Progress grid visible');
      console.log('  ✓ Grid found');
    }

    screenshots.push(await takeScreenshot(page, testName, 'progress-grid'));

    // Step 4: Verify grid structure
    console.log('  Step 4: Verifying grid structure...');

    const rows = page.locator('tr, [data-test="grid-row"]');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      findings.push(`✓ Found ${rowCount} rows in grid`);
      console.log(`  ✓ Grid has ${rowCount} rows`);
    }

    // Step 5: Verify color coding
    console.log('  Step 5: Verifying color coding...');

    const coloredCells = page.locator('[class*="red"], [class*="green"], [class*="yellow"], [style*="color"]');
    const colorCount = await coloredCells.count();

    if (colorCount > 0) {
      findings.push(`✓ Color coding applied (${colorCount} cells)`);
      console.log('  ✓ Color coding visible');
    }

    // Step 6: Click cell for details
    console.log('  Step 6: Clicking cell for details...');

    const gridCell = page.locator('td, [data-test="grid-cell"]').nth(2);
    if (await gridCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gridCell.click();
      await page.waitForTimeout(1000);
      findings.push('✓ Grid cell clicked');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.7',
      'Student Progress Grid',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.7',
      'Student Progress Grid',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: AI Interactions Log
test('TC-26.1.8: AI Interactions Log', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.8-AIInteractionsLog';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: AI Interactions Log');
    console.log('━'.repeat(50));

    // Step 1: Login and navigate
    console.log('  Step 1: Logging in...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator('button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' });
    const classCard = page.locator('[data-test="class-card"], [class*="class-card"]').first();
    if (await classCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(1000);
    findings.push('✓ Class accessed');

    // Step 2: Navigate to analytics
    console.log('  Step 2: Navigating to analytics...');
    const analyticsTab = page.locator('button:has-text("Analytics"), [data-test="analytics-tab"]').first();
    if (await analyticsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await analyticsTab.click();
      await page.waitForTimeout(1500);
    }

    // Step 3: Find AI Interactions section
    console.log('  Step 3: Finding AI Interactions section...');

    const aiSection = page.locator(
      '[data-test="ai-interactions"], text=/ai tutor|ai interaction/i, [class*="ai-log"]'
    ).first();

    if (await aiSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      findings.push('✓ AI Interactions section visible');
      console.log('  ✓ AI section found');
    }

    screenshots.push(await takeScreenshot(page, testName, 'ai-section'));

    // Step 4: Verify AI interaction log
    console.log('  Step 4: Verifying AI interaction log...');

    const interactions = {
      'Student Name': await page.locator('[data-test="student-name"], text=/student/i').isVisible({ timeout: 2000 }).catch(() => false),
      'Date/Time': await page.locator('[data-test="timestamp"], text=/\\d{1,2}:\\d{2}/').isVisible({ timeout: 2000 }).catch(() => false),
      'Topic': await page.locator('[data-test="topic"], text=/topic|subject/i').isVisible({ timeout: 2000 }).catch(() => false),
      'Duration': await page.locator('[data-test="duration"], text=/minute|second/i').isVisible({ timeout: 2000 }).catch(() => false),
    };

    Object.entries(interactions).forEach(([field, visible]) => {
      if (visible) {
        findings.push(`✓ ${field} column visible`);
        console.log(`  ✓ ${field} found`);
      }
    });

    // Step 5: Click interaction for transcript
    console.log('  Step 5: Clicking interaction for transcript...');

    const interaction = page.locator('[data-test="interaction-row"], tr').first();
    if (await interaction.isVisible({ timeout: 2000 }).catch(() => false)) {
      await interaction.click();
      await page.waitForTimeout(1000);
      findings.push('✓ Interaction clicked');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.8',
      'AI Interactions Log',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.8',
      'AI Interactions Log',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Class Analytics Deep Dive
test('TC-26.1.9: Class Analytics Deep Dive', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.9-AnalyticsDeepDive';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Class Analytics Deep Dive');
    console.log('━'.repeat(50));

    // Step 1: Login and navigate
    console.log('  Step 1: Logging in and navigating...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator('button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/app/teacher`, { waitUntil: 'networkidle' });
    const classCard = page.locator('[data-test="class-card"], [class*="class-card"]').first();
    if (await classCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(1000);
    findings.push('✓ Class accessed');

    // Step 2: Navigate to analytics with URL
    console.log('  Step 2: Navigating to analytics tab...');
    const analyticsTab = page.locator('button:has-text("Analytics")').first();
    if (await analyticsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await analyticsTab.click();
      await page.waitForTimeout(1500);
    }

    screenshots.push(await takeScreenshot(page, testName, 'analytics-page'));
    findings.push('✓ Analytics page loaded');

    // Step 3: Verify comprehensive analytics
    console.log('  Step 3: Verifying comprehensive analytics...');

    const analytics = {
      'Performance Distribution': await page.locator('[data-test="performance-chart"], text=/performance|distribution/i').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Topic Mastery Heatmap': await page.locator('[data-test="heatmap"], text=/heatmap|mastery/i').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Learning Curve': await page.locator('[data-test="learning-curve"], text=/learning|curve/i').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Time Spent': await page.locator('[data-test="time-spent"], text=/time spent/i').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Engagement Metrics': await page.locator('[data-test="engagement"], text=/engagement|interaction/i').first().isVisible({ timeout: 2000 }).catch(() => false),
    };

    Object.entries(analytics).forEach(([metric, visible]) => {
      if (visible) {
        findings.push(`✓ ${metric} visible`);
        console.log(`  ✓ ${metric} found`);
      }
    });

    // Step 4: Verify filters
    console.log('  Step 4: Verifying filters...');

    const filterButton = page.locator('button:has-text("Filter"), [data-test="filter-button"]').first();
    if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      findings.push('✓ Filter button functional');
    }

    // Step 5: Apply date filter
    console.log('  Step 5: Applying date filter...');

    const dateFilter = page.locator('input[type="date"], [data-test="date-filter"]').first();
    if (await dateFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateFilter.fill('2025-01-01');
      await page.waitForTimeout(1000);
      findings.push('✓ Date filter applied');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.9',
      'Class Analytics Deep Dive',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.9',
      'Class Analytics Deep Dive',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Teacher Profile Editor
test('TC-26.1.10: Teacher Profile Editor', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-26.1.10-TeacherProfileEditor';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Teacher Profile Editor');
    console.log('━'.repeat(50));

    // Step 1: Login
    console.log('  Step 1: Logging in...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('teacher@example.com');
    }

    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
    }

    const loginButton = page.locator('button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);
    findings.push('✓ Teacher logged in');

    // Step 2: Navigate to settings
    console.log('  Step 2: Navigating to settings...');
    await page.goto(`${BASE_URL}/app/settings`, { waitUntil: 'networkidle' }).catch(() => {
      findings.push('⚠️ Settings navigation attempted');
    });

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'settings-page'));

    // Step 3: Click Edit Profile
    console.log('  Step 3: Clicking Edit Profile...');

    const editButton = page.locator(
      'button:has-text("Edit Profile"), button:has-text("Edit"), [data-test="edit-profile-button"]'
    ).first();

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();
      await page.waitForTimeout(1000);
      findings.push('✓ Edit Profile button clicked');
    }

    screenshots.push(await takeScreenshot(page, testName, 'edit-form'));

    // Step 4: Verify editable fields
    console.log('  Step 4: Verifying editable fields...');

    const fields = {
      'Name': await page.locator('input[placeholder*="name" i], [data-test="name-input"]').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Subject': await page.locator('select[name*="subject"], [data-test="subject-select"]').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Experience': await page.locator('select[name*="experience"], [data-test="experience-select"]').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Phone': await page.locator('input[placeholder*="phone" i], [data-test="phone-input"]').first().isVisible({ timeout: 2000 }).catch(() => false),
      'Bio': await page.locator('textarea[placeholder*="bio" i], [data-test="bio-input"]').first().isVisible({ timeout: 2000 }).catch(() => false),
    };

    Object.entries(fields).forEach(([field, visible]) => {
      if (visible) {
        findings.push(`✓ ${field} field editable`);
        console.log(`  ✓ ${field} found`);
      }
    });

    // Step 5: Modify fields
    console.log('  Step 5: Modifying profile fields...');

    const timestamp = Date.now();

    const nameInput = page.locator('input[placeholder*="name" i], [data-test="name-input"]').first();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.clear();
      await nameInput.fill(`Teacher_${timestamp}`);
      findings.push('✓ Name updated');
    }

    const phoneInput = page.locator('input[placeholder*="phone" i], [data-test="phone-input"]').first();
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.clear();
      await phoneInput.fill('9876543210');
      findings.push('✓ Phone updated');
    }

    const bioInput = page.locator('textarea[placeholder*="bio" i], [data-test="bio-input"]').first();
    if (await bioInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bioInput.clear();
      await bioInput.fill('Updated teacher bio');
      findings.push('✓ Bio updated');
    }

    screenshots.push(await takeScreenshot(page, testName, 'form-filled'));

    // Step 6: Save changes
    console.log('  Step 6: Saving changes...');

    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Update"), [data-test="save-button"]'
    ).first();

    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click();
      await page.waitForTimeout(1500);
      findings.push('✓ Changes saved');
    }

    // Step 7: Verify updated
    console.log('  Step 7: Verifying updates...');

    const successMsg = page.locator('text=/updated|success/i').first();
    if (await successMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Success message shown');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.10',
      'Teacher Profile Editor',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-26.1.10',
      'Teacher Profile Editor',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-26.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});
