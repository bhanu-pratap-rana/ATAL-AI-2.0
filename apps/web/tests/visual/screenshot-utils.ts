/**
 * ATAL AI - Screenshot Testing Utilities
 *
 * Provides helper functions for capturing screenshots at each step
 * to analyze UI flow, theme consistency, and test coverage.
 */

import { Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

// Screenshot output directory
const SCREENSHOT_DIR = 'playwright/screenshots'

// Ensure screenshot directory exists
export function ensureScreenshotDir(subDir: string = ''): string {
  const dir = path.join(SCREENSHOT_DIR, subDir)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

// Screenshot counter for ordering
let screenshotCounter: Record<string, number> = {}

/**
 * Reset screenshot counter for a new test flow
 */
export function resetCounter(flowName: string): void {
  screenshotCounter[flowName] = 0
}

/**
 * Capture a screenshot with descriptive naming
 * @param page - Playwright page object
 * @param flowName - Name of the flow (e.g., 'student', 'teacher', 'admin')
 * @param stepName - Description of the current step
 * @param fullPage - Whether to capture full page
 */
export async function captureStep(
  page: Page,
  flowName: string,
  stepName: string,
  fullPage: boolean = true
): Promise<string> {
  // Increment counter
  if (!screenshotCounter[flowName]) {
    screenshotCounter[flowName] = 0
  }
  screenshotCounter[flowName]++

  const dir = ensureScreenshotDir(flowName)
  const counter = String(screenshotCounter[flowName]).padStart(2, '0')
  const safeName = stepName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  const filename = `${counter}-${safeName}.png`
  const filepath = path.join(dir, filename)

  // Wait for any animations to settle
  await page.waitForTimeout(300)

  await page.screenshot({
    path: filepath,
    fullPage,
  })

  console.log(`📸 Screenshot captured: ${flowName}/${filename}`)
  return filepath
}

/**
 * Capture a screenshot of a specific element
 */
export async function captureElement(
  page: Page,
  flowName: string,
  stepName: string,
  selector: string
): Promise<string> {
  if (!screenshotCounter[flowName]) {
    screenshotCounter[flowName] = 0
  }
  screenshotCounter[flowName]++

  const dir = ensureScreenshotDir(flowName)
  const counter = String(screenshotCounter[flowName]).padStart(2, '0')
  const safeName = stepName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  const filename = `${counter}-${safeName}-element.png`
  const filepath = path.join(dir, filename)

  const element = page.locator(selector)
  await element.screenshot({ path: filepath })

  console.log(`📸 Element screenshot: ${flowName}/${filename}`)
  return filepath
}

/**
 * Wait for page to be fully loaded and stable
 * Uses domcontentloaded as fallback if networkidle times out
 */
export async function waitForStable(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 })
  } catch {
    // Fall back to domcontentloaded if networkidle times out
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 })
  }
  await page.waitForTimeout(500) // Allow CSS animations to complete
}

/**
 * Capture before and after screenshots for an action
 */
export async function captureAction(
  page: Page,
  flowName: string,
  actionName: string,
  action: () => Promise<void>
): Promise<{ before: string; after: string }> {
  const before = await captureStep(page, flowName, `${actionName}-before`)
  await action()
  await waitForStable(page)
  const after = await captureStep(page, flowName, `${actionName}-after`)
  return { before, after }
}

/**
 * Test credentials from environment
 */
export const TEST_CREDENTIALS = {
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL || 'ranabhanu514@gmail.com',
    password: process.env.TEST_TEACHER_PASSWORD || 'Bhanu12@',
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL || 'lyricallywilliam@gmail.com',
    password: process.env.TEST_STUDENT_PASSWORD || 'Bhanu12@',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'atal.app.ai@gmail.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'b8h9a7n9',
  },
}

/**
 * Generate a summary report of all captured screenshots
 */
export function generateScreenshotReport(): void {
  const report: Record<string, string[]> = {}

  if (fs.existsSync(SCREENSHOT_DIR)) {
    const flows = fs.readdirSync(SCREENSHOT_DIR)
    for (const flow of flows) {
      const flowDir = path.join(SCREENSHOT_DIR, flow)
      if (fs.statSync(flowDir).isDirectory()) {
        const screenshots = fs.readdirSync(flowDir).filter(f => f.endsWith('.png'))
        report[flow] = screenshots.sort()
      }
    }
  }

  // Write report
  const reportPath = path.join(SCREENSHOT_DIR, 'report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📊 Screenshot report generated: ${reportPath}`)

  // Print summary
  console.log('\n=== SCREENSHOT SUMMARY ===')
  for (const [flow, screenshots] of Object.entries(report)) {
    console.log(`\n${flow.toUpperCase()} (${screenshots.length} screenshots):`)
    screenshots.forEach(s => console.log(`  - ${s}`))
  }
}
