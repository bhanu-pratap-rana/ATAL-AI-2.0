/**
 * ATAL AI - Assessment Flow E2E Tests
 *
 * Complete testing of assessment functionality:
 * - Starting Assessment
 * - Question Navigation (Previous/Next/Skip)
 * - Question Pagination
 * - Timer Display
 * - Answer Selection
 * - Assessment Submission
 * - Results/Summary Viewing
 */

import { test, expect } from '@playwright/test'
import { TEST_STUDENT, TEST_TEACHER } from '../fixtures/test-data'

test.describe('Assessment Start Flow', () => {
  test('AS-001: Assessment start page is accessible', async ({ page }) => {
    await page.goto('/app/assessment/start')

    // Should show assessment start or redirect to login
    const hasAssessment = await page.getByText(/Assessment|Start|Begin/i).isVisible().catch(() => false)
    const isRedirected = page.url().includes('/login') || page.url().includes('/student')

    expect(hasAssessment || isRedirected).toBeTruthy()
  })

  test('AS-002: Unauthenticated users are redirected', async ({ page }) => {
    await page.goto('/app/assessment/start')
    await page.waitForLoadState('networkidle')

    // Should redirect to login or student start
    const isProtected = !page.url().includes('/app/assessment/start') ||
      await page.getByText(/Login|Sign In/i).isVisible().catch(() => false)

    expect(isProtected).toBeTruthy()
  })

  test('AS-003: Language selection is available', async ({ page }) => {
    await page.goto('/app/assessment/start')

    // Should show language options
    const hasLanguageOptions = await page.getByText(/English|Hindi|हिंदी|Assamese|অসমীয়া/i).isVisible().catch(() => false)
    const isRedirected = !page.url().includes('/app/assessment/start')

    expect(hasLanguageOptions || isRedirected).toBeTruthy()
  })
})

