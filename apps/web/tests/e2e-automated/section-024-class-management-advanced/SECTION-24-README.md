# SECTION 24: CLASS MANAGEMENT - ADVANCED
## Complete Automated Test Suite

**Status:** ✅ COMPLETE - READY FOR TESTING
**Date:** 2025-12-30
**Total Test Cases:** 8 (Subsection 24.1)

---

## Overview

This document covers **Section 24: Class Management - Advanced**. All test cases automated to verify advanced class management features including code generation, verification, QR code handling, student enrollment, removal, class leaving, and duplicate prevention with Row-Level Security (RLS).

### What's Included

- **1 Test Specification File:** 001-class-management.spec.ts
- **8 Complete Test Cases:** TC-24.1.1 through TC-24.1.8
- **Class Features:** Code generation, enrollment, QR codes, preview, removal, RLS enforcement
- **Security:** Duplicate enrollment prevention, RLS policy validation
- **Screenshot Capture:** 3-4 per test (32+ total configured)
- **Results Organization:** Section-specific folder structure

---

## Section 24.1: Class Management - Advanced Testing

### Overview
Tests advanced class management functionality including class code generation and validation, QR code scanning workflows, student enrollment management with security policies, and duplicate enrollment prevention via Row-Level Security.

**Components Tested:**
- ClassCodeGenerator.tsx - Class code generation
- ClassCodeValidator.tsx - Code validation
- QRCodeGenerator.tsx - QR code creation
- ClassPreview.tsx - Class information display
- EnrollmentManager.tsx - Student enrollment
- StudentRemoval.tsx - Remove students from class
- LeaveClass.tsx - Student leaving class
- RLSEnforcement.tsx - Row-Level Security policies

**Test File:** `001-class-management.spec.ts` (1050+ lines, 8 tests)

### Test Cases

#### TC-24.1.1: Class Code Generation ✅
**Verifies:** Unique class code generation for student enrollment

**Test Procedure:**
1. Login as teacher
2. Navigate to class management
3. Create or open a class
4. Locate code generation option
5. Click "Generate Class Code"
6. Verify code generated and displayed
7. Verify code format (alphanumeric)
8. Check code uniqueness
9. Verify code display on class invite panel

**Expected Results:**
- ✓ Code generation button functional
- ✓ Unique code generated
- ✓ Code format valid (alphanumeric)
- ✓ Code displayed prominently
- ✓ Code copyable to clipboard
- ✓ Code shareable
- ✓ Multiple classes have different codes
- ✓ Code persists across sessions

**Code Format:**
```
Format:      [A-Z0-9]{6}
Examples:    ABC123, XYZ789, DEF456
Length:      6 characters
Characters:  Uppercase letters + digits
Uniqueness:  No duplicates across platform
```

**Code Properties:**
- Auto-generated on class creation
- Can be manually regenerated
- Expires after N days (configurable)
- One code per class
- Not reused after expiration
- Case-insensitive for entry
- Can be shared via link/QR code

**Screenshots:** 3 (class-management, code-generated, code-displayed)

---

#### TC-24.1.2: Class Code Verification ✅
**Verifies:** Class code validation for student enrollment

**Test Procedure:**
1. Navigate to student join class page
2. Enter invalid class code
3. Verify error message: "Invalid class code"
4. Enter valid class code
5. Verify code accepted
6. Verify class details shown
7. Proceed with enrollment
8. Verify success

**Invalid Code Examples:**
```
- INVALID9 (too long)
- AB1 (too short)
- invalid123 (case-sensitive)
- 000000 (doesn't exist)
- expired_code (expired)
```

**Valid Code Examples:**
```
- ABC123
- XYZ789
- DEF456
- GHI012
```

**Expected Results:**
- ✓ Invalid codes rejected
- ✓ Error messages clear
- ✓ Valid codes accepted
- ✓ Class details shown
- ✓ Enrollment proceeds
- ✓ Duplicate entry prevented
- ✓ Expired codes rejected
- ✓ Rate limiting on attempts

**Validation Rules:**
- Exact match (no typos allowed)
- Case-insensitive matching
- Syntax validation (format)
- Existence check (database)
- Expiration check
- Active status check

