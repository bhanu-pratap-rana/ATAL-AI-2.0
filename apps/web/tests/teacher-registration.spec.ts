import { test, expect } from '@playwright/test'

/**
 * Teacher Registration Flow Tests
 *
 * Tests the teacher onboarding process on /teacher/start
 */

test.describe('Teacher Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display teacher button on landing page', async ({ page }) => {
    const teacherButton = page.getByRole('button', { name: /Teacher/i })
    await expect(teacherButton).toBeVisible()
  })

  test('should navigate to teacher start page', async ({ page }) => {
    await page.getByRole('button', { name: /Teacher/i }).click()
    await expect(page).toHaveURL(/teacher\/start/)
  })

  test('should display Teacher Portal title', async ({ page }) => {
    await page.goto('/teacher/start')
    await expect(page.getByText('Teacher Portal')).toBeVisible()
  })

  test('should show Create New Account and Login options', async ({ page }) => {
    await page.goto('/teacher/start')

    await expect(page.getByText(/Create New Account/i)).toBeVisible()
    await expect(page.getByText(/Login to Account/i)).toBeVisible()
  })

  test('should show login form when Login to Account clicked', async ({ page }) => {
    await page.goto('/teacher/start')
    await page.getByText(/Login to Account/i).click()

    // Should show email and password inputs
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByLabel(/Password/i)).toBeVisible()
  })

  test('should validate email format in login', async ({ page }) => {
    await page.goto('/teacher/start')
    await page.getByText(/Login to Account/i).click()

    const emailInput = page.getByLabel(/Email/i)
    await emailInput.fill('invalid-email')

    const passwordInput = page.getByLabel(/Password/i)
    await passwordInput.fill('somepassword123')

    // Try to submit
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    // Should stay on page due to validation
    await expect(page).toHaveURL(/teacher\/start/)
  })

  test('should show forgot password link', async ({ page }) => {
    await page.goto('/teacher/start')
    await page.getByText(/Login to Account/i).click()

    // Check for forgot password link
    const forgotLink = page.getByText(/Forgot.*password/i)
    await expect(forgotLink).toBeVisible()
  })

  test('should show registration form when Create New Account clicked', async ({ page }) => {
    await page.goto('/teacher/start')
    await page.getByText(/Create New Account/i).click()

    // Should show email input for registration
    await expect(page.getByLabel(/Email/i)).toBeVisible()
  })
})

test.describe('Teacher Login Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/teacher/start')
    await page.getByText(/Login to Account/i).click()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    const emailInput = page.getByLabel(/Email/i)
    await emailInput.fill('nonexistent@example.com')

    const passwordInput = page.getByLabel(/Password/i)
    await passwordInput.fill('wrongpassword123')

    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    // Should show error message - use first() to handle multiple matching elements
    await expect(page.getByText(/Invalid|error|failed/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('should require email field', async ({ page }) => {
    const passwordInput = page.getByLabel(/Password/i)
    await passwordInput.fill('somepassword123')

    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })

    // Email is required, button may be disabled or show validation
    const emailInput = page.getByLabel(/Email/i)
    const isEmailRequired = await emailInput.getAttribute('required')
    expect(isEmailRequired !== null || await loginButton.isDisabled()).toBeTruthy()
  })

  test('should require password field', async ({ page }) => {
    const emailInput = page.getByLabel(/Email/i)
    await emailInput.fill('test@example.com')

    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })

    // Password is required
    const passwordInput = page.getByLabel(/Password/i)
    const isPasswordRequired = await passwordInput.getAttribute('required')
    expect(isPasswordRequired !== null || await loginButton.isDisabled()).toBeTruthy()
  })
})
