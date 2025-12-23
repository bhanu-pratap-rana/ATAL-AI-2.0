/**
 * ATAL AI - Student Flow Visual Tests with Screenshots
 *
 * Captures screenshots at each step to analyze:
 * - Theme consistency
 * - UI/UX flow
 * - Component styling
 * - Responsive design
 */

import { test, expect } from '@playwright/test'
import {
  captureStep,
  captureAction,
  waitForStable,
  resetCounter,
  TEST_CREDENTIALS,
} from './screenshot-utils'

const FLOW = 'student'

test.describe('Student Flow Visual Analysis', () => {
  test.beforeEach(async ({ page }) => {
    resetCounter(FLOW)
  })

  test('VS-001: Complete Student Landing & Auth UI', async ({ page }) => {
    // 1. Landing page
    await page.goto('/')
    await waitForStable(page)
    await captureStep(page, FLOW, '01-landing-page')

    // Check for student entry point
    const studentButton = page.getByRole('button', { name: /Student|I am a Student/i })
    if (await studentButton.isVisible()) {
      await studentButton.click()
      await waitForStable(page)
    } else {
      await page.goto('/student/start')
      await waitForStable(page)
    }
    await captureStep(page, FLOW, '02-student-start-page')

    // 2. Student start page elements
    await expect(page.getByText(/Welcome/i)).toBeVisible()
    await captureStep(page, FLOW, '03-welcome-visible')

    // 3. Click Login button
    const loginButton = page.getByRole('button', { name: /Login/i })
    await loginButton.click()
    await waitForStable(page)
    await captureStep(page, FLOW, '04-login-form-shown')

    // 4. Show email tab
    const emailTab = page.getByText('📧 Email')
    if (await emailTab.isVisible()) {
      await emailTab.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '05-email-tab-active')
    }

    // 5. Show phone tab
    const phoneTab = page.getByText('📱 Phone')
    if (await phoneTab.isVisible()) {
      await phoneTab.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '06-phone-tab-active')
    }

    // 6. Show username tab
    const usernameTab = page.getByText('👤 Username')
    if (await usernameTab.isVisible()) {
      await usernameTab.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '07-username-tab-active')
    }

    // 7. Go back to see Create Account
    await page.goto('/student/start')
    await waitForStable(page)
    const createButton = page.getByRole('button', { name: /Create Account/i })
    await createButton.click()
    await waitForStable(page)
    await captureStep(page, FLOW, '08-signup-options')

    // 8. Show signup email tab
    const signupEmailTab = page.getByText('📧 Email')
    if (await signupEmailTab.isVisible()) {
      await signupEmailTab.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '09-signup-email-tab')
    }

    // 9. Show signup phone tab
    const signupPhoneTab = page.getByText('📱 Phone')
    if (await signupPhoneTab.isVisible()) {
      await signupPhoneTab.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '10-signup-phone-tab')
    }

    // 10. Show Quick Start tab
    const quickStartTab = page.getByText('⚡ Quick Start')
    if (await quickStartTab.isVisible()) {
      await quickStartTab.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '11-quick-start-tab')
    }
  })

  test('VS-002: Student Login Flow with Email', async ({ page }) => {
    // Navigate to login
    await page.goto('/student/start')
    await waitForStable(page)
    await captureStep(page, FLOW, '20-login-flow-start')

    await page.getByRole('button', { name: /Login/i }).click()
    await waitForStable(page)
    await captureStep(page, FLOW, '21-login-form')

    // Fill email
    const emailInput = page.getByLabel(/Email/i)
    await emailInput.fill(TEST_CREDENTIALS.student.email)
    await captureStep(page, FLOW, '22-email-filled')

    // Fill password
    const passwordInput = page.getByLabel(/Password/i)
    await passwordInput.fill(TEST_CREDENTIALS.student.password)
    await captureStep(page, FLOW, '23-password-filled')

    // Submit
    await page.getByRole('button', { name: /Sign In/i }).click()
    await waitForStable(page)

    // Wait for redirect or error
    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
      await captureStep(page, FLOW, '24-login-success-dashboard')
    } catch {
      await captureStep(page, FLOW, '24-login-result')
    }
  })

  test('VS-003: Student Dashboard (Authenticated)', async ({ page }) => {
    // Login first
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.student.password)
    await page.getByRole('button', { name: /Sign In/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // May already be on dashboard or login failed
    }

    // Dashboard
    await page.goto('/app/dashboard')
    await waitForStable(page)
    await captureStep(page, FLOW, '30-dashboard-overview')

    // Scroll to see full content
    await page.evaluate(() => window.scrollBy(0, 500))
    await captureStep(page, FLOW, '31-dashboard-scrolled')
  })

  test('VS-004: Student Classes Page', async ({ page }) => {
    // Login first
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.student.password)
    await page.getByRole('button', { name: /Sign In/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue anyway
    }

    // Classes page
    await page.goto('/app/student/classes')
    await waitForStable(page)
    await captureStep(page, FLOW, '40-classes-page')

    // Check for join class option
    const joinButton = page.getByRole('button', { name: /Join/i })
    if (await joinButton.isVisible()) {
      await joinButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '41-join-class-dialog')
    }
  })

  test('VS-005: Student Assessments Page', async ({ page }) => {
    // Login first
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.student.password)
    await page.getByRole('button', { name: /Sign In/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue anyway
    }

    // Assessments page
    await page.goto('/app/student/assessments')
    await waitForStable(page)
    await captureStep(page, FLOW, '50-assessments-page')

    // Check for available assessments
    const assessmentCards = page.locator('[class*="card"]').first()
    if (await assessmentCards.isVisible()) {
      await captureStep(page, FLOW, '51-assessment-cards')
    }
  })

  test('VS-006: Student Settings/Profile Page', async ({ page }) => {
    // Login first
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.student.password)
    await page.getByRole('button', { name: /Sign In/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue anyway
    }

    // Settings page
    await page.goto('/app/settings')
    await waitForStable(page)
    await captureStep(page, FLOW, '60-settings-page')

    // Click edit if available
    const editButton = page.getByRole('button', { name: /Edit/i })
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '61-profile-edit-mode')
    }

    // Scroll down for more settings
    await page.evaluate(() => window.scrollBy(0, 500))
    await captureStep(page, FLOW, '62-settings-scrolled')
  })

  test('VS-007: Join Class Flow', async ({ page }) => {
    // Direct to join page with invite param
    await page.goto('/join?via=invite')
    await waitForStable(page)
    await captureStep(page, FLOW, '70-join-page')

    // Check for class code input
    const codeInput = page.getByPlaceholder(/code/i)
    if (await codeInput.isVisible()) {
      await codeInput.fill('ABC123')
      await captureStep(page, FLOW, '71-code-entered')

      // Check for PIN input
      const pinInput = page.getByPlaceholder(/PIN/i)
      if (await pinInput.isVisible()) {
        await pinInput.fill('1234')
        await captureStep(page, FLOW, '72-pin-entered')
      }
    }

    // Auth options
    const phoneButton = page.getByRole('button', { name: /Phone/i })
    if (await phoneButton.isVisible()) {
      await phoneButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '73-phone-auth-option')
    }

    // Guest option
    await page.goto('/join?via=invite')
    await waitForStable(page)
    const guestButton = page.getByRole('button', { name: /Guest/i })
    if (await guestButton.isVisible()) {
      await guestButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '74-guest-option')
    }
  })

  test('VS-008: AI Tools Page', async ({ page }) => {
    // Login first
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.student.password)
    await page.getByRole('button', { name: /Sign In/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue anyway
    }

    // AI Tools page
    await page.goto('/app/ai-tools')
    await waitForStable(page)
    await captureStep(page, FLOW, '80-ai-tools-page')

    // Check for tutor option (use first() to avoid multiple matches)
    const tutorLink = page.getByRole('link', { name: /AI Tutor/i }).first()
    if (await tutorLink.isVisible()) {
      await tutorLink.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '81-ai-tutor')
    }
  })

  test('VS-009: Student Progress Page', async ({ page }) => {
    // Login first
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.student.password)
    await page.getByRole('button', { name: /Sign In/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue anyway
    }

    // Progress page
    await page.goto('/app/progress')
    await waitForStable(page)
    await captureStep(page, FLOW, '90-progress-page')

    // Scroll for charts
    await page.evaluate(() => window.scrollBy(0, 500))
    await captureStep(page, FLOW, '91-progress-scrolled')
  })

  test('VS-010: Student Curriculum Page', async ({ page }) => {
    // Login first
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.student.password)
    await page.getByRole('button', { name: /Sign In/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue anyway
    }

    // Curriculum page
    await page.goto('/app/curriculum')
    await waitForStable(page)
    await captureStep(page, FLOW, '100-curriculum-page')
  })
})
