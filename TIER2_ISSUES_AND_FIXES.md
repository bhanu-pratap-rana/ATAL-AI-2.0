# TIER 2 Test Execution - Issues & Fixes

**Date**: 2025-12-30  
**Status**: Analysis Complete - Ready for Implementation

---

## Issue Analysis

### Section 3: Teacher Pages - Root Cause Identified ✅

**Problem**: Tests navigate to `/auth/signin` which doesn't exist or has different form structure

**Evidence**: 
- Tests try to access `/auth/signin` 
- Actual teacher flow is at `/teacher/start`
- Teacher start page uses state-based form switching

**Error**:
```
TimeoutError: locator.fill: Timeout 10000ms exceeded.
Call log: waiting for locator('input[type="email"]').first()
```

---

## Recommended Fixes

### Fix 1: Update Navigation Routes

**Current** (FAILING):
```typescript
await page.goto(`${BASE_URL}/auth/signin`);
const emailInput = page.locator('input[type="email"]').first();
```

**Recommended** (SHOULD FIX):
```typescript
// For teacher signin - navigate to teacher start page
await page.goto(`${BASE_URL}/teacher/start`);

// Click "Sign In" to switch to login step
const signInBtn = page.locator('button:has-text("Sign In")').first();
await signInBtn.click();

// Fill teacher credentials
const emailInput = page.locator('input[placeholder*="email" i]');
const passwordInput = page.locator('input[placeholder*="password" i]');
```

**Alternative** (Using authenticated state):
If tests should access logged-in pages, use the pre-authenticated teacher session:
```typescript
// Use teacher auth context from playwright.config.ts
// Navigate directly to: `/app/teacher/classes` or `/app/teacher/dashboard`
await page.goto(`${BASE_URL}/app/teacher/classes`);
```

---

## Implementation Approach

### Option A: Use Pre-Authenticated Sessions (RECOMMENDED)
**Advantage**: Faster tests, don't need to re-login every time  
**Implementation**: 
- Global setup already creates teacher auth state in `playwright/.auth/teacher.json`
- Tests can use this without logging in manually

**Code**:
```typescript
test('TC-3.1.1: Dashboard Load', async ({ page, context }) => {
  // Navigate directly to teacher page (already authenticated)
  await page.goto(`${BASE_URL}/app/teacher/dashboard`);
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  
  // Verify teacher dashboard loaded
  const dashboardTitle = page.locator('h1:has-text("Dashboard")');
  await expect(dashboardTitle).toBeVisible();
});
```

### Option B: Login Fresh Every Test (SLOWER)
**Advantage**: Tests login flow independently  
**Implementation**: Use `/teacher/start` route with step-based form

---

## Files That Need Updates

### Section 3 Files:
1. `tests/e2e-automated/section-003-teacher-pages/001-teacher-dashboard.spec.ts`
   - Lines 153-165: Update navigation and selectors
   - Lines 179: Verify route exists

2. `tests/e2e-automated/section-003-teacher-pages/002-teacher-class-management.spec.ts`
   - Similar fixes needed for all tests

### Section 4 Files:
1. `tests/e2e-automated/section-004-admin-pages/`
   - Similar pattern for admin pages

---

## Suggested Implementation Steps

### Step 1: Fix Section 3
- [ ] Update navigation routes (Option A recommended)
- [ ] Update element selectors
- [ ] Re-run Section 3 tests
- [ ] Verify pass rate improves to 100%

### Step 2: Apply Pattern to Section 4
- [ ] Update admin page navigation
- [ ] Update admin page selectors
- [ ] Run Section 4 tests

### Step 3: Check Sections 5-17
- [ ] Run quick test on each section
- [ ] Document any similar issues
- [ ] Fix as needed

---

## Quick Reference: Route Mappings

**Teacher Flows**:
- Public Signin: `/teacher/start` (state-based form)
- Teacher Dashboard: `/app/teacher/classes` or `/app/teacher/dashboard`
- Teacher Assessments: `/app/teacher/assessments`

**Admin Flows**:
- Admin Signin: `/admin/start` (likely similar to teacher)
- Admin Dashboard: `/app/admin/dashboard`

**Student Flows** (Already Fixed in TIER 1):
- Public Signup: `/student/start` (state-based form)
- Student Dashboard: `/app/student/classes` or `/app/dashboard`

---

## Next Steps

1. **Immediate**: Choose Option A or Option B for implementation
2. **Quick Fix**: Update Section 3 files with correct routes/selectors
3. **Validation**: Run Section 3 tests again
4. **Rollout**: Apply pattern to remaining sections
5. **Report**: Generate TIER 2 final report with results

---

**Recommendation**: Use Option A (Pre-authenticated sessions) for faster, more stable tests.

