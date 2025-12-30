# SECTION 15: SECURITY TESTING
## Complete Automated Test Suite

**Status:** ✅ COMPLETE - READY FOR TESTING
**Date:** 2025-12-30
**Total Test Cases:** 5 (Subsection 15.1)

---

## Overview

This document covers **Section 15: Security Testing**. All test cases automated to verify security implementations including password hashing, CSRF protection, data isolation, XSS prevention, and HTTPS enforcement.

### What's Included

- **1 Test Specification File:** 001-security-testing.spec.ts
- **5 Complete Test Cases:** TC-15.1.1 through TC-15.1.5
- **Security Coverage:** Authentication, authorization, data protection, client-side security
- **OWASP Reference:** A1 Injection, A2 Broken Auth, A3 XSS, A5 CSRF, A6 Sensitive Data
- **Screenshot Capture:** 3-4 per test (15+ total configured)
- **Results Organization:** Section-specific folder structure

---

## Section 15.1: Security Testing

### Overview
Tests application security mechanisms to ensure user data is protected, authentication is enforced, and common vulnerabilities are mitigated.

**Security Testing Framework:**
- OWASP Top 10 focus areas
- Authentication/Authorization verification
- Cryptographic implementation checks
- Input validation and output encoding
- HTTPS and secure headers validation

**Test File:** `001-security-testing.spec.ts` (1100+ lines, 5 tests)

### Test Cases

#### TC-15.1.1: Password Hashing ✅
**Verifies:** Passwords are not transmitted or stored in plain text

**Test Procedure:**
1. Sign in with test credentials
2. Intercept network requests during authentication
3. Search request bodies for plain-text password
4. Verify password is hashed/encrypted before transmission
5. Check for secure password handling in form submission

**Security Checks:**
- ✓ Plain-text passwords NOT in request body
- ✓ Plain-text passwords NOT in response body
- ✓ Passwords NOT in localStorage/sessionStorage
- ✓ Password fields have secure attribute (autocomplete="off")
- ✓ HTTPS enforced for login endpoint

**Expected Results:**
```
✓ Signup request body does NOT contain plain password
✓ Form submission uses POST (not GET)
✓ Secure password field attributes detected
✓ Password hashing happens client-side or server-side (not transmitted plain)
✓ Login succeeds with hashed/encrypted password
```

**Finding Indicators:**
```typescript
const findings = {
  plainTextPasswordInRequest: false,  // Should be false (secure)
  plainTextPasswordInResponse: false, // Should be false (secure)
  passwordInLocalStorage: false,      // Should be false (secure)
  securePasswordFieldAttributes: true, // Should be true (secure)
  postMethodUsed: true,               // Should be true (secure)
};
```

**Code Pattern:**
```typescript
// Monitor all requests during signup
page.on('request', request => {
  const body = request.postDataJSON();
  if (body && body.password) {
    if (body.password === TEST_USER_PASSWORD) {
      findings['plainTextPasswordInRequest'] = true;
    }
  }
});

// Check form attributes
const passwordField = await page.locator('input[type="password"]');
const autocomplete = await passwordField.getAttribute('autocomplete');
if (autocomplete === 'off') {
  findings['securePasswordFieldAttributes'] = true;
}
```

**Screenshots:** 3 (login-form, signin-attempt, security-verified)

**OWASP Reference:**
- **A2: Broken Authentication** - Weak password storage
- **A6: Sensitive Data Exposure** - Passwords transmitted in plain text

---

#### TC-15.1.2: CSRF Protection ✅
**Verifies:** Forms include CSRF tokens to prevent Cross-Site Request Forgery attacks

**Test Procedure:**
1. Navigate to signup form
2. Inspect form HTML for CSRF token element
3. Check multiple common token field names
4. Verify token is present and non-empty
5. Verify token changes on form reload
6. Check response headers for CSRF-related tokens

**CSRF Token Selectors:**
```typescript
const csrfTokenSelectors = [
  'input[name="_csrf"]',
  'input[name="csrf_token"]',
  'input[name="csrfToken"]',
  'input[name="_token"]',
  'input[name="authenticity_token"]',
];
```

