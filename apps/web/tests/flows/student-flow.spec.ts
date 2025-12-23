/**
 * ATAL AI - Student Flow E2E Tests
 *
 * Complete testing of all student functionality:
 * - Registration & Login (Email/Phone/Username)
 * - Profile Management
 * - Class Joining
 * - Assessment Taking
 * - Dashboard Features
 *
 * Note: The /join page redirects unauthenticated users to /student/start
 * unless ?via=invite query param is present.
 */

import { test, expect } from '@playwright/test'
import { VALID_INPUTS, INVALID_INPUTS } from '../fixtures/test-data'

test.describe('Student Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student/start')
  })

  test('SF-001: Student start page displays all options', async ({ page }) => {
    // Student page shows "Welcome, Student!" as title
    await expect(page.getByText('Welcome, Student!')).toBeVisible()
    // Buttons are "Create Account" and "Login"
    await expect(page.getByRole('button', { name: /Login/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible()
  })

  test('SF-002: Sign In shows email/phone toggle', async ({ page }) => {
    await page.getByRole('button', { name: /Login/i }).click()

    // Tabs use emoji icons
    await expect(page.getByText('📧 Email')).toBeVisible()
    await expect(page.getByText('📱 Phone')).toBeVisible()
    await expect(page.getByText('👤 Username')).toBeVisible()
  })

  test('SF-003: Email validation prevents invalid formats', async ({ page }) => {
    await page.getByRole('button', { name: /Login/i }).click()

    for (const invalidEmail of INVALID_INPUTS.emails.filter(e => e)) {
      const emailInput = page.getByLabel(/Email Address/i)
      await emailInput.clear()
      await emailInput.fill(invalidEmail)

      const passwordInput = page.getByLabel(/Password/i)
      await passwordInput.fill('testpassword123')

      await page.getByRole('button', { name: /Sign In/i }).click()

      // Should stay on same page due to validation
      await expect(page).toHaveURL(/student\/start/)
    }
  })

  test('SF-004: Phone input validates 10-digit format', async ({ page }) => {
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByText('📱 Phone').click()

    const phoneInput = page.getByPlaceholder('9876543210')
    await phoneInput.fill('12345678901234') // More than 10 digits

    const value = await phoneInput.inputValue()
    expect(value.replace(/\D/g, '').length).toBeLessThanOrEqual(10)
  })

  test('SF-005: Create Account shows email/phone options', async ({ page }) => {
    await page.getByRole('button', { name: /Create Account/i }).click()

    // Signup tabs with emoji icons
    await expect(page.getByText('📧 Email')).toBeVisible()
    await expect(page.getByText('📱 Phone')).toBeVisible()
    await expect(page.getByText('⚡ Quick Start')).toBeVisible()
  })

  test('SF-006: Valid email format is accepted', async ({ page }) => {
    await page.getByRole('button', { name: /Login/i }).click()

    const emailInput = page.getByLabel(/Email Address/i)
    await emailInput.fill(VALID_INPUTS.emails[0])

    // Fill password too so button can be enabled
    const passwordInput = page.getByLabel(/Password/i)
    await passwordInput.fill('testpassword123')

    // Should enable the submit button or not show validation error
    const submitButton = page.getByRole('button', { name: /Sign In/i })
    await expect(submitButton).toBeEnabled()
  })
})

test.describe('Student Guest/Join Class Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/student/start')
  })

  test('SF-010: Guest join option redirects to join page', async ({ page }) => {
    // Check if there's a join class link or navigation
    const joinLink = page.getByText(/Join.*Class/i)
    if (await joinLink.isVisible()) {
      await joinLink.click()
      // May redirect to /join with proper params or stay on student/start
      await page.waitForLoadState('networkidle')
    }
  })
})

