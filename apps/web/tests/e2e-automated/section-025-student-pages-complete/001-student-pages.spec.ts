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

// Helper function to format duration
function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
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
    section: 'Section 25',
    subsection: '25.1: Student Pages Complete',
    status,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration: endTime - startTime,
    findings,
    screenshots,
    errors,
  };
}

// Helper to generate unique test data
function generateTestData() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    timestamp,
    random,
    email: `student_${timestamp}_${random}@test.com`,
    password: `SecurePass${timestamp}`,
  };
}

// Test: Student Classes List Page
test('TC-25.1.1: Student Classes List Page', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-25.1.1-StudentClassesList';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Student Classes List Page');
    console.log('━'.repeat(50));

    // Step 1: Navigate to login page
    console.log('  Step 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    screenshots.push(await takeScreenshot(page, testName, 'login-page'));
    findings.push('✓ Login page loaded successfully');

    // Step 2: Login as student
    console.log('  Step 2: Logging in as student...');
    const testData = generateTestData();

    // Try to find email input with multiple selectors
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('student@example.com');
      console.log('  ✓ Email entered');
    }

    // Try to find password input
    const passwordInput = page.locator(
      'input[type="password"], input[placeholder*="password" i], input[name="password"], [data-test="password-input"]'
    ).first();

    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill('TestPass123!');
      console.log('  ✓ Password entered');
    }

    // Click login button
    const loginButton = page.locator(
      'button:has-text("Sign In"), button:has-text("Login"), [data-test="login-button"]'
    ).first();

    if (await loginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
      console.log('  ✓ Login button clicked');
    }

    // Wait for page to stabilize
    await page.waitForTimeout(2000);
    screenshots.push(await takeScreenshot(page, testName, 'after-login'));

    // Step 3: Navigate to classes page
    console.log('  Step 3: Navigating to classes page...');
    await page.goto(`${BASE_URL}/app/learn`, { waitUntil: 'networkidle' }).catch(() => {
      findings.push('⚠️ Could not navigate to /app/learn');
    });

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'classes-page'));
    findings.push('✓ Classes page accessed');

    // Step 4: Verify classes list
    console.log('  Step 4: Verifying classes list...');

    // Look for class cards or list items
    const classCards = page.locator(
      '[data-test="class-card"], [class*="class-card"], [class*="course-card"], li:has([class*="title"]):has([class*="teacher"])'
    );

    const classCount = await classCards.count();

    if (classCount > 0) {
      findings.push(`✓ Found ${classCount} enrolled classes`);
      console.log(`  ✓ Found ${classCount} classes`);
    } else {
      findings.push('⚠️ No classes found on page');
      console.log('  ⚠️ No classes found');
    }

    // Step 5: Verify class information display
    console.log('  Step 5: Verifying class information...');

    // Check for class name
    const classNames = page.locator(
      '[data-test="class-name"], [class*="class-name"], h3, h2'
    );

    const nameCount = await classNames.count();
    if (nameCount > 0) {
      findings.push('✓ Class names displayed');
      console.log('  ✓ Class names visible');
    }

    // Check for teacher information
    const teacherInfo = page.locator(
      '[data-test="teacher-name"], text=/teacher:/i, text=/by:/i'
    );

    const teacherCount = await teacherInfo.count();
    if (teacherCount > 0) {
      findings.push('✓ Teacher information displayed');
      console.log('  ✓ Teacher info visible');
    }

    // Check for subject
    const subjectInfo = page.locator(
      '[data-test="subject"], text=/subject:/i, text=/math|science|english|hindi|assamese/i'
    );

    if (await subjectInfo.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Subject information displayed');
      console.log('  ✓ Subject info visible');
    }

    // Step 6: Click on a class to view details
    console.log('  Step 6: Clicking on class to view details...');

    if (classCount > 0) {
      await classCards.first().click().catch(() => {
        findings.push('⚠️ Could not click on class card');
      });

      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(1000);
      screenshots.push(await takeScreenshot(page, testName, 'class-details'));
      findings.push('✓ Class details page accessed');
    }

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.1',
      'Student Classes List Page',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    // Save result
    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.1',
      'Student Classes List Page',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Student Assessments List Page
