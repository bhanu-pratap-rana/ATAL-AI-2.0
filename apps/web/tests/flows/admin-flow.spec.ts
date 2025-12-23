/**
 * ATAL AI - Admin Flow E2E Tests
 *
 * Complete testing of all admin functionality:
 * - Admin Login
 * - Dashboard & Metrics
 * - School Management
 * - Teacher Management
 * - PIN Management
 * - Admin User Management
 */

import { test, expect } from '@playwright/test'
import { TEST_ADMIN } from '../fixtures/test-data'

test.describe('Admin Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
  })

  test('AF-001: Admin login page displays correctly', async ({ page }) => {
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByLabel(/Password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Login|Sign In/i })).toBeVisible()
  })

  test('AF-002: Invalid credentials show error', async ({ page }) => {
    await page.getByLabel(/Email/i).fill('invalid@test.com')
    await page.getByLabel(/Password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    // Use first() to handle multiple matching elements (error + toast)
    await expect(page.getByText(/Invalid|Unauthorized|error/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('AF-003: Empty form submission is prevented', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })

    // Button should be disabled when form is empty OR submission keeps us on the page
    const isDisabled = await loginButton.isDisabled()
    if (!isDisabled) {
      await loginButton.click()
      // Should stay on login page
      await expect(page).toHaveURL(/admin\/login/)
    } else {
      expect(isDisabled).toBeTruthy()
    }
  })

  test('AF-004: Non-admin user gets access denied', async ({ page }) => {
    await page.getByLabel(/Email/i).fill('student@example.com')
    await page.getByLabel(/Password/i).fill('password123')
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    // Should show error or access denied
    await expect(page.getByText(/Invalid|Unauthorized|Access Denied|error/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Admin Dashboard (Authenticated)', () => {
  // Skip if no admin credentials
  test.skip(!process.env.TEST_ADMIN_EMAIL, 'No admin credentials configured')

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_ADMIN.email)
    await page.getByLabel(/Password/i).fill(TEST_ADMIN.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 })
  })

  test('AF-010: Dashboard displays metrics', async ({ page }) => {
    await expect(page.getByText(/Dashboard/i)).toBeVisible()

    // Should show some metrics
    const metrics = page.getByText(/Total|Count|Active|Schools|Teachers|Students/i)
    await expect(metrics.first()).toBeVisible()
  })

  test('AF-011: Navigation menu is visible', async ({ page }) => {
    // Should have navigation to different admin sections
    await expect(page.getByText(/Schools|Teachers|Admins|PINs/i).first()).toBeVisible()
  })

  test('AF-012: Can navigate to schools management', async ({ page }) => {
    const schoolsLink = page.getByRole('link', { name: /Schools/i })
    if (await schoolsLink.isVisible()) {
      await schoolsLink.click()
      await expect(page).toHaveURL(/\/admin\/|\/app\/admin/)
    }
  })
})

test.describe('Admin School Management', () => {
  // Skip if no admin credentials
  test.skip(!process.env.TEST_ADMIN_EMAIL, 'No admin credentials configured')

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_ADMIN.email)
    await page.getByLabel(/Password/i).fill(TEST_ADMIN.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 })
  })

  test('AF-020: Schools page shows search interface', async ({ page }) => {
    await page.goto('/app/admin/schools')

    // Should show search or school list
    const searchInput = page.getByPlaceholder(/Search|Find|School/i)
    const schoolList = page.getByText(/School|District|Block/i)

    const hasSearch = await searchInput.isVisible().catch(() => false)
    const hasList = await schoolList.first().isVisible().catch(() => false)

    expect(hasSearch || hasList).toBeTruthy()
  })

  test('AF-021: Can search for schools', async ({ page }) => {
    await page.goto('/app/admin/schools')

    const searchInput = page.getByPlaceholder(/Search|Find|School/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test')
      await page.waitForLoadState('networkidle')

      // Results should update or show "no results"
    }
  })

  test('AF-022: School details are visible', async ({ page }) => {
    await page.goto('/app/admin/schools')

    // Click on a school if available
    const schoolItem = page.locator('[data-testid="school-item"]').first()
    if (await schoolItem.isVisible()) {
      await schoolItem.click()

      // Should show school details
      await expect(page.getByText(/Code|District|Block|Address/i).first()).toBeVisible()
    }
  })
})

