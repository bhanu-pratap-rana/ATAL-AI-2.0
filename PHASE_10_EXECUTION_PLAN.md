# Phase 10 Execution Plan - Detailed Strategy

**Date**: 2026-01-09
**Approach**: Risk-Based Remediation (Strategy B)
**Target**: 135 issues in 25-35 hours

---

## High-Level Strategy

Rather than manually fixing each issue one-by-one, we'll use a combination of:
1. **Pattern-based fixes** - Write fixes that apply to multiple similar files
2. **Automated batch operations** - Use scripts to fix categories of issues
3. **Manual targeted fixes** - Handle complex cases manually

---

## Phase 10.1: Quick Wins (50 issues, 2-3 hours)

### S6582: Optional Chaining (16 issues)
**Pattern**: `obj && obj.prop` → `obj?.prop`

**Automated Approach**:
```bash
# Find all instances
grep -rn "&&\s*\w\+\s*\." src --include="*.ts"

# Create sed script to replace common patterns
```

**Manual files to check**:
- apps/web/src/app/(public)/join/page.tsx:519
- apps/web/src/app/actions/assessment/adaptive-selection.ts:185
- apps/web/src/app/actions/school/teacher-verification.ts:329

---

### S6606: Nullish Coalescing (12 issues)
**Pattern**: `value !== null ? value : default` → `value ?? default`

**Automated Approach**:
```bash
# Find ternary with null checks
grep -rn "!== null\s*?" src --include="*.ts"
grep -rn "== null\s*?" src --include="*.ts"
```

---

### S4619: includes() vs indexOf (5 issues)
**Pattern**: `arr.indexOf(x) !== -1` → `arr.includes(x)`

**Automated Approach**:
```bash
grep -rn "indexOf.*!==" src --include="*.ts" | head -10
# Then replace manually or with script
```

---

### S3799: Empty Object Patterns (5 issues)
**Pattern**: `const {} = obj;` (destructuring nothing)

**Manual Fix**: Remove empty destructuring patterns

---

## Phase 10.2: Accessibility (70 issues, 6-7 hours)

### S6853: Form Label Association (35 issues)
**Issue**: `<label>` without `htmlFor` or `<label htmlFor>` without matching input id

**Files with issues**:
- apps/web/src/app/(public)/admin/pins/page.tsx
- apps/web/src/app/app/settings/page.tsx
- apps/web/src/components/settings/StudentProfileEditor.tsx
- apps/web/src/components/settings/TeacherProfileEditor.tsx
- + 31 more

**Pattern**:
```tsx
// BEFORE:
<label>Email</label>
<input value={email} />

// AFTER:
<label htmlFor="email-input">Email</label>
<input id="email-input" value={email} />
```

**Strategy**:
1. Identify all `<label>` tags
2. Check if they have `htmlFor` attribute
3. If not, add `htmlFor={id}` and matching `id` on input

---

### S6819: Replace ARIA Roles (20 issues)
**Issue**: Using ARIA roles instead of native HTML elements

**Pattern**:
```tsx
// BEFORE:
<div role="button" onClick={handleClick}>Click</div>

// AFTER:
<button onClick={handleClick}>Click</button>
```

**Files**: QuestionPagination, BadgesDisplay, and other interactive components

---

### S6850: Heading Hierarchy (15 issues)
**Issue**: Invalid heading levels (e.g., h1 → h3 without h2)

**Pattern**:
```tsx
// BEFORE:
<h1>Title</h1>
<h3>Subtitle</h3>

// AFTER:
<h1>Title</h1>
<h2>Subtitle</h2>
```

---

## Phase 10.3: Pattern Fixes (30 issues, 3-4 hours)

### S3358: Nested Ternary Operators (22 issues)
**Pattern**: Extract nested ternary into helper function

```ts
// BEFORE:
const status = isActive ? "active" : isPending ? "pending" : "inactive";

// AFTER:
function getStatus(isActive, isPending) {
  if (isActive) return "active";
  if (isPending) return "pending";
  return "inactive";
}
const status = getStatus(isActive, isPending);
```

---

### S6479: Array Index in Keys (8 issues)
**Pattern**: Replace array indices with stable IDs

```tsx
// BEFORE:
{items.map((item, index) => <div key={index}>{item}</div>)}

// AFTER:
{items.map((item) => <div key={item.id}>{item}</div>)}
```

---

## Phase 10.4: CRITICAL Complexity (15 issues, 12-15 hours)

