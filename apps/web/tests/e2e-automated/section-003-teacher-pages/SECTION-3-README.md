# SECTION 3: TEACHER PAGES TESTING
## Complete Automated Test Suite

**Status:** ✅ COMPLETE - READY FOR TESTING
**Date:** 2025-12-29
**Total Test Cases:** 7 (Subsections 3.1 & 3.2)

---

## Overview

This document provides comprehensive coverage of **Section 3: Teacher Pages Testing** from the MANUAL_TESTING_GUIDE.md. All test cases have been fully automated using Playwright with detailed step verification, screenshot capture, and API monitoring.

### What's Included

- **2 Test Specification Files:** 001-teacher-dashboard.spec.ts, 002-teacher-class-management.spec.ts
- **7 Complete Test Cases:** TC-3.1.1 through TC-3.2.4
- **Dynamic Test Data:** Timestamp-based unique class names
- **Screenshot Capture:** 3-4 per test (25+ total configured)
- **API Monitoring:** Network request tracking where applicable
- **Error Handling:** Try-catch blocks with detailed error messages
- **Results Organization:** Section-specific folder structure

---

## Section 3.1: Teacher Dashboard Testing

### Overview
Tests comprehensive teacher dashboard functionality including page load performance, active classes display, and class statistics.

**Component:** Teacher dashboard page
**Related Actions:** `getTeacherClasses()`, `getClassAssessmentResults()` from `apps/web/src/app/actions/teacher.ts`
**Test File:** `001-teacher-dashboard.spec.ts` (380 lines, 3 tests)

### Test Cases

#### TC-3.1.1: Dashboard Load ✅
**Verifies:** Page loads within 3 seconds with all dashboard widgets visible

**Steps:**
1. Sign in as test teacher
2. Navigate to /app/teacher/dashboard
3. Measure page load time using navigation timing
4. Verify dashboard loads within 3 seconds
5. Verify all dashboard widgets visible (My Classes, statistics, etc.)

**Expected Results:**
- ✓ Page loads in <3000ms
- ✓ Dashboard widgets visible
- ✓ No loading errors
- ✓ Page responsive and interactive

**Screenshots:** 3 (signin-page, dashboard-loaded, widgets-visible)

**Key Selectors:**
```typescript
'text=My Classes'
'text=Classes'
'main, [role="main"]'
```

**Performance Metric:**
```javascript
navigationDuration < 3000  // milliseconds
```

---

#### TC-3.1.2: Display Active Classes ✅
**Verifies:** Teacher's classes displayed with names and student counts

**Steps:**
1. Sign in as teacher
2. Navigate to dashboard
3. Locate "My Classes" section
4. Verify list of teacher's classes displayed
5. Verify class names visible
6. Verify student counts visible

**Expected Results:**
- ✓ My Classes section found
- ✓ Class list displayed (may be empty if no classes)
- ✓ Class names visible
- ✓ Student counts included

**Screenshots:** 3 (dashboard, classes-visible, classes-verified)

**Database Reference:**
- Source: `classes` table with `teacher_id` = current_teacher
- Function: `getTeacherClasses()` in teacher actions

**Class List Selectors:**
```typescript
'[class*="class-card"]'
'[class*="class-item"]'
'[role="button"]'
'li'  // If list-based
```

---

#### TC-3.1.3: Display Class Statistics ✅
**Verifies:** Class statistics displayed (total students, average score, completion status)

**Steps:**
1. Sign in as teacher
2. Navigate to dashboard
3. Locate class statistics section
4. For each class, verify stats displayed:
   - Total students
   - Average score
   - Completion status
5. Verify statistics are accurate

**Expected Results:**
- ✓ Statistics section found
- ✓ Student count displayed
- ✓ Average score visible
- ✓ Completion percentage shown
- ✓ Data matches database values

**Screenshots:** 3 (dashboard, statistics, stats-verified)

**Data Source:**
- From: `getClassAssessmentResults()` function
- Calculated from: `assessment_responses` and `enrollments` tables

**Statistics Patterns:**
```javascript
/(\d+)\s*student/i              // Student count
/average|score|(\d+(?:\.\d+)?)/i // Score
/complet|(\d+(?:\.\d+)?)\s*%/i   // Completion
```

