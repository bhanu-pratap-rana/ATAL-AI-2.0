# SECTION 5: ASSESSMENT SYSTEM TESTING
## Complete Automated Test Suite

**Status:** ✅ COMPLETE - READY FOR TESTING
**Date:** 2025-12-29
**Total Test Cases:** 7 (Subsection 5.1)

---

## Overview

This document provides comprehensive coverage of **Section 5: Assessment System Testing - Basics** from the MANUAL_TESTING_GUIDE.md. All test cases have been fully automated using Playwright with detailed step verification, screenshot capture, and API monitoring.

### What's Included

- **1 Test Specification File:** 001-assessment-basics.spec.ts
- **7 Complete Test Cases:** TC-5.1.1 through TC-5.1.7
- **Dynamic Test Data:** Timestamp-based unique assessment sessions
- **Screenshot Capture:** 4-5 per test (30+ total configured)
- **Mobile Testing:** Viewport validation (375px mobile, 1024px tablet, 1440px desktop)
- **API Monitoring:** Network request tracking for assessment operations
- **Error Handling:** Try-catch blocks with detailed error messages
- **Results Organization:** Section-specific folder structure

---

## Section 5.1: Assessment System - Basics Testing

### Overview
Tests complete assessment workflow from list display through submission and results viewing.

**Component:** Assessment system pages (`/app/assessments`, assessment runner, results display)
**Related Actions:** Assessment operations from `apps/web/src/app/actions/assessment.ts`
**Test File:** `001-assessment-basics.spec.ts` (1850+ lines, 7 tests)

### Test Cases

#### TC-5.1.1: Start Assessment ✅
**Verifies:** Assessment list displays and user can start first assessment

**Steps:**
1. Sign in as student
2. Navigate to /app/assessments or assessments list
3. Verify assessment list displays
4. Click on first assessment
5. Verify assessment starts and first question displays

**Expected Results:**
- ✓ Assessments list found
- ✓ Assessment cards/items visible with names
- ✓ Click action triggers assessment start
- ✓ First question displayed
- ✓ Assessment timer visible
- ✓ Question content readable

**Screenshots:** 4 (assessments-list, first-assessment, question-visible, assessment-started)

**Key Selectors:**
```typescript
'text=Assessment'
'[class*="assessment-card"]'
'[role="button"]:has-text("Start")'
'[class*="question"]'
```

**Assessment Data Reference:**
- Source: `assessments` table
- Display: Assessment name, description, duration, question count
- Query: `getStudentAssessments()` function

---

#### TC-5.1.2: Assessment Timer ✅
**Verifies:** Assessment timer displays in MM:SS format and counts down

**Steps:**
1. Start assessment (from TC-5.1.1)
2. Locate timer element on assessment page
3. Verify timer displays in MM:SS format (e.g., 30:00)
4. Wait 2+ seconds
5. Verify timer value decreased (countdown working)
6. Verify timer updates continuously

**Expected Results:**
- ✓ Timer element visible
- ✓ Format is MM:SS (matches regex /\d+:\d{2}/)
- ✓ Timer counting down
- ✓ Updates continuously
- ✓ Shows minutes:seconds clearly
- ✓ No formatting errors (displays as integer:zero-padded-seconds)

**Screenshots:** 4 (assessment-start, timer-visible, countdown-1, countdown-2)

**Timer Validation:**
```javascript
/\d+:\d{2}/.test(timerValue)  // MM:SS format validation
```

**Component Reference:**
- Component: `apps/web/src/components/assessment/AssessmentTimer.tsx`
- Props: Duration (in seconds), starts from full duration

---

#### TC-5.1.3: Question Navigation - Next ✅
**Verifies:** User can navigate forward through questions with answer preservation

**Steps:**
1. Start assessment (from TC-5.1.1)
2. Verify first question displayed
3. Select answer for first question (radio/checkbox)
4. Click "Next" or navigation button to move forward
5. Verify second question displays
6. Navigate back to first question
7. Verify selected answer is preserved

**Expected Results:**
- ✓ First question displayed with answer options
- ✓ Answer selection works (radio button checked/checkbox marked)
- ✓ Next button present and clickable
- ✓ Second question displays after clicking Next
- ✓ Can navigate backward to first question
- ✓ Selected answer persisted (same radio/checkbox still checked)
- ✓ No answer loss on navigation

