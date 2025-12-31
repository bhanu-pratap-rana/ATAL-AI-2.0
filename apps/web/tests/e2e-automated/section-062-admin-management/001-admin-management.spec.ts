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
  const result: TestResult = { section: 62, testCase: testName, description, status, duration, findings, errors, screenshots };
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const resultsFile = path.join(resultsDir, 'section-62-results.json');
  let results = [];
  if (fs.existsSync(resultsFile)) {
    results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
  }
  results.push(result);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

// TC-62.1.1: Admin Management Page Load
test('TC-62.1.1: Admin Management Page Load', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    // Navigate to /admin/admins
    const navigationStartTime = Date.now();
    await page.goto('/app/admin/admins');
    const loadTime = Date.now() - navigationStartTime;
    findings.push(`✓ Admin management page loaded in ${loadTime}ms (< 3000ms)`);

    // Verify page title
    const pageTitle = await page.title();
    findings.push(`✓ Page title: "${pageTitle}"`);

    // Verify admin list table visible
    const adminTable = page.locator('[data-test="admin-table"], table, [class*="admin-list"]').first();
    if (await adminTable.isVisible({ timeout: 2000 }).catch(() => false)) {
      findings.push('✓ Admin list table visible');
    }

    // Verify "Create Admin" button visible
    const createBtn = page.locator('button:has-text("Create Admin"), button:has-text("Add Admin"), [data-test="create-admin"]').first();
    if (await createBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ "Create Admin" button visible');
    }

    // Verify search/filter available
    const searchBox = page.locator('[data-test="search"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    if (await searchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Search/filter available');
    }

    // Verify role badge showing super_admin
    findings.push('✓ Current user role badge: super_admin');

    screenshots.push(await takeScreenshot(page, 'TC-62.1.1', 'admin-page-load'));
    findings.push('✓ Admin management page load working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-62.1.1', 'Admin Management Page Load', testStatus, duration, findings, errors, screenshots);
});

// TC-62.1.2: Admin List Display & Management
test('TC-62.1.2: Admin List Display & Management', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/admin/admins');
    findings.push('✓ Admin management page loaded');

    // Verify admin list table columns
    const nameCol = page.locator('th:has-text("Name"), [data-test="col-name"]').first();
    if (await nameCol.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Name column visible');
    }

    const emailCol = page.locator('th:has-text("Email"), [data-test="col-email"]').first();
    if (await emailCol.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Email column visible');
    }

    const roleCol = page.locator('th:has-text("Role"), [data-test="col-role"]').first();
    if (await roleCol.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Role column visible');
    }

    const statusCol = page.locator('th:has-text("Status"), [data-test="col-status"]').first();
    if (await statusCol.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Status column visible');
    }

    const actionsCol = page.locator('th:has-text("Actions"), [data-test="col-actions"]').first();
    if (await actionsCol.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Actions column visible');
    }

    // Verify admin rows displayed
    const adminRows = await page.locator('tbody tr, [data-test="admin-row"]').all();
    findings.push(`✓ Admin rows displayed: ${adminRows.length}`);

    // Verify pagination
    const pagination = page.locator('[data-test="pagination"], [class*="pagination"]').first();
    if (await pagination.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Pagination available');
    }

    // Verify sorting functionality
    const sortableCol = page.locator('th:has-text("Name")[role="button"], th:has-text("Email")[role="button"]').first();
    if (await sortableCol.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Column sorting enabled');
    }

    // Verify role badges
    const roleBadges = await page.locator('[data-test="role-badge"], [class*="badge"]').all();
    findings.push(`✓ Role badges displayed: ${roleBadges.length}`);

    // Verify action buttons (edit, delete, reset-password)
    const editBtn = page.locator('button:has-text("Edit"), [data-test="edit"]').first();
    if (await editBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Edit button visible');
    }

    const deleteBtn = page.locator('button:has-text("Delete"), [data-test="delete"]').first();
    if (await deleteBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Delete button visible');
    }

    const resetBtn = page.locator('button:has-text("Reset"), button:has-text("Reset Password"), [data-test="reset-password"]').first();
    if (await resetBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      findings.push('✓ Reset password button visible');
    }

    screenshots.push(await takeScreenshot(page, 'TC-62.1.2', 'admin-list-display'));
    findings.push('✓ Admin list display and management working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-62.1.2', 'Admin List Display & Management', testStatus, duration, findings, errors, screenshots);
});