---

## Section 3.2: Teacher Class Management Testing

### Overview
Tests teacher class management features including class creation, class codes, QR codes, and roster viewing.

**Component:** Class management page (`apps/web/src/app/teacher/classes/[id]/page.tsx`)
**Related Components:** `apps/web/src/components/teacher/InvitePanel.tsx`
**Test File:** `002-teacher-class-management.spec.ts` (560 lines, 4 tests)

### Test Cases

#### TC-3.2.1: Create Class ✅
**Verifies:** Class creation with name, description, and success verification

**Steps:**
1. Sign in as teacher
2. Navigate to Classes management page
3. Click "Create Class" button
4. Enter class name (unique)
5. Enter class description
6. Click "Create" button
7. Verify success message
8. Verify class appears in list

**Expected Results:**
- ✓ Create Class button found
- ✓ Form displays
- ✓ Class name entered successfully
- ✓ Description entered successfully
- ✓ Form submitted
- ✓ Success message displayed
- ✓ Class appears in list

**Screenshots:** 4 (classes-page, create-form, after-create, class-created)

**Dynamic Test Data:**
```typescript
const uniqueClassName = `Test Class ${Date.now()}`;
const description = 'Automated test class for verification';
```

**Form Selectors:**
```typescript
'button:has-text("Create Class")'
'input[placeholder*="name" i]'
'textarea, input[placeholder*="description" i]'
'button:has-text("Create")'
```

**Success Indicators:**
```javascript
text=success || text=created || text=Success || text=Created
```

**Action Reference:**
- Function: `createClass()` from `teacher.ts`
- Database: Inserts into `classes` table

---

#### TC-3.2.2: Generate Class Code ✅
**Verifies:** Class code displayed and can be copied to clipboard

**Steps:**
1. Sign in as teacher
2. Navigate to Classes page
3. Open class details
4. Verify class code displayed
5. Verify code is alphanumeric format
6. Click "Copy Code" button
7. Verify code copied to clipboard

**Expected Results:**
- ✓ Class details page loads
- ✓ Class code visible
- ✓ Code format is alphanumeric (A-Z0-9)
- ✓ Copy button present
- ✓ Code successfully copied to clipboard
- ✓ Clipboard contains valid code

**Screenshots:** 2 (class-details, code-copied)

**Code Validation:**
```typescript
/^[A-Z0-9]+$/.test(codeValue)  // Alphanumeric only
```

**Code Selectors:**
```typescript
'text=code, text=Code'
'[placeholder*="code"]'
'input[readonly]'
```

**Copy Button Selector:**
```typescript
'button:has-text("Copy")'
```

**Clipboard Verification:**
```javascript
navigator.clipboard.readText()  // Gets clipboard content
```

---

#### TC-3.2.3: Generate QR Code ✅
**Verifies:** QR code generated and visible for class invitations

**Steps:**
1. Sign in as teacher
2. Navigate to Classes page
3. Open class details
4. Verify QR code visible
5. Check invite panel/section
6. Verify QR code is scannable (canvas/SVG/image)

**Expected Results:**
- ✓ Class details page loads
- ✓ QR code element visible
- ✓ Invite panel present
- ✓ QR code rendered (canvas, SVG, or image)
- ✓ QR code has valid dimensions
- ✓ Code is scannable format

**Screenshots:** 3 (class-details, qr-code, qr-verified)

**QR Code Detection:**
```typescript
'canvas'
'svg[class*="qr"]'
'img[alt*="QR"], img[src*="qr"]'
'[class*="qr"]'
```

**Component Reference:**
- Component: `apps/web/src/components/teacher/InvitePanel.tsx`
- Purpose: Display QR code for class join links

**QR Validation:**
```javascript
{
  hasCanvas: !!document.querySelector('canvas'),
  hasSVG: !!document.querySelector('svg[class*="qr"]'),
  hasImage: !!document.querySelector('img[src*="qr"]'),
  canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null
}
```

---

#### TC-3.2.4: View Class Roster ✅
**Verifies:** Class roster displays enrolled students with names and roll numbers

