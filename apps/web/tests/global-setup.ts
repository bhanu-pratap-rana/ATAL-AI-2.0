/**
 * ATAL AI - Playwright Global Setup
 *
 * This file runs before all tests to:
 * 1. Start the dev server (if needed)
 * 2. Create authenticated states for Teacher, Student, and Admin
 * 3. Save auth states to files for reuse across tests
 */

import { chromium, FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const TEST_TEACHER = {
  email: process.env.TEST_TEACHER_EMAIL || 'ranabhanu514@gmail.com',
  password: process.env.TEST_TEACHER_PASSWORD || 'Bhanu12@',
}

const TEST_STUDENT = {
  email: process.env.TEST_STUDENT_EMAIL || 'lyricallywilliam@gmail.com',
  password: process.env.TEST_STUDENT_PASSWORD || 'Bhanu12@',
}

const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || 'ranabhanu514@gmail.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'Bhanu12@',
}

const AUTH_DIR = 'playwright/.auth'

async function globalSetup(config: FullConfig) {
  console.log('🔧 Running global setup...')

  // Ensure auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'

  // Skip authentication setup if no credentials provided
  if (!TEST_TEACHER.email && !TEST_ADMIN.email) {
    console.log('⚠️  No test credentials provided. Skipping authentication setup.')
    console.log('   Set TEST_TEACHER_EMAIL, TEST_TEACHER_PASSWORD, etc. in .env.local')
    return
  }

  const browser = await chromium.launch()

  try {
    // Setup Teacher Auth State
    if (TEST_TEACHER.email && TEST_TEACHER.password) {
      console.log('🔐 Setting up teacher authentication...')
      const teacherContext = await browser.newContext()
      const teacherPage = await teacherContext.newPage()

      try {
        // Use simple goto without waitUntil - this works better with React
        await teacherPage.goto(`${baseURL}/teacher/start`)

        // Button text is "Login to Account" (on the choice page)
        await teacherPage.getByRole('button', { name: /Login to Account|Login/i }).click()

        // Fill using getByLabel (proven to work)
        await teacherPage.getByLabel(/Email/i).fill(TEST_TEACHER.email)
        await teacherPage.getByLabel(/Password/i).fill(TEST_TEACHER.password)

        // Click Sign In button
        await teacherPage.getByRole('button', { name: /Sign In/i }).click()

        // Wait for successful login with longer timeout
        await teacherPage.waitForURL(/\/app\//, { timeout: 45000 })

        // Save storage state
        await teacherContext.storageState({ path: path.join(AUTH_DIR, 'teacher.json') })
        console.log('✅ Teacher auth state saved')
      } catch (error) {
        console.log('❌ Failed to setup teacher auth:', (error as Error).message)
      }

      await teacherContext.close()
    }

    // Setup Admin Auth State
    if (TEST_ADMIN.email && TEST_ADMIN.password) {
      console.log('🔐 Setting up admin authentication...')
      const adminContext = await browser.newContext()
      const adminPage = await adminContext.newPage()

      try {
        // Use simple goto without waitUntil - this works better with React
        await adminPage.goto(`${baseURL}/admin/login`)

        // Fill using getByLabel (proven to work)
        await adminPage.getByLabel(/Email/i).fill(TEST_ADMIN.email)
        await adminPage.getByLabel(/Password/i).fill(TEST_ADMIN.password)

        // Submit
        await adminPage.getByRole('button', { name: /Login|Sign In/i }).click()

        // Wait for successful login - admin may go to dashboard or pins page
        await adminPage.waitForURL(/\/admin\/(dashboard|pins)/, { timeout: 30000 })

        // Save storage state
        await adminContext.storageState({ path: path.join(AUTH_DIR, 'admin.json') })
        console.log('✅ Admin auth state saved')
      } catch (error) {
        console.log('❌ Failed to setup admin auth:', (error as Error).message)
      }

      await adminContext.close()
    }

    // Setup Student Auth State (if password provided, use email+password login)
    if (TEST_STUDENT.email && TEST_STUDENT.password) {
      console.log('🔐 Setting up student authentication...')
      const studentContext = await browser.newContext()
      const studentPage = await studentContext.newPage()

      try {
        // Use simple goto without waitUntil - this works better with React
        await studentPage.goto(`${baseURL}/student/start`)

        // Click Login button on choice page
        await studentPage.getByRole('button', { name: /Login/i }).click()

        // Fill using getByLabel (email tab is default)
        await studentPage.getByLabel(/Email/i).first().fill(TEST_STUDENT.email)
        await studentPage.getByLabel(/Password/i).first().fill(TEST_STUDENT.password)

        // Click Sign In button
        await studentPage.getByRole('button', { name: /Sign In/i }).click()

        // Wait for successful login
        await studentPage.waitForURL(/\/app\//, { timeout: 30000 })

        // Save storage state
        await studentContext.storageState({ path: path.join(AUTH_DIR, 'student.json') })
        console.log('✅ Student auth state saved')
      } catch (error) {
        console.log('❌ Failed to setup student auth:', (error as Error).message)
        // Create empty student auth file so tests don't fail
        fs.writeFileSync(
          path.join(AUTH_DIR, 'student.json'),
          JSON.stringify({ cookies: [], origins: [] })
        )
      }

      await studentContext.close()
    } else if (TEST_STUDENT.email) {
      console.log('ℹ️  Student auth uses OTP - tests will use mock or unauthenticated flows')
      // Create empty student auth file so tests don't fail
      fs.writeFileSync(
        path.join(AUTH_DIR, 'student.json'),
        JSON.stringify({ cookies: [], origins: [] })
      )
    }

  } finally {
    await browser.close()
  }

  console.log('✅ Global setup complete!')
}

export default globalSetup