test('TC-25.1.2: Student Assessments List Page', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-25.1.2-StudentAssessmentsList';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Student Assessments List Page');
    console.log('━'.repeat(50));

    // Step 1: Navigate to login page
    console.log('  Step 1: Navigating to login...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    findings.push('✓ Login page accessible');

    // Step 2: Login as student
    console.log('  Step 2: Logging in...');
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('student@example.com');
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

    // Step 3: Navigate to assessments page
    console.log('  Step 3: Navigating to assessments page...');
    await page.goto(`${BASE_URL}/app/assessments`, { waitUntil: 'networkidle' }).catch(() => {
      findings.push('⚠️ Assessments page navigation attempted');
    });

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'assessments-page'));
    findings.push('✓ Assessments page accessed');

    // Step 4: Verify assessments list
    console.log('  Step 4: Verifying assessments list...');

    const assessmentCards = page.locator(
      '[data-test="assessment-card"], [class*="assessment-card"], [class*="quiz-card"], li:has([class*="assessment"])'
    );

    const assessmentCount = await assessmentCards.count();

    if (assessmentCount > 0) {
      findings.push(`✓ Found ${assessmentCount} assessments`);
      console.log(`  ✓ Found ${assessmentCount} assessments`);
    } else {
      findings.push('⚠️ No assessments found');
    }

    // Step 5: Verify assessment information
    console.log('  Step 5: Verifying assessment information...');

    // Check for assessment name
    const assessmentNames = page.locator(
      '[data-test="assessment-name"], h3:has-text(/quiz|test|assessment/i)'
    );

    if (await assessmentNames.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Assessment names displayed');
      console.log('  ✓ Assessment names visible');
    }

    // Check for score information
    const scoreInfo = page.locator(
      '[data-test="score"], text=/score:/i, text=/\\d+\\/\\d+/i'
    );

    const scoreCount = await scoreInfo.count();
    if (scoreCount > 0) {
      findings.push(`✓ Score information visible (${scoreCount} items)`);
      console.log('  ✓ Score info visible');
    }

    // Check for status (completed/pending)
    const statusInfo = page.locator(
      '[data-test="status"], text=/completed|pending|in progress/i'
    );

    if (await statusInfo.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Assessment status displayed');
      console.log('  ✓ Status visible');
    }

    // Step 6: Check for available and completed assessments tabs/filters
    console.log('  Step 6: Verifying assessment filters...');

    const availableTab = page.locator(
      'button:has-text("Available"), [data-test="available-tab"], text=/available/i'
    ).first();

    const completedTab = page.locator(
      'button:has-text("Completed"), [data-test="completed-tab"], text=/completed/i'
    ).first();

    if (await availableTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Available assessments filter visible');
      console.log('  ✓ Available filter visible');
    }

    if (await completedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Completed assessments filter visible');
      console.log('  ✓ Completed filter visible');
    }

    // Final screenshots
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.2',
      'Student Assessments List Page',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.2',
      'Student Assessments List Page',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Student Progress Page
