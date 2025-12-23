import { test, expect } from '@playwright/test'

/**
 * Student Join Class Flow Tests
 *
 * Tests the student enrollment process.
 *
 * Note: The /join page redirects unauthenticated users to /student/start
 * unless ?via=invite or ?code= query params are present.
 */

test.describe('Student Join Class Flow', () => {
  test.describe('Join Page Redirect Behavior', () => {
    test('should redirect unauthenticated users to student start', async ({ page }) => {
      // Navigate to join page without invite params
      await page.goto('/join')
      await page.waitForLoadState('networkidle')

      // Should redirect to student start
      await expect(page).toHaveURL(/student\/start/)
    })

    test('should stay on join page with invite link', async ({ page }) => {
      // Navigate to join page with invite params
      await page.goto('/join?code=ABC123&via=invite')
      await page.waitForLoadState('networkidle')

      // Should stay on join page or show auth selection
      const url = page.url()
      expect(url).toMatch(/join/)
    })
  })

  test.describe('Join Page Auth Selection', () => {
    test('should display auth options on invite link', async ({ page }) => {
      await page.goto('/join?code=TEST123&via=invite')
      await page.waitForLoadState('networkidle')

      // Should show phone or guest auth options
      const phoneButton = page.getByRole('button', { name: /Continue with Phone|Phone/i })
      const guestButton = page.getByRole('button', { name: /Continue as Guest|Guest/i })

      // At least one auth option should be visible
      const hasAuthOption = await phoneButton.isVisible() || await guestButton.isVisible()
      expect(hasAuthOption).toBeTruthy()
    })
  })
})

test.describe('Student Authentication on /student/start', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student/start')
  })

  test('should display all auth options', async ({ page }) => {
    // Check main buttons
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Login/i })).toBeVisible()
  })

  test('should show sign-in tabs when Login clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Login/i }).click()

    // Should show email/phone/username tabs
    await expect(page.getByText('📧 Email')).toBeVisible()
    await expect(page.getByText('📱 Phone')).toBeVisible()
    await expect(page.getByText('👤 Username')).toBeVisible()
  })

  test('should show sign-up tabs when Create Account clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Create Account/i }).click()

    // Should show email/phone/quick start tabs
    await expect(page.getByText('📧 Email')).toBeVisible()
    await expect(page.getByText('📱 Phone')).toBeVisible()
    await expect(page.getByText('⚡ Quick Start')).toBeVisible()
  })
})

test.describe('Student Navigation', () => {
  test('should navigate from landing page to student start', async ({ page }) => {
    await page.goto('/')

    const studentButton = page.getByRole('button', { name: /Student/i })
    await studentButton.click()

    await expect(page).toHaveURL(/student\/start/)
  })

  test('should show Welcome, Student! on student start page', async ({ page }) => {
    await page.goto('/student/start')

    await expect(page.getByText('Welcome, Student!')).toBeVisible()
  })
})

test.describe('Input Validation', () => {
  test('should validate class code format on join page', async ({ page }) => {
    await page.goto('/join?via=invite')
    await page.waitForLoadState('networkidle')

    const codeInput = page.getByPlaceholder(/code/i)

    if (await codeInput.isVisible()) {
      // Try entering more than 6 characters
      await codeInput.fill('ABCDEFGHIJ')
      const value = await codeInput.inputValue()

      // Should be limited to 6 characters
      expect(value.length).toBeLessThanOrEqual(6)
    }
  })

  test('should validate PIN format on join page', async ({ page }) => {
    await page.goto('/join?via=invite&code=ABC123')
    await page.waitForLoadState('networkidle')

    const pinInput = page.getByPlaceholder(/PIN/i)

    if (await pinInput.isVisible()) {
      // Try entering more than 4 digits
      await pinInput.fill('12345678')
      const value = await pinInput.inputValue()

      // Should be limited to 4 digits
      expect(value.length).toBeLessThanOrEqual(4)
    }
  })
})
