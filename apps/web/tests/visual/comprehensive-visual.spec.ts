/**
 * ATAL AI - Comprehensive Visual Tests
 *
 * Captures screenshots of ALL pages and components
 * to ensure complete UI coverage and theme consistency.
 */

import { test, expect } from '@playwright/test'
import {
  captureStep,
  waitForStable,
  resetCounter,
  TEST_CREDENTIALS,
  generateScreenshotReport,
} from './screenshot-utils'

const FLOW = 'comprehensive'

test.describe('Comprehensive UI Visual Analysis', () => {
  test.beforeEach(async ({ page }) => {
    resetCounter(FLOW)
  })

  test('VC-001: Public Pages', async ({ page }) => {
    // Landing page
    await page.goto('/')
    await waitForStable(page)
    await captureStep(page, FLOW, '01-landing-page')

    // Student start
    await page.goto('/student/start')
    await waitForStable(page)
    await captureStep(page, FLOW, '02-student-start')

    // Teacher start
    await page.goto('/teacher/start')
    await waitForStable(page)
    await captureStep(page, FLOW, '03-teacher-start')

    // Join page (with invite param)
    await page.goto('/join?via=invite')
    await waitForStable(page)
    await captureStep(page, FLOW, '04-join-page')

    // Admin login
    await page.goto('/admin/login')
    await waitForStable(page)
    await captureStep(page, FLOW, '05-admin-login')
  })

  test('VC-002: Mobile Responsive - Public Pages', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })

    // Landing page mobile
    await page.goto('/')
    await waitForStable(page)
    await captureStep(page, FLOW, '10-mobile-landing')

    // Student start mobile
    await page.goto('/student/start')
    await waitForStable(page)
    await captureStep(page, FLOW, '11-mobile-student-start')

    // Teacher start mobile
    await page.goto('/teacher/start')
    await waitForStable(page)
    await captureStep(page, FLOW, '12-mobile-teacher-start')

    // Join page mobile
    await page.goto('/join?via=invite')
    await waitForStable(page)
    await captureStep(page, FLOW, '13-mobile-join')

    // Admin login mobile
    await page.goto('/admin/login')
    await waitForStable(page)
    await captureStep(page, FLOW, '14-mobile-admin-login')
  })

  test('VC-003: Tablet Responsive - Public Pages', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    // Landing page tablet
    await page.goto('/')
    await waitForStable(page)
    await captureStep(page, FLOW, '20-tablet-landing')

    // Student start tablet
    await page.goto('/student/start')
    await waitForStable(page)
    await captureStep(page, FLOW, '21-tablet-student-start')

    // Teacher start tablet
    await page.goto('/teacher/start')
    await waitForStable(page)
    await captureStep(page, FLOW, '22-tablet-teacher-start')
  })

  test('VC-004: Student Authenticated Pages', async ({ page }) => {
    // Login as student
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.student.password)
    await page.getByRole('button', { name: /Sign In/i }).click()

    try {
      await page.waitForURL(/\/app\//, { timeout: 15000 })
    } catch {
      // Continue even if redirect fails
    }

    // All student pages
    const studentPages = [
      { path: '/app/dashboard', name: '30-student-dashboard' },
      { path: '/app/student/classes', name: '31-student-classes' },
      { path: '/app/student/assessments', name: '32-student-assessments' },
      { path: '/app/settings', name: '33-student-settings' },
      { path: '/app/progress', name: '34-student-progress' },
      { path: '/app/curriculum', name: '35-student-curriculum' },
      { path: '/app/ai-tools', name: '36-student-ai-tools' },
    ]

    for (const pageInfo of studentPages) {
      await page.goto(pageInfo.path)
      await waitForStable(page)
      await captureStep(page, FLOW, pageInfo.name)
    }
  })

  test('VC-005: Teacher Authenticated Pages', async ({ page }) => {
    // Login as teacher
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

    // All teacher pages
    const teacherPages = [
      { path: '/app/dashboard', name: '40-teacher-dashboard' },
      { path: '/app/teacher/classes', name: '41-teacher-classes' },
      { path: '/app/teacher/assessments', name: '42-teacher-assessments' },
      { path: '/app/settings', name: '43-teacher-settings' },
      { path: '/app/ai-tools', name: '44-teacher-ai-tools' },
    ]

    for (const pageInfo of teacherPages) {
      await page.goto(pageInfo.path)
      await waitForStable(page)
      await captureStep(page, FLOW, pageInfo.name)
    }
  })

  test('VC-006: Admin Authenticated Pages', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login')
    await page.getByLabel(/Email/i).fill(TEST_CREDENTIALS.admin.email)
    await page.getByLabel(/Password/i).fill(TEST_CREDENTIALS.admin.password)
    await page.getByRole('button', { name: /Login|Sign In/i }).click()

    try {
      await page.waitForURL(/\/admin/, { timeout: 15000 })
    } catch {
      // Continue
    }

    // All admin pages
    const adminPages = [
      { path: '/admin/dashboard', name: '50-admin-dashboard' },
      { path: '/admin/pins', name: '51-admin-pins' },
      { path: '/admin/admins', name: '52-admin-list' },
      { path: '/admin/create', name: '53-admin-create' },
      { path: '/admin/manage', name: '54-admin-manage' },
      { path: '/admin/setup', name: '55-admin-setup' },
      { path: '/app/admin/schools', name: '56-admin-schools' },
    ]

    for (const pageInfo of adminPages) {
      await page.goto(pageInfo.path)
      await waitForStable(page)
      await captureStep(page, FLOW, pageInfo.name)
    }
  })

  test('VC-007: Form Validation States', async ({ page }) => {
    // Student login - empty form
    await page.goto('/student/start')
    await page.getByRole('button', { name: /Login/i }).click()
    await waitForStable(page)
    await captureStep(page, FLOW, '60-form-empty-state')

    // Invalid email format
    const emailInput = page.getByLabel(/Email/i)
    await emailInput.fill('invalid-email')
    await page.getByRole('button', { name: /Sign In/i }).click()
    await waitForStable(page)
    await captureStep(page, FLOW, '61-form-invalid-email')

    // Valid email but wrong password
    await emailInput.clear()
    await emailInput.fill(TEST_CREDENTIALS.student.email)
    await page.getByLabel(/Password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /Sign In/i }).click()
    await waitForStable(page)
    await page.waitForTimeout(2000) // Wait for error message
    await captureStep(page, FLOW, '62-form-wrong-password')
  })

  test('VC-008: Error States & Edge Cases', async ({ page }) => {
    // 404 page
    await page.goto('/nonexistent-page-xyz')
    await waitForStable(page)
    await captureStep(page, FLOW, '70-404-page')

    // Join with invalid code
    await page.goto('/join?via=invite')
    await waitForStable(page)
    const codeInput = page.getByPlaceholder(/code/i)
    if (await codeInput.isVisible()) {
      await codeInput.fill('INVALID')
      const pinInput = page.getByPlaceholder(/PIN/i)
      if (await pinInput.isVisible()) {
        await pinInput.fill('0000')
      }
      const joinButton = page.getByRole('button', { name: /Join/i })
      if (await joinButton.isVisible()) {
        await joinButton.click()
        await page.waitForTimeout(3000)
        await captureStep(page, FLOW, '71-join-error-state')
      }
    }

    // Offline page if available
    await page.goto('/offline')
    await waitForStable(page)
    await captureStep(page, FLOW, '72-offline-page')
  })

  test('VC-009: UI Components Gallery', async ({ page }) => {
    // Login as teacher to see more UI
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

    // Dashboard - capture various UI components
    await page.goto('/app/dashboard')
    await waitForStable(page)
    await captureStep(page, FLOW, '80-ui-cards')

    // Settings - form elements
    await page.goto('/app/settings')
    await waitForStable(page)
    await captureStep(page, FLOW, '81-ui-forms')

    // Classes - tables/lists
    await page.goto('/app/teacher/classes')
    await waitForStable(page)
    await captureStep(page, FLOW, '82-ui-lists')
  })

  test('VC-010: Dialog & Modal States', async ({ page }) => {
    // Login as teacher
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

    // Go to classes to trigger dialogs
    await page.goto('/app/teacher/classes')
    await waitForStable(page)

    // Try to open create class dialog
    const createButton = page.getByRole('button', { name: /Create|New|Add/i })
    if (await createButton.isVisible()) {
      await createButton.click()
      await waitForStable(page)
      await captureStep(page, FLOW, '90-dialog-create-class')
    }
  })

  test.afterAll(async () => {
    // Generate summary report
    generateScreenshotReport()
  })
})