**Error Messages:**
```
- "Invalid class code"
- "Class code not found"
- "Class code has expired"
- "This class is full"
- "You are already enrolled"
```

**Screenshots:** 3 (join-page, invalid-code, valid-code)

---

#### TC-24.1.3: QR Code Generation & Scanning ✅
**Verifies:** QR code creation and scanning for class joining

**Test Procedure:**
1. Login as teacher
2. Navigate to class management
3. Access invite panel
4. Verify QR code displayed
5. Verify QR code contains class code
6. Test QR code download/share
7. Scan QR code (simulated)
8. Verify correct class code extracted
9. Verify enrollment flow triggered

**QR Code Properties:**
```
Format:         QR Code (2D barcode)
Data:           https://app.com/join/{classCode}
Version:        Auto-determined based on data
Error Level:    M (Medium, ~15% recovery)
Size:           200x200px or larger
Color:          Black on white
Border:         Quiet zone (4 modules)
```

**QR Code Functionality:**
- Generated automatically for each class
- Updated when class code changes
- Can be downloaded as PNG/SVG
- Can be printed
- Can be emailed
- Links to join form with code pre-filled
- Mobile-optimized
- Works with standard QR scanners

**Expected Results:**
- ✓ QR code generated
- ✓ QR code visible in invite panel
- ✓ QR code downloadable
- ✓ QR code scannable
- ✓ Scanning populates class code
- ✓ Correct class opened after scan
- ✓ Enrollment flow completes
- ✓ Mobile-friendly scanning

**QR Scan Verification:**
```typescript
// Extract class code from QR data
const qrData = 'https://app.com/join/ABC123';
const classCode = qrData.split('/').pop(); // ABC123

// Verify enrollment works
const enrollmentResult = await enrollStudent(classCode);
expect(enrollmentResult.success).toBe(true);
```

**Screenshots:** 3 (invite-panel, qr-code-visible, qr-code-highlighted)

---

#### TC-24.1.4: Class Preview Before Join ✅
**Verifies:** Class information display before student joins

**Test Procedure:**
1. Navigate to join class page
2. Enter valid class code
3. Verify preview loaded
4. Check class name displayed
5. Verify teacher name shown
6. Check subject displayed
7. Verify student count visible
8. Check class description
9. Verify join button ready
10. Click join to proceed

**Preview Information:**
```
CLASS PREVIEW
─────────────────────────────
Class Name:       Mathematics 101
Teacher:          Mr. John Smith
Subject:          Mathematics
Grade/Level:      Class 10 (or Grade 10)
Student Count:    45 students enrolled
Description:      Comprehensive mathematics
                  curriculum covering
                  algebra, geometry, etc.
Language:         English/Hindi/Assamese
Schedule:         Monday-Friday, 2-4 PM

[Join Class Button]
```

**Expected Results:**
- ✓ Preview loads quickly
- ✓ All information displayed
- ✓ Class name prominent
- ✓ Teacher name visible
- ✓ Subject clearly labeled
- ✓ Student count shown
- ✓ Description helpful
- ✓ Join button functional

**Data Verification:**
- Class name matches created name
- Teacher is correct
- Subject is correct
- Student count accurate
- Description matches
- Language matches teacher's setting

**Responsive Design:**
- Works on mobile (375px)
- Works on tablet (768px)
- Works on desktop (1920px)
- Text readable
- Buttons clickable (44px minimum)
- Images load properly

**Screenshots:** 3 (join-page, code-entered, preview-displayed)

---

#### TC-24.1.5: Student Enrollment ✅
**Verifies:** Student enrollment into class with database recording

**Test Procedure:**
1. Login as student
2. Navigate to join class
3. Enter valid class code
4. View class preview
5. Click "Join Class" button
6. Verify enrollment success
7. Verify redirect to class page
8. Check database records created
9. Verify enrollment timestamp
10. Check student appears in class roster

**Enrollment Data Recorded:**
```sql
INSERT INTO class_enrollments
  (class_id, student_id, enrolled_at, role, status)
VALUES
  (uuid, uuid, NOW(), 'student', 'active');
```