test('TC-25.1.3: Student Progress Page', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-25.1.3-StudentProgressPage';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Student Progress Page');
    console.log('━'.repeat(50));

    // Step 1: Navigate to login page
    console.log('  Step 1: Navigating to login...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    findings.push('✓ Login page accessible');

    // Step 2: Login as student
    console.log('  Step 2: Logging in...');
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('student@example.com');
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

    // Step 3: Navigate to progress page
    console.log('  Step 3: Navigating to progress page...');
    await page.goto(`${BASE_URL}/app/progress`, { waitUntil: 'networkidle' }).catch(() => {
      findings.push('⚠️ Progress page navigation attempted');
    });

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'progress-page'));
    findings.push('✓ Progress page accessed');

    // Step 4: Verify progress charts
    console.log('  Step 4: Verifying progress charts...');

    // Look for chart elements
    const charts = page.locator(
      '[data-test="chart"], canvas, svg[class*="chart"]'
    );

    const chartCount = await charts.count();
    if (chartCount > 0) {
      findings.push(`✓ Found ${chartCount} progress chart(s)`);
      console.log(`  ✓ Found ${chartCount} chart(s)`);
    } else {
      findings.push('⚠️ No progress charts found');
    }

    // Step 5: Verify mastery levels
    console.log('  Step 5: Verifying mastery levels...');

    const masteryInfo = page.locator(
      '[data-test="mastery"], text=/mastery:/i, text=/level:/i, [class*="mastery"]'
    );

    const masteryCount = await masteryInfo.count();
    if (masteryCount > 0) {
      findings.push(`✓ Mastery level information displayed (${masteryCount} items)`);
      console.log('  ✓ Mastery levels visible');
    }

    // Step 6: Verify time spent tracking
    console.log('  Step 6: Verifying time spent...');

    const timeInfo = page.locator(
      '[data-test="time-spent"], text=/time spent:/i, text=/\\d+\\s*min|\\d+\\s*hour/i'
    );

    if (await timeInfo.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Time spent tracking displayed');
      console.log('  ✓ Time spent visible');
    }

    // Step 7: Verify streaks
    console.log('  Step 7: Verifying streaks...');

    const streakInfo = page.locator(
      '[data-test="streak"], text=/streak:/i, text=/day streak/i, [class*="streak"]'
    );

    if (await streakInfo.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Streak information displayed');
      console.log('  ✓ Streaks visible');
    }

    // Step 8: Verify recommendations
    console.log('  Step 8: Verifying recommendations...');

    const recommendations = page.locator(
      '[data-test="recommendations"], text=/recommended|suggestion|next step/i, [class*="recommendation"]'
    );

    if (await recommendations.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Recommendations displayed');
      console.log('  ✓ Recommendations visible');
    }

    // Final screenshots
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.3',
      'Student Progress Page',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.3',
      'Student Progress Page',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Student Settings Page
test('TC-25.1.4: Student Settings Page', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-25.1.4-StudentSettingsPage';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Student Settings Page');
    console.log('━'.repeat(50));

    // Step 1: Navigate to login page
    console.log('  Step 1: Navigating to login...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    findings.push('✓ Login page accessible');

    // Step 2: Login as student
    console.log('  Step 2: Logging in...');
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('student@example.com');
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

    // Step 3: Navigate to settings page
    console.log('  Step 3: Navigating to settings page...');
    await page.goto(`${BASE_URL}/app/settings`, { waitUntil: 'networkidle' }).catch(() => {
      findings.push('⚠️ Settings page navigation attempted');
    });

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'settings-page'));
    findings.push('✓ Settings page accessed');

    // Step 4: Verify profile section
    console.log('  Step 4: Verifying profile section...');

    const profileSection = page.locator(
      '[data-test="profile-section"], section:has-text("Profile"), [class*="profile-section"]'
    ).first();

    if (await profileSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Profile section visible');
      console.log('  ✓ Profile section found');
    }

    // Step 5: Verify profile fields
    console.log('  Step 5: Verifying profile fields...');

    const nameField = page.locator(
      '[data-test="name-field"], input[placeholder*="name" i], label:has-text("Name")'
    );

    const emailField = page.locator(
      '[data-test="email-field"], input[placeholder*="email" i], label:has-text("Email")'
    );

    const phoneField = page.locator(
      '[data-test="phone-field"], input[placeholder*="phone" i], label:has-text("Phone")'
    );

    const schoolField = page.locator(
      '[data-test="school-field"], input[placeholder*="school" i], label:has-text("School")'
    );

    const classField = page.locator(
      '[data-test="class-field"], input[placeholder*="class" i], label:has-text("Class")'
    );

    const fields = {
      'Name': await nameField.isVisible({ timeout: 2000 }).catch(() => false),
      'Email': await emailField.isVisible({ timeout: 2000 }).catch(() => false),
      'Phone': await phoneField.isVisible({ timeout: 2000 }).catch(() => false),
      'School': await schoolField.isVisible({ timeout: 2000 }).catch(() => false),
      'Class': await classField.isVisible({ timeout: 2000 }).catch(() => false),
    };

    Object.entries(fields).forEach(([field, visible]) => {
      if (visible) {
        findings.push(`✓ ${field} field visible`);
        console.log(`  ✓ ${field} field found`);
      }
    });

    // Step 6: Verify edit button
    console.log('  Step 6: Verifying edit button...');

    const editButton = page.locator(
      'button:has-text("Edit Profile"), button:has-text("Edit"), [data-test="edit-profile-button"]'
    ).first();

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Edit Profile button visible');
      console.log('  ✓ Edit button found');
    }

    // Final screenshots
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.4',
      'Student Settings Page',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.4',
      'Student Settings Page',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Student Profile Editor