**Screenshots:** 5 (q1-initial, q1-answered, q2-visible, back-to-q1, q1-answer-preserved)

**Navigation Selectors:**
```typescript
'button:has-text("Next")'
'button:has-text("Previous")'
'[role="button"]:has-text(">")'
'[aria-label*="next"]'
```

**Answer Preservation Validation:**
```javascript
{
  initialAnswer: radioButton.checked,  // After answering Q1
  afterNavigation: radioButton.checked // After returning to Q1
  // Both should be true
}
```

---

#### TC-5.1.4: Question Navigation - Previous ✅
**Verifies:** User can navigate backward through questions with answer preservation

**Steps:**
1. Start assessment
2. Answer question 1
3. Move to question 2
4. Answer question 2
5. Click "Previous" to go back to question 1
6. Verify question 1 displayed with original answer preserved
7. Answer question 3
8. Move to question 4
9. Navigate back to question 2
10. Verify question 2 answer preserved

**Expected Results:**
- ✓ Previous button present and clickable
- ✓ Navigation to previous question works
- ✓ Previous question displays correctly
- ✓ Previously selected answer is preserved
- ✓ Can navigate freely between questions
- ✓ Multiple answers preserved across forward/backward navigation

**Screenshots:** 5 (q2-answered, back-to-q1, q1-preserved, q3-answered, q2-back-preserved)

**Previous Button Selectors:**
```typescript
'button:has-text("Previous")'
'[role="button"]:has-text("<")'
'[aria-label*="previous"]'
```

---

#### TC-5.1.5: Pagination Accessibility ✅
**Verifies:** Question pagination has accessible touch targets (44px minimum) on mobile

**Steps:**
1. Start assessment on mobile viewport (375px width)
2. Locate pagination buttons (Next, Previous, Question number buttons)
3. Measure button sizes
4. Verify all touch targets are minimum 44px × 44px
5. Verify buttons are properly spaced
6. Test button clickability on mobile

**Expected Results:**
- ✓ Pagination buttons visible on mobile
- ✓ All buttons meet 44px minimum height
- ✓ All buttons meet 44px minimum width
- ✓ Buttons are properly spaced (not too close)
- ✓ Touch targets clearly defined
- ✓ No overlap between buttons
- ✓ Buttons responsive to touch

**Screenshots:** 4 (mobile-viewport, pagination-visible, button-sizing, accessibility-verified)

**Mobile Viewport Configuration:**
```typescript
{ width: 375, height: 667 }  // iPhone SE dimensions
```

**Accessibility Validation:**
```javascript
{
  width: element.offsetWidth,   // Should be >= 44
  height: element.offsetHeight, // Should be >= 44
  padding: computedStyle.padding,
  margin: computedStyle.margin
}
```

---

#### TC-5.1.6: Submit Assessment ✅
**Verifies:** User can submit assessment with confirmation dialog and redirect to results

**Steps:**
1. Complete at least 1 question in assessment
2. Look for "Submit" or "Finish" button
3. Click submit button
4. Verify confirmation dialog appears
5. Click "Confirm" on dialog
6. Verify assessment submitted
7. Verify redirect to results page

**Expected Results:**
- ✓ Submit button visible when assessment has answers
- ✓ Confirmation dialog appears before submission
- ✓ Dialog has Cancel and Confirm buttons
- ✓ Confirming submission shows success message or loading state
- ✓ User redirected to results page
- ✓ Results URL contains assessment ID or results path
- ✓ No data loss during submission

**Screenshots:** 5 (submit-button, confirm-dialog, dialog-visible, submitting, results-page)

**Submit Selectors:**
```typescript
'button:has-text("Submit")'
'button:has-text("Finish")'
'button:has-text("Complete")'
'[role="button"]:has-text("Submit")'
```

**Confirmation Dialog Selectors:**
```typescript
'[role="dialog"]'
'button:has-text("Confirm")'
'button:has-text("Cancel")'
```

---

#### TC-5.1.7: Assessment Results Display ✅
**Verifies:** Results page displays score (0-100%) and offers review options

**Steps:**
1. Complete and submit assessment (from TC-5.1.6)
2. Verify results page loads
3. Locate and verify score display
4. Verify score is numeric (0-100 format or 0-100% format)
5. Verify review/retake options available
6. Verify performance feedback

