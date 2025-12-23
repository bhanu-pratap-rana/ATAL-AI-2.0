/**
 * ATAL AI - Authentication Fixtures
 *
 * Provides pre-authenticated test contexts for Teacher, Student, and Admin roles.
 * Uses Supawright for automatic database cleanup after tests.
 */

import { test as base, expect, type Page, type BrowserContext } from '@playwright/test'
import { withSupawright } from 'supawright'
import { copycat } from '@snaplet/copycat'
import type { Database } from '../../src/types/database'

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

export function generateTeacherData(seed: string) {
  return {
    email: copycat.email(seed, { domain: 'atalai-test.edu' }),
    name: copycat.fullName(seed),
    phone: `91${copycat.int(seed, { min: 7000000000, max: 9999999999 })}`,
    gender: copycat.oneOf(seed, ['male', 'female']) as 'male' | 'female',
    village: copycat.city(seed),
    subject: copycat.oneOf(seed, ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies']),
  }
}

export function generateStudentData(seed: string) {
  return {
    email: copycat.email(seed, { domain: 'student-atalai.test' }),
    name: copycat.fullName(seed),
    phone: `91${copycat.int(seed, { min: 7000000000, max: 9999999999 })}`,
    gender: copycat.oneOf(seed, ['male', 'female']) as 'male' | 'female',
    village: copycat.city(seed),
    rollNumber: `${copycat.int(seed, { min: 1, max: 99 })}`,
    className: copycat.oneOf(seed, ['Class 5', 'Class 6', 'Class 7', 'Class 8']),
  }
}

export function generateClassData(seed: string) {
  return {
    name: `${copycat.oneOf(seed, ['Mathematics', 'Science', 'English'])} - Section ${copycat.oneOf(seed, ['A', 'B', 'C'])}`,
    subject: copycat.oneOf(seed, ['Mathematics', 'Science', 'English', 'Hindi']),
  }
}

// ============================================================================
// SUPAWRIGHT SETUP (with automatic cleanup)
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create test with Supawright for automatic DB cleanup
export const testWithSupawright = withSupawright<Database, 'public'>(['public'], {
  supabase: {
    supabaseUrl,
    serviceRoleKey,
  },
})

// ============================================================================
// CUSTOM FIXTURES
// ============================================================================

type AuthFixtures = {
  // Authenticated pages for different roles
  teacherPage: Page
  studentPage: Page
  adminPage: Page

  // Contexts with authentication state
  teacherContext: BrowserContext
  studentContext: BrowserContext
  adminContext: BrowserContext

  // Test data
  testTeacher: ReturnType<typeof generateTeacherData>
  testStudent: ReturnType<typeof generateStudentData>
  testClass: ReturnType<typeof generateClassData>

  // Helper functions
  loginAsTeacher: (email: string, password: string) => Promise<void>
  loginAsStudent: (email: string) => Promise<void>
  loginAsAdmin: (email: string, password: string) => Promise<void>
}

export const test = base.extend<AuthFixtures>({
  // Test data fixtures (deterministic based on test name)
  testTeacher: async ({}, use, testInfo) => {
    const seed = `teacher-${testInfo.title}-${testInfo.retry}`
    await use(generateTeacherData(seed))
  },

  testStudent: async ({}, use, testInfo) => {
    const seed = `student-${testInfo.title}-${testInfo.retry}`
    await use(generateStudentData(seed))
  },

  testClass: async ({}, use, testInfo) => {
    const seed = `class-${testInfo.title}-${testInfo.retry}`
    await use(generateClassData(seed))
  },

  // Login helper functions
  loginAsTeacher: async ({ page }, use) => {
    const login = async (email: string, password: string) => {
      await page.goto('/teacher/start')
      await page.getByRole('button', { name: /Login to Account/i }).click()
      await page.getByLabel(/Email/i).fill(email)
      await page.getByLabel(/Password/i).fill(password)
      await page.getByRole('button', { name: /Sign In/i }).click()
      await page.waitForURL(/\/app\/dashboard|\/app\/teacher/)
    }
    await use(login)
  },

  loginAsStudent: async ({ page }, use) => {
    const login = async (email: string) => {
      await page.goto('/student/start')
      await page.getByRole('button', { name: /Sign In/i }).click()
      // Student uses OTP, so we'd need to mock this or use test mode
      await page.getByPlaceholder(/email/i).fill(email)
      await page.getByRole('button', { name: /Send|Continue/i }).click()
    }
    await use(login)
  },

  loginAsAdmin: async ({ page }, use) => {
    const login = async (email: string, password: string) => {
      await page.goto('/admin/login')
      await page.getByLabel(/Email/i).fill(email)
      await page.getByLabel(/Password/i).fill(password)
      await page.getByRole('button', { name: /Login|Sign In/i }).click()
      await page.waitForURL(/\/admin\/dashboard/)
    }
    await use(login)
  },

  // Pre-authenticated contexts (uses stored auth state)
  teacherContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/teacher.json',
    })
    await use(context)
    await context.close()
  },

  studentContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/student.json',
    })
    await use(context)
    await context.close()
  },

  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    })
    await use(context)
    await context.close()
  },

  // Pre-authenticated pages
  teacherPage: async ({ teacherContext }, use) => {
    const page = await teacherContext.newPage()
    await use(page)
  },

  studentPage: async ({ studentContext }, use) => {
    const page = await studentContext.newPage()
    await use(page)
  },

  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage()
    await use(page)
  },
})

export { expect }
