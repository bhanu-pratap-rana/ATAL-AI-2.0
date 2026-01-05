# Issue Fix Roadmap
## Prioritized Action Plan for Code Quality Improvements

> **Generated:** January 5, 2026  
> **Total Issues:** 639 unique issues  
> **Estimated Total Effort:** 39-51 hours

---

## Priority Levels

- **P0 (Critical):** Must fix before production (34 issues, 6-9 hours)
- **P1 (High):** Should fix before production (162 issues, 20-23 hours)
- **P2 (Medium):** Fix post-launch (204 issues, 8.5-12.5 hours)
- **P3 (Low):** Nice-to-have improvements (294 issues, 4.25-6.25 hours)

---

## P0: Critical Issues (Must Fix Before Production)

### 1. Cognitive Complexity Refactoring (22 CRITICAL issues)

#### Highest Priority Files

**File: `apps/web/src/app/actions/teacher.ts:726`**
- **Complexity:** 49 (target: 15)
- **Effort:** 2-3 hours
- **Action:** Break down into smaller functions
- **Dependencies:** None

**File: `apps/web/src/app/actions/dashboard-stats.ts:338`**
- **Complexity:** 31 (target: 15)
- **Effort:** 1.5-2 hours
- **Action:** Extract helper functions for data processing
- **Dependencies:** None

**File: `apps/web/src/app/actions/admin-management.ts:138`**
- **Complexity:** 29 (target: 15)
- **Effort:** 1.5-2 hours
- **Action:** Split into validation, processing, and response functions
- **Dependencies:** None

**File: `apps/web/src/app/(public)/student/start/page.tsx:36`**
- **Complexity:** 24 (target: 15)
- **Effort:** 1-1.5 hours
- **Action:** Extract form handling logic into custom hooks
- **Dependencies:** None

**File: `apps/web/src/app/(public)/teacher/start/page.tsx:36`**
- **Complexity:** 23 (target: 15)
- **Effort:** 1-1.5 hours
- **Action:** Extract authentication flow into separate functions
- **Dependencies:** None

**File: `apps/web/src/app/actions/school.ts:298`**
- **Complexity:** 24 (target: 15)
- **Effort:** 1-1.5 hours
- **Action:** Break down school creation/update logic
- **Dependencies:** None

**File: `apps/web/src/app/actions/assessment.ts:277`**
- **Complexity:** 21 (target: 15)
- **Effort:** 1 hour
- **Action:** Extract assessment validation and processing
- **Dependencies:** None

**File: `apps/web/src/app/actions/auth.ts:130`**
- **Complexity:** 20 (target: 15)
- **Effort:** 1 hour
- **Action:** Split authentication logic
- **Dependencies:** None

**File: `apps/web/src/app/actions/dashboard-stats.ts:171`**
- **Complexity:** 23 (target: 15)
- **Effort:** 1-1.5 hours
- **Action:** Extract stats calculation logic
- **Dependencies:** None

**File: `apps/web/src/app/app/learn/[moduleId]/[topicId]/page.tsx:56`**
- **Complexity:** 26 (target: 15)
- **Effort:** 1-1.5 hours
- **Action:** Extract learning page logic into hooks
- **Dependencies:** None

**Remaining 12 CRITICAL complexity issues:**
- `admin/manage/page.tsx:18` (Complexity: 17)
- `admin/pins/page.tsx:132` (Complexity: 18)
- `teacher/start/page.tsx:125` (Complexity: 16)
- `assessment.ts:658` (Complexity: 18)
- `school.ts:39` (Complexity: 23)
- `student.ts:258` (Complexity: 16)
- `teacher.ts:358` (Complexity: 21)
- `api/teacher/search-students/route.ts:29` (Complexity: 23)
- `components/admin/DashboardMetrics.tsx:61` (Complexity: 19)
- `components/admin/DashboardMetrics.tsx:97` (Complexity: 17)
- Plus 2 more...

**Total P0 Complexity Effort:** 4-6 hours

---

### 2. Bug Fixes (12 BUG issues)

#### Accessibility Bugs

**File: `apps/web/src/app/(public)/admin/manage/page.tsx`**
- **Lines:** 238, 248
- **Issue:** Missing keyboard listeners for click handlers
- **Fix:** Add `onKeyDown` handlers
- **Effort:** 15 minutes

**File: `apps/web/src/app/global-error.tsx`**
- **Lines:** 99, 103, 123, 126
- **Issue:** `onMouseOver`/`onMouseOut` without `onFocus`/`onBlur`
- **Fix:** Add corresponding focus/blur handlers
- **Effort:** 15 minutes

**File: `apps/web/src/app/offline/page.tsx`**
- **Lines:** 132, 136, 168, 171
- **Issue:** Same as above
- **Fix:** Add focus/blur handlers
- **Effort:** 15 minutes

**File: `apps/web/src/components/ui/markdown-renderer.tsx:117`**
- **Issue:** Table missing header row/column
- **Fix:** Add `<thead>` or scope attributes
- **Effort:** 10 minutes

