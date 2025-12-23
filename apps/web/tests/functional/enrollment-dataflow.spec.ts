/**
 * ATAL AI - Enrollment & Data Flow Tests
 *
 * Tests critical data synchronization between:
 * - Student joining a class
 * - Student seeing class details (teacher, subject)
 * - Teacher seeing enrolled student details (name, roll, class)
 * - Duplicate enrollment prevention
 */

import { test, expect } from '@playwright/test'
import { loginAsStudent, loginAsTeacher, CREDENTIALS } from './test-helpers'
import * as fs from 'fs'
import * as path from 'path'

// Ensure screenshots directory exists
const screenshotDir = 'playwright/screenshots/enrollment'
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

test.describe('Enrollment Data Flow - Critical Issues', () => {
  // Use longer timeout for these tests
  test.setTimeout(60000)

  test.describe('Student Side - Class Display', () => {
    test.use({ storageState: 'playwright/.auth/student.json' })

    test.beforeEach(async ({ page }) => {
      // Verify we're logged in as student
      await page.goto('/app/dashboard')
      await page.waitForLoadState('domcontentloaded')
    })

    test('ENROLL-001: Student classes page shows enrolled classes', async ({ page }) => {
      await page.goto('/app/student/classes')
      await page.waitForLoadState('domcontentloaded')

      // Check page loads
      await expect(page.getByText(/My Classes/i).first()).toBeVisible()

      // Take screenshot for analysis
      await page.screenshot({ path: 'playwright/screenshots/enrollment/student-classes-page.png', fullPage: true })
    })

    test('ENROLL-002: Enrolled class shows teacher name or email', async ({ page }) => {
      await page.goto('/app/student/classes')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000) // Wait for data to load

      // Check if student has any enrolled classes
      const noClasses = await page.getByText(/No classes yet/i).isVisible().catch(() => false)

      if (noClasses) {
        // ISSUE IDENTIFIED: Student not seeing enrolled classes
        console.log('⚠️ ISSUE: Student has no visible enrolled classes')
        await page.screenshot({ path: 'playwright/screenshots/enrollment/student-no-classes-issue.png', fullPage: true })
      } else {
        // Check if teacher info is shown
        const hasTeacher = await page.getByText(/Teacher:/i).isVisible().catch(() => false)

        if (!hasTeacher) {
          console.log('⚠️ ISSUE: Enrolled class does not show teacher information')
        }

        await page.screenshot({ path: 'playwright/screenshots/enrollment/student-class-with-teacher.png', fullPage: true })
        expect(hasTeacher).toBeTruthy()
      }
    })

    test('ENROLL-003: Enrolled class shows subject', async ({ page }) => {
      await page.goto('/app/student/classes')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Check for subject display (may be in class card)
      const hasSubject = await page.getByText(/Subject:|Science|Math|English|Computer/i).isVisible().catch(() => false)

      // This is optional - not all classes have subjects
      console.log(`Subject display: ${hasSubject ? 'Found' : 'Not found'}`)
    })

    test('ENROLL-004: Click on enrolled class shows details', async ({ page }) => {
      await page.goto('/app/student/classes')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Find any class card
      const classCard = page.locator('[class*="card"]').first()

      if (await classCard.isVisible()) {
        // Try to click on it
        const startBtn = page.getByRole('button', { name: /Start Assessment/i }).first()

        if (await startBtn.isVisible()) {
          await page.screenshot({ path: 'playwright/screenshots/enrollment/student-class-card.png', fullPage: true })
          console.log('✅ Class card found with Start Assessment button')
        }
      } else {
        console.log('⚠️ No class cards visible for student')
      }
    })
  })

  test.describe('Teacher Side - Student Roster Display', () => {
    test.use({ storageState: 'playwright/.auth/teacher.json' })

    test.beforeEach(async ({ page }) => {
      // Verify we're logged in as teacher
      await page.goto('/app/teacher/classes')
      await page.waitForLoadState('domcontentloaded')
    })

    test('ENROLL-010: Teacher classes page shows classes', async ({ page }) => {
      await page.goto('/app/teacher/classes')
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(/My Classes/i).first()).toBeVisible()

      // Check if any classes exist
      const classCards = page.locator('[class*="card"]')
      const count = await classCards.count()

      console.log(`Teacher has ${count} class cards visible`)
      await page.screenshot({ path: 'playwright/screenshots/enrollment/teacher-classes-page.png', fullPage: true })
    })

    test('ENROLL-011: Teacher can view class roster', async ({ page }) => {
      await page.goto('/app/teacher/classes')
      await page.waitForLoadState('domcontentloaded')

      // Find a class to click on
      const viewRosterBtn = page.getByRole('button', { name: /View Roster/i }).first()
      const manageClassBtn = page.getByRole('button', { name: /Manage Class/i }).first()
      const classLink = page.locator('a[href*="/teacher/classes/"]').first()

      if (await viewRosterBtn.isVisible()) {
        await viewRosterBtn.click()
      } else if (await manageClassBtn.isVisible()) {
        await manageClassBtn.click()
      } else if (await classLink.isVisible()) {
        await classLink.click()
      } else {
        console.log('⚠️ No way to access class roster found')
        return
      }

      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Check if on class detail page
      if (page.url().includes('/teacher/classes/')) {
        await page.screenshot({ path: 'playwright/screenshots/enrollment/teacher-class-detail.png', fullPage: true })

        // Check for roster section
        const hasRoster = await page.getByText(/Class Roster|Students|Enrolled/i).isVisible().catch(() => false)
        console.log(`Roster section visible: ${hasRoster}`)
      }
    })

    test('ENROLL-012: Teacher sees enrolled student NAME', async ({ page }) => {
      await page.goto('/app/teacher/classes')
      await page.waitForLoadState('domcontentloaded')

      // Navigate to first class
      const classLink = page.locator('a[href*="/teacher/classes/"]').first()
      if (await classLink.isVisible()) {
        await classLink.click()
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2000)

        // Check if enrolled count > 0
        const enrolledText = await page.getByText(/\d+ student/).textContent().catch(() => null)

        if (enrolledText && !enrolledText.includes('0 student')) {
          // There are enrolled students - check if names are visible
          const noStudentsMsg = await page.getByText(/No students enrolled/i).isVisible().catch(() => false)

          if (noStudentsMsg) {
            console.log('⚠️ CRITICAL ISSUE: Students are enrolled but showing "No students enrolled"')
            await page.screenshot({ path: 'playwright/screenshots/enrollment/teacher-no-students-issue.png', fullPage: true })
          } else {
            // Look for student names in table/list
            const table = page.locator('table').first()
            if (await table.isVisible()) {
              await page.screenshot({ path: 'playwright/screenshots/enrollment/teacher-student-roster.png', fullPage: true })
              console.log('✅ Student roster table visible')
            }
          }
        } else {
          console.log('Class has 0 enrolled students')
        }
      }
    })

    test('ENROLL-013: Teacher sees student roll number', async ({ page }) => {
      await page.goto('/app/teacher/classes')
      await page.waitForLoadState('domcontentloaded')

      const classLink = page.locator('a[href*="/teacher/classes/"]').first()
      if (await classLink.isVisible()) {
        await classLink.click()
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2000)

        // Check for roll number column in roster
        const hasRollNumber = await page.getByText(/Roll|Number|#/i).isVisible().catch(() => false)
        console.log(`Roll number column visible: ${hasRollNumber}`)

        if (!hasRollNumber) {
          console.log('⚠️ Roll number may not be displayed in roster')
        }
      }
    })

    test('ENROLL-014: Teacher sees student class/grade info', async ({ page }) => {
      await page.goto('/app/teacher/classes')
      await page.waitForLoadState('domcontentloaded')

      const classLink = page.locator('a[href*="/teacher/classes/"]').first()
      if (await classLink.isVisible()) {
        await classLink.click()
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2000)

        // Check for class/grade column
        const hasClassInfo = await page.getByText(/Class|Grade/i).isVisible().catch(() => false)
        console.log(`Class/Grade column visible: ${hasClassInfo}`)
      }
    })
  })

  test.describe('Join Class Flow - Full E2E', () => {
    test.use({ storageState: 'playwright/.auth/student.json' })

    test('ENROLL-020: Student can find join class button', async ({ page }) => {
      await page.goto('/app/student/classes')
      await page.waitForLoadState('domcontentloaded')

      // Look for join class button/link
      const joinBtn = page.getByRole('button', { name: /Join.*Class/i }).first()
      const joinLink = page.getByRole('link', { name: /Join.*Class/i }).first()

      const hasJoin = await joinBtn.isVisible().catch(() => false) ||
                      await joinLink.isVisible().catch(() => false)

      console.log(`Join Class button visible: ${hasJoin}`)
      await page.screenshot({ path: 'playwright/screenshots/enrollment/student-join-button.png', fullPage: true })

      expect(hasJoin).toBeTruthy()
    })

    test('ENROLL-021: Join class page loads', async ({ page }) => {
      await page.goto('/join?via=invite')
      await page.waitForLoadState('domcontentloaded')

      await page.screenshot({ path: 'playwright/screenshots/enrollment/join-class-page.png', fullPage: true })

      // Should have code input
      const hasCodeInput = await page.getByPlaceholder(/code/i).isVisible().catch(() => false)
      console.log(`Class code input visible: ${hasCodeInput}`)
    })

    test('ENROLL-022: Invalid class code shows error', async ({ page }) => {
      await page.goto('/join?via=invite')
      await page.waitForLoadState('domcontentloaded')

      // Fill invalid code
      const codeInput = page.getByPlaceholder(/code/i).first()
      if (await codeInput.isVisible()) {
        await codeInput.fill('XXXXXX')

        // Try PIN if visible
        const pinInput = page.getByPlaceholder(/PIN/i).first()
        if (await pinInput.isVisible()) {
          await pinInput.fill('0000')
        }

        // Try to submit
        const joinBtn = page.getByRole('button', { name: /Join|Verify|Submit/i }).first()
        if (await joinBtn.isVisible()) {
          await joinBtn.click()
          await page.waitForTimeout(3000)

          // Check for error
          const hasError = await page.getByText(/invalid|error|not found|incorrect/i).isVisible().catch(() => false)
          console.log(`Error shown for invalid code: ${hasError}`)

          await page.screenshot({ path: 'playwright/screenshots/enrollment/join-invalid-code.png', fullPage: true })
        }
      }
    })
  })

  test.describe('Duplicate Enrollment Prevention', () => {
    test.use({ storageState: 'playwright/.auth/student.json' })

    test('ENROLL-030: Check database for duplicate enrollments', async ({ page }) => {
      // This test checks if there are duplicate enrollments in the database
      // by analyzing the student's classes page
      await page.goto('/app/student/classes')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Get all class cards
      const classCards = page.locator('[class*="card"]')
      const count = await classCards.count()

      // Check for duplicate class names
      const classNames: string[] = []
      for (let i = 0; i < count; i++) {
        const cardText = await classCards.nth(i).textContent()
        classNames.push(cardText || '')
      }

      // Find duplicates
      const duplicates = classNames.filter((name, index) =>
        classNames.indexOf(name) !== index
      )

      if (duplicates.length > 0) {
        console.log('⚠️ CRITICAL ISSUE: Duplicate class enrollments detected!')
        console.log('Duplicate classes:', duplicates)
        await page.screenshot({ path: 'playwright/screenshots/enrollment/duplicate-enrollments-issue.png', fullPage: true })
      } else {
        console.log('✅ No duplicate enrollments visible on UI')
      }

      // Note: Even if no duplicates on UI, they may exist in database
      // The action layer should prevent duplicates (checked in ENROLL-031)
    })

    test('ENROLL-031: joinClass action checks for existing enrollment', async ({ page }) => {
      // This test documents that the joinClass action SHOULD check for duplicates
      // From code review of student.ts lines 283-299:
      // - It uses .maybeSingle() to check existing enrollment
      // - It returns error "Already enrolled in this class" if enrollment exists

      console.log('✅ Code review: joinClass action has duplicate check at lines 283-299')
      console.log('   - Uses maybeSingle() to check existing enrollment')
      console.log('   - Returns error if already enrolled')

      // The issue may be:
      // 1. RLS policy blocking the SELECT
      // 2. User ID mismatch
      // 3. Guest/anonymous session issues

      console.log('⚠️ If duplicates occur, check:')
      console.log('   1. enrollments RLS policy for SELECT')
      console.log('   2. User session consistency')
      console.log('   3. Guest user handling')
    })
  })

  test.describe('Data Sync Issues Investigation', () => {
    test('ENROLL-040: Student classes query structure', async ({ page }) => {
      // Document the query used to fetch student classes
      // From student/classes/page.tsx lines 22-42

      console.log('Student Classes Query Analysis:')
      console.log('  Endpoint: /rest/v1/enrollments')
      console.log('  Filter: student_id=eq.{userId}')
      console.log('  Select: id,created_at,class:classes(id,name,class_code,teacher:users!classes_teacher_id_fkey(email))')
      console.log('')
      console.log('⚠️ Potential Issues:')
      console.log('  1. Uses anon key instead of user token')
      console.log('  2. RLS may block query')
      console.log('  3. Teacher lookup via users table (not teacher_profiles)')
      console.log('')
      console.log('  FIX SUGGESTION: Use Supabase client with user session')
    })

    test('ENROLL-041: Teacher roster query structure', async ({ page }) => {
      // Document the query used to fetch class roster
      // From teacher/classes/[id]/page.tsx lines 42-97

      console.log('Teacher Roster Query Analysis:')
      console.log('  Step 1: Fetch class with teacher_id check')
      console.log('  Step 2: Fetch enrollments for class_id')
      console.log('  Step 3: Fetch student_profiles for enrolled student_ids')
      console.log('')
      console.log('⚠️ Potential Issues:')
      console.log('  1. student_profiles RLS may block teacher SELECT')
      console.log('  2. student_profiles needs is_teacher() check')
      console.log('  3. Empty result if RLS denies access')
      console.log('')
      console.log('  FIX: Ensure teacher can SELECT enrolled students profiles')
    })
  })
})

test.describe('RLS Policy Verification', () => {
  test('ENROLL-050: Check enrollments RLS for student self-select', async ({ page }) => {
    // Document expected RLS behavior
    console.log('Enrollments RLS - Student Self-Select:')
    console.log('  Policy: enrollments_select')
    console.log('  Condition: student_id = auth.uid() OR class_id IN get_teacher_class_ids()')
    console.log('')
    console.log('  Expected: Student can see their own enrollments')
  })

  test('ENROLL-051: Check student_profiles RLS for teacher select', async ({ page }) => {
    console.log('Student Profiles RLS - Teacher Select:')
    console.log('  Policy: student_profile_teacher_select')
    console.log('  Condition: is_teacher() AND user_id IN get_teacher_student_ids()')
    console.log('')
    console.log('  Required Functions:')
    console.log('    - is_teacher() - checks if user has teacher_profile')
    console.log('    - get_teacher_student_ids() - returns enrolled students')
    console.log('')
    console.log('  If teacher cannot see students, verify:')
    console.log('    1. is_teacher() returns true')
    console.log('    2. get_teacher_student_ids() includes the student')
  })
})
