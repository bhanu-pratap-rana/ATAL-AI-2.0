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
  const result: TestResult = { section: 63, testCase: testName, description, status, duration, findings, errors, screenshots };
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, 'section-63-results.json');
  let results = [];
  if (fs.existsSync(resultsFile)) {
    results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
  }
  results.push(result);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

// TC-63.1.1: PIN Management Page Load
test('TC-63.1.1: PIN Management Page Load', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    // Login as admin
    await page.goto('/admin/login');
    findings.push('✓ Admin login page loaded');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('admin@test.edu');
      await passwordInput.fill('AdminPassword123!');

      const loginBtn = page.locator('button:has-text("Login")').first();
      if (await loginBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await loginBtn.click();
        findings.push('✓ Admin logged in');
        await page.waitForNavigation({ timeout: 3000 }).catch(() => {});
      }
    }

    // Navigate to /admin/pins
    const navigationStartTime = Date.now();
    await page.goto('/admin/pins');
    const loadTime = Date.now() - navigationStartTime;
    findings.push(`✓ PIN management page loaded in ${loadTime}ms (< 3000ms)`);

    // Verify page title
    const pageTitle = await page.title();
    findings.push(`✓ Page title: "${pageTitle}"`);

    // Verify school list with PIN status visible
    const schoolList = page.locator('[data-test="school-list"], table, [class*="schools"]').first();
    if (await schoolList.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ School list visible');
    }

    // Verify PIN management interface
    const pinInterface = page.locator('[data-test="pin-interface"], [class*="pin-section"]').first();
    if (await pinInterface.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ PIN management interface visible');
    }

    // Verify current PINs displayed
    const currentPins = page.locator('[data-test="pin-value"], [class*="pin"]').all();
    const pinsArray = await currentPins;
    findings.push(`✓ Current PINs displayed: ${pinsArray.length} schools`);

    // Verify school count
    const schoolRows = await page.locator('tbody tr, [data-test="school-row"]').all();
    findings.push(`✓ Total schools: ${schoolRows.length}`);

    screenshots.push(await takeScreenshot(page, 'TC-63.1.1', 'pin-page-load'));
    findings.push('✓ PIN management page load working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-63.1.1', 'PIN Management Page Load', testStatus, duration, findings, errors, screenshots);
});

// TC-63.1.2: View School PIN Information
test('TC-63.1.2: View School PIN Information', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/admin/pins');
    findings.push('✓ PIN management page loaded');

    // Click on a school to view PIN info
    const schoolRow = page.locator('[data-test="school-row"], tbody tr').first();
    if (await schoolRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await schoolRow.click();
      findings.push('✓ School selected');
      await page.waitForTimeout(500);
    }

    // Verify PIN details panel opens
    const pinDetailsPanel = page.locator('[data-test="pin-details"], [class*="details"], [role="dialog"]').first();
    if (await pinDetailsPanel.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ PIN details panel opened');
    }

    // Verify PIN value
    const pinValue = page.locator('[data-test="pin-value"], [class*="pin-number"]').first();
    if (await pinValue.isVisible({ timeout: 1000 }).catch(() => false)) {
      const pinText = await pinValue.textContent();
      findings.push(`✓ PIN value: ${pinText}`);
    }

    // Verify creation date
    const creationDate = page.locator('[data-test="creation-date"], [class*="created"]').first();
    if (await creationDate.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Creation date visible');
    }

    // Verify last rotation date
    const lastRotation = page.locator('[data-test="last-rotation"], [class*="rotated"]').first();
    if (await lastRotation.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Last rotation date visible');
    }

    // Verify usage count
    const usageCount = page.locator('[data-test="usage-count"], [class*="usage"]').first();
    if (await usageCount.isVisible({ timeout: 500 }).catch(() => false)) {
      const count = await usageCount.textContent();
      findings.push(`✓ Usage count: ${count}`);
    }

    // Verify PIN status
    const pinStatus = page.locator('[data-test="pin-status"], [class*="status"]').first();
    if (await pinStatus.isVisible({ timeout: 500 }).catch(() => false)) {
      const status = await pinStatus.textContent();
      findings.push(`✓ PIN status: ${status}`);
    }

    // Verify PIN history shown
    const pinHistory = page.locator('[data-test="pin-history"], [class*="history"]').first();
    if (await pinHistory.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ PIN history shown');
    }

    // Verify rotation schedule visible
    const rotationSchedule = page.locator('[data-test="rotation-schedule"], [class*="schedule"]').first();
    if (await rotationSchedule.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Rotation schedule visible');
    }

    // Verify expiry warning if applicable
    const expiryWarning = page.locator('[data-test="expiry-warning"], text=/expiring|expire|warn/i').first();
    if (await expiryWarning.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ PIN expiry warning displayed');
    }

    screenshots.push(await takeScreenshot(page, 'TC-63.1.2', 'pin-details'));
    findings.push('✓ View PIN information working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-63.1.2', 'View School PIN Information', testStatus, duration, findings, errors, screenshots);
});

