/**
 * ATAL AI - Visual Test Runner Script
 *
 * Runs visual tests and captures screenshots for analysis.
 * Usage: npx ts-node scripts/run-visual-tests.ts
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOT_DIR = 'playwright/screenshots'

console.log('🎬 ATAL AI Visual Test Runner')
console.log('=============================\n')

// Clean up old screenshots
if (fs.existsSync(SCREENSHOT_DIR)) {
  console.log('🧹 Cleaning up old screenshots...')
  fs.rmSync(SCREENSHOT_DIR, { recursive: true })
}
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

// Set test credentials from environment variables
// SECURITY: Never hardcode credentials - use .env.local or environment variables
const testCredentials = {
  student: {
    email: process.env.TEST_STUDENT_EMAIL,
    password: process.env.TEST_STUDENT_PASSWORD,
  },
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL,
    password: process.env.TEST_TEACHER_PASSWORD,
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
  },
}

// Validate required environment variables
const missingVars: string[] = []
if (!testCredentials.student.email) missingVars.push('TEST_STUDENT_EMAIL')
if (!testCredentials.student.password) missingVars.push('TEST_STUDENT_PASSWORD')
if (!testCredentials.teacher.email) missingVars.push('TEST_TEACHER_EMAIL')
if (!testCredentials.teacher.password) missingVars.push('TEST_TEACHER_PASSWORD')
if (!testCredentials.admin.email) missingVars.push('TEST_ADMIN_EMAIL')
if (!testCredentials.admin.password) missingVars.push('TEST_ADMIN_PASSWORD')

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(v => console.error(`   - ${v}`))
  console.error('\nPlease set these in your .env.local file or environment.')
  console.error('Example .env.local:')
  console.error('  TEST_STUDENT_EMAIL=student@example.com')
  console.error('  TEST_STUDENT_PASSWORD=your-secure-password')
  console.error('  TEST_TEACHER_EMAIL=teacher@example.com')
  console.error('  TEST_TEACHER_PASSWORD=your-secure-password')
  console.error('  TEST_ADMIN_EMAIL=admin@example.com')
  console.error('  TEST_ADMIN_PASSWORD=your-secure-password')
  process.exit(1)
}

console.log('📋 Test Credentials Loaded from environment')
console.log(`  Student: ${testCredentials.student.email}`)
console.log(`  Teacher: ${testCredentials.teacher.email}`)
console.log(`  Admin: ${testCredentials.admin.email}\n`)

// Run visual tests
console.log('🚀 Running visual tests...\n')

try {
  execSync(
    'npx playwright test tests/visual/ --reporter=list --project=chromium',
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Pass through credentials from environment (already validated above)
        TEST_STUDENT_EMAIL: testCredentials.student.email,
        TEST_STUDENT_PASSWORD: testCredentials.student.password,
        TEST_TEACHER_EMAIL: testCredentials.teacher.email,
        TEST_TEACHER_PASSWORD: testCredentials.teacher.password,
        TEST_ADMIN_EMAIL: testCredentials.admin.email,
        TEST_ADMIN_PASSWORD: testCredentials.admin.password,
      },
    }
  )
} catch (error) {
  console.log('\n⚠️ Some tests may have failed, but screenshots were captured.')
}

// Generate summary
console.log('\n\n📊 Screenshot Summary')
console.log('=====================\n')

if (fs.existsSync(SCREENSHOT_DIR)) {
  const flows = fs.readdirSync(SCREENSHOT_DIR).filter(f => {
    const stat = fs.statSync(path.join(SCREENSHOT_DIR, f))
    return stat.isDirectory()
  })

  let totalScreenshots = 0

  for (const flow of flows) {
    const flowDir = path.join(SCREENSHOT_DIR, flow)
    const screenshots = fs.readdirSync(flowDir).filter(f => f.endsWith('.png'))
    totalScreenshots += screenshots.length

    console.log(`\n📁 ${flow.toUpperCase()} (${screenshots.length} screenshots):`)
    screenshots.sort().forEach(s => {
      console.log(`   📸 ${s}`)
    })
  }

  console.log(`\n\n✅ Total screenshots captured: ${totalScreenshots}`)
  console.log(`📂 Screenshots saved to: ${SCREENSHOT_DIR}/`)

  // Create analysis checklist
  const checklistPath = path.join(SCREENSHOT_DIR, 'ANALYSIS_CHECKLIST.md')
  const checklist = `# Visual Analysis Checklist

## Theme Consistency
- [ ] All pages use consistent color palette
- [ ] Typography is consistent across all views
- [ ] Spacing and margins are uniform
- [ ] Border radius follows design system

## Component Styling
- [ ] Buttons have consistent styling
- [ ] Cards use proper shadows and borders
- [ ] Form inputs have consistent appearance
- [ ] Icons are properly sized and aligned

## Responsive Design
- [ ] Mobile views are functional
- [ ] Tablet views maintain layout
- [ ] Desktop views use full width appropriately

## User Flow
- [ ] Login flows are clear and intuitive
- [ ] Navigation is consistent
- [ ] Error states are clearly displayed
- [ ] Success states provide feedback

## Accessibility
- [ ] Contrast ratios are sufficient
- [ ] Focus states are visible
- [ ] Labels are present for inputs
- [ ] Interactive elements are identifiable

## Screenshots to Review

${flows.map(flow => {
  const flowDir = path.join(SCREENSHOT_DIR, flow)
  const screenshots = fs.readdirSync(flowDir).filter(f => f.endsWith('.png')).sort()
  return `### ${flow.toUpperCase()}\n${screenshots.map(s => `- [ ] ${s}`).join('\n')}`
}).join('\n\n')}

---
Generated: ${new Date().toISOString()}
`

  fs.writeFileSync(checklistPath, checklist)
  console.log(`📝 Analysis checklist created: ${checklistPath}`)
}

console.log('\n🎉 Visual test run complete!')
console.log('Review screenshots in playwright/screenshots/ folder')