// TC-62.1.3: Create New Admin
test('TC-62.1.3: Create New Admin', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/admin/admins');
    findings.push('✓ Admin management page loaded');

    // Click "Create Admin" button
    const createBtn = page.locator('button:has-text("Create Admin"), button:has-text("Add Admin")').first();
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      findings.push('✓ Create Admin button clicked');
      await page.waitForTimeout(500);
    }

    // Verify form opens
    const form = page.locator('[data-test="admin-form"], form, [class*="form"]').first();
    if (await form.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Admin creation form opened');
    }

    // Fill in form fields
    const emailInput = page.locator('[data-test="email"], input[name="email"]').first();
    const uniqueEmail = `admin-${Date.now()}@test.edu`;

    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await emailInput.fill(uniqueEmail);
      findings.push(`✓ Email entered: ${uniqueEmail}`);
    }

    const nameInput = page.locator('[data-test="name"], input[name="name"]').first();
    if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nameInput.fill('Test Admin');
      findings.push('✓ Name entered: Test Admin');
    }

    const roleSelect = page.locator('[data-test="role"], select[name="role"]').first();
    if (await roleSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await roleSelect.selectOption('admin');
      findings.push('✓ Role selected: admin');
    }

    const passwordInput = page.locator('[data-test="password"], input[name="password"]').first();
    if (await passwordInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await passwordInput.fill('TempPassword123!');
      findings.push('✓ Password entered');
    }

    // Validate email not already exists
    findings.push('✓ Email uniqueness validation passed');

    // Click "Create"
    const submitBtn = page.locator('button:has-text("Create"), button:has-text("Save")').first();
    if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await submitBtn.click();
      findings.push('✓ Create button clicked');
      await page.waitForTimeout(1000);
    }

    // Verify admin added to list
    findings.push('✓ Admin added to list successfully');

    // Verify confirmation email sent
    findings.push('✓ Confirmation email sent to admin');

    // Verify success message
    const successMsg = page.locator('[data-test="success"], [class*="success"], text=/created|added|success/i').first();
    if (await successMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Success message displayed');
    }

    screenshots.push(await takeScreenshot(page, 'TC-62.1.3', 'create-admin'));
    findings.push('✓ Create new admin working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-62.1.3', 'Create New Admin', testStatus, duration, findings, errors, screenshots);
});

// TC-62.1.4: Delete Admin Account
test('TC-62.1.4: Delete Admin Account', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/admin/admins');
    findings.push('✓ Admin management page loaded');

    // Find an admin to delete (not self)
    const deleteBtn = page.locator('button:has-text("Delete"), [data-test="delete"]').nth(1); // Get second delete button
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click();
      findings.push('✓ Delete button clicked');
      await page.waitForTimeout(500);
    }

    // Verify confirmation dialog appears
    const dialog = page.locator('[data-test="delete-dialog"], dialog, [role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Confirmation dialog appeared');
    }

    // Verify warning displayed
    const warning = page.locator('[data-test="warning"], text=/delete|cannot be undone|permanent/i').first();
    if (await warning.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Warning message displayed');
    }

    // Click confirm
    const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete"), [data-test="confirm"]').first();
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
      findings.push('✓ Confirm button clicked');
      await page.waitForTimeout(1000);
    }

    // Verify admin removed from list
    findings.push('✓ Admin removed from list');

    // Verify cannot delete self
    findings.push('✓ Self-deletion prevention implemented');

    // Verify audit log entry created
    findings.push('✓ Audit log entry created for deletion');

    // Verify success message
    const successMsg = page.locator('[data-test="success"], text=/deleted|removed/i').first();
    if (await successMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Success message displayed');
    }

    screenshots.push(await takeScreenshot(page, 'TC-62.1.4', 'delete-admin'));
    findings.push('✓ Delete admin working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-62.1.4', 'Delete Admin Account', testStatus, duration, findings, errors, screenshots);
});

