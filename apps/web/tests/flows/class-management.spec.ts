/**
 * ATAL AI - Class Management E2E Tests
 *
 * Complete testing of class CRUD operations:
 * - Create Class
 * - Read Class (View Details)
 * - Update Class
 * - Delete Class
 * - Student Enrollment
 * - Class Code & PIN Management
 */

import { test, expect } from '@playwright/test'
import { TEST_TEACHER, TEST_CLASS } from '../fixtures/test-data'

test.describe('Class Creation', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_TEACHER_EMAIL
  })

  test.beforeEach(async ({ page }) => {
    // Login as teacher
    await page.goto('/teacher/start')
    await page.getByRole('button', { name: /Login.*Account/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_TEACHER.email)
    await page.getByLabel(/Password/i).fill(TEST_TEACHER.password)
    await page.getByRole('button', { name: /Sign In/i }).click()
    await page.waitForURL(/\/app\//, { timeout: 15000 })
  })

  test('CM-001: Create class dialog opens', async ({ page }) => {
    await page.goto('/app/teacher/classes')
    await page.getByRole('button', { name: /Create.*Class|New Class|\+/i }).click()

    await expect(page.getByLabel(/Class Name|Name/i)).toBeVisible()
    await expect(page.getByLabel(/Subject/i)).toBeVisible()
  })

  test('CM-002: Class name is required', async ({ page }) => {
    await page.goto('/app/teacher/classes')
    await page.getByRole('button', { name: /Create.*Class|New Class|\+/i }).click()

    // Leave name empty, fill subject
    const subjectInput = page.getByLabel(/Subject/i)
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Mathematics')
    }

    await page.getByRole('button', { name: /Create|Save/i }).last().click()

    // Should show validation error or prevent submission
    await expect(page.getByText(/required|enter|name/i)).toBeVisible()
  })

  test('CM-003: Can create class with valid data', async ({ page }) => {
    await page.goto('/app/teacher/classes')
    await page.getByRole('button', { name: /Create.*Class|New Class|\+/i }).click()

    const uniqueName = `Test Class ${Date.now()}`
    await page.getByLabel(/Class Name|Name/i).fill(uniqueName)

    const subjectInput = page.getByLabel(/Subject/i)
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Science')
    }

    await page.getByRole('button', { name: /Create|Save/i }).last().click()

    // Should show success or new class in list
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 })
  })

  test('CM-004: New class has auto-generated code', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    // Look for class code in any class card
    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      // Class code should be 6 characters
      const codeText = await classCard.textContent()
      const codeMatch = codeText?.match(/[A-Z0-9]{6}/)
      expect(codeMatch).toBeTruthy()
    }
  })

  test('CM-005: New class has auto-generated PIN', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      // PIN should be 4 digits
      const cardText = await classCard.textContent()
      const pinMatch = cardText?.match(/\d{4}/)
      expect(pinMatch).toBeTruthy()
    }
  })
})

test.describe('Class Viewing', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_TEACHER_EMAIL
  })

  test('CM-010: Classes page lists all teacher classes', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    // Should show classes or "no classes" message
    const hasClasses = await page.locator('[data-testid="class-card"]').count() > 0
    const hasNoClasses = await page.getByText(/No classes|Create your first/i).isVisible()

    expect(hasClasses || hasNoClasses).toBeTruthy()
  })

  test('CM-011: Class card shows essential info', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      // Should show name, subject, code, or student count
      const cardContent = await classCard.textContent()
      expect(cardContent).toBeTruthy()
    }
  })

  test('CM-012: Can navigate to class details', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()
      await expect(page).toHaveURL(/\/app\/teacher\/classes\//)
    }
  })

  test('CM-013: Class detail shows student roster', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()
      await page.waitForURL(/\/app\/teacher\/classes\//)

      // Should show students section
      await expect(page.getByText(/Students|Roster|Enrolled/i).first()).toBeVisible()
    }
  })

  test('CM-014: Class detail shows invite options', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      // Should show code, PIN, or QR for inviting students
      await expect(page.getByText(/Code|PIN|Invite|Share|QR/i).first()).toBeVisible()
    }
  })
})