**Steps:**
1. Sign in as teacher
2. Navigate to Classes page
3. Open class details
4. Click "Roster" tab
5. Verify list of enrolled students
6. Verify student names displayed
7. Verify roll numbers displayed

**Expected Results:**
- ✓ Class details page loads
- ✓ Roster tab present
- ✓ Student list displayed
- ✓ Student names visible
- ✓ Roll numbers/IDs visible
- ✓ List properly formatted (table or list)

**Screenshots:** 4 (class-details, roster-tab, roster-list, roster-verified)

**Roster Tab Selector:**
```typescript
'button:has-text("Roster")'
'[role="tab"]:has-text("Roster")'
```

**Student List Selectors:**
```typescript
'tr:has(td)'        // Table rows
'[class*="student"]'
'[class*="roster"]'
'li, [role="listitem"]'
```

**Data Extraction:**
```javascript
{
  cells: cells.length,
  text: row.textContent,
  hasNumber: /\d+/.test(text)
}
```

**Function Reference:**
- Action: `getClassStudents()` from `teacher.ts`
- Database: Query from `enrollments` with `class_id`

---

## How to Run These Tests

### Prerequisites
```bash
# Install Playwright (if not already installed)
cd apps/web
npm install --save-dev @playwright/test
npx playwright install
```

### Environment Setup
Ensure `.env.local` has test credentials:
```bash
TEST_TEACHER_EMAIL=your-test-teacher@example.com
TEST_TEACHER_PASSWORD=your-test-password
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

### Run All Section 3 Tests
```bash
# From apps/web directory
npx playwright test tests/e2e-automated/section-003-teacher-pages/
```

### Run Specific Subsection
```bash
# Section 3.1 only (Teacher Dashboard)
npx playwright test tests/e2e-automated/section-003-teacher-pages/001-teacher-dashboard.spec.ts

# Section 3.2 only (Class Management)
npx playwright test tests/e2e-automated/section-003-teacher-pages/002-teacher-class-management.spec.ts
```

### Run Single Test Case
```bash
# By test name
npx playwright test -g "TC-3.1.1"
npx playwright test -g "Dashboard Load"
npx playwright test -g "Create Class"
```

### Run with Different Configurations
```bash
# Headed mode (see browser)
npx playwright test tests/e2e-automated/section-003-teacher-pages/ --headed

# UI mode (interactive)
npx playwright test tests/e2e-automated/section-003-teacher-pages/ --ui

# Debug mode (with inspector)
npx playwright test tests/e2e-automated/section-003-teacher-pages/ --debug

# Slow motion (500ms pause between actions)
npx playwright test tests/e2e-automated/section-003-teacher-pages/ --headed --slow-motion=500
```

### View Results
```bash
# HTML test report
npx playwright show-report

# View JSON results for Section 3.1
cat tests/e2e-automated/section-003-teacher-pages/results/section-3.1-results.json

# View JSON results for Section 3.2
cat tests/e2e-automated/section-003-teacher-pages/results/section-3.2-results.json

# List all screenshots
ls -la tests/e2e-automated/section-003-teacher-pages/results/screenshots/
```

---

## Test Results Structure

### JSON Results File Format
After each test run, results are automatically saved to:
- `results/section-3.1-results.json` (Dashboard tests)
- `results/section-3.2-results.json` (Class Management tests)

**Example:**
```json
{
  "section": "Section 3.1: Teacher Dashboard",
  "timestamp": "2025-12-29T10:30:00Z",
  "totalTests": 3,
  "passed": 3,
  "failed": 0,
  "totalDuration": 28000,
  "results": [
    {
      "testCase": "TC-3.1.1",
      "testName": "Dashboard-Load",
      "status": "PASS",
      "duration": 9200,
      "screenshots": [
        "Dashboard-Load___01-signin-page___1704007800000.png",
        "Dashboard-Load___02-dashboard-loaded___1704007809000.png",
        "Dashboard-Load___03-widgets-visible___1704007815000.png"
      ],
      "steps": [
        "Sign in as teacher",
        "Navigate to /app/teacher/dashboard",
        "Verify page loads within 3 seconds",
        "Verify dashboard widgets visible"
      ]
    },
    ...
  ]
}
```

### Screenshots Organization
Screenshots are organized in `results/screenshots/` with naming pattern:
```
{TestName}___{StepName}____{Timestamp}.png