**Expected Results:**
- ✓ Enrollment succeeds
- ✓ Success message shown
- ✓ Redirect to class page
- ✓ Class appears in student's list
- ✓ Database record created
- ✓ Timestamp recorded
- ✓ Student visible in class roster
- ✓ Can access class content

**Database Verification:**
```sql
SELECT * FROM class_enrollments
WHERE class_id = ? AND student_id = ?;

-- Should return:
-- class_id, student_id, enrolled_at, role, status
```

**Confirmation Elements:**
- ✓ Success toast notification
- ✓ Page title shows class name
- ✓ Class appears in sidebar
- ✓ Class accessible from dashboard
- ✓ Student count increased

**Error Handling:**
- Duplicate enrollment prevented
- Full class rejected
- Invalid class rejected
- Network errors handled
- Database errors handled

**Screenshots:** 3 (join-button, enrollment-success, class-page)

---

#### TC-24.1.6: Student Removal ✅
**Verifies:** Teacher ability to remove students from class

**Test Procedure:**
1. Login as teacher
2. Navigate to class roster
3. Locate student to remove
4. Click remove/delete button
5. Verify confirmation dialog
6. Confirm removal
7. Verify student removed from list
8. Check database record updated
9. Verify student no longer has access
10. Check student notified (optional)

**Removal Process:**
```
1. Teacher opens class roster
   ↓
2. Locates student name
   ↓
3. Clicks "Remove" button
   ↓
4. Confirmation: "Remove John Doe?"
   ↓
5. Confirms removal
   ↓
6. Student enrollment status → 'removed'
   ↓
7. Student roster updated
   ↓
8. Student notified (if enabled)
```

**Expected Results:**
- ✓ Remove button visible
- ✓ Confirmation dialog shown
- ✓ Cancellation possible
- ✓ Removal confirmed
- ✓ Student disappears from roster
- ✓ Database updated
- ✓ Student status changed to 'removed'
- ✓ Student loses access
- ✓ Class assignment removed
- ✓ Grade history preserved

**Database Update:**
```sql
UPDATE class_enrollments
SET status = 'removed', removed_at = NOW()
WHERE class_id = ? AND student_id = ?;
```

**Access Control After Removal:**
- Student cannot see class anymore
- Student's grades preserved
- Student cannot submit assignments
- Student cannot take new assessments
- Student can rejoin if code available

**Confirmation Message:**
```
✅ Student removed successfully
   John Doe has been removed from Mathematics 101
```

**Screenshots:** 3 (roster-page, remove-button, student-removed)

---

#### TC-24.1.7: Leave Class (Student Side) ✅
**Verifies:** Student ability to leave class

**Test Procedure:**
1. Login as student
2. Navigate to class page
3. Access class options/menu
4. Click "Leave Class" option
5. Verify confirmation dialog
6. Confirm leaving
7. Verify removal from student's class list
8. Check access removed
9. Verify successful message
10. Verify can rejoin if needed

**Leave Class Process:**
```
1. Student opens class
   ↓
2. Clicks options menu (⋮)
   ↓
3. Selects "Leave Class"
   ↓
4. Confirmation: "Leave this class?"
   ↓
5. Confirms action
   ↓
6. Enrollment status → 'left'
   ↓
7. Class removed from student's list
   ↓
8. Success message shown
```

**Expected Results:**
- ✓ Leave option visible
- ✓ Confirmation dialog shown
- ✓ Cancellation possible
- ✓ Leaving confirmed
- ✓ Class removed from list
- ✓ Success message shown
- ✓ Redirect to dashboard
- ✓ Database updated
- ✓ Can rejoin class later

**Database Update:**
```sql
UPDATE class_enrollments
SET status = 'left', left_at = NOW()
WHERE class_id = ? AND student_id = ?;
```

**Post-Removal State:**
- Class not visible in dashboard
- Can view but cannot edit grades
- Progress still tracked
- Can rejoin via code
- Old assignments accessible (read-only)

**Confirmation Message:**
```
✅ You have left Mathematics 101
   You can rejoin anytime with the class code.
```

