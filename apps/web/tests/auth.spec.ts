import { test, expect } from '@playwright/test'

/**
 * Authentication Flow Tests
 *
 * Tests the actual authentication routes in ATAL AI:
 * - /student/start - Student authentication
 * - /teacher/start - Teacher authentication
 * - /admin/login - Admin authentication
 *
 * Note: The app does NOT have a unified /login or /verify route.
 */

test.describe('Authentication Flow', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect protected /app/dashboard to student start', async ({ page }) => {
      // Attempt to access protected dashboard without authentication
      await page.goto('/app/dashboard')
      await page.waitForLoadState('networkidle')

      // Should be redirected to student start (or home)
      await expect(page).not.toHaveURL('/app/dashboard')
    })

    test('should show student login form on /student/start', async ({ page }) => {
      await page.goto('/student/start')

      // Verify we're on the student start page
      await expect(page).toHaveURL(/student\/start/)

      // Check for page elements
      await expect(page.getByText('Welcome, Student!')).toBeVisible()
      await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Login/i })).toBeVisible()
    })

    test('should show teacher login form on /teacher/start', async ({ page }) => {
      await page.goto('/teacher/start')

      // Verify we're on the teacher start page
      await expect(page).toHaveURL(/teacher\/start/)

      // Check for page elements
      await expect(page.getByText('Teacher Portal')).toBeVisible()
    })

    test('should show admin login form on /admin/login', async ({ page }) => {
      await page.goto('/admin/login')

      // Verify we're on the admin login page
      await expect(page).toHaveURL(/admin\/login/)

      // Check for admin login elements
      await expect(page.getByText('Admin Login')).toBeVisible()
    })
  })

  test.describe('Student Authentication UI', () => {
    test('should show email/phone/username tabs when Login clicked', async ({ page }) => {
      await page.goto('/student/start')
      await page.getByRole('button', { name: /Login/i }).click()

      // Should show auth tabs with emoji icons
      await expect(page.getByText('📧 Email')).toBeVisible()
      await expect(page.getByText('📱 Phone')).toBeVisible()
      await expect(page.getByText('👤 Username')).toBeVisible()
    })

    test('should show email input when email tab selected', async ({ page }) => {
      await page.goto('/student/start')
      await page.getByRole('button', { name: /Login/i }).click()

      // Email tab is selected by default
      await expect(page.getByLabel(/Email Address/i)).toBeVisible()
      await expect(page.getByLabel(/Password/i)).toBeVisible()
    })

    test('should show phone input when phone tab selected', async ({ page }) => {
      await page.goto('/student/start')
      await page.getByRole('button', { name: /Login/i }).click()
      await page.getByText('📱 Phone').click()

      // Should show phone input
      await expect(page.getByPlaceholder('9876543210')).toBeVisible()
    })

    test('should show username input when username tab selected', async ({ page }) => {
      await page.goto('/student/start')
      await page.getByRole('button', { name: /Login/i }).click()
      await page.getByText('👤 Username').click()

      // Should show username input
      await expect(page.getByLabel(/Username/i)).toBeVisible()
    })

    test('should validate email format on submission', async ({ page }) => {
      await page.goto('/student/start')
      await page.getByRole('button', { name: /Login/i }).click()

      const emailInput = page.getByLabel(/Email Address/i)
      await emailInput.fill('invalid-email')

      const passwordInput = page.getByLabel(/Password/i)
      await passwordInput.fill('somepassword123')

      await page.getByRole('button', { name: /Sign In/i }).click()

      // Should stay on page (validation prevents submission)
      await expect(page).toHaveURL(/student\/start/)
    })
  })

  test.describe('Student Sign Up UI', () => {
    test('should show signup options when Create Account clicked', async ({ page }) => {
      await page.goto('/student/start')
      await page.getByRole('button', { name: /Create Account/i }).click()

      // Should show signup tabs with emoji icons
      await expect(page.getByText('📧 Email')).toBeVisible()
      await expect(page.getByText('📱 Phone')).toBeVisible()
      await expect(page.getByText('⚡ Quick Start')).toBeVisible()
    })

    test('should show Quick Start for username-based signup', async ({ page }) => {
      await page.goto('/student/start')
      await page.getByRole('button', { name: /Create Account/i }).click()
      await page.getByText('⚡ Quick Start').click()

      // Should show username input
      await expect(page.getByLabel(/Username/i)).toBeVisible()
    })
  })

  test.describe('Teacher Authentication UI', () => {
    test('should show login and signup options', async ({ page }) => {
      await page.goto('/teacher/start')

      await expect(page.getByText(/Create New Account/i)).toBeVisible()
      await expect(page.getByText(/Login to Account/i)).toBeVisible()
    })

    test('should show login form when Login clicked', async ({ page }) => {
      await page.goto('/teacher/start')
      await page.getByText(/Login to Account/i).click()

      // Should show email and password inputs
      await expect(page.getByLabel(/Email/i)).toBeVisible()
      await expect(page.getByLabel(/Password/i)).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect /app/settings without auth', async ({ page }) => {
      await page.goto('/app/settings')
      await page.waitForLoadState('networkidle')

      await expect(page).not.toHaveURL('/app/settings')
    })

    test('should redirect /app/teacher/classes without auth', async ({ page }) => {
      await page.goto('/app/teacher/classes')
      await page.waitForLoadState('networkidle')

      await expect(page).not.toHaveURL('/app/teacher/classes')
    })

    test('should redirect /app/student/classes without auth', async ({ page }) => {
      await page.goto('/app/student/classes')
      await page.waitForLoadState('networkidle')

      await expect(page).not.toHaveURL('/app/student/classes')
    })
  })
})