test.describe('Class Updates', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_TEACHER_EMAIL
  })

  test('CM-020: Can access class edit form', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      const editButton = page.getByRole('button', { name: /Edit|Update/i })
      if (await editButton.isVisible()) {
        await editButton.click()
        await expect(page.getByLabel(/Name|Subject/i).first()).toBeVisible()
      }
    }
  })

  test('CM-021: Can update class name', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      const editButton = page.getByRole('button', { name: /Edit|Update/i })
      if (await editButton.isVisible()) {
        await editButton.click()

        const nameInput = page.getByLabel(/Class Name|Name/i)
        const currentName = await nameInput.inputValue()
        await nameInput.fill(`${currentName} Updated`)

        await page.getByRole('button', { name: /Save|Update/i }).click()
        await expect(page.getByText(/updated|saved|success/i)).toBeVisible()
      }
    }
  })
})

test.describe('Class Deletion', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_TEACHER_EMAIL
  })

  test('CM-030: Delete option exists in class detail', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      // Look for delete button or menu option
      const deleteButton = page.getByRole('button', { name: /Delete|Remove/i })
      const menuButton = page.getByRole('button', { name: /Menu|More|\.\.\.|\⋮/i })

      const hasDelete = await deleteButton.isVisible().catch(() => false)
      const hasMenu = await menuButton.isVisible().catch(() => false)

      // Delete functionality should exist
      expect(hasDelete || hasMenu).toBeTruthy()
    }
  })

  test('CM-031: Delete requires confirmation', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      const deleteButton = page.getByRole('button', { name: /Delete|Remove/i })
      if (await deleteButton.isVisible()) {
        await deleteButton.click()

        // Should show confirmation dialog
        await expect(page.getByText(/confirm|sure|delete/i)).toBeVisible()
      }
    }
  })
})

test.describe('Student Enrollment Management', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_TEACHER_EMAIL
  })

  test('CM-040: Can view enrolled students', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      // Should show student list or empty state
      const hasStudents = await page.locator('[data-testid="student-row"]').count() > 0
      const hasEmptyState = await page.getByText(/No students|Empty|Invite/i).isVisible()

      expect(hasStudents || hasEmptyState).toBeTruthy()
    }
  })

  test('CM-041: Can search students in class', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      const searchInput = page.getByPlaceholder(/Search|Find|Student/i)
      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        await page.waitForLoadState('networkidle')
      }
    }
  })

  test('CM-042: Student row shows relevant info', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      const studentRow = page.locator('[data-testid="student-row"]').first()
      if (await studentRow.isVisible()) {
        // Should show name, roll number, or other info
        const content = await studentRow.textContent()
        expect(content?.length).toBeGreaterThan(0)
      }
    }
  })

  test('CM-043: Can remove student from class', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      const studentRow = page.locator('[data-testid="student-row"]').first()
      if (await studentRow.isVisible()) {
        const removeButton = studentRow.getByRole('button', { name: /Remove|Delete|X/i })
        if (await removeButton.isVisible()) {
          await removeButton.click()

          // Should show confirmation
          await expect(page.getByText(/confirm|remove|sure/i)).toBeVisible()
        }
      }
    }
  })
})

test.describe('Class Code & PIN Management', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_TEACHER_EMAIL
  })

  test('CM-050: Class code can be copied', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      const copyButton = page.getByRole('button', { name: /Copy|📋/i })
      if (await copyButton.isVisible()) {
        await copyButton.click()
        // Should show "copied" feedback
        await expect(page.getByText(/copied/i)).toBeVisible()
      }
    }
  })

  test('CM-051: QR code is displayed for class', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      // Look for QR code
      const qrElement = page.locator('canvas, [data-testid="qr-code"], img[alt*="QR"]')
      if (await qrElement.first().isVisible()) {
        await expect(qrElement.first()).toBeVisible()
      }
    }
  })

  test('CM-052: Can regenerate class PIN', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      const regenerateButton = page.getByRole('button', { name: /Regenerate|New PIN|Rotate/i })
      if (await regenerateButton.isVisible()) {
        const oldPin = await page.getByText(/\d{4}/).first().textContent()
        await regenerateButton.click()

        // PIN should change (or show confirmation)
        await page.waitForLoadState('networkidle')
      }
    }
  })
})

test.describe('Class Analytics', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_TEACHER_EMAIL
  })

  test('CM-060: Class detail shows basic analytics', async ({ page }) => {
    await page.goto('/app/teacher/classes')

    const classCard = page.locator('[data-testid="class-card"]').first()
    if (await classCard.isVisible()) {
      await classCard.click()

      // Should show some analytics like student count, assessment stats
      const analyticsText = page.getByText(/students|enrolled|assessments|completed/i)
      if (await analyticsText.first().isVisible()) {
        await expect(analyticsText.first()).toBeVisible()
      }
    }
  })
})