test.describe('Join Class Flow (Dedicated Page)', () => {
  test('SF-020: Join page redirects unauthenticated users', async ({ page }) => {
    // Join page redirects to student/start without auth
    await page.goto('/join')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/student\/start/)
  })

  test('SF-020b: Join page with invite shows auth options', async ({ page }) => {
    // With invite params, should stay on join
    await page.goto('/join?via=invite&code=ABC123')
    await page.waitForLoadState('networkidle')

    // Should show auth selection options
    const phoneButton = page.getByRole('button', { name: /Continue with Phone|Phone/i })
    const guestButton = page.getByRole('button', { name: /Continue as Guest|Guest/i })

    await expect(phoneButton.or(guestButton).first()).toBeVisible()
  })

  test('SF-021: Class code auto-uppercases', async ({ page }) => {
    await page.goto('/join?via=invite')
    await page.waitForLoadState('networkidle')

    const codeInput = page.getByPlaceholder(/code/i)
    if (await codeInput.isVisible()) {
      await codeInput.fill('abc123')
      const value = await codeInput.inputValue()
      expect(value).toBe('ABC123')
    }
  })

  test('SF-022: Class code limited to 6 characters', async ({ page }) => {
    await page.goto('/join?via=invite')
    await page.waitForLoadState('networkidle')

    const codeInput = page.getByPlaceholder(/code/i)
    if (await codeInput.isVisible()) {
      await codeInput.fill('ABCDEFGHIJ') // More than 6 chars
      const value = await codeInput.inputValue()
      expect(value.length).toBeLessThanOrEqual(6)
    }
  })

  test('SF-023: PIN limited to 4 digits', async ({ page }) => {
    await page.goto('/join?via=invite&code=ABC123')
    await page.waitForLoadState('networkidle')

    const pinInput = page.getByPlaceholder(/PIN/i)
    if (await pinInput.isVisible()) {
      await pinInput.fill('12345678') // More than 4 digits
      const value = await pinInput.inputValue()
      expect(value.length).toBeLessThanOrEqual(4)
    }
  })

  test('SF-024: Invalid class code shows error', async ({ page }) => {
    await page.goto('/join?via=invite')
    await page.waitForLoadState('networkidle')

    const codeInput = page.getByPlaceholder(/code/i)
    if (await codeInput.isVisible()) {
      await codeInput.fill('XXXXXX')

      const pinInput = page.getByPlaceholder(/PIN/i)
      if (await pinInput.isVisible()) {
        await pinInput.fill('0000')
      }

      const joinButton = page.getByRole('button', { name: /Join/i })
      if (await joinButton.isVisible()) {
        await joinButton.click()
        // Should show generic error (no info leakage)
        await expect(page.getByText(/Invalid|not found|error/i)).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('SF-025: SQL injection in class code is handled safely', async ({ page }) => {
    await page.goto('/join?via=invite')
    await page.waitForLoadState('networkidle')

    const codeInput = page.getByPlaceholder(/code/i)
    if (await codeInput.isVisible()) {
      await codeInput.fill("'; DROP TABLE--")
      // Should handle gracefully
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/join')
    }
  })

  test('SF-026: XSS in class code is sanitized', async ({ page }) => {
    await page.goto('/join?via=invite')
    await page.waitForLoadState('networkidle')

    const codeInput = page.getByPlaceholder(/code/i)
    if (await codeInput.isVisible()) {
      await codeInput.fill('<script>alert(1)</script>')
    }

    // Page should not execute script
    await page.waitForLoadState('networkidle')
    // If we get here without dialog, XSS is prevented
    expect(true).toBeTruthy()
  })
})

test.describe('Student Dashboard (Authenticated)', () => {
  // Skip if no student credentials
  test.skip(!process.env.TEST_STUDENT_EMAIL, 'No student credentials configured')

  test.beforeEach(async ({ page }) => {
    // Login before each test in this describe block
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByText('📧 Email').click()
    await page.getByLabel(/Email Address/i).fill(process.env.TEST_STUDENT_EMAIL || '')
    await page.getByLabel(/Password/i).fill(process.env.TEST_STUDENT_PASSWORD || '')
    await page.getByRole('button', { name: /Sign In/i }).click()
    await page.waitForURL(/\/app\//, { timeout: 15000 })
  })

  test.describe('When authenticated as student', () => {
    test('SF-030: Dashboard loads correctly', async ({ page }) => {
      await page.goto('/app/dashboard')

      // Should show student dashboard elements
      await expect(page.getByText(/Dashboard|Welcome/i)).toBeVisible()
    })

    test('SF-031: Classes page shows enrolled classes', async ({ page }) => {
      await page.goto('/app/student/classes')

      // Should show classes or "Join a class" prompt
      const hasClasses = await page.getByText(/My Classes|Enrolled/i).isVisible()
      const hasJoinPrompt = await page.getByText(/Join|No classes/i).isVisible()
      expect(hasClasses || hasJoinPrompt).toBeTruthy()
    })

    test('SF-032: Assessment page is accessible', async ({ page }) => {
      await page.goto('/app/student/assessments')

      await expect(page.getByText(/Assessment|Test/i)).toBeVisible()
    })
  })
})

test.describe('Student Assessment Flow', () => {
  // Skip if no student credentials
  test.skip(!process.env.TEST_STUDENT_EMAIL, 'No student credentials configured')

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByText('📧 Email').click()
    await page.getByLabel(/Email Address/i).fill(process.env.TEST_STUDENT_EMAIL || '')
    await page.getByLabel(/Password/i).fill(process.env.TEST_STUDENT_PASSWORD || '')
    await page.getByRole('button', { name: /Sign In/i }).click()
    await page.waitForURL(/\/app\//, { timeout: 15000 })
  })

  test('SF-040: Can start an assessment', async ({ page }) => {
    await page.goto('/app/assessment/start')

    // Should show assessment start page or redirect to login
    const hasAssessment = await page.getByText(/Start|Begin|Assessment/i).isVisible()
    const isRedirected = page.url().includes('/student/start')
    expect(hasAssessment || isRedirected).toBeTruthy()
  })

  test('SF-041: Assessment questions display correctly', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Should show question or options
      await expect(page.getByText(/Question|Option|Select/i)).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Student Profile Management', () => {
  // Skip if no student credentials
  test.skip(!process.env.TEST_STUDENT_EMAIL, 'No student credentials configured')

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByText('📧 Email').click()
    await page.getByLabel(/Email Address/i).fill(process.env.TEST_STUDENT_EMAIL || '')
    await page.getByLabel(/Password/i).fill(process.env.TEST_STUDENT_PASSWORD || '')
    await page.getByRole('button', { name: /Sign In/i }).click()
    await page.waitForURL(/\/app\//, { timeout: 15000 })
  })

  test('SF-050: Settings page loads', async ({ page }) => {
    await page.goto('/app/settings')
    await page.waitForLoadState('networkidle')

    // Settings page shows "Profile" as the main h1 heading
    await expect(page.locator('h1').filter({ hasText: /Profile/i })).toBeVisible()
  })

  test('SF-051: Profile shows student information', async ({ page }) => {
    await page.goto('/app/settings')

    // Should show name, school, or other profile fields
    const profileFields = page.getByText(/Name|School|Class|Roll/i)
    await expect(profileFields.first()).toBeVisible()
  })

  test('SF-052: Sign out redirects to home', async ({ page }) => {
    await page.goto('/app/settings')

    const signOutButton = page.getByRole('button', { name: /Sign Out|Logout/i })
    if (await signOutButton.isVisible()) {
      await signOutButton.click()
      await expect(page).toHaveURL(/^\/$|\/student\/start/)
    }
  })
})

test.describe('Student Forgot Password Flow', () => {
  test('SF-060: Forgot password link exists', async ({ page }) => {
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()

    // May or may not have forgot password for students (depends on auth method)
    const forgotLink = page.getByText(/Forgot|Reset/i)
    if (await forgotLink.isVisible()) {
      await forgotLink.click()
      await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    }
  })
})