### S3776: Cognitive Complexity > 15
**Files** (by complexity):
1. gamification-service.ts:168 - Complexity 28 (Extract switch cases)
2. sync-queue.ts:168 & :253 - Complexity 16 (Extract pattern)
3. supabase-pagination.ts:119 - Complexity 18 (Break into smaller functions)
4. admin/manage/page.tsx:27 - Complexity 17 (Extract helper functions)
5. admin/pins/page.tsx - Complexity 18 (Simplify conditionals)
6. student/start/page.tsx:95 - Complexity 24 (Extract main logic)
7. useTeacherOnboarding.ts:439 - Complexity 16 (Break into hooks)
8. DashboardMetrics.tsx:124 - Complexity 16 (Extract render helpers)
9. + 7 more (Complexity 16-20)

**Approach**: Refactor each function by:
1. Extracting helper functions
2. Breaking switch statements into separate methods
3. Simplifying nested conditionals
4. Using early returns to reduce nesting depth

---

## Estimated Effort Breakdown

### Quick Wins (50 issues):
- S6582 (16 issues): 30 min
- S6606 (12 issues): 15 min
- S4619 (5 issues): 10 min
- S3799 (5 issues): 15 min
- S1854 (6 issues): 10 min
- S7721 (6 issues): 30 min
- **Total: 2-3 hours**

### Accessibility (70 issues):
- S6853 (35 issues): 3-4 hours (5 min each)
- S6819 (20 issues): 2-3 hours (5-10 min each)
- S6850 (15 issues): 1-2 hours (5 min each)
- **Total: 6-7 hours**

### Pattern Fixes (30 issues):
- S3358 (22 issues): 1.5-2 hours (5 min each)
- S6479 (8 issues): 45 min (5 min each)
- **Total: 2.5-3 hours**

### Complexity Reduction (15 issues):
- gamification-service.ts: 2-3 hours
- sync-queue.ts: 1-2 hours
- supabase-pagination.ts: 1.5 hours
- admin/manage/page.tsx: 1.5 hours
- admin/pins/page.tsx: 1.5 hours
- student/start/page.tsx: 2 hours
- useTeacherOnboarding.ts: 1.5 hours
- DashboardMetrics.tsx: 1 hour
- Other (7 issues): 3 hours
- **Total: 15-18 hours** (higher than estimated due to complexity)

### Phase 11: Auto-fixable (200 issues):
- S6759 (50): 3-4 hours
- S7764 (58): 2 hours
- S7781 (66): 3-4 hours
- S7718 (21): 20 min
- Other (5): 1-2 hours
- **Total: 10-12 hours**

---

## Execution Sequence

### Step 1: Quick Wins (Start NOW) - 2-3 hours
1. Review/fix each quick win category
2. Build verification
3. Commit: "fix: Quick wins batch - 50 issues (S6582, S6606, S4619, S3799)"

### Step 2: Accessibility (Next) - 6-7 hours
1. Fix form labels first (most files)
2. Then replace ARIA roles
3. Finally fix heading hierarchy
4. Build verification after each sub-batch
5. Commit: "fix: Accessibility batch - 70 issues (S6853, S6819, S6850)"

### Step 3: Pattern Fixes - 2.5-3 hours
1. Extract nested ternaries
2. Fix array keys
3. Build verification
4. Commit: "refactor: Pattern fixes - 30 issues (S3358, S6479)"

### Step 4: Complexity Reduction - 15-18 hours
1. Handle largest file first (gamification-service.ts)
2. One file per commit for traceability
3. Build verification after each
4. Multiple commits: "refactor: Reduce complexity in {file}"

### Step 5: Auto-fixable Batch (If time) - 10-12 hours
1. Create batch scripts
2. Run replacements
3. Verify changes
4. Single commit: "fix: Auto-fixable MINOR violations - 200 issues"

---

## Success Criteria

After Phase 10 completion:
- [ ] 135 issues fixed (50+70+30+15 = 165, but some overlap possible)
- [ ] Build passing ✅
- [ ] TypeScript: zero errors
- [ ] ESLint: clean
- [ ] All commits with clear messages
- [ ] ~35-40 total commits (small focused commits)

---

## Reality Check

### Time vs Effort
- Quick wins: Very efficient (2-3 min per issue average)
- Accessibility: Moderate efficiency (5-10 min per issue average)
- Pattern fixes: Moderate efficiency (5-10 min per issue average)
- Complexity: Lower efficiency (45-60 min per issue average)
- Auto-fixable: High efficiency (2-3 min per issue average)

### Total Time: 25-40 hours (within our estimate of 25-35 hours)

### Next Work After This Phase
- Phase 11: MINOR auto-fixes (200 issues, 10-12 hours)
- Phase 12: Manual MINOR review (68 issues, 10-15 hours)
- Remaining: 500+ other code smells (future sprints)

---

**Status**: ✅ Plan Ready - Ready to Execute Step 1 (Quick Wins)

Do you want me to proceed with Step 1 now?
