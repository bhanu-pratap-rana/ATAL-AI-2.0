import { test, expect } from '@playwright/test'

/**
 * ATAL AI - Smoke Tests
 *
 * These are critical path tests that verify the core functionality works.
 * Run these before every deployment to catch regressions.
 *
 * Test Coverage:
 * 1. Landing page loads and role selection works
 * 2. Teacher registration flow (up to OTP)
 * 3. Student registration flow (up to OTP)
 * 4. Join class page accessibility
 * 5. Protected routes redirect to login
 */

test.describe('Smoke Tests', () => {
  test.describe('Landing Page', () => {
    test('should display role selection buttons', async ({ page }) => {
      await page.goto('/')

      // Verify page title/heading
      await expect(page.getByText('Welcome to ATAL AI')).toBeVisible()
      await expect(page.getByText('Choose your role to get started')).toBeVisible()

      // Verify both role buttons are visible
      const teacherButton = page.getByRole('button', { name: /I'm a Teacher/i })
      const studentButton = page.getByRole('button', { name: /I'm a Student/i })

      await expect(teacherButton).toBeVisible()
      await expect(studentButton).toBeVisible()

      // Verify info box is present
      await expect(page.getByText(/New here?/i)).toBeVisible()
    })

    test('teacher button navigates to /teacher/start', async ({ page }) => {
      await page.goto('/')

      const teacherButton = page.getByRole('button', { name: /I'm a Teacher/i })
      await teacherButton.click()

      // Wait for client-side navigation to complete using regex pattern
      await page.waitForURL(/.*\/teacher\/start/, { timeout: 15000 })
      await expect(page).toHaveURL(/.*\/teacher\/start/)
    })

    test('student button navigates to /student/start', async ({ page }) => {
      await page.goto('/')

      const studentButton = page.getByRole('button', { name: /I'm a Student/i })
      await studentButton.click()

      // Wait for client-side navigation to complete using regex pattern
      await page.waitForURL(/.*\/student\/start/, { timeout: 15000 })
      await expect(page).toHaveURL(/.*\/student\/start/)
    })
  })

  test.describe('Teacher Registration Flow', () => {
    test('should display teacher portal choice page', async ({ page }) => {
      await page.goto('/teacher/start')

      // Should show choice between login and registration
      await expect(page.getByText('Teacher Portal')).toBeVisible()
      await expect(page.getByText(/new or existing teacher/i)).toBeVisible()

      // Verify both options are visible
      await expect(page.getByRole('button', { name: /Create New Account/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Login to Account/i })).toBeVisible()
    })

    test('should show registration form when Create Account clicked', async ({ page }) => {
      await page.goto('/teacher/start')

      // Click create account
      await page.getByRole('button', { name: /Create New Account/i }).click()

      // Should show registration form
      await expect(page.getByText('Teacher Registration')).toBeVisible()
      await expect(page.getByText('Step 1 of 4')).toBeVisible()

      // Should have email/phone tabs
      await expect(page.getByRole('button', { name: /Email/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Phone/i })).toBeVisible()
    })

    test('should show login form when Login clicked', async ({ page }) => {
      await page.goto('/teacher/start')

      // Click login
      await page.getByRole('button', { name: /Login to Account/i }).click()

      // Should show login form
      await expect(page.getByText('Teacher Login')).toBeVisible()
      await expect(page.getByLabel(/Email Address/i)).toBeVisible()
      await expect(page.getByLabel(/Password/i)).toBeVisible()

      // Should have forgot password link
      await expect(page.getByText(/Forgot your password/i)).toBeVisible()
    })

    test('should validate email format in registration', async ({ page }) => {
      await page.goto('/teacher/start')
      await page.getByRole('button', { name: /Create New Account/i }).click()

      // Enter invalid email
      const emailInput = page.getByPlaceholder(/teacher@school.edu/i)
      await emailInput.fill('invalid-email')

      // Click send verification code
      await page.getByRole('button', { name: /Send Verification Code/i }).click()

      // Should show validation error (HTML5 or custom)
      // The form should not submit with invalid email
      await expect(page).toHaveURL('/teacher/start')
    })
  })

  test.describe('Student Registration Flow', () => {
    test('should display student choice page', async ({ page }) => {
      await page.goto('/student/start')

      // Should show choice options - Student page shows "Welcome, Student!" as title
      await expect(page.getByText('Welcome, Student!')).toBeVisible()

      // Verify options are visible - Buttons are "Create Account" and "Login"
      await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Login/i })).toBeVisible()
    })

    test('should have email and phone signup options', async ({ page }) => {
      await page.goto('/student/start')

      // Click create account
      await page.getByRole('button', { name: /Create Account/i }).click()

      // Should have email/phone options with emoji icons
      await expect(page.getByText('📧 Email')).toBeVisible()
      await expect(page.getByText('📱 Phone')).toBeVisible()
    })
  })

  test.describe('Join Class Page', () => {
    test('should redirect unauthenticated users to student start', async ({ page }) => {
      // Join page redirects unauthenticated users to /student/start
      await page.goto('/join')
      await page.waitForLoadState('networkidle')

      // Should redirect to student start page
      await expect(page).toHaveURL(/student\/start/)
    })

    test('should show auth options with invite link', async ({ page }) => {
      // Access join page via invite link (bypasses redirect)
      await page.goto('/join?code=ABC123&via=invite')
      await page.waitForLoadState('networkidle')

      // Should show auth selection options (Phone OTP or Guest)
      const phoneButton = page.getByRole('button', { name: /Continue with Phone/i })
      const guestButton = page.getByRole('button', { name: /Continue as Guest/i })

      await expect(phoneButton.or(guestButton).first()).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect /app/dashboard to login when not authenticated', async ({ page }) => {
      await page.goto('/app/dashboard')

      // Should redirect to home or login
      // The middleware redirects unauthenticated users
      await page.waitForURL(url =>
        url.pathname === '/' ||
        url.pathname.includes('/login') ||
        url.pathname.includes('/student/start') ||
        url.pathname.includes('/teacher/start')
      , { timeout: 10000 })
    })

    test('should redirect /app/settings to login when not authenticated', async ({ page }) => {
      await page.goto('/app/settings')

      // Should redirect to home or login
      await page.waitForURL(url =>
        url.pathname === '/' ||
        url.pathname.includes('/login') ||
        url.pathname.includes('/student/start') ||
        url.pathname.includes('/teacher/start')
      , { timeout: 10000 })
    })
  })

  test.describe('PWA Configuration', () => {
    test('should have manifest.json accessible', async ({ page }) => {
      const response = await page.goto('/manifest.json')
      expect(response?.status()).toBe(200)

      const manifest = await response?.json()
      expect(manifest.name).toBe('ATAL AI - Digital Empowerment Platform')
      expect(manifest.short_name).toBe('ATAL AI')
      expect(manifest.icons).toBeDefined()
      expect(manifest.icons.length).toBeGreaterThan(0)
    })

    test('should have apple-touch-icon accessible', async ({ page }) => {
      const response = await page.goto('/apple-touch-icon.png')
      expect(response?.status()).toBe(200)
    })
  })

  test.describe('Responsive Design', () => {
    test('landing page is accessible on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/')

      // Verify content is visible
      await expect(page.getByText('Welcome to ATAL AI')).toBeVisible()
      await expect(page.getByRole('button', { name: /I'm a Teacher/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /I'm a Student/i })).toBeVisible()
    })

    test('teacher registration is accessible on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/teacher/start')

      await expect(page.getByText('Teacher Portal')).toBeVisible()
      await expect(page.getByRole('button', { name: /Create New Account/i })).toBeVisible()
    })
  })
})