**File: `apps/web/src/components/ui/table.tsx:10`**
- **Issue:** Table missing header row/column
- **Fix:** Add `<thead>` or scope attributes
- **Effort:** 10 minutes

**Total P0 Bug Fix Effort:** 2-3 hours

---

## P1: High Priority Issues (Should Fix Before Production)

### 1. Type Safety Improvements (158 issues)

#### Replace `any` Types (87 instances)

**File: `apps/web/src/app/actions/admin-metrics.ts`**
- **Count:** 8 instances
- **Action:** Create RPC response type definitions
- **Effort:** 1 hour

**File: `apps/web/src/app/actions/auth.ts`**
- **Count:** 8 instances
- **Action:** Use Zod inferred types for form data
- **Effort:** 1 hour

**File: `apps/web/src/app/actions/teacher.ts`**
- **Count:** 5 instances
- **Action:** Type Map operations explicitly
- **Effort:** 30 minutes

**File: `apps/web/src/app/actions/admin-management.ts`**
- **Count:** 4 instances
- **Action:** Create proper type definitions
- **Effort:** 30 minutes

**File: `apps/web/src/app/actions/school-finder.ts`**
- **Count:** 4 instances
- **Action:** Type search results properly
- **Effort:** 30 minutes

**Remaining files:** 35 files with 1-3 `any` types each
- **Action:** Replace with proper types or `unknown` with type guards
- **Effort:** 1-2 hours

**Total `any` Type Fix Effort:** 4-6 hours

#### Fix Non-null Assertions (61 instances)

**File: `apps/web/src/app/actions/admin-metrics.ts`**
- **Count:** 24 instances
- **Action:** Use discriminated unions (already implemented in `supabase-server.ts`)
- **Effort:** 1 hour

**File: `apps/web/src/lib/offline/sync-queue.ts`**
- **Count:** 10 instances
- **Action:** Add null checks
- **Effort:** 30 minutes

**File: `apps/web/src/app/actions/admin-pin-management.ts`**
- **Count:** 6 instances
- **Action:** Add validation
- **Effort:** 30 minutes

**Remaining files:** 10 files with 1-4 assertions each
- **Action:** Add proper null checks or use optional chaining
- **Effort:** 1 hour

**Total Non-null Assertion Fix Effort:** 2-3 hours

#### Fix Unnecessary Type Assertions (29 instances - SonarQube S4325)

**Files:** `admin-metrics.ts`, `admin-pins/page.tsx`, `admin/dashboard/page.tsx`, etc.
- **Action:** Remove unnecessary `as` assertions
- **Effort:** 30 minutes

**Total Type Safety Effort:** 7-10 hours

---

### 2. Exception Handling (14 issues)

**File: `apps/web/src/app/(public)/teacher/start/page.tsx`**
- **Lines:** 220, 262, 338, 374, 415, 475
- **Issue:** Empty catch blocks
- **Action:** Add error logging or remove try-catch
- **Effort:** 1 hour

**File: `apps/web/src/app/(public)/student/start/page.tsx`**
- **Lines:** 567
- **Issue:** Empty catch block
- **Action:** Add error handling
- **Effort:** 15 minutes

**Remaining files:** 6 more files with empty catch blocks
- **Action:** Add proper error handling
- **Effort:** 1 hour

**Total Exception Handling Effort:** 2-3 hours

---

## P2: Medium Priority Issues (Fix Post-Launch)

### 1. React Best Practices (153 issues)

#### Props Not Read-only (97 instances - S6759)

**Action:** Mark all component props as `readonly`
```typescript
// Before
interface Props {
  name: string;
}

// After
interface Props {
  readonly name: string;
}
```
**Effort:** 2-3 hours (bulk fix)

#### Array Index in Keys (22 instances - S6478)

**Action:** Use stable IDs instead of array indices
**Effort:** 1-2 hours

#### Form Label Association (24 instances - S6853)

**Action:** Associate labels with form controls
**Effort:** 1 hour

#### Missing Keyboard Listeners (10 instances - S1082)

**Action:** Add keyboard event handlers
**Effort:** 30 minutes

**Total React Best Practices Effort:** 4.5-6.5 hours

---

### 2. Modern JavaScript Patterns (69 issues)

#### Prefer `globalThis` over `window` (38 instances - S7764)

**Action:** Replace `window` with `globalThis`
```typescript
// Before
window.location.href

// After
globalThis.location.href
```
**Effort:** 30 minutes (bulk find-replace)

#### Prefer `replaceAll` over `replace` (24 instances - S7781)

**Action:** Use `String.replaceAll()` for global replacements
**Effort:** 30 minutes

#### Prefer Optional Chaining (7 instances - S6582)

**Action:** Use `?.` instead of `&&` chains
**Effort:** 15 minutes

**Total Modern JS Effort:** 1.25 hours

---

### 3. Code Smells (187 issues)

#### Nested Ternaries (45 instances - S3358)

**Action:** Extract to if-else or helper functions
**Effort:** 2-3 hours