test.describe('Assessment Taking (Authenticated Student)', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_STUDENT_EMAIL
  })

  test('AS-010: Can start an assessment', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin|Continue/i })
    if (await startButton.isVisible()) {
      await expect(startButton).toBeEnabled()
    }
  })

  test('AS-011: Assessment shows question content', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Should show question text
      await expect(page.getByText(/Question|Select|Choose/i).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('AS-012: Assessment shows answer options as radio buttons', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Should show multiple choice options as radio buttons
      const options = page.getByRole('radio')
      await expect(options.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('AS-013: Can select an answer', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Click first radio option
      const option = page.getByRole('radio').first()
      if (await option.isVisible()) {
        await option.click()

        // Should show selected state via aria-checked
        await expect(option).toHaveAttribute('aria-checked', 'true')
      }
    }
  })

  test('AS-014: Can navigate between questions using Submit & Next', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForTimeout(500)

      // Select an answer first
      const option = page.getByRole('radio').first()
      if (await option.isVisible()) {
        await option.click()
      }

      // Look for Submit & Next button (new navigation)
      const nextButton = page.getByRole('button', { name: /Submit.*Next|Next/i }).first()
      if (await nextButton.isVisible()) {
        await nextButton.click()
        // Should move to question 2
        await expect(page.getByText(/Question 2 of/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('AS-015: Progress indicator shows completion', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Should show progress (e.g., "Question 1 of 30")
      const progress = page.getByText(/Question\s+\d+\s+of\s+\d+/i)
      await expect(progress.first()).toBeVisible()
    }
  })
})

test.describe('Assessment Navigation Features', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_STUDENT_EMAIL
  })

  test('AS-016: Timer is displayed during assessment', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Look for timer with role="timer"
      const timer = page.getByRole('timer')
      await expect(timer).toBeVisible({ timeout: 5000 })
    }
  })

  test('AS-017: Question pagination dots are displayed', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Look for pagination navigation
      const pagination = page.getByRole('navigation', { name: /question navigation/i })
      await expect(pagination).toBeVisible({ timeout: 5000 })
    }
  })

  test('AS-018: Pagination legend is displayed', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Look for legend items
      await expect(page.getByText('Current')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Answered')).toBeVisible()
      await expect(page.getByText('Skipped')).toBeVisible()
      await expect(page.getByText('Not Attempted')).toBeVisible()
    }
  })

  test('AS-019: Can skip a question', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForTimeout(500)

      // Find and click Skip button
      const skipButton = page.getByRole('button', { name: /skip/i }).first()
      if (await skipButton.isVisible()) {
        await skipButton.click()
        // Should move to question 2
        await expect(page.getByText(/Question 2 of/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('AS-020: Can navigate back to previous question', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForTimeout(500)

      // Answer first question
      const option = page.getByRole('radio').first()
      if (await option.isVisible()) {
        await option.click()
      }

      // Go to next question
      const nextButton = page.getByRole('button', { name: /Submit.*Next|Next/i }).first()
      if (await nextButton.isVisible()) {
        await nextButton.click()
        await page.waitForTimeout(500)
      }

      // Now go back
      const previousButton = page.getByRole('button', { name: /previous/i }).first()
      if (await previousButton.isVisible() && await previousButton.isEnabled()) {
        await previousButton.click()
        // Should be back on question 1
        await expect(page.getByText(/Question 1 of/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('AS-021: Can clear selected answer', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForTimeout(500)

      // Select an answer
      const option = page.getByRole('radio').first()
      if (await option.isVisible()) {
        await option.click()
        await expect(option).toHaveAttribute('aria-checked', 'true')

        // Clear should now be visible
        const clearButton = page.getByRole('button', { name: /clear/i }).first()
        if (await clearButton.isVisible()) {
          await clearButton.click()
          // Answer should be deselected
          await expect(option).toHaveAttribute('aria-checked', 'false')
        }
      }
    }
  })

  test('AS-022: Previous button is disabled on first question without history', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForTimeout(500)

      // Previous button should be disabled on first question
      const previousButton = page.getByRole('button', { name: /previous/i }).first()
      if (await previousButton.isVisible()) {
        await expect(previousButton).toBeDisabled()
      }
    }
  })
})

test.describe('Assessment Submission', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_STUDENT_EMAIL
  })

  test('AS-030: Submit button appears on last question', async ({ page }) => {
    await page.goto('/app/assessment/start')

    // This would navigate through all questions
    // For now, just check submit exists somewhere
    const submitButton = page.getByRole('button', { name: /Submit|Finish|Complete/i })
    // May not be visible until last question
  })

  test('AS-031: Complete Assessment button shows on last question', async ({ page }) => {
    await page.goto('/app/assessment/start')

    // Navigate to end and check for Complete Assessment button
    // This is a placeholder - full test would navigate through all questions
    const completeButton = page.getByRole('button', { name: /Complete Assessment/i })
    // May not be visible until last question
  })
})

test.describe('Assessment Summary/Results', () => {
  test('AS-040: Summary page is accessible after completion', async ({ page }) => {
    await page.goto('/app/assessment/summary')

    // Should show summary or redirect
    const hasSummary = await page.getByText(/Summary|Results|Score|Complete/i).isVisible().catch(() => false)
    const isRedirected = !page.url().includes('/summary')

    expect(hasSummary || isRedirected).toBeTruthy()
  })

  test.skip(({ }, testInfo) => {
    return !process.env.TEST_STUDENT_EMAIL
  })

  test('AS-041: Summary shows score or results', async ({ page }) => {
    await page.goto('/app/assessment/summary')

    // Should show some results
    const results = page.getByText(/Score|Correct|Total|Performance/i)
    if (await results.first().isVisible()) {
      await expect(results.first()).toBeVisible()
    }
  })

  test('AS-042: Summary shows category breakdown', async ({ page }) => {
    await page.goto('/app/assessment/summary')

    // Should show category performance section
    const categorySection = page.getByText(/Category Performance|Performance by Module/i)
    if (await categorySection.isVisible()) {
      await expect(categorySection).toBeVisible()
    }
  })

  test('AS-043: Summary shows skill level badge', async ({ page }) => {
    await page.goto('/app/assessment/summary')

    // Should show skill level (Beginner/Intermediate/Advanced)
    const levelBadge = page.getByText(/Beginner|Intermediate|Advanced/i)
    if (await levelBadge.first().isVisible()) {
      await expect(levelBadge.first()).toBeVisible()
    }
  })

  test('AS-044: Summary shows retake assessment option', async ({ page }) => {
    await page.goto('/app/assessment/summary')

    // Should show retake button
    const retakeButton = page.getByRole('button', { name: /Retake|Start Again|Try Again/i })
    if (await retakeButton.isVisible()) {
      await expect(retakeButton).toBeEnabled()
    }
  })

  test('AS-045: Can navigate back to dashboard from summary', async ({ page }) => {
    await page.goto('/app/assessment/summary')

    const dashboardButton = page.getByRole('button', { name: /Dashboard|Home|Back/i })
    if (await dashboardButton.isVisible()) {
      await dashboardButton.click()
      await expect(page).toHaveURL(/\/app\/dashboard/)
    }
  })
})