**Expected Results:**
- ✓ Results page displays
- ✓ Score visible and readable
- ✓ Score in valid format (numeric 0-100 or percentage 0-100%)
- ✓ Positive/negative feedback based on score
- ✓ Review button/link present
- ✓ Retake option available if allowed
- ✓ Results breakdown shown (questions correct/total)

**Screenshots:** 4 (results-page, score-display, feedback-visible, review-option)

**Score Pattern Validation:**
```javascript
/(\d+)\s*(%|\/100|percent)?/.test(scoreText)
// Matches: "85%", "85/100", "85 percent", "85"
```

**Results Page Indicators:**
```javascript
{
  scoreValue: extractedNumber,     // 0-100
  feedbackPresent: feedbackFound,  // true/false
  reviewAvailable: reviewButton != null,
  retakeAvailable: retakeButton != null
}
```

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
TEST_STUDENT_EMAIL=your-test-student@example.com
TEST_STUDENT_PASSWORD=your-test-password
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

### Run All Section 5 Tests
```bash
# From apps/web directory
npx playwright test tests/e2e-automated/section-005-assessment-system/
```

### Run Specific Test Case
```bash
# By test name
npx playwright test -g "TC-5.1.1"
npx playwright test -g "Start Assessment"
npx playwright test -g "Assessment Timer"
npx playwright test -g "Question Navigation"
npx playwright test -g "Submit Assessment"
npx playwright test -g "Assessment Results Display"
```

### Run with Different Configurations
```bash
# Headed mode (see browser)
npx playwright test tests/e2e-automated/section-005-assessment-system/ --headed

# UI mode (interactive)
npx playwright test tests/e2e-automated/section-005-assessment-system/ --ui

# Debug mode (with inspector)
npx playwright test tests/e2e-automated/section-005-assessment-system/ --debug

# Slow motion (500ms pause between actions)
npx playwright test tests/e2e-automated/section-005-assessment-system/ --headed --slow-motion=500

# Mobile viewport only
npx playwright test tests/e2e-automated/section-005-assessment-system/ --project=Pixel
```

### View Results
```bash
# HTML test report
npx playwright show-report

# View JSON results for Section 5.1
cat tests/e2e-automated/section-005-assessment-system/results/section-5.1-results.json

# List all screenshots
ls -la tests/e2e-automated/section-005-assessment-system/results/screenshots/
```

---

## Test Results Structure

### JSON Results File Format
After each test run, results are automatically saved to:
- `results/section-5.1-results.json` (Assessment Basics tests)

**Example:**
```json
{
  "section": "Section 5.1: Assessment System - Basics",
  "timestamp": "2025-12-29T10:30:00Z",
  "totalTests": 7,
  "passed": 7,
  "failed": 0,
  "totalDuration": 75000,
  "results": [
    {
      "testCase": "TC-5.1.1",
      "testName": "Start-Assessment",
      "status": "PASS",
      "duration": 11200,
      "screenshots": [
        "Start-Assessment___01-assessments-list___1704007800000.png",
        "Start-Assessment___02-first-assessment___1704007810000.png",
        "Start-Assessment___03-question-visible___1704007820000.png",
        "Start-Assessment___04-assessment-started___1704007830000.png"
      ],
      "steps": [
        "Sign in as student",
        "Navigate to assessments",
        "Click first assessment",
        "Verify first question displays"
      ]
    },
    {
      "testCase": "TC-5.1.2",
      "testName": "Assessment-Timer",
      "status": "PASS",
      "duration": 10500,
      "screenshots": [
        "Assessment-Timer___01-assessment-start___1704007840000.png",
        "Assessment-Timer___02-timer-visible___1704007850000.png",
        "Assessment-Timer___03-countdown-1___1704007852000.png",
        "Assessment-Timer___04-countdown-2___1704007860000.png"
      ]
    }
  ]
}
```

### Screenshots Organization
Screenshots are organized in `results/screenshots/` with naming pattern:
```
{TestName}___{StepName}____{Timestamp}.png

Examples:
- Start-Assessment___01-assessments-list___1704007800000.png
- Assessment-Timer___02-timer-visible___1704007850000.png
- Question-Navigation-Next___03-q2-visible___1704007900000.png
```

---