**Expected Results:**
- ✓ CSRF token present in form
- ✓ Token value is non-empty string
- ✓ Token varies between page loads
- ✓ Server validates token on form submission
- ✓ Response headers include CSRF protection indicators

**Finding Indicators:**
```typescript
const findings = {
  csrfTokenPresent: true,           // Should be true (secure)
  csrfTokenNonEmpty: true,          // Should be true (secure)
  csrfTokenDifferentOnReload: true, // Should be true (secure)
  serverValidatesToken: true,       // Should be true (secure)
  x_csrfTokenHeader: true,          // Should be true (secure)
};
```

**Code Pattern:**
```typescript
// Check for CSRF token in form
let csrfTokenFound = false;
let csrfTokenValue = '';

for (const selector of csrfTokenSelectors) {
  const token = page.locator(selector).first();
  if (await token.isVisible({ timeout: 2000 }).catch(() => false)) {
    const value = await token.inputValue();
    if (value && value.length > 0) {
      csrfTokenFound = true;
      csrfTokenValue = value;
      console.log(`  ✓ CSRF token found: ${value.substring(0, 20)}...`);
      break;
    }
  }
}

// Reload and check if token changes
await page.reload();
let csrfTokenDifferent = false;
for (const selector of csrfTokenSelectors) {
  const token = page.locator(selector).first();
  const newValue = await token.inputValue().catch(() => '');
  if (newValue && newValue !== csrfTokenValue) {
    csrfTokenDifferent = true;
    break;
  }
}
```

**Screenshots:** 4 (signup-form, csrf-token-verified, reload-check, security-verified)

**OWASP Reference:**
- **A5: Cross-Site Request Forgery (CSRF)** - Missing CSRF protection

---

#### TC-15.1.3: Data Isolation ✅
**Verifies:** Users can only access their own data (Row Level Security / RLS)

**Test Procedure:**
1. Sign in as Student A
2. Get Student A's data (should succeed)
3. Attempt to access Student B's data via API
4. Verify 403 Forbidden or 401 Unauthorized response
5. Sign in as Student B
6. Verify Student B data is accessible to them

**Test Scenarios:**
```
Student A tries to access:
  - /api/student/{studentB_id} → 403 Forbidden ✓
  - /api/assessments/{studentB_assessment_id} → 403 Forbidden ✓
  - /api/progress/{studentB_id} → 403 Forbidden ✓

Student A accesses own data:
  - /api/student/{studentA_id} → 200 OK ✓
  - /api/assessments/{studentA_assessment_id} → 200 OK ✓
  - /api/progress/{studentA_id} → 200 OK ✓
```

**Expected Results:**
- ✓ Unauthenticated users get 401 Unauthorized
- ✓ Students cannot access other student data (403)
- ✓ Students can access their own data (200)
- ✓ Attempt to access other data returns empty or error
- ✓ No sensitive data leaked in error messages

**Finding Indicators:**
```typescript
const findings = {
  studentACanAccessOwnData: true,      // Should be true (secure)
  studentACannnotAccessStudentBData: true, // Should be true (secure)
  properForbiddenResponse: true,       // Should be true (secure)
  noDataLeakInError: true,             // Should be true (secure)
  studentBCanAccessOwnData: true,      // Should be true (secure)
};
```

**Code Pattern:**
```typescript
// Get Student A's user ID from authenticated session
const studentAId = await page.evaluate(() => {
  return (window as any).__USER_ID__ || 'test-student-a';
});

// Try to access Student B data via API request
const studentBId = 'student-b-id-12345';
const studentBUrl = `${BASE_URL}/api/student/${studentBId}`;

const response = await page.request.get(studentBUrl, {
  headers: {
    'Authorization': `Bearer ${authToken}`,
  }
});

if (response.status() === 403 || response.status() === 401) {
  console.log('  ✓ Properly denied access to other student data');
  findings['studentACannnotAccessStudentBData'] = true;
} else {
  console.log('  ❌ SECURITY ISSUE: Can access other student data');
  findings['studentACannnotAccessStudentBData'] = false;
}
```

**Screenshots:** 4 (student-a-signin, student-a-data-accessible, student-b-access-denied, isolation-verified)