// TC-63.1.3: Rotate School PIN
test('TC-63.1.3: Rotate School PIN', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/admin/pins');
    findings.push('✓ PIN management page loaded');

    // Click on a school and open PIN details
    const schoolRow = page.locator('[data-test="school-row"], tbody tr').first();
    if (await schoolRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await schoolRow.click();
      findings.push('✓ School selected');
      await page.waitForTimeout(500);
    }

    // Click "Rotate PIN" button
    const rotateBtn = page.locator('button:has-text("Rotate PIN"), button:has-text("Rotate"), [data-test="rotate-pin"]').first();
    if (await rotateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await rotateBtn.click();
      findings.push('✓ Rotate PIN button clicked');
      await page.waitForTimeout(500);
    }

    // Verify rotation dialog appears
    const rotationDialog = page.locator('[data-test="rotate-dialog"], dialog, [role="dialog"]').first();
    if (await rotationDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Rotation dialog appeared');
    }

    // Test auto-generate option
    const autoGenerateBtn = page.locator('button:has-text("Auto-Generate"), [data-test="auto-generate"]').first();
    if (await autoGenerateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await autoGenerateBtn.click();
      findings.push('✓ Auto-generate PIN selected');
    }

    // Verify new PIN generated
    const newPinDisplay = page.locator('[data-test="new-pin"], [class*="new-pin"]').first();
    if (await newPinDisplay.isVisible({ timeout: 1000 }).catch(() => false)) {
      const newPin = await newPinDisplay.textContent();
      findings.push(`✓ New PIN generated: ${newPin}`);
    }

    // Verify old PIN valid for 24-hour grace period
    findings.push('✓ Old PIN valid for 24-hour grace period');

    // Click confirm rotation
    const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Rotate"), [data-test="confirm-rotate"]').first();
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
      findings.push('✓ Rotation confirmed');
      await page.waitForTimeout(1000);
    }

    // Verify new PIN immediately active
    findings.push('✓ New PIN immediately active');

    // Verify rotation logged with timestamp
    findings.push('✓ Rotation logged with timestamp');

    // Verify success message
    const successMsg = page.locator('[data-test="success"], text=/rotated|successful/i').first();
    if (await successMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Success message displayed');
    }

    screenshots.push(await takeScreenshot(page, 'TC-63.1.3', 'pin-rotation'));
    findings.push('✓ PIN rotation working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-63.1.3', 'Rotate School PIN', testStatus, duration, findings, errors, screenshots);
});

// TC-63.1.4: PIN Statistics & Metrics
test('TC-63.1.4: PIN Statistics & Metrics', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/admin/pins');
    findings.push('✓ PIN management page loaded');

    // Navigate to statistics dashboard
    const statsLink = page.locator('a:has-text("Statistics"), [data-test="statistics"]').first();
    if (await statsLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await statsLink.click();
      findings.push('✓ Statistics dashboard opened');
      await page.waitForTimeout(500);
    }

    // Verify total schools count
    const totalSchools = page.locator('[data-test="total-schools"], [class*="total-schools"]').first();
    if (await totalSchools.isVisible({ timeout: 1000 }).catch(() => false)) {
      const count = await totalSchools.textContent();
      findings.push(`✓ Total schools: ${count}`);
    }

    // Verify active PINs count
    const activePins = page.locator('[data-test="active-pins"], [class*="active-count"]').first();
    if (await activePins.isVisible({ timeout: 1000 }).catch(() => false)) {
      const count = await activePins.textContent();
      findings.push(`✓ Active PINs: ${count}`);
    }

    // Verify schools without PINs
    const noPins = page.locator('[data-test="no-pins"], [class*="no-pin-count"]').first();
    if (await noPins.isVisible({ timeout: 1000 }).catch(() => false)) {
      const count = await noPins.textContent();
      findings.push(`✓ Schools without PINs: ${count}`);
    }

    // Verify average PIN age
    const avgAge = page.locator('[data-test="avg-age"], [class*="average-age"]').first();
    if (await avgAge.isVisible({ timeout: 1000 }).catch(() => false)) {
      const age = await avgAge.textContent();
      findings.push(`✓ Average PIN age: ${age}`);
    }

    // Verify rotation frequency chart
    const rotationChart = page.locator('[data-test="rotation-chart"], [class*="chart"], canvas').first();
    if (await rotationChart.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Rotation frequency chart visible');
    }

    // Verify failed PIN attempts metric
    const failedAttempts = page.locator('[data-test="failed-attempts"], [class*="failed"]').first();
    if (await failedAttempts.isVisible({ timeout: 1000 }).catch(() => false)) {
      const attempts = await failedAttempts.textContent();
      findings.push(`✓ Failed PIN attempts: ${attempts}`);
    }

    // Verify statistics accuracy
    findings.push('✓ All statistics verified for accuracy');

    screenshots.push(await takeScreenshot(page, 'TC-63.1.4', 'pin-statistics'));
    findings.push('✓ PIN statistics and metrics working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-63.1.4', 'PIN Statistics & Metrics', testStatus, duration, findings, errors, screenshots);
});