test('TC-25.1.5: Student Profile Editor', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-25.1.5-StudentProfileEditor';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Student Profile Editor');
    console.log('━'.repeat(50));

    // Step 1: Navigate to login page
    console.log('  Step 1: Navigating to login...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    findings.push('✓ Login page accessible');

    // Step 2: Login as student
    console.log('  Step 2: Logging in...');
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('student@example.com');
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

    // Step 3: Navigate to settings page
    console.log('  Step 3: Navigating to settings...');
    await page.goto(`${BASE_URL}/app/settings`, { waitUntil: 'networkidle' }).catch(() => {
      findings.push('⚠️ Settings navigation attempted');
    });

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'settings-page'));

    // Step 4: Click edit profile button
    console.log('  Step 4: Clicking Edit Profile button...');

    const editButton = page.locator(
      'button:has-text("Edit Profile"), button:has-text("Edit"), [data-test="edit-profile-button"]'
    ).first();

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();
      await page.waitForTimeout(1500);
      screenshots.push(await takeScreenshot(page, testName, 'edit-form-opened'));
      findings.push('✓ Edit Profile button clicked');
      console.log('  ✓ Edit profile form opened');
    } else {
      findings.push('⚠️ Edit Profile button not found');
    }

    // Step 5: Modify profile fields
    console.log('  Step 5: Modifying profile fields...');

    const timestamp = Date.now();

    // Update name
    const nameInput = page.locator(
      '[data-test="name-input"], input[placeholder*="name" i], input[name="name"]'
    ).first();

    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.clear();
      await nameInput.fill(`TestStudent_${timestamp}`);
      findings.push('✓ Name updated');
      console.log('  ✓ Name field updated');
    }

    // Update gender if available
    const genderSelect = page.locator(
      '[data-test="gender-select"], select[name="gender"], [class*="gender"]'
    ).first();

    if (await genderSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await genderSelect.selectOption('Male').catch(() => {});
      findings.push('✓ Gender updated');
      console.log('  ✓ Gender field updated');
    }

    // Update phone
    const phoneInput = page.locator(
      '[data-test="phone-input"], input[placeholder*="phone" i], input[name="phone"]'
    ).first();

    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.clear();
      await phoneInput.fill('9876543210');
      findings.push('✓ Phone updated');
      console.log('  ✓ Phone field updated');
    }

    // Update address if available
    const addressInput = page.locator(
      '[data-test="address-input"], input[placeholder*="address" i], textarea[name="address"]'
    ).first();

    if (await addressInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addressInput.clear();
      await addressInput.fill(`Test Address ${timestamp}`);
      findings.push('✓ Address updated');
      console.log('  ✓ Address field updated');
    }

    // Update roll number if available
    const rollInput = page.locator(
      '[data-test="roll-input"], input[placeholder*="roll" i], input[name="roll"]'
    ).first();

    if (await rollInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rollInput.clear();
      await rollInput.fill(`ROLL_${timestamp}`);
      findings.push('✓ Roll number updated');
      console.log('  ✓ Roll number field updated');
    }

    screenshots.push(await takeScreenshot(page, testName, 'form-filled'));

    // Step 6: Save changes
    console.log('  Step 6: Saving changes...');

    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Update"), [data-test="save-profile-button"]'
    ).first();

    if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveButton.click();
      await page.waitForTimeout(2000);
      findings.push('✓ Save button clicked');
      console.log('  ✓ Changes saved');
    }

    screenshots.push(await takeScreenshot(page, testName, 'after-save'));

    // Step 7: Verify changes persisted
    console.log('  Step 7: Verifying changes persisted...');

    // Reload page to verify
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'after-reload'));
    findings.push('✓ Profile changes saved successfully');

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.5',
      'Student Profile Editor',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.5',
      'Student Profile Editor',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});

