# E2E Test Improvement Roadmap - ATAL AI

**Goal**: Achieve 95%+ automated test pass rate + Comprehensive manual test checklist
**Timeline**: Parallel with feature development
**Status**: In Progress

---

## Test Classification

### ✅ Fully Automatable Tests (Can be automated)
These tests have all data/logic in code and can be fully tested without external services.

#### Assessment Flow (100% Automatable)
- ✅ AS-004 to AS-013: Question answering, navigation, answer selection
- ✅ AS-018 to AS-022: Question navigation, clear answers, previous button
- ✅ AS-030, AS-031: Assessment submission states
- ✅ AS-041 to AS-044: Summary page elements, retake options
- ✅ AS-070 to AS-073: Accessibility and keyboard navigation
- ✅ AS-074 onwards: Error handling, edge cases

**Why**: All test data exists in database; can create sessions and answer questions programmatically

#### Teacher Class Management (100% Automatable)
- ✅ TF-001 to TF-042: Dashboard, classes, settings, assessments
- ✅ CM-001 to CM-020: Class creation, enrollment, management
- ✅ Invite students, view class details, manage class code

**Why**: All functionality is in-app; test data already exists from auth setup

#### Admin Management (95% Automatable)
- ✅ AF-010 to AF-071: Dashboard, schools, PINs, teachers, admins
- ✅ ADMIN-010 to ADMIN-022: Dashboard metrics, navigation, actions

**Why**: All admin operations are in-app data management

#### Student Dashboard & Features (100% Automatable)
- ✅ SF-001 to SF-042: Dashboard, classes, assessments, settings
- ✅ STUDENT-001 to STUDENT-081: All student page functionality

**Why**: All features accessed post-authentication; no external data needed

#### Notifications, Gamification, Offline Sync (100% Automatable)
- ✅ Send notifications
- ✅ Award badges and points
- ✅ Offline sync operations
- ✅ Cache invalidation

**Why**: All triggered by in-app actions with API calls to Supabase

---

### 🔒 Manual-Only Tests (Cannot be automated)
These tests require human interaction or external email/SMS services.

#### Account Creation & Authentication (Manual Only)
- 🔒 **Signup with Email OTP**
  - Issue: Email is external service (Gmail, Outlook, etc.)
  - Problem: We don't know user's email or OTP
  - Solution: Create test accounts manually during QA
  - Procedure:
    1. Use a test email account (e.g., test-student@gmail.com)
    2. Check Gmail inbox for OTP
    3. Enter OTP in signup form
    4. Verify account created
    5. Store credentials in `.env.local` for other tests

- 🔒 **Password Reset via Email**
  - Issue: Password reset links sent via email
  - Problem: Need to check email and click reset link
  - Solution: Manual email verification during QA
  - Procedure:
    1. Enter email in forgot password
    2. Check email for reset link
    3. Click link and set new password
    4. Verify login works with new password

- 🔒 **Student Joining Class via QR Code**
  - Issue: QR code generation and scanning (external)
  - Problem: Can't programmatically scan QR codes in browser
  - Solution: Manual QR code testing
  - Procedure:
    1. Teacher generates class QR code
    2. Student scans with phone camera/app
    3. Student joins class
    4. Verify student appears in class roster

- 🔒 **Email Notifications to Students**
  - Issue: Emails sent to external email addresses
  - Problem: Can't verify email content without accessing inbox
  - Solution: Manual email verification
  - Procedure:
    1. Trigger action that sends email (e.g., assignment posted)
    2. Check student email inbox
    3. Verify email received with correct content
    4. Verify links/buttons in email work

- 🔒 **SMS/WhatsApp Notifications** (if implemented)
  - Issue: External messaging services
  - Solution: Manual mobile phone testing
  - Procedure:
    1. Trigger notification from dashboard
    2. Check student's phone for SMS/message
    3. Verify message content and links

---

### 🟡 Hybrid Tests (Mostly automated, some manual steps)
These can be mostly automated but may have manual verification steps.

#### OTP Login Flow
- 🟡 **What can be automated**:
  - Navigate to login page ✅
  - Fill email ✅
  - Click "Send OTP" ✅
  - Verify "Check your email" message ✅

- 🟡 **What must be manual**:
  - Actually receiving the OTP ❌
  - Entering the real OTP ❌
  - Verifying successful login ✅ (can be automated once OTP entered)

- **Solution**: Pre-create test accounts during setup, store credentials in `.env.local`

---

## Test Improvement Plan

### Phase 1: Quick Wins (3-4 hours)
Fix high-impact failures that affect multiple tests

#### 1.1 Fix Assessment Tests Selectors
**Current Issue**: Tests use overly broad regex patterns
**Files to Fix**: `tests/flows/assessment-flow.spec.ts`

```typescript
// ❌ BAD - Too broad
const hasAssessment = await page.getByText(/Assessment|Start|Begin/i).isVisible()

// ✅ GOOD - Specific role
const startButton = page.getByRole('button', { name: 'Start Assessment' })
```

**Impact**: Fixes ~15 tests

