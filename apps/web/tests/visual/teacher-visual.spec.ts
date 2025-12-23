/**
 * ATAL AI - Teacher Flow Visual Tests with Screenshots
 *
 * Captures screenshots at each step to analyze:
 * - Theme consistency
 * - UI/UX flow
 * - Component styling
 * - Teacher-specific features
 */

import { test, expect } from '@playwright/test'
import {
  captureStep,
  waitForStable,
  resetCounter,
  TEST_CREDENTIALS,
} from './screenshot-utils'

const FLOW = 'teacher'

test.describe('Teacher Flow Visual Analysis', () => {
  test.beforeEach(async ({ page }) => {
    resetCounter(FLOW)
  })

  test('VT-001: Teacher Landing & Auth UI', async ({ page }) => {
    // 1. Landing page
    await page.goto('/')
    await waitForStable(page)
    await captureStep(page, FLOW, '01-landing-page')

    // Check for teacher entry point
    const teacherButton = page.getByRole('button', { name: /Teacher|I am a Teacher/i })
    if (await teacherButton.isVisible()) {
      await teacherButton.click()
      await waitForStable(page)
    } else {
      await page.goto('/teacher/start')
      await waitForStable(page)
    }
    await captureStep(page, FLOW, '02-teacher-start-page')

    // 2. Teacher start page elements
    await captureStep(page, FLOW, '03-teacher-welcome')

    // 3. Click Login button
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await waitForStable(page)
    await captureStep(page, FLOW, '04-login-form-shown')

    // 4. Show signup option
    await page.goto('/teacher/start')
    await waitForStable(page)
    const signupButton = page.getByRole('button', { name: /Create|Register|Sign Up/i })
    if (await signupButton.isVisible()) {
      await signupButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '05-signup-options')

      // Email tab
      const emailTab = page.getByText('📧 Email')
      if (await emailTab.isVisible()) {
        await emailTab.click()
        await waitForStable(page)
        await captureStep(page, FLOW, '06-signup-email-tab')
      }

      // Phone tab
      const phoneTab = page.getByText('📱 Phone')
      if (await phoneTab.isVisible()) {
        await phoneTab.click()
        await waitForStable(page)
        await captureStep(page, FLOW, '07-signup-phone-tab')
      }
    }
  })

  test('VT-002: Teacher Login Flow', async ({ page }) => {
    // Navigate to login
    await page.goto('/teacher/start')
    await waitForStable(page)
    await captureStep(page, FLOW, '10-login-flow-start')

    // Click login
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await waitForStable(page)
    await captureStep(page, FLOW, '11-login-form')

    // Fill email
    const emailInput = page.getByLabel(/Email/i)
    await emailInput.fill(TEST_CREDENTIALS.teacher.email)
    await captureStep(page, FLOW, '12-email-filled')

    // Fill password
    const passwordInput = page.getByLabel(/Password/i)
    await passwordInput.fill(TEST_CREDENTIALS.teacher.password)
    await captureStep(page, FLOW, '13-password-filled')

    // Submit
    await page.getByRole('button', { name: /Sign In|Login/i }).click()
    await waitForStable(page)

    // Wait for redirect or error
    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
      await captureStep(page, FLOW, '14-login-success-dashboard')
    } catch {
      await captureStep(page, FLOW, '14-login-result')
    }
  })

  test('VT-003: Teacher Dashboard (Authenticated)', async ({ page }) => {
    // Login first
    await page.goto('/teacher/start')
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.teacher.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.teacher.password)
    await page.getByRole('button', { name: /Sign In|Login/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // May already be on dashboard
    }

    // Dashboard
    await page.goto('/app/dashboard')
    await waitForStable(page)
    await captureStep(page, FLOW, '20-dashboard-overview')

    // Check for analytics/metrics cards
    await page.evaluate(() => window.scrollBy(0, 300))
    await captureStep(page, FLOW, '21-dashboard-metrics')

    // Full page scroll
    await page.evaluate(() => window.scrollBy(0, 500))
    await captureStep(page, FLOW, '22-dashboard-full')
  })

  test('VT-004: Teacher Classes Page', async ({ page }) => {
    // Login
    await page.goto('/teacher/start')
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.teacher.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.teacher.password)
    await page.getByRole('button', { name: /Sign In|Login/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Classes page
    await page.goto('/app/teacher/classes')
    await waitForStable(page)
    await captureStep(page, FLOW, '30-classes-page')

    // Check for create class button
    const createButton = page.getByRole('button', { name: /Create|New|Add/i })
    if (await createButton.isVisible()) {
      await createButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '31-create-class-dialog')

      // Close dialog (use first() to avoid multiple matches)
      const closeButton = page.getByRole('button', { name: /Cancel/i }).first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await waitForStable(page)
      }
    }

    // Check for existing class cards
    const classCard = page.locator('[class*="card"]').first()
    if (await classCard.isVisible()) {
      await captureStep(page, FLOW, '32-class-cards')

      // Click on first class
      await classCard.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '33-class-detail-page')
    }
  })

  test('VT-005: Teacher Class Detail Page', async ({ page }) => {
    // Login
    await page.goto('/teacher/start')
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.teacher.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.teacher.password)
    await page.getByRole('button', { name: /Sign In|Login/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Go to classes first
    await page.goto('/app/teacher/classes')
    await waitForStable(page)

    // Find and click on a class
    const classLink = page.locator('a[href*="/teacher/classes/"]').first()
    if (await classLink.isVisible()) {
      await classLink.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '40-class-detail')

      // Check for invite panel (use heading or specific text)
      const inviteSection = page.getByRole('heading', { name: /Invite Students/i }).first()
      if (await inviteSection.isVisible()) {
        await captureStep(page, FLOW, '41-invite-section')
      } else {
        // Fallback - just capture current state
        await captureStep(page, FLOW, '41-class-detail-view')
      }

      // Check for roster/students table
      const rosterSection = page.getByText(/Students|Roster|Members/i)
      if (await rosterSection.isVisible()) {
        await captureStep(page, FLOW, '42-roster-section')
      }

      // Check for analytics
      const analyticsSection = page.getByText(/Analytics|Stats|Performance/i)
      if (await analyticsSection.isVisible()) {
        await page.evaluate(() => window.scrollTo(0, 0))
        await captureStep(page, FLOW, '43-analytics-section')
      }
    }
  })

  test('VT-006: Teacher Assessments Page', async ({ page }) => {
    // Login
    await page.goto('/teacher/start')
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.teacher.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.teacher.password)
    await page.getByRole('button', { name: /Sign In|Login/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Assessments page
    await page.goto('/app/teacher/assessments')
    await waitForStable(page)
    await captureStep(page, FLOW, '50-assessments-page')

    // Check for assessment list
    await page.evaluate(() => window.scrollBy(0, 300))
    await captureStep(page, FLOW, '51-assessments-list')
  })

  test('VT-007: Teacher Settings/Profile Page', async ({ page }) => {
    // Login
    await page.goto('/teacher/start')
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.teacher.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.teacher.password)
    await page.getByRole('button', { name: /Sign In|Login/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Settings page
    await page.goto('/app/settings')
    await waitForStable(page)
    await captureStep(page, FLOW, '60-settings-page')

    // Check for profile editor
    const profileCard = page.getByText(/Teacher Profile/i)
    if (await profileCard.isVisible()) {
      await captureStep(page, FLOW, '61-profile-section')
    }

    // Click edit if available
    const editButton = page.getByRole('button', { name: /Edit/i })
    if (await editButton.isVisible()) {
      await editButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '62-profile-edit-mode')
    }

    // Scroll for more settings
    await page.evaluate(() => window.scrollBy(0, 500))
    await captureStep(page, FLOW, '63-settings-more')
  })

  test('VT-008: Teacher AI Tools Page', async ({ page }) => {
    // Login
    await page.goto('/teacher/start')
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.teacher.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.teacher.password)
    await page.getByRole('button', { name: /Sign In|Login/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue
    }

    // AI Tools page
    await page.goto('/app/ai-tools')
    await waitForStable(page)
    await captureStep(page, FLOW, '70-ai-tools-page')

    // Check for different AI tool options
    await page.evaluate(() => window.scrollBy(0, 300))
    await captureStep(page, FLOW, '71-ai-tools-options')
  })

  test('VT-009: Teacher Invite Student Dialog', async ({ page }) => {
    // Login
    await page.goto('/teacher/start')
    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.teacher.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.teacher.password)
    await page.getByRole('button', { name: /Sign In|Login/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue
    }

    // Go to classes
    await page.goto('/app/teacher/classes')
    await waitForStable(page)

    // Find a class and access invite
    const classLink = page.locator('a[href*="/teacher/classes/"]').first()
    if (await classLink.isVisible()) {
      await classLink.click()
      await waitForStable(page)

      // Look for invite button
      const inviteButton = page.getByRole('button', { name: /Invite|Add Student/i })
      if (await inviteButton.isVisible()) {
        await inviteButton.click()
        await waitForStable(page)
        await captureStep(page, FLOW, '80-invite-dialog')
      }

      // Look for share code/QR section (capture current state)
      await captureStep(page, FLOW, '81-class-invite-view')
    }
  })

  test('VT-010: Teacher Forgot Password Flow', async ({ page }) => {
    // Navigate to teacher login
    await page.goto('/teacher/start')
    await waitForStable(page)

    const loginButton = page.getByRole('button', { name: /Login|Sign In/i })
    await loginButton.click()
    await waitForStable(page)
    await captureStep(page, FLOW, '90-login-page')

    // Look for forgot password link
    const forgotLink = page.getByText(/Forgot|Reset/i)
    if (await forgotLink.isVisible()) {
      await forgotLink.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '91-forgot-password-form')

      // Fill email
      const emailInput = page.getByPlaceholder(/email/i)
      if (await emailInput.isVisible()) {
        await emailInput.fill(TEST_CREDENTIALS.teacher.email)
        await captureStep(page, FLOW, '92-forgot-email-filled')
      }
    }
  })
})