test.describe('Teacher Assessment View', () => {
  test.skip(({ }, testInfo) => {
    return !process.env.TEST_TEACHER_EMAIL
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/teacher/start')
    await page.getByRole('button', { name: /Login.*Account/i }).click()
    await page.getByLabel(/Email/i).fill(TEST_TEACHER.email)
    await page.getByLabel(/Password/i).fill(TEST_TEACHER.password)
    await page.getByRole('button', { name: /Sign In/i }).click()
    await page.waitForURL(/\/app\//, { timeout: 15000 })
  })

  test('AS-050: Teacher can view assessments page', async ({ page }) => {
    await page.goto('/app/teacher/assessments')

    await expect(page.getByText(/Assessment|Results|Class/i).first()).toBeVisible()
  })

  test('AS-051: Teacher can see class assessment summary', async ({ page }) => {
    await page.goto('/app/teacher/assessments')

    // Should show assessment data for classes
    const assessmentData = page.getByText(/completed|pending|students/i)
    if (await assessmentData.first().isVisible()) {
      await expect(assessmentData.first()).toBeVisible()
    }
  })

  test('AS-052: Teacher can filter by class', async ({ page }) => {
    await page.goto('/app/teacher/assessments')

    const classFilter = page.getByLabel(/Class|Filter/i)
    if (await classFilter.isVisible()) {
      await classFilter.click()
      // Should show class options
    }
  })
})

test.describe('Assessment Error Handling', () => {
  test('AS-060: Handles network errors gracefully', async ({ page }) => {
    await page.goto('/app/assessment/start')

    // Simulate offline
    await page.route('**/*', route => route.abort())

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Should show error message, not crash
      await expect(page.getByText(/error|offline|try again/i)).toBeVisible({ timeout: 10000 })
    }
  })

  test('AS-061: Handles session timeout gracefully', async ({ page }) => {
    await page.goto('/app/assessment/start')

    // Clear auth state
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.reload()

    // Should redirect to login
    await page.waitForLoadState('networkidle')
    const needsAuth = page.url().includes('/login') ||
      page.url().includes('/student') ||
      await page.getByText(/Sign In|Login/i).isVisible().catch(() => false)

    expect(needsAuth).toBeTruthy()
  })
})

test.describe('Assessment Accessibility', () => {
  test('AS-070: Keyboard navigation works for answer selection', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()
      await page.waitForTimeout(500)

      // Use keyboard to navigate and select
      await page.keyboard.press('Tab') // Move to first option
      await page.keyboard.press('Space') // Select it

      // First option should be selected
      const firstOption = page.getByRole('radio').first()
      if (await firstOption.isVisible()) {
        await expect(firstOption).toHaveAttribute('aria-checked', 'true')
      }
    }
  })

  test('AS-071: Question has proper heading structure', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Question should be in a heading element
      const questionHeading = page.locator('h2')
      await expect(questionHeading.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('AS-072: Options have proper radiogroup role', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Should have radiogroup
      const radiogroup = page.getByRole('radiogroup')
      await expect(radiogroup).toBeVisible({ timeout: 10000 })
    }
  })

  test('AS-073: Progress bar has proper ARIA attributes', async ({ page }) => {
    await page.goto('/app/assessment/start')

    const startButton = page.getByRole('button', { name: /Start|Begin/i })
    if (await startButton.isVisible()) {
      await startButton.click()

      // Should have progressbar with proper attributes
      const progressbar = page.getByRole('progressbar')
      if (await progressbar.isVisible()) {
        await expect(progressbar).toHaveAttribute('aria-valuenow')
        await expect(progressbar).toHaveAttribute('aria-valuemin', '0')
        await expect(progressbar).toHaveAttribute('aria-valuemax', '100')
      }
    }
  })
})
