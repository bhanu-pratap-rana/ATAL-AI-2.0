/**
 * ATAL AI - Admin Flow Visual Tests with Screenshots
 *
 * Captures screenshots at each step to analyze:
 * - Admin dashboard and management UI
 * - Theme consistency
 * - Admin-specific features
 * - PIN management, school management, etc.
 */

import { test, expect } from '@playwright/test'
import {
  captureStep,
  waitForStable,
  resetCounter,
  TEST_CREDENTIALS,
} from './screenshot-utils'

const FLOW = 'admin'

test.describe('Admin Flow Visual Analysis', () => {
  test.beforeEach(async ({ page }) => {
    resetCounter(FLOW)
  })

  test('VA-001: Admin Login Page', async ({ page }) => {
    // Admin login page
    await page.goto('/admin/login')
    await waitForStable(page)
    await captureStep(page, FLOW, '01-admin-login-page')

    // Fill credentials
    const emailInput = page.getByLabel(/Email/i)
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_CREDENTIALS.admin.email)
      await captureStep(page, FLOW, '02-email-filled')
    }

    const passwordInput = page.getByLabel(/Password/i)
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(TEST_CREDENTIALS.admin.password)
      await captureStep(page, FLOW, '03-password-filled')
    }
  })

  test('VA-002: Admin Login Flow', async ({ page }) => {
    // Navigate to admin login
    await page.goto('/admin/login')
    await waitForStable(page)
    await captureStep(page, FLOW, '10-login-start')

    // Fill and submit
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()
    await waitForStable(page)

    // Wait for redirect
    try {
      await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 })
      await captureStep(page, FLOW, '11-login-success')
    } catch {
      await captureStep(page, FLOW, '11-login-result')
    }
  })

  test('VA-003: Admin Dashboard', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 })
    } catch {
      // May already be logged in
    }

    // Dashboard
    await page.goto('/admin/dashboard')
    await waitForStable(page)
    await captureStep(page, FLOW, '20-dashboard-overview')

    // Capture metrics/stats cards
    const metricsSection = page.locator('[class*="card"]').first()
    if (await metricsSection.isVisible()) {
      await captureStep(page, FLOW, '21-metrics-cards')
    }

    // Scroll for more content
    await page.evaluate(() => window.scrollBy(0, 500))
    await captureStep(page, FLOW, '22-dashboard-scrolled')

    // Full page
    await page.evaluate(() => window.scrollBy(0, 500))
    await captureStep(page, FLOW, '23-dashboard-full')
  })

  test('VA-004: Admin - Schools Management', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Schools page
    await page.goto('/app/admin/schools')
    await waitForStable(page)
    await captureStep(page, FLOW, '30-schools-page')

    // Search/filter
    const searchInput = page.getByPlaceholder(/Search/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test')
      await waitForStable(page)
      await captureStep(page, FLOW, '31-schools-search')
    }

    // School list
    await page.evaluate(() => window.scrollBy(0, 300))
    await captureStep(page, FLOW, '32-schools-list')
  })

  test('VA-005: Admin - PIN Management', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // PIN management page
    await page.goto('/admin/pins')
    await waitForStable(page)
    await captureStep(page, FLOW, '40-pins-page')

    // Check for PIN statistics
    const statsSection = page.getByText(/Statistics|Usage|Active/i)
    if (await statsSection.isVisible()) {
      await captureStep(page, FLOW, '41-pin-stats')
    }

    // Check for generate button
    const generateButton = page.getByRole('button', { name: /Generate|Create|New/i })
    if (await generateButton.isVisible()) {
      await captureStep(page, FLOW, '42-generate-button')
    }

    // Scroll for PIN list
    await page.evaluate(() => window.scrollBy(0, 400))
    await captureStep(page, FLOW, '43-pins-list')
  })

  test('VA-006: Admin - Manage Admins', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Admin management page
    await page.goto('/admin/admins')
    await waitForStable(page)
    await captureStep(page, FLOW, '50-admins-list-page')

    // Check for admin table
    const adminTable = page.locator('table')
    if (await adminTable.isVisible()) {
      await captureStep(page, FLOW, '51-admins-table')
    }

    // Check for create admin button
    const createButton = page.getByRole('button', { name: /Create|Add|New/i })
    if (await createButton.isVisible()) {
      await createButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '52-create-admin-dialog')
    }
  })

  test('VA-007: Admin - Create Admin Flow', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Create admin page
    await page.goto('/admin/create')
    await waitForStable(page)
    await captureStep(page, FLOW, '60-create-admin-page')

    // Fill form fields
    const emailInput = page.getByLabel(/Email/i)
    if (await emailInput.isVisible()) {
      await emailInput.fill('test.new.admin@example.com')
      await captureStep(page, FLOW, '61-create-email-filled')
    }

    const nameInput = page.getByLabel(/Name/i)
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Admin')
      await captureStep(page, FLOW, '62-create-name-filled')
    }

    // Role selection
    const roleSelect = page.getByLabel(/Role/i)
    if (await roleSelect.isVisible()) {
      await captureStep(page, FLOW, '63-role-selection')
    }
  })

  test('VA-008: Admin - Manage Page (Admin Operations)', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Manage page
    await page.goto('/admin/manage')
    await waitForStable(page)
    await captureStep(page, FLOW, '70-manage-page')

    // Check for different management sections
    await page.evaluate(() => window.scrollBy(0, 300))
    await captureStep(page, FLOW, '71-manage-sections')
  })

  test('VA-009: Admin - Setup Page', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Setup page
    await page.goto('/admin/setup')
    await waitForStable(page)
    await captureStep(page, FLOW, '80-setup-page')

    // Check for setup options
    await page.evaluate(() => window.scrollBy(0, 300))
    await captureStep(page, FLOW, '81-setup-options')
  })

  test('VA-010: Admin Navigation & Layout', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Dashboard for navigation capture
    await page.goto('/admin/dashboard')
    await waitForStable(page)
    await captureStep(page, FLOW, '90-admin-nav-desktop')

    // Check sidebar/navigation
    const sidebar = page.locator('nav, [class*="sidebar"]')
    if (await sidebar.isVisible()) {
      await captureStep(page, FLOW, '91-sidebar-nav')
    }

    // Header section
    const header = page.locator('header')
    if (await header.isVisible()) {
      await captureStep(page, FLOW, '92-header-section')
    }

    // Check for user menu/profile
    const userMenu = page.getByRole('button', { name: /Profile|User|Account/i })
    if (await userMenu.isVisible()) {
      await userMenu.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '93-user-menu-open')
    }
  })

  test('VA-011: Admin - Delete/Reset Actions', async ({ page }) => {
    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Go to admin list
    await page.goto('/admin/admins')
    await waitForStable(page)
    await captureStep(page, FLOW, '100-admin-list-for-actions')

    // Check for action buttons (don't click delete)
    const actionButtons = page.getByRole('button', { name: /Delete|Reset|Edit/i })
    if (await actionButtons.first().isVisible()) {
      await captureStep(page, FLOW, '101-action-buttons')

      // Click reset password if available (safer than delete)
      const resetButton = page.getByRole('button', { name: /Reset/i }).first()
      if (await resetButton.isVisible()) {
        await resetButton.click()
        await waitForStable(page)
        await captureStep(page, FLOW, '102-reset-dialog')

        // Close dialog without confirming
        const cancelButton = page.getByRole('button', { name: /Cancel|Close/i })
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          await waitForStable(page)
        }
      }
    }
  })
})