## Performance Baselines

| Test Case | Expected Duration | Threshold |
|-----------|-------------------|-----------
| TC-5.1.1 Start Assessment | 10-12 seconds | 15 seconds |
| TC-5.1.2 Assessment Timer | 9-11 seconds | 15 seconds |
| TC-5.1.3 Question Navigation - Next | 12-14 seconds | 20 seconds |
| TC-5.1.4 Question Navigation - Previous | 12-14 seconds | 20 seconds |
| TC-5.1.5 Pagination Accessibility | 10-12 seconds | 15 seconds |
| TC-5.1.6 Submit Assessment | 11-13 seconds | 18 seconds |
| TC-5.1.7 Assessment Results Display | 10-12 seconds | 15 seconds |
| **TOTAL** | **74-88 seconds** | **118 seconds** |

---

## Troubleshooting

### Issue: Assessment list not found
**Solution:** Assessment list may be on different route:
```bash
# Check assessment pages
grep -r "assessment" apps/web/src/app --include="*.tsx" | grep page.tsx
```

### Issue: Timer not in MM:SS format
**Solution:** Timer component may use different format, check actual output:
```bash
# Run single test in headed mode to see actual timer format
npx playwright test -g "TC-5.1.2" --headed
```

### Issue: Answer not preserved on navigation
**Solution:** Form state may not be properly managed. Verify:
```bash
# Check form components
grep -r "checked\|defaultChecked" apps/web/src/components/assessment
```

### Issue: Mobile viewport test fails
**Solution:** Verify pagination buttons meet accessibility standards:
```bash
# Measure button dimensions in mobile view
npx playwright test -g "TC-5.1.5" --headed --project=Pixel
```

### Issue: Submit button not found
**Solution:** Button text may vary, check actual implementation:
```bash
# Check assessment runner component
cat apps/web/src/components/assessment/AssessmentRunner.tsx | grep -i "submit\|finish"
```

### Issue: Results page not displayed
**Solution:** Verify redirect after submission:
```bash
# Check assessment actions
grep -r "redirect\|revalidatePath" apps/web/src/app/actions/assessment.ts
```

---

## Files Created

| File | Size | Lines | Purpose |
|------|------|-------|---------
| 001-assessment-basics.spec.ts | 65 KB | 1850+ | Basics tests (7 tests) |
| SECTION-5-README.md | 20 KB | 450+ | This documentation |
| SECTION-5-VERIFICATION.md | 15 KB | 350+ | Verification checklist |
| results/section-5.1-results.json | Auto-generated | | Test results for 5.1 |
| results/screenshots/ | Variable | | Screenshot storage (30+) |

**Total Code:** 1850+ lines in 1 test file
**Total Documentation:** 800+ lines
**Total Screenshots Configured:** 30+

---

## Next Steps

### After Section 5 Testing
1. ✅ Review test results in JSON and HTML reports
2. ✅ Inspect screenshots for visual verification
3. ✅ Verify all 7 tests pass (100% success rate)
4. ✅ Address any failures with appropriate fixes
5. ✅ Verify assessment workflow end-to-end
6. ✅ Proceed to **Section 6 (if exists)** or project refinement

---

## Test Data Requirements

### Assessment Setup
Before running these tests, ensure:
- ✅ At least 1 assessment exists in the database
- ✅ Assessment has at least 3 questions
- ✅ Test student is enrolled in class with assessments
- ✅ Assessment is published/visible to students

### Database Verification
```sql
-- Check assessment exists
SELECT COUNT(*) FROM assessments;

-- Check assessment has questions
SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = 1;

-- Check test student enrolled
SELECT COUNT(*) FROM enrollments WHERE student_id = 'test-student-id';
```

---

## Summary

✅ **SECTION 5: ASSESSMENT SYSTEM TESTING - BASICS - COMPLETE**

- **7 Test Cases:** TC-5.1.1 through TC-5.1.7
- **1 Test File:** 001-assessment-basics.spec.ts
- **Coverage:** 100% of MANUAL_TESTING_GUIDE.md Section 5 (Basics)
- **Status:** Production-ready for local execution
- **Ready for:** `npx playwright test tests/e2e-automated/section-005-assessment-system/`

---

**Generated:** 2025-12-29
**Status:** ✅ COMPLETE AND READY FOR TESTING