**Screenshots:** 3 (class-page, options-menu, leave-confirmation)

---

#### TC-24.1.8: Prevent Duplicate Enrollment ✅
**Verifies:** Row-Level Security (RLS) prevents duplicate enrollment

**Test Procedure:**
1. Login as student
2. Join class with valid code
3. Verify enrollment successful
4. Attempt to join same class again
5. Verify rejection: "Already enrolled"
6. Check error message clear
7. Verify RLS policy enforced
8. Check database prevents duplicate
9. Test via API (direct request)
10. Verify API also rejects

**Duplicate Prevention Mechanisms:**
```sql
-- Database constraint
CREATE UNIQUE INDEX idx_unique_enrollment
ON class_enrollments(class_id, student_id)
WHERE status != 'removed';

-- RLS Policy
CREATE POLICY prevent_duplicate_enrollment ON class_enrollments
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_id = NEW.class_id
        AND student_id = NEW.student_id
        AND status IN ('active', 'left')
    )
  );
```

**Expected Results:**
- ✓ Duplicate enrollment rejected
- ✓ Error message: "Already enrolled"
- ✓ User-friendly error
- ✓ RLS policy enforced
- ✓ Database constraint applied
- ✓ API also rejects
- ✓ No duplicate records created
- ✓ Transaction rolled back

**Error Messages:**
```
1. UI Attempt:
   ❌ "You are already enrolled in this class"

2. API Attempt:
   HTTP 400 Bad Request
   {
     "error": "duplicate_enrollment",
     "message": "Student already enrolled"
   }
```

**API Testing:**
```typescript
// First enrollment - success
POST /api/enroll
{
  "classCode": "ABC123"
}
// Response: 200 OK, enrollment created

// Second enrollment - failure
POST /api/enroll
{
  "classCode": "ABC123"
}
// Response: 400 Bad Request
// { "error": "duplicate_enrollment" }
```

**Security Verification:**
- RLS policy blocks at database
- Cannot bypass with direct API
- Cannot bypass with raw SQL
- Logging records all attempts
- Rate limiting prevents brute force

**Screenshots:** 3 (join-success, duplicate-attempt, error-message)

---

## Class Management Flow Diagram

```
Class Creation (Teacher)
┌──────────────────┐
│ Create Class     │
│ Set name, subject│
└────────┬─────────┘
         ↓
  ┌────────────────────┐
  │ Generate Code      │  ← TC-24.1.1
  │ (ABC123)           │
  └────────┬───────────┘
           ↓
  ┌────────────────────┐
  │ Generate QR Code   │  ← TC-24.1.3
  │ (QR image)         │
  └────────┬───────────┘
           ↓
  ✅ Class Ready for Enrollment

Student Enrollment Flow
┌──────────────────────┐
│ Student Join Page    │
└────────┬─────────────┘
         ↓
  ┌─────────────────────┐
  │ Validate Code       │  ← TC-24.1.2
  │ (ABC123 valid?)     │
  └────────┬────────────┘
           ↓
  ┌─────────────────────┐
  │ Preview Class       │  ← TC-24.1.4
  │ (Math 101, Mr. Smith)
  └────────┬────────────┘
           ↓
  ┌─────────────────────┐
  │ Check RLS Policy    │  ← TC-24.1.8
  │ (Not already joined?)
  └────────┬────────────┘
           ↓
  ┌─────────────────────┐
  │ Enroll Student      │  ← TC-24.1.5
  │ (Create record)     │
  └────────┬────────────┘
           ↓
  ✅ Student Enrolled

Teacher Management
┌──────────────────────┐
│ Class Roster         │
└────────┬─────────────┘
         ↓
  ├─→ Remove Student   │  ← TC-24.1.6
  │   (RLS policy blocks)
  │
  └─→ Manage Grades

Student Management
┌──────────────────────┐
│ My Classes           │
└────────┬─────────────┘
         ↓
  └─→ Leave Class      │  ← TC-24.1.7
      (Removal request)
      ↓
      (Teacher approval or automatic)
      ↓
  ✅ Class Removed
```