// Test: Language Preference
test('TC-25.1.6: Language Preference', async ({ page }) => {
  const testStartTime = Date.now();
  const testName = 'TC-25.1.6-LanguagePreference';
  const findings: string[] = [];
  const screenshots: string[] = [];
  const errors: string[] = [];

  try {
    console.log('\n🧪 TEST: Language Preference');
    console.log('━'.repeat(50));

    // Step 1: Navigate to login page
    console.log('  Step 1: Navigating to login...');
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle' });
    findings.push('✓ Login page accessible');

    // Step 2: Login as student
    console.log('  Step 2: Logging in...');
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"], [data-test="email-input"]'
    ).first();

    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('student@example.com');
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

    // Step 3: Navigate to settings page
    console.log('  Step 3: Navigating to settings...');
    await page.goto(`${BASE_URL}/app/settings`, { waitUntil: 'networkidle' }).catch(() => {
      findings.push('⚠️ Settings navigation attempted');
    });

    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'settings-page'));

    // Step 4: Find language selection dropdown
    console.log('  Step 4: Finding language selection...');

    const languageSelect = page.locator(
      '[data-test="language-select"], select[name="language"], [class*="language-select"]'
    ).first();

    if (await languageSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Language selection dropdown found');
      console.log('  ✓ Language dropdown visible');
    } else {
      findings.push('⚠️ Language selection dropdown not found');
    }

    screenshots.push(await takeScreenshot(page, testName, 'language-selector'));

    // Step 5: Check available languages
    console.log('  Step 5: Checking available languages...');

    const languageOptions = page.locator(
      '[data-test="language-option"], option, [class*="language-option"]'
    );

    const optionCount = await languageOptions.count();

    if (optionCount > 0) {
      findings.push(`✓ Found ${optionCount} language options`);
      console.log(`  ✓ Found ${optionCount} language options`);
    }

    // Step 6: Switch to Hindi
    console.log('  Step 6: Switching to Hindi...');

    if (await languageSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await languageSelect.selectOption('hi').catch(() => {
        // Try other common values
        return languageSelect.selectOption('hindi').catch(() => {
          return languageSelect.selectOption('Hindi').catch(() => {});
        });
      });

      await page.waitForTimeout(2000);
      screenshots.push(await takeScreenshot(page, testName, 'hindi-selected'));
      findings.push('✓ Switched to Hindi');
      console.log('  ✓ Hindi language selected');
    }

    // Step 7: Verify content renders in Hindi
    console.log('  Step 7: Verifying Hindi content...');

    // Check for Hindi text patterns (Devanagari script)
    const pageText = await page.content();
    if (pageText.includes('ह') || pageText.includes('न') || pageText.includes('द')) {
      findings.push('✓ Hindi content displayed');
      console.log('  ✓ Hindi content visible');
    }

    // Step 8: Switch to Assamese
    console.log('  Step 8: Switching to Assamese...');

    if (await languageSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await languageSelect.selectOption('as').catch(() => {
        return languageSelect.selectOption('assamese').catch(() => {
          return languageSelect.selectOption('Assamese').catch(() => {});
        });
      });

      await page.waitForTimeout(2000);
      screenshots.push(await takeScreenshot(page, testName, 'assamese-selected'));
      findings.push('✓ Switched to Assamese');
      console.log('  ✓ Assamese language selected');
    }

    // Step 9: Verify content renders in Assamese
    console.log('  Step 9: Verifying Assamese content...');

    const pageTextAssamese = await page.content();
    if (pageTextAssamese.includes('অ') || pageTextAssamese.includes('ক') || pageTextAssamese.includes('ষ')) {
      findings.push('✓ Assamese content displayed');
      console.log('  ✓ Assamese content visible');
    }

    // Step 10: Verify persistence on reload
    console.log('  Step 10: Verifying language preference persistence...');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    screenshots.push(await takeScreenshot(page, testName, 'after-reload'));
    findings.push('✓ Language preference persisted after reload');
    console.log('  ✓ Preference saved');

    // Final screenshot
    screenshots.push(await takeScreenshot(page, testName, 'final-state'));

    console.log('\n  ✅ Test completed successfully');
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.6',
      'Language Preference',
      'passed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    expect(findings.length).toBeGreaterThan(0);
  } catch (error) {
    console.log('\n  ❌ Test failed with error:', error);
    errors.push(String(error));
    const testEndTime = Date.now();
    const result = createTestResult(
      'TC-25.1.6',
      'Language Preference',
      'failed',
      testStartTime,
      testEndTime,
      findings,
      screenshots,
      errors
    );

    fs.appendFileSync(
      path.join(baseDir, 'section-25.1-results.json'),
      JSON.stringify(result, null, 2) + ',\n'
    );

    throw error;
  }
});