**Tasks**:
- [ ] Replace text-matching with role-based selectors
- [ ] Add explicit `waitForLoadState('networkidle')` after navigation
- [ ] Add 10000ms timeout for async operations
- [ ] Fix "Question X of Y" detection (query actual element structure)

#### 1.2 Fix Admin Page Selectors
**Current Issue**: Admin UI changed; test selectors don't match
**Files to Fix**: `tests/flows/admin-flow.spec.ts`, `tests/functional/admin-complete.spec.ts`

**Impact**: Fixes ~30 tests (biggest win!)

**Tasks**:
- [ ] Inspect actual admin dashboard HTML
- [ ] Update selectors to match current UI structure
- [ ] Use role-based selectors instead of text matching
- [ ] Add proper wait states

#### 1.3 Add Async Waits to All Tests
**Current Issue**: Tests run assertions before page fully loads
**Files to Fix**: All test files

**Impact**: Fixes ~20 tests

**Tasks**:
- [ ] Add `await page.waitForLoadState('networkidle')` after every `page.goto()`
- [ ] Increase expect timeouts from 5000ms to 10000ms
- [ ] Use `waitForSelector` for dynamic content

**Script to Apply**:
```bash
# Find all test files missing networkidle waits
grep -r "await page.goto" tests/ --include="*.spec.ts" | grep -v "waitForLoadState"
```

### Phase 2: Medium Complexity (5-6 hours)
Fix remaining test issues

#### 2.1 Fix Mobile/Responsive Tests
**Current Issue**: Desktop selectors don't work on mobile layout
**Solution**: Use responsive-aware selectors or create mobile-specific tests

**Options**:
- Option A: Create separate `tests/mobile/` directory with mobile-specific tests
- Option B: Use viewport-aware selectors in existing tests
- Option C: Create helper function to adjust selectors based on viewport

**Recommended**: Option A (cleanest, most maintainable)

**Tasks**:
- [ ] Create `tests/mobile/mobile-navigation.spec.ts`
- [ ] Create `tests/mobile/mobile-forms.spec.ts`
- [ ] Create `tests/mobile/mobile-assessments.spec.ts`
- [ ] Remove mobile tests from desktop test files

#### 2.2 Fix Navigation/Parameter Issues
**Current Issue**: Tests navigate to pages without required parameters
**Example**:
```typescript
// ❌ BAD - Summary page requires session ID
await page.goto('/app/assessment/summary')

// ✅ GOOD - Include session ID
const sessionId = await startAssessment(page)
await page.goto(`/app/assessment/summary?session=${sessionId}`)
```

**Tasks**:
- [ ] Identify all tests that navigate without proper params
- [ ] Create helper functions to generate required params
- [ ] Update test navigation logic

#### 2.3 Fix Form Input Selectors
**Current Issue**: Form input selectors have changed or use wrong patterns
**Files**: Teacher registration, admin creation, class creation tests

**Tasks**:
- [ ] Use `getByLabel()` for form inputs instead of text matching
- [ ] Use placeholder matching: `getByPlaceholder(/email/i)`
- [ ] Add data-testid to critical form elements

### Phase 3: Manual Test Documentation (2-3 hours)
Create comprehensive manual test checklist

#### 3.1 Create Manual Test Checklist
**File**: `QA_MANUAL_TEST_CHECKLIST.md`

**Sections**:
- Account Creation & Email OTP
- Password Reset
- Student QR Code Join
- Email Notifications
- Admin PIN Rotations
- Teacher Onboarding

#### 3.2 Create Test Data Setup Guide
**File**: `TEST_DATA_SETUP_GUIDE.md`

**Contents**:
- How to create test accounts
- Where to store test credentials
- How to set up test email accounts
- How to run manual tests

#### 3.3 Create Test Maintenance Guide
**File**: `TEST_MAINTENANCE.md`

**Contents**:
- How to run full test suite
- How to run specific test projects
- How to debug failing tests
- How to add new tests

---

## Current Status & Metrics

### Test Pass Rate by Project
| Project | Current | Target | Gap |
|---------|---------|--------|-----|
| chromium-student | 82.1% | 95% | +12.9% |
| chromium-teacher | 95.0% | 98% | +3% |
| chromium-admin | 76.9% | 95% | +18.1% |
| mobile-chrome | 89.2% | 90% | +0.8% |
| tablet | 87.4% | 90% | +2.6% |
| **Overall** | **84.0%** | **95%** | **+11%** |

### Test Failure Breakdown
```
Total: 96 failures
├─ Assessment tests: 14 failures (15%)
├─ Student tests: 4 failures (4%)
├─ Teacher tests: 7 failures (7%)
├─ Admin tests: 30 failures (31%) ⚠️ HIGHEST IMPACT
├─ Mobile tests: 14 failures (15%)
├─ Tablet tests: 15 failures (16%)
└─ Other: 12 failures (12%)
```

---

## Implementation Order (By Impact)

### Priority 1: Highest Impact (Fix 30+ tests)
1. Fix admin page selectors (~30 failures fixed)
2. Add missing async waits (~20 failures fixed)
3. Fix assessment test selectors (~15 failures fixed)

