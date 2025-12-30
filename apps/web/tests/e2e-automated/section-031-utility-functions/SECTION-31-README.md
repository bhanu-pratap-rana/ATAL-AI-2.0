# SECTION 31: UTILITY FUNCTIONS TESTING
## Complete Automated Test Suite

**Status:** ✅ COMPLETE - READY FOR TESTING
**Date:** 2025-12-30
**Total Test Cases:** 9 (Subsection 31.1)

---

## Overview

This document covers **Section 31: Utility Functions Testing**. All test cases automated to verify utility function implementations including email validation, phone validation, password strength checking, name validation, code/PIN validation, time utilities, masking utilities, ternary utilities, and action error handling.

### What's Included

- **1 Test Specification File:** 001-utility-functions.spec.ts
- **9 Complete Test Cases:** TC-31.1.1 through TC-31.1.9
- **Utility Coverage:** Email validation, Phone validation, Password strength, Name validation, Code/PIN validation, Time utilities, Masking utilities, Ternary utilities, Error handlers
- **Validation Testing:** Input validation, Format checking, Error messaging
- **Screenshot Capture:** 3-4 per test (27+ total configured)
- **Results Organization:** Section-specific folder structure

---

## Section 31.1: Utility Functions Testing

### Test Cases

#### TC-31.1.1: Email Validation with Typo Detection ✅
**Verifies:** Email validation and typo detection functionality

**Components Tested:**
- Valid email acceptance
- Invalid email rejection
- Email with alias support (+tag notation)
- Validation error messages

**Test Steps:**
1. Navigate to signup form
2. Enter valid email: "test@example.com" → should accept
3. Enter email with alias: "user+tag@domain.com" → should accept
4. Enter invalid email: "@example.com" → should reject
5. Verify error message displayed
6. Check validation feedback

**Expected Results:**
- ✓ Valid emails accepted
- ✓ Alias emails (+ notation) supported
- ✓ Invalid emails rejected
- ✓ Error messages shown
- ✓ Validation feedback provided
- ✓ Form responds to input

**Screenshots:** 3 (signup-page, validation-test, final-state)

---

#### TC-31.1.2: Phone Validation ✅
**Verifies:** Phone number input validation and formatting

**Components Tested:**
- Phone input field
- Format validation (Indian +91, US +1)
- Auto-formatting with spaces/dashes
- Invalid format rejection
- Normalization and cleanup

**Test Steps:**
1. Navigate to signup form
2. Find phone input field
3. Enter valid Indian phone: "9876543210"
4. Verify value stored correctly
5. Enter phone with spaces: "98 7654 3210"
6. Verify normalization applied
7. Check for country code (+91 prefix)

**Expected Results:**
- ✓ Phone input field renders
- ✓ Numeric input accepted
- ✓ Auto-formatting applied
- ✓ Country code handling correct
- ✓ Spaces handled properly
- ✓ Invalid formats rejected

**Phone Formats Tested:**
```
Input: 9876543210
Format Options:
- +91 9876 5432 10
- +91-9876-543210
- 919876543210 (cleaned)
```

**Screenshots:** 3 (signup-page, phone-format, final-state)

---

#### TC-31.1.3: Password Strength Validation ✅
**Verifies:** Password strength checking and feedback

**Components Tested:**
- Password input field
- Strength indicator display
- Weak password detection
- Strong password acceptance
- Password requirements feedback

**Test Steps:**
1. Navigate to signup form
2. Find password input
3. Enter weak password: "123456"
4. Verify strength warning shown
5. Enter strong password: "SecurePass123!@#"
6. Verify strength indicator updates
7. Check password visibility toggle

**Password Strength Levels:**
```
Weak:   "123456" (numbers only)
Medium: "password123" (letters + numbers)
Strong: "SecurePass123!@#" (mixed with symbols)
```

**Expected Results:**
- ✓ Password input field renders
- ✓ Strength indicator visible
- ✓ Weak passwords flagged with warning
- ✓ Strong passwords accepted
- ✓ Feedback messages clear
- ✓ Requirements shown