#### Unexpected Negated Conditions (37 instances - S7735)

**Action:** Invert conditions for clarity
**Effort:** 1 hour

#### Ambiguous JSX Spacing (35 instances - S6772)

**Action:** Fix JSX spacing issues
**Effort:** 1 hour

#### Unused Imports (12 instances - S1128)

**Action:** Remove unused imports
**Effort:** 15 minutes

**Remaining code smells:** 58 instances
**Effort:** 2-3 hours

**Total Code Smells Effort:** 6.25-8.25 hours

---

### 4. Console Logging (18 instances)

**Files:** `useTimer.ts`, `useValidationHandler.ts`, `password-utils.ts`, `form-handler-factory.ts`
- **Action:** Replace with structured logger
- **Effort:** 30 minutes

---

## P3: Low Priority Issues (Nice-to-Have)

### 1. Code Style Improvements (292 MINOR issues)

- Various code style improvements
- **Effort:** 4-6 hours (can be done incrementally)

### 2. TODOs (2 instances)

- `phone-validation.ts` - 1 TODO
- `masking-utils.ts` - 1 TODO
- **Effort:** 15 minutes

---

## File-by-File Breakdown

### High-Impact Files (Fix First)

#### `apps/web/src/app/actions/teacher.ts`
- **Issues:** 10 (1 CRITICAL complexity: 49)
- **Priority:** P0
- **Effort:** 2-3 hours
- **Actions:**
  1. Refactor function at line 726 (Complexity: 49)
  2. Fix 5 `any` types
  3. Fix 1 complexity issue at line 358

#### `apps/web/src/app/(public)/student/start/page.tsx`
- **Issues:** 26 (1 CRITICAL complexity: 24)
- **Priority:** P0
- **Effort:** 2-3 hours
- **Actions:**
  1. Refactor function at line 36 (Complexity: 24)
  2. Fix multiple code smells
  3. Fix exception handling

#### `apps/web/src/app/(public)/teacher/start/page.tsx`
- **Issues:** 18 (2 CRITICAL complexity: 23, 16)
- **Priority:** P0
- **Effort:** 2-3 hours
- **Actions:**
  1. Refactor functions at lines 36, 125
  2. Fix 6 exception handling issues
  3. Fix multiple code smells

#### `apps/web/src/app/actions/dashboard-stats.ts`
- **Issues:** 2 CRITICAL (Complexity: 31, 23)
- **Priority:** P0
- **Effort:** 2-3 hours
- **Actions:**
  1. Refactor functions at lines 338, 171
  2. Extract helper functions

#### `apps/web/src/app/actions/admin-management.ts`
- **Issues:** 1 CRITICAL (Complexity: 29) + 4 `any` types
- **Priority:** P0
- **Effort:** 2-3 hours
- **Actions:**
  1. Refactor function at line 138
  2. Fix `any` types

---

## Implementation Order

### Week 1: Critical Fixes (P0)
1. Day 1-2: Fix 22 CRITICAL complexity issues (4-6 hours)
2. Day 3: Fix 12 BUG issues (2-3 hours)
3. **Total:** 6-9 hours

### Week 2: High Priority (P1)
1. Day 1-2: Replace 87 `any` types (4-6 hours)
2. Day 3: Fix 14 exception handling issues (2-3 hours)
3. Day 4: Fix 61 non-null assertions (2-3 hours)
4. **Total:** 8-12 hours

### Week 3: Medium Priority (P2)
1. Day 1-2: React best practices (4.5-6.5 hours)
2. Day 3: Modern JS patterns (1.25 hours)
3. Day 4-5: Code smells (6.25-8.25 hours)
4. Day 6: Console logging (30 minutes)
5. **Total:** 12.5-16.5 hours

### Ongoing: Low Priority (P3)
- Fix MINOR issues incrementally
- Address TODOs
- **Total:** 4.25-6.25 hours

---

## Dependencies

### No Dependencies
- All P0 issues can be fixed independently
- All P1 type safety issues can be fixed independently

### Sequential Dependencies
- Fix complexity issues before addressing code smells in same files
- Fix `any` types before fixing non-null assertions (better type inference)

---

## Success Metrics

### Before Fixes
- **Total Issues:** 639
- **CRITICAL:** 22
- **Deployment Readiness:** 78/100

### After P0 Fixes
- **CRITICAL:** 0
- **Deployment Readiness:** 85/100 (estimated)

### After P0 + P1 Fixes
- **High Priority:** 0
- **Deployment Readiness:** 90/100 (estimated)

### After All Fixes
- **Total Issues:** 0
- **Deployment Readiness:** 95/100 (estimated)

---

## Notes

- **Bulk fixes:** Many issues can be fixed with find-replace (e.g., `window` → `globalThis`)
- **Automated fixes:** Some issues can be auto-fixed by ESLint/Prettier
- **Incremental approach:** Fix issues file-by-file to avoid large PRs
- **Testing:** Run tests after each file fix to ensure no regressions

---

**Last Updated:** January 5, 2026  
**Next Review:** After P0 fixes completed