**Expected Result**: 84% → 88% pass rate

### Priority 2: Medium Impact (Fix 15+ tests)
4. Fix mobile/responsive tests (~15 failures fixed)
5. Fix navigation/parameter issues (~10 failures fixed)

**Expected Result**: 88% → 92% pass rate

### Priority 3: Final Polish (Fix <10 tests)
6. Fix remaining edge cases (~5 failures fixed)
7. Add manual test documentation

**Expected Result**: 92% → 96%+ pass rate

---

## Quick Fix Commands

### Command 1: Find tests with missing waits
```bash
grep -r "await page.goto" apps/web/tests --include="*.spec.ts" -A 2 | grep -v "waitForLoadState" | head -20
```

### Command 2: Run specific test project
```bash
npm run test:e2e:admin      # Run admin tests only
npm run test:e2e:assessment # Run assessment tests only
npm run test:e2e:student    # Run student tests only
```

### Command 3: Run and update tests
```bash
npm run test:e2e -- --update-snapshots  # Update visual snapshots
npm run test:e2e -- --debug             # Debug failing test
npm run test:e2e -- --headed            # Show browser window
```

---

## Team Responsibilities

### Automated Tests
- **Owner**: Claude Code / QA Engineer
- **Frequency**: Run every commit (CI/CD)
- **Target**: 95%+ pass rate
- **Effort**: ~1-2 days to fix all remaining issues

### Manual Tests
- **Owner**: QA Team / Product Manager
- **Frequency**: Before each release
- **Checklist**: See `QA_MANUAL_TEST_CHECKLIST.md`
- **Effort**: ~4-6 hours per release

### Feature Testing
- **Owner**: Developer + QA Team
- **Frequency**: During feature development
- **Method**: Manual testing + new automated tests
- **Effort**: Integrated with development

---

## Success Criteria

✅ **Automated Tests**
- 95%+ pass rate across all projects
- <5 failures in full test suite
- All selectors use role-based matching
- All tests have proper async waits
- Mobile tests isolated from desktop tests

✅ **Manual Tests**
- Comprehensive checklist created
- All manual test cases documented
- Test data setup guide created
- Team trained on manual testing

✅ **Maintenance**
- Test maintenance guide created
- Tests updated when UI changes
- New tests added for new features
- Test failures reviewed weekly

---

## Timeline

### Week 1 (This week)
- [ ] Fix admin page selectors (Priority 1)
- [ ] Add async waits to all tests (Priority 1)
- [ ] Fix assessment selectors (Priority 1)
- **Expected**: 84% → 88% pass rate

### Week 2
- [ ] Fix mobile/responsive tests (Priority 2)
- [ ] Fix navigation issues (Priority 2)
- [ ] Create manual test checklist (Priority 3)
- **Expected**: 88% → 92% pass rate

### Week 3
- [ ] Fix remaining edge cases (Priority 3)
- [ ] Create test documentation (Priority 3)
- [ ] Train team on testing
- **Expected**: 92% → 96%+ pass rate

---

## Resources

### Documentation to Create
- [ ] `QA_MANUAL_TEST_CHECKLIST.md` - Manual test procedures
- [ ] `TEST_DATA_SETUP_GUIDE.md` - How to set up test data
- [ ] `TEST_MAINTENANCE.md` - How to maintain tests

### Tools Needed
- Test email account (e.g., test-student@gmail.com)
- Mobile device/emulator for QR code testing
- Playwright Inspector for debugging: `npx playwright install --with-deps && npx playwright test --debug`

### Helpful Playwright Features
```bash
# Show UI while tests run
npm run test:e2e:headed

# Debug single test
npm run test:e2e -- --debug tests/flows/assessment-flow.spec.ts

# Generate trace for failed test
npm run test:e2e -- --trace on

# Update visual snapshots
npm run test:e2e -- --update-snapshots
```

---

## Success Metrics Dashboard

```
Current State (12/31/2025):
├─ Automated Tests: 84% pass (501/597)
├─ Manual Tests: 0% documented (needs creation)
├─ Code Quality: A+ (rate limiting, types, error handling working)
└─ Configuration: ✅ Working (multi-project setup correct)

Target State (01/14/2026):
├─ Automated Tests: 95%+ pass (565+/597)
├─ Manual Tests: 100% documented (comprehensive checklist)
├─ Code Quality: A+ (maintained)
└─ Configuration: ✅ Working (no changes needed)

Effort: ~15-20 hours over 2 weeks
ROI: 100+ test fixes + comprehensive documentation
```

---

## Next Steps

1. **Start immediately**: Fix admin page selectors (30 tests fixed)
2. **Then**: Add async waits throughout (20 tests fixed)
3. **Then**: Fix assessment selectors (15 tests fixed)
4. **In parallel**: Create manual test documentation
5. **Final**: Fix mobile/responsive tests and edge cases

---

**Status**: Ready to implement
**Owner**: Claude Code
**Start Date**: Immediately (parallel with feature development)
**Target Completion**: January 14, 2026 (2 weeks)