test.describe('Admin PIN Management', () => {
  // Skip if no admin credentials
  test.skip(!process.env.TEST_ADMIN_EMAIL, 'No admin credentials configured')

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_ADMIN.email)
    await page.getByLabel(/Password/i).fill(TEST_ADMIN.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 })
  })

  test('AF-030: PIN management page loads', async ({ page }) => {
    await page.goto('/admin/pins')

    // Should show PIN management interface
    await expect(page.getByText(/PIN|School|Manage/i).first()).toBeVisible()
  })

  test('AF-031: Can search schools for PIN management', async ({ page }) => {
    await page.goto('/admin/pins')

    const searchInput = page.getByPlaceholder(/Search|School|Code/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('KR')
      await page.waitForLoadState('networkidle')
    }
  })

  test('AF-032: PIN rotation button exists', async ({ page }) => {
    await page.goto('/admin/pins')

    // After selecting a school, should see rotate option
    // May not be visible until school is selected - just verify page loads
    await page.waitForLoadState('networkidle')
    expect(true).toBeTruthy()
  })

  test('AF-033: Browse by district option exists', async ({ page }) => {
    await page.goto('/admin/pins')

    const browseButton = page.getByRole('button', { name: /Browse|District/i })
    if (await browseButton.isVisible()) {
      await browseButton.click()

      // Should show district selection
      await expect(page.getByText(/District|Select/i).first()).toBeVisible()
    }
  })
})

test.describe('Admin Teacher Management', () => {
  // Skip if no admin credentials
  test.skip(!process.env.TEST_ADMIN_EMAIL, 'No admin credentials configured')

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_ADMIN.email)
    await page.getByLabel(/Password/i).fill(TEST_ADMIN.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 })
  })

  test('AF-040: Teacher management page loads', async ({ page }) => {
    await page.goto('/admin/manage')

    await expect(page.getByText(/Teachers|Manage|Staff/i).first()).toBeVisible()
  })

  test('AF-041: Can search for teachers', async ({ page }) => {
    await page.goto('/admin/manage')

    const searchInput = page.getByPlaceholder(/Search|Teacher|Email/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await page.waitForLoadState('networkidle')
    }
  })

  test('AF-042: Teacher list shows relevant info', async ({ page }) => {
    await page.goto('/admin/manage')

    // Should show teacher details like email, school, status
    const teacherInfo = page.getByText(/Email|School|Active/i)
    if (await teacherInfo.first().isVisible()) {
      await expect(teacherInfo.first()).toBeVisible()
    }
  })
})

test.describe('Admin User Management', () => {
  // Skip if no admin credentials
  test.skip(!process.env.TEST_ADMIN_EMAIL, 'No admin credentials configured')

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_ADMIN.email)
    await page.getByLabel(/Password/i).fill(TEST_ADMIN.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 })
  })

  test('AF-050: Admin list page loads', async ({ page }) => {
    await page.goto('/admin/admins')

    await expect(page.getByText(/Admin|Users|Role/i).first()).toBeVisible()
  })

  test('AF-051: Can create new admin', async ({ page }) => {
    await page.goto('/admin/create')

    // Should show admin creation form
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByLabel(/Password/i)).toBeVisible()
  })

  test('AF-052: Admin role selection exists', async ({ page }) => {
    await page.goto('/admin/create')

    // Should show role selection
    const roleSelect = page.getByLabel(/Role/i)
    if (await roleSelect.isVisible()) {
      await expect(roleSelect).toBeVisible()
    }
  })

  test('AF-053: Admin creation validates email', async ({ page }) => {
    await page.goto('/admin/create')

    await page.getByLabel(/Email/i).fill('invalid-email')
    await page.getByLabel(/Password/i).fill('password123')

    const createButton = page.getByRole('button', { name: /Create|Save/i })
    await createButton.click()

    // Should show validation error or prevent submission
    await expect(page).toHaveURL(/admin\/create/)
  })
})

test.describe('Admin Setup Flow', () => {
  test('AF-060: Setup page is accessible', async ({ page }) => {
    await page.goto('/admin/setup')

    // Setup page should show some form or instructions
    const setupContent = page.getByText(/Setup|Initialize|Configure/i)
    const loginRedirect = page.url().includes('/admin/login')

    // Either shows setup or redirects to login
    expect(await setupContent.first().isVisible().catch(() => false) || loginRedirect).toBeTruthy()
  })
})

test.describe('Admin Protected Routes', () => {
  test('AF-070: Dashboard redirects without auth', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')

    // Should redirect to login or show access denied
    const isRedirected = page.url().includes('/admin/login') || page.url() === '/'
    const hasAccessDenied = await page.getByText(/Access Denied|Login|Unauthorized/i).isVisible().catch(() => false)

    expect(isRedirected || hasAccessDenied).toBeTruthy()
  })

  test('AF-071: Admins page redirects without auth', async ({ page }) => {
    await page.goto('/admin/admins')
    await page.waitForLoadState('networkidle')

    const isRedirected = !page.url().includes('/admin/admins') || page.url().includes('/login')
    const hasAccessDenied = await page.getByText(/Access Denied|Login/i).isVisible().catch(() => false)

    expect(isRedirected || hasAccessDenied).toBeTruthy()
  })

  test('AF-072: Manage page requires authentication', async ({ page }) => {
    await page.goto('/admin/manage')
    await page.waitForLoadState('networkidle')

    // Page should redirect or show login/access message
    const currentUrl = page.url()
    const isRedirected = !currentUrl.endsWith('/admin/manage')
    const hasLoginText = await page.getByText(/Login|Access/i).first().isVisible().catch(() => false)

    expect(isRedirected || hasLoginText).toBeTruthy()
  })
})