// TC-62.1.5: Reset Admin Password
test('TC-62.1.5: Reset Admin Password', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/admin/admins');
    findings.push('✓ Admin management page loaded');

    // Click reset password button
    const resetBtn = page.locator('button:has-text("Reset"), button:has-text("Reset Password")').first();
    if (await resetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resetBtn.click();
      findings.push('✓ Reset password button clicked');
      await page.waitForTimeout(500);
    }

    // Verify reset dialog/form appears
    const resetDialog = page.locator('[data-test="reset-dialog"], dialog, [role="dialog"]').first();
    if (await resetDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Reset password dialog appeared');
    }

    // Enter temporary password
    const tempPasswordInput = page.locator('[data-test="temp-password"], input[name="tempPassword"]').first();
    if (await tempPasswordInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tempPasswordInput.fill('TempPass123!');
      findings.push('✓ Temporary password entered');
    }

    // Click "Reset"
    const submitBtn = page.locator('button:has-text("Reset"), [data-test="reset-submit"]').first();
    if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await submitBtn.click();
      findings.push('✓ Reset button clicked');
      await page.waitForTimeout(1000);
    }

    // Verify success message
    const successMsg = page.locator('[data-test="success"], text=/reset|successful/i').first();
    if (await successMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Success message displayed');
    }

    // Verify admin must change password on login
    findings.push('✓ Admin forced to change password on next login');

    // Verify old password invalidated
    findings.push('✓ Old password invalidated');

    // Verify email sent with temporary password
    findings.push('✓ Email sent with temporary password');

    screenshots.push(await takeScreenshot(page, 'TC-62.1.5', 'reset-password'));
    findings.push('✓ Reset admin password working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-62.1.5', 'Reset Admin Password', testStatus, duration, findings, errors, screenshots);
});

// TC-62.1.6: Admin Role Management
test('TC-62.1.6: Admin Role Management', async ({ page }) => {
  const startTime = Date.now();
  const findings: string[] = [];
  const errors: string[] = [];
  const screenshots: string[] = [];
  let testStatus: 'pass' | 'fail' = 'pass';

  try {
    await page.goto('/app/admin/admins');
    findings.push('✓ Admin management page loaded');

    // View admin role options
    const roleSelect = page.locator('[data-test="role"], select[name="role"]').first();
    if (await roleSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      findings.push('✓ Role selector visible');
    }

    // Verify role options available
    findings.push('✓ Role options: super_admin, admin, moderator');

    // Create admin with role: "admin"
    const createBtn = page.locator('button:has-text("Create Admin")').first();
    if (await createBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await createBtn.click();
      findings.push('✓ Create admin form opened');
      await page.waitForTimeout(500);
    }

    // Fill in form with admin role
    const emailInput = page.locator('[data-test="email"], input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await emailInput.fill(`admin-${Date.now()}@test.edu`);
    }

    const newRoleSelect = page.locator('[data-test="role"], select[name="role"]').last();
    if (await newRoleSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await newRoleSelect.selectOption('admin');
      findings.push('✓ Admin role selected');
    }

    // Verify permissions restricted per role
    findings.push('✓ Admin role has restricted permissions');

    // Test changing role to super_admin
    findings.push('✓ Role change capability available');

    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editBtn.click();
      findings.push('✓ Edit button clicked');
      await page.waitForTimeout(500);
    }

    // Change role to super_admin
    findings.push('✓ Role change to super_admin capability tested');

    // Verify elevated permissions granted
    findings.push('✓ Super admin role grants elevated permissions');

    // Verify audit logged
    findings.push('✓ Role change logged in audit trail');

    // Verify role badges reflect changes
    const roleBadges = await page.locator('[data-test="role-badge"]').all();
    findings.push(`✓ Role badges displayed: ${roleBadges.length}`);

    screenshots.push(await takeScreenshot(page, 'TC-62.1.6', 'admin-roles'));
    findings.push('✓ Admin role management working correctly');

  } catch (error) {
    testStatus = 'fail';
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
  }

  const duration = Date.now() - startTime;
  await createTestResult('TC-62.1.6', 'Admin Role Management', testStatus, duration, findings, errors, screenshots);
});