---

## Row-Level Security (RLS) Policies

### Policy 1: Prevent Duplicate Enrollment
```sql
CREATE POLICY prevent_duplicate_on_insert
  ON class_enrollments FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.class_id = NEW.class_id
        AND ce.student_id = NEW.student_id
        AND ce.status IN ('active', 'left')
    )
  );
```

### Policy 2: Teacher Can Remove Students
```sql
CREATE POLICY teacher_can_remove_student
  ON class_enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      WHERE c.id = class_enrollments.class_id
        AND c.teacher_id = auth.uid()
    )
  );
```

### Policy 3: Student Can Only Leave Own Enrollment
```sql
CREATE POLICY student_can_leave
  ON class_enrollments FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
```

---

## How to Run These Tests

### Run All Class Management Tests
```bash
npx playwright test tests/e2e-automated/section-024-class-management-advanced/
```

### Run Specific Test
```bash
npx playwright test -g "TC-24.1.1"
npx playwright test -g "Class Code Generation"
npx playwright test -g "Class Code Verification"
npx playwright test -g "QR Code Generation"
npx playwright test -g "Class Preview"
npx playwright test -g "Student Enrollment"
npx playwright test -g "Student Removal"
npx playwright test -g "Leave Class"
npx playwright test -g "Prevent Duplicate"
```

### View Results
```bash
npx playwright show-report
cat tests/e2e-automated/section-024-class-management-advanced/results/section-24.1-results.json
```

---

## Performance Baselines

| Test Case | Expected Duration | Threshold |
|-----------|-------------------|-----------
| TC-24.1.1 Class Code Generation | 6-10 seconds | 15 seconds |
| TC-24.1.2 Class Code Verification | 6-10 seconds | 15 seconds |
| TC-24.1.3 QR Code Generation | 8-12 seconds | 18 seconds |
| TC-24.1.4 Class Preview | 8-12 seconds | 18 seconds |
| TC-24.1.5 Student Enrollment | 10-14 seconds | 20 seconds |
| TC-24.1.6 Student Removal | 10-14 seconds | 20 seconds |
| TC-24.1.7 Leave Class | 8-12 seconds | 18 seconds |
| TC-24.1.8 Prevent Duplicate | 10-14 seconds | 20 seconds |
| **TOTAL** | **66-98 seconds** | **164 seconds** |

---

## Files Created

| File | Size | Lines | Purpose |
|------|------|-------|---------
| 001-class-management.spec.ts | 44 KB | 1050+ | Class management tests (8 tests) |
| SECTION-24-README.md | 16 KB | 450+ | This documentation |
| results/section-24.1-results.json | Auto-generated | | Test results |
| results/screenshots/ | Variable | | Screenshot storage (32+) |

**Total Code:** 1050+ lines
**Total Documentation:** 450+ lines

---

## Security Considerations

### Code Security
- Codes should not be predictable
- Codes should not expose class ID
- Codes should expire after use period
- Codes should not be reused

### RLS Enforcement
- Database-level enforcement (not app-level)
- Cannot bypass with API direct access
- Row-level access control
- Principle of least privilege
- Audit logging of all access

### Student Protection
- Cannot be enrolled twice
- Cannot access class after removal
- Grades preserved after removal
- Can rejoin if authorized
- Cannot modify own enrollment status directly

---

## Summary

✅ **SECTION 24: CLASS MANAGEMENT - ADVANCED - COMPLETE**

- **8 Test Cases:** TC-24.1.1 through TC-24.1.8
- **Coverage:** 100% of MANUAL_TESTING_GUIDE.md Section 24
- **Status:** Production-ready for local execution
- **Ready for:** `npx playwright test tests/e2e-automated/section-024-class-management-advanced/`

### Test Coverage Summary
- Class code generation ✅
- Code validation ✅
- QR code functionality ✅
- Class preview ✅
- Student enrollment ✅
- Student removal ✅
- Leave class functionality ✅
- RLS duplicate prevention ✅

---

**Generated:** 2025-12-30
**Status:** ✅ COMPLETE AND READY FOR TESTING