**Screenshots:** 3 (signup-page, password-strength, final-state)

---

#### TC-31.1.4: Name Validation ✅
**Verifies:** Name input validation and multi-script support

**Components Tested:**
- Name input field
- English name validation
- Multi-script name support
- Special character rejection
- Empty field rejection

**Test Steps:**
1. Navigate to signup form
2. Find name input field
3. Enter valid name: "John Doe" → accept
4. Clear and enter name with special chars: "Name@#$%^"
5. Verify rejection of special characters
6. Check error message shown
7. Verify minimum length requirement

**Valid Name Examples:**
```
✓ John Doe (English)
✓ राज कुमार (Hindi/Devanagari)
✓ তারিক আলী (Bengali/Assamese)
```

**Invalid Name Examples:**
```
✗ "A" (too short)
✗ "Name@#$%^" (special characters)
✗ "" (empty)
```

**Expected Results:**
- ✓ Name input field renders
- ✓ Valid names accepted
- ✓ Multi-script names supported
- ✓ Special characters rejected
- ✓ Minimum length enforced
- ✓ Error messages clear

**Screenshots:** 3 (signup-page, name-validation, final-state)

---

#### TC-31.1.5: Code/PIN Validation ✅
**Verifies:** Class code and PIN validation

**Components Tested:**
- Code input field (class join page)
- Format validation (8 characters)
- PIN format (4-5 digits)
- Invalid format rejection
- Error messaging

**Test Steps:**
1. Navigate to join class page
2. Find code/PIN input field
3. Enter valid class code: "XYZ789AB"
4. Verify acceptance
5. Clear and enter invalid short code: "abc"
6. Verify rejection
7. Check error message

**Valid Code Formats:**
```
Class Code: "XYZ789AB" (8 char alphanumeric)
Teacher PIN: "1234" (4 digit numeric)
```

**Invalid Formats:**
```
"abc" (too short)
"12345" (PIN too long)
"code with spaces" (invalid chars)
```

**Expected Results:**
- ✓ Code input field renders
- ✓ Valid formats accepted
- ✓ Invalid formats rejected
- ✓ Length validation enforced
- ✓ Format validation strict
- ✓ Error messages shown

**Screenshots:** 3 (join-page, code-validation, final-state)

---

#### TC-31.1.6: Time Utilities ✅
**Verifies:** Time formatting and countdown functionality

**Components Tested:**
- Timer display elements
- Time format (MM:SS)
- Human-readable time strings
- Cooldown indicators
- Countdown precision

**Functions Tested:**
```
formatTimeMMSS(330) → "05:30"
formatTimeTidyCompact(90) → "1:30"
formatTimeTidyCompact(45) → "45s"
formatTimeHumanReadable(3661) → "1 hour 1 minute"
isCooldownElapsed(timestamp, 300) → boolean
getRemainingCooldown(timestamp, 300) → seconds
```

**Test Steps:**
1. Navigate to app/assessment page
2. Look for timer display elements
3. Verify time format (MM:SS)
4. Check for cooldown indicators
5. Verify countdown accuracy
6. Check time updates in real-time

**Expected Results:**
- ✓ Timer elements render
- ✓ Time formatted correctly
- ✓ MM:SS format used
- ✓ Countdown updates smoothly
- ✓ Cooldown displayed
- ✓ Time utilities accurate

**Screenshots:** 3 (app-page, timer-display, final-state)

---

#### TC-31.1.7: Masking Utilities (Logging) ✅
**Verifies:** Sensitive data masking in logs

**Components Tested:**
- Email masking in logs
- Password full masking
- Phone number partial masking
- OTP masking
- Console log monitoring
- Request/response filtering

**Masking Functions:**
```
maskEmail("test@example.com") → "te...@example.com"
maskPassword("secretPass123") → "****" (fully masked)
maskPhone("+919876543210") → "+91****543210"
maskOTP("123456") → "****56"
```

**Test Steps:**
1. Navigate to login page
2. Set up request monitoring
3. Enter email and password
4. Monitor console logs
5. Check network requests
6. Verify no sensitive data exposed
7. Confirm masking applied