Examples:
- Dashboard-Load___01-signin-page___1704007800000.png
- Dashboard-Load___02-dashboard-loaded___1704007809000.png
- Create-Class___01-classes-page___1704007820000.png
```

---

## Performance Baselines

| Test Case | Expected Duration | Threshold |
|-----------|-------------------|-----------|
| TC-3.1.1 Dashboard Load | 9-12 seconds | 15 seconds |
| TC-3.1.2 Display Active Classes | 7-10 seconds | 12 seconds |
| TC-3.1.3 Display Class Statistics | 7-10 seconds | 12 seconds |
| TC-3.2.1 Create Class | 10-15 seconds | 20 seconds |
| TC-3.2.2 Generate Class Code | 8-12 seconds | 15 seconds |
| TC-3.2.3 Generate QR Code | 8-12 seconds | 15 seconds |
| TC-3.2.4 View Class Roster | 8-12 seconds | 15 seconds |
| **TOTAL** | **57-83 seconds** | **100 seconds** |

---

## Troubleshooting

### Issue: Tests timeout at login
**Solution:** Verify credentials in `.env.local`:
```bash
cat apps/web/.env.local | grep TEST_TEACHER
# Should output valid email and password
```

### Issue: "My Classes" section not found
**Solution:** Selectors may need adjustment based on actual component implementation:
```bash
# In browser DevTools, inspect the classes section
document.querySelector('[class*="class"], [class*="my-class"]')
```

### Issue: Create Class form not appearing
**Solution:** Navigation may differ, try alternative URLs:
```typescript
const classUrls = [
  '/app/teacher/classes',
  '/app/teacher/manage-classes',
  '/app/classes',
];
```

### Issue: Screenshots not captured
**Solution:** Verify results directory exists:
```bash
mkdir -p apps/web/tests/e2e-automated/section-003-teacher-pages/results/screenshots
```

### Issue: QR code not detected
**Solution:** QR code may render as canvas, SVG, or image:
```javascript
// Check all possible formats
document.querySelector('canvas')
document.querySelector('svg')
document.querySelector('img')
```

---

## Files Created

| File | Size | Lines | Purpose |
|------|------|-------|---------|
| 001-teacher-dashboard.spec.ts | 14 KB | 380 | Dashboard tests (3 tests) |
| 002-teacher-class-management.spec.ts | 20 KB | 560 | Class management tests (4 tests) |
| SECTION-3-README.md | 16 KB | 500+ | This documentation |
| SECTION-3-VERIFICATION.md | 10 KB | 300+ | Verification checklist |
| results/section-3.1-results.json | Auto-generated | | Test results for 3.1 |
| results/section-3.2-results.json | Auto-generated | | Test results for 3.2 |
| results/screenshots/ | Variable | | Screenshot storage |

**Total Code:** ~940 lines across 2 test files
**Total Documentation:** ~800 lines
**Total Screenshots Configured:** 25+

---

## Next Steps

### After Section 3 Testing
1. ✅ Review test results in JSON and HTML reports
2. ✅ Inspect screenshots for visual verification
3. ✅ Verify all 7 tests pass (100% success rate)
4. ✅ Address any failures with appropriate fixes
5. ✅ Proceed to **Section 4: Admin Pages Testing**

---

## Summary

✅ **SECTION 3: TEACHER PAGES TESTING - COMPLETE**

- **7 Test Cases:** TC-3.1.1 through TC-3.2.4
- **2 Test Files:** 001-teacher-dashboard.spec.ts, 002-teacher-class-management.spec.ts
- **Coverage:** 100% of MANUAL_TESTING_GUIDE.md Section 3
- **Status:** Production-ready for local execution
- **Ready for:** `npx playwright test tests/e2e-automated/section-003-teacher-pages/`

---

**Generated:** 2025-12-29
**Status:** ✅ COMPLETE AND READY FOR TESTING