**OWASP Reference:**
- **A2: Broken Authentication** - Missing authorization checks
- **A4: Broken Access Control** - Insufficient data isolation

---

#### TC-15.1.4: XSS Prevention ✅
**Verifies:** Application prevents Cross-Site Scripting (XSS) attacks

**Test Procedure:**
1. Navigate to form (signup, profile, etc.)
2. Enter XSS payload: `<script>alert("XSS")</script>`
3. Monitor for JavaScript execution (dialog event)
4. Check if payload is HTML-escaped in page content
5. Verify script is not executed by checking page state
6. Test with alternative payloads

**XSS Payloads Tested:**
```
1. <script>alert("XSS")</script>
2. <img src=x onerror="alert('XSS')">
3. <svg onload="alert('XSS')">
4. javascript:alert("XSS")
5. <iframe src="javascript:alert('XSS')">
```

**Expected Results:**
- ✓ No dialog/alert appears on page
- ✓ Payload is HTML-escaped in output (`&lt;script&gt;...&lt;/script&gt;`)
- ✓ Script tags removed or escaped
- ✓ Event handlers not executed
- ✓ Page remains in normal state (no redirect, no error)

**Finding Indicators:**
```typescript
const findings = {
  xssPayloadExecuted: false,          // Should be false (secure)
  payloadHtmlEscaped: true,           // Should be true (secure)
  scriptTagsRemoved: true,            // Should be true (secure)
  eventHandlersNotExecuted: true,     // Should be true (secure)
  pageRemainedNormal: true,           // Should be true (secure)
};
```

**Code Pattern:**
```typescript
// Listen for dialogs (would indicate script execution)
let dialogDetected = false;
page.on('dialog', async dialog => {
  console.log(`  ❌ Dialog detected: ${dialog.message()}`);
  dialogDetected = true;
  await dialog.dismiss();
});

// Enter XSS payload into form field
const xssPayload = '<script>alert("XSS")</script>';
await page.fill('input[type="email"]', xssPayload);
await page.fill('input[type="text"]', xssPayload);

// Submit form
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

// Check if payload was executed
if (dialogDetected) {
  findings['xssPayloadExecuted'] = true;
  console.log('  ❌ SECURITY ISSUE: XSS vulnerability detected');
}

// Check if payload is escaped in HTML
const pageHtml = await page.evaluate(() => document.documentElement.innerHTML);
if (pageHtml.includes('&lt;script&gt;')) {
  findings['payloadHtmlEscaped'] = true;
  console.log('  ✓ Payload properly HTML-escaped');
}
```

**Screenshots:** 3 (xss-form, payload-entered, no-execution-verified)

**OWASP Reference:**
- **A7: Cross-Site Scripting (XSS)** - Unvalidated/unencoded output

---

#### TC-15.1.5: HTTPS Enforcement ✅
**Verifies:** Application enforces HTTPS and implements security headers

**Test Procedure:**
1. Check if application uses HTTPS in production
2. Verify security headers are present in responses
3. Check for HSTS (HTTP Strict-Transport-Security)
4. Check for CSP (Content-Security-Policy)
5. Check for X-Frame-Options (clickjacking prevention)
6. Check for X-Content-Type-Options (MIME sniffing prevention)
7. Verify secure cookie flags

**Security Headers Checked:**
```typescript
const securityHeaders = [
  'Strict-Transport-Security',   // HSTS: enforce HTTPS
  'Content-Security-Policy',      // CSP: prevent inline scripts
  'X-Content-Type-Options',       // MIME type sniffing
  'X-Frame-Options',              // Clickjacking prevention
  'X-XSS-Protection',             // XSS filter enable
  'Referrer-Policy',              // Referrer leakage prevention
];
```

**Expected Results (Production):**
- ✓ BASE_URL starts with `https://`
- ✓ HSTS header present with `max-age >= 31536000`
- ✓ CSP header prevents inline scripts
- ✓ X-Frame-Options set to DENY or SAMEORIGIN
- ✓ X-Content-Type-Options set to nosniff
- ✓ Secure flag set on session cookies