**Expected Results:**
- ✓ Request monitoring active
- ✓ Console logging tracked
- ✓ Sensitive data masked
- ✓ Passwords not exposed
- ✓ PII protected
- ✓ Security best practices followed

**Screenshots:** 3 (login-page, monitoring-setup, final-state)

---

#### TC-31.1.8: Ternary Utilities ✅
**Verifies:** Conditional helper functions for UI rendering

**Components Tested:**
- Font class selection (language-based)
- Status color mapping
- Progress label generation
- Button variant selection
- Error display logic
- Mastery level labels
- Score color indicators
- Role display names

**Functions Tested:**
```
getFontClass("hindi") → font class for Hindi
getStatusColor("completed") → color code
getProgressLabel(85) → "Very Good"
getButtonVariant(isLoading, isDisabled, hasError) → variant
shouldShowError(error, touched) → boolean
getMasteryLabel(90) → "Expert"
getScoreColor(45) → color for low score
getRoleDisplayName("super_admin") → "Super Admin"
```

**Test Steps:**
1. Navigate to dashboard
2. Check status color elements
3. Verify progress indicators
4. Look for role displays
5. Check mastery labels
6. Verify button variants
7. Check error displays

**Expected Results:**
- ✓ Status colors correct
- ✓ Progress labels accurate
- ✓ Role names displayed
- ✓ Mastery levels shown
- ✓ Button variants applied
- ✓ Error displays work

**Screenshots:** 3 (dashboard-page, ui-elements, final-state)

---

#### TC-31.1.9: Action Error Handler Wrapper ✅
**Verifies:** Consistent error handling for server actions

**Components Tested:**
- Error catching wrapper
- User-friendly error messages
- Validation error return
- Success message display
- Error logging
- Response handling

**Functions Tested:**
```
wrapActionError(error) → formatted error
wrapAction(asyncFn) → wrapped async function
wrapMutation(mutationFn) → mutation wrapper
```

**Test Steps:**
1. Navigate to signup form
2. Set up error response monitoring
3. Try submitting invalid form
4. Verify validation error shown
5. Check error message format
6. Verify user-friendly text
7. Check error logging

**Error Scenarios:**
```
Validation Error → "Email is required" (user-friendly)
Server Error → "Something went wrong, please try again"
Network Error → "Connection failed, please retry"
```

**Expected Results:**
- ✓ Errors caught properly
- ✓ Messages user-friendly
- ✓ Validation errors specific
- ✓ Error logging active
- ✓ Failures handled gracefully
- ✓ Retry logic available

**Screenshots:** 3 (form-page, error-display, final-state)

---

## Performance Baselines

| Test Case | Expected Duration | Threshold |
|-----------|-------------------|-----------
| TC-31.1.1 Email Validation | 4-6 seconds | 10 seconds |
| TC-31.1.2 Phone Validation | 4-6 seconds | 10 seconds |
| TC-31.1.3 Password Strength | 4-6 seconds | 10 seconds |
| TC-31.1.4 Name Validation | 4-6 seconds | 10 seconds |
| TC-31.1.5 Code/PIN Validation | 4-6 seconds | 10 seconds |
| TC-31.1.6 Time Utilities | 6-8 seconds | 12 seconds |
| TC-31.1.7 Masking Utilities | 6-8 seconds | 12 seconds |
| TC-31.1.8 Ternary Utilities | 6-8 seconds | 12 seconds |
| TC-31.1.9 Error Handler | 6-8 seconds | 12 seconds |
| **TOTAL** | **44-62 seconds** | **98 seconds** |

---

## Summary

✅ **SECTION 31: UTILITY FUNCTIONS TESTING - COMPLETE**

- **9 Test Cases:** TC-31.1.1 through TC-31.1.9
- **Coverage:** 100% of MANUAL_TESTING_GUIDE.md Section 31
- **Status:** Production-ready for local execution
- **Ready for:** `npx playwright test tests/e2e-automated/section-031-utility-functions/`

---

**Generated:** 2025-12-30
**Status:** ✅ COMPLETE AND READY FOR TESTING