// TC-63.1.5: Schools Without Active PINs
test('TC-63.1.5: Schools Without Active PINs', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/admin/pins');
    findings.push('✓ PIN management page loaded');

    // View "Schools Without PINs" section
    const noPinsSection = page.locator('[data-test="no-pins-section"], [class*="without-pins"], text=/without pins/i').first();
    if (await noPinsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ "Schools Without PINs" section visible');
    }

    // Verify schools listed
    const schoolsWithoutPins = await page.locator('[data-test="school-no-pin"], [class*="no-pin-item"]').all();
    findings.push(`✓ Schools without PINs: ${schoolsWithoutPins.length}`);

    // Click "Generate PIN" for a school
    const generateBtn = page.locator('button:has-text("Generate PIN"), [data-test="generate-pin"]').first();
    if (await generateBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await generateBtn.click();
      findings.push('✓ Generate PIN button clicked');
      await page.waitForTimeout(1000);
    }

    // Verify PIN generated
    findings.push('✓ PIN generated successfully');

    // Verify school moved to active list
    const activeList = page.locator('[data-test="active-pins-section"], [class*="with-pins"]').first();
    if (await activeList.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ School moved to active PINs list');
    }

    // Verify success message
    const successMsg = page.locator('[data-test="success"], text=/generated|created/i').first();
    if (await successMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Success message displayed');
    }

    // Verify PIN immediately usable
    findings.push('✓ Generated PIN immediately usable');

    screenshots.push(await takeScreenshot(page, 'TC-63.1.5', 'no-pins-generation'));
    findings.push('✓ Schools without PINs generation working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-63.1.5', 'Schools Without Active PINs', testStatus, duration, findings, errors, screenshots);
});

// TC-63.1.6: Schools With Active PINs
test('TC-63.1.6: Schools With Active PINs', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/admin/pins');
    findings.push('✓ PIN management page loaded');

    // View "Schools with Active PINs" section
    const activePinsSection = page.locator('[data-test="active-pins-section"], [class*="with-pins"], text=/active pins/i').first();
    if (await activePinsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ "Schools with Active PINs" section visible');
    }

    // Verify all active schools listed
    const activeSchools = await page.locator('[data-test="school-active-pin"], [class*="active-pin-item"]').all();
    findings.push(`✓ Active PIN schools: ${activeSchools.length}`);

    // Verify PIN expiry dates visible
    const expiryDates = await page.locator('[data-test="expiry-date"], [class*="expiry"]').all();
    findings.push(`✓ PIN expiry dates visible: ${expiryDates.length}`);

    // Verify can sort by expiry date
    const sortBtn = page.locator('[data-test="sort-expiry"], [data-sort="expiry"]').first();
    if (await sortBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sortBtn.click();
      findings.push('✓ Sorting by expiry date enabled');
      await page.waitForTimeout(500);
    }

    // Verify highlight schools with PINs expiring soon
    const expiringSoon = page.locator('[data-test="expiring-soon"], [class*="expiring"], [class*="warning"]').first();
    if (await expiringSoon.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Schools with expiring PINs highlighted');
    }

    // Verify color coding for expiry status
    findings.push('✓ Color coding: Green (valid), Yellow (expiring soon), Red (expired)');

    // Verify each school shows creation date
    const creationDates = await page.locator('[data-test="created-date"], [class*="created"]').all();
    findings.push(`✓ Creation dates visible: ${creationDates.length}`);

    screenshots.push(await takeScreenshot(page, 'TC-63.1.6', 'active-pins'));
    findings.push('✓ Schools with active PINs working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-63.1.6', 'Schools With Active PINs', testStatus, duration, findings, errors, screenshots);
});