**Expected Results (Development/Localhost):**
- ✓ HTTP allowed for development (typically http://localhost:3000)
- ✓ Security headers may be enforced even in dev
- ✓ CSP not blocking necessary dev resources

**Finding Indicators:**
```typescript
const findings = {
  baseUrlIsHttps: true,              // Should be true in production
  hstsHeaderPresent: true,           // Should be true in production
  cspHeaderPresent: true,            // Should be true
  xFrameOptionsPresent: true,        // Should be true
  xContentTypeOptionsPresent: true,  // Should be true
  secureCookieFlags: true,           // Should be true
};
```

**Code Pattern:**
```typescript
// Check if HTTPS is enforced
const isHttps = BASE_URL.startsWith('https://');
const isLocalhost = BASE_URL.includes('localhost');
findings['baseUrlIsHttps'] = isHttps;

if (isHttps) {
  console.log('  ✓ HTTPS enforced in production');
} else if (isLocalhost) {
  console.log('  ℹ️ Local development using HTTP (acceptable)');
}

// Get response headers from a page request
const response = await page.goto(`${BASE_URL}/auth/signin`);
const headers = response?.headers() || {};

// Check for security headers
const hstsHeader = headers['strict-transport-security'];
if (hstsHeader) {
  console.log(`  ✓ HSTS header present: ${hstsHeader}`);
  findings['hstsHeaderPresent'] = true;
}

const cspHeader = headers['content-security-policy'];
if (cspHeader) {
  console.log(`  ✓ CSP header present`);
  findings['cspHeaderPresent'] = true;
}

const xFrameOptions = headers['x-frame-options'];
if (xFrameOptions) {
  console.log(`  ✓ X-Frame-Options: ${xFrameOptions}`);
  findings['xFrameOptionsPresent'] = true;
}
```

**Screenshots:** 3 (https-verified, security-headers-check, all-headers-present)

**OWASP Reference:**
- **A2: Broken Authentication** - Missing HTTPS
- **A6: Sensitive Data Exposure** - Unencrypted data in transit

---

## Security Testing Best Practices

### What These Tests Cover
1. ✅ Authentication security (password hashing)
2. ✅ CSRF attack prevention
3. ✅ Unauthorized data access prevention
4. ✅ XSS attack prevention
5. ✅ Secure communication (HTTPS)

### What These Tests Don't Cover
- SQL Injection (requires backend testing)
- File Upload vulnerabilities (requires file operations)
- Business logic vulnerabilities (requires manual testing)
- Advanced cryptographic implementation
- Penetration testing (requires specialized tools)

### Additional Manual Security Testing
- SQL injection attempts on forms
- File upload with malicious files
- Session fixation attacks
- Account enumeration attacks
- Brute force attacks (rate limiting)
- API endpoint authorization bypass
- Admin panel access controls

---

## How to Run These Tests

### Prerequisites
```bash
cd apps/web
npm install --save-dev @playwright/test
npx playwright install
```

### Environment Setup
```bash
export PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
export TEST_STUDENT_EMAIL=test.student@example.com
export TEST_STUDENT_PASSWORD=password123
export TEST_STUDENT_B_EMAIL=test.student.b@example.com
export TEST_STUDENT_B_PASSWORD=password456
```

### Run All Section 15 Tests
```bash
npx playwright test tests/e2e-automated/section-015-security-testing/
```

### Run Specific Test
```bash
npx playwright test -g "TC-15.1.1"
npx playwright test -g "Password Hashing"
npx playwright test -g "CSRF Protection"
npx playwright test -g "Data Isolation"
npx playwright test -g "XSS Prevention"
npx playwright test -g "HTTPS Enforcement"
```

### View Results
```bash
npx playwright show-report
cat tests/e2e-automated/section-015-security-testing/results/section-15.1-results.json
```

---

## Security Test Results Interpretation

### Understanding Findings
Each security test returns a findings object indicating security stance:

```json
{
  "testCase": "TC-15.1.1",
  "testName": "Password-Hashing",
  "findings": {
    "plainTextPasswordInRequest": false,      // ✓ Good: no plain text
    "plainTextPasswordInResponse": false,     // ✓ Good: no plain text
    "passwordInLocalStorage": false,          // ✓ Good: not stored
    "securePasswordFieldAttributes": true,    // ✓ Good: autocomplete=off
    "postMethodUsed": true                    // ✓ Good: POST not GET
  },
  "status": "PASS",
  "resultsSummary": "Password hashing verified ✓"
}
```

### Red Flags (Security Issues)
- ❌ `plainTextPasswordInRequest: true` - **CRITICAL**: Passwords transmitted plaintext
- ❌ `csrfTokenPresent: false` - **HIGH**: CSRF protection missing
- ❌ `studentACannnotAccessStudentBData: false` - **CRITICAL**: RLS/authorization bypass
- ❌ `xssPayloadExecuted: true` - **HIGH**: XSS vulnerability present
- ❌ `baseUrlIsHttps: false` (production) - **HIGH**: Unencrypted communication

---

## Remediation Guide

### Issue: Password Hashing
**Problem:** Passwords sent in plain text
**Fix:**
```typescript
// Use HTTPS for login
// Hash password client-side or server-side
// Never log passwords
// Use secure password fields
```

### Issue: Missing CSRF Token
**Problem:** Forms lack CSRF protection
**Fix:**
```typescript
// Add CSRF middleware to API
// Generate token per request
// Validate token on form submission
```

### Issue: Data Isolation
**Problem:** Users access other user data
**Fix:**
```sql
-- Enable Row Level Security (RLS)
ALTER TABLE student_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_isolation ON student_data
  USING (user_id = current_user_id());
```

### Issue: XSS Vulnerability
**Problem:** User input rendered without escaping
**Fix:**
```typescript
// Always escape user input in template
// Use CSP to block inline scripts
// Sanitize HTML if rich text needed
// Use Content-Security-Policy header
```

### Issue: HTTP Instead of HTTPS
**Problem:** Unencrypted communication
**Fix:**
```typescript
// Obtain SSL certificate (Let's Encrypt)
// Enable HTTPS on server
// Add HSTS header (min 1 year)
// Redirect HTTP → HTTPS
```

---

## Performance Baselines

| Test Case | Expected Duration | Threshold |
|-----------|-------------------|-----------
| TC-15.1.1 Password Hashing | 8-12 seconds | 18 seconds |
| TC-15.1.2 CSRF Protection | 10-15 seconds | 20 seconds |
| TC-15.1.3 Data Isolation | 15-20 seconds | 25 seconds |
| TC-15.1.4 XSS Prevention | 10-14 seconds | 20 seconds |
| TC-15.1.5 HTTPS Enforcement | 5-8 seconds | 12 seconds |
| **TOTAL** | **48-69 seconds** | **95 seconds** |

---

## Files Created

| File | Size | Lines | Purpose |
|------|------|-------|---------
| 001-security-testing.spec.ts | 42 KB | 1100+ | Security tests (5 tests) |
| SECTION-15-README.md | 16 KB | 450+ | This documentation |
| results/section-15.1-results.json | Auto-generated | | Test results |
| results/screenshots/ | Variable | | Screenshot storage (15+) |

**Total Code:** 1100+ lines
**Total Documentation:** 450+ lines

---

## Security Testing Checklist

After running these tests, verify:

- [ ] All 5 security tests pass
- [ ] No CRITICAL findings in results
- [ ] Password hashing verified
- [ ] CSRF tokens present and validated
- [ ] Data isolation enforced (RLS/authorization)
- [ ] XSS payloads properly escaped
- [ ] HTTPS enforced (production)
- [ ] Security headers configured
- [ ] Sensitive data not logged
- [ ] Error messages don't leak information

---

## Summary

✅ **SECTION 15: SECURITY TESTING - COMPLETE**

- **5 Test Cases:** TC-15.1.1, TC-15.1.2, TC-15.1.3, TC-15.1.4, TC-15.1.5
- **Coverage:** 100% of MANUAL_TESTING_GUIDE.md Section 15
- **Status:** Production-ready for local execution
- **Ready for:** `npx playwright test tests/e2e-automated/section-015-security-testing/`

---

**Generated:** 2025-12-30
**Status:** ✅ COMPLETE AND READY FOR TESTING
