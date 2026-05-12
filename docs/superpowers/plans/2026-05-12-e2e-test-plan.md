# Atal AI End-to-End Test Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a regression suite that proves every user-visible feature works for each of the 4 roles (Student, Teacher, Admin, Super-admin), with RLS isolation verified across roles.

**Architecture:** Three layers — (1) **Playwright E2E** for full-stack user flows, (2) **Jest API tests** for protected routes & RLS, (3) **DB seed fixtures** so tests are deterministic and reset cleanly. Tests run in order: seed → unit → API → E2E → teardown.

**Tech Stack:** Playwright 1.56, Jest 30, Supabase test instance (separate from production), `@snaplet/copycat` for deterministic test data, MSW for outbound API mocks (Gemini/Google TTS).

---

## Current Production State (as of audit, 2026-05-12)

Captured via Supabase MCP — informs which scenarios are stress-tested vs greenfield:

| Role (`app_metadata.role`) | Users | Active 30d | Confirmed | Notes |
|---|---|---|---|---|
| `unknown` (no role set) | 32 | 0 | 32 | Pre-role-system test/seed users; should have been students. Migration to set roles is a separate workstream. |
| `teacher` | 3 | 0 | 3 | Small real user base. Test data dominates. |
| `super_admin` | 1 | 0 | 1 | Single super-admin per the bootstrap pattern. |
| `admin` | 0 | — | — | None promoted yet. Test suite must validate the `setAdminRole` flow. |

**Implications for the plan:**
1. Bootstrap test must seed each role from scratch — production has too few users to test against.
2. The 32 "unknown" users are a real-world risk: any feature that reads `app_metadata.role` and expects `student` will skip them. A test should cover the unknown-role fallback path.
3. Zero active-30d signals no recent QA. This plan is the first formal regression net.

---

## Test Pyramid Summary

| Layer | Count target | Coverage |
|---|---|---|
| Unit (Jest) | ~150 tests | Pure logic: validators, formatters, IRT math, rate-limit configs, t() helper, moderation rules. Already at 84 from sub05. |
| API / Action (Jest + Supabase test client) | ~60 tests | Each route handler, each server action, each RPC. Auth gate + happy path + error path + RLS isolation. |
| E2E (Playwright) | ~40 specs | Full user journeys per role. Already 12 specs from prior work (auth, lesson play, offline). |

**Pass criteria for shipping a feature**: at least 1 happy-path Playwright spec + at least 2 API tests (auth + happy path). RLS-sensitive routes need a 3rd test proving cross-tenant isolation.

---

## Cross-cutting Rules

1. **Branch**: `test/e2e-suite`. One PR per major test file or seed module.
2. **PR size**: ≤ 7 files, ≤ 500 lines (per project CLAUDE.md).
3. **Test isolation**: each test creates the users it needs via factories (`__tests__/factories/`). No reliance on residual DB state.
4. **Seed reset**: every Playwright run begins by calling a `reset-test-db.sh` that truncates non-system tables and re-seeds baseline curriculum. NEVER runs against prod (guarded by `NEXT_PUBLIC_SUPABASE_URL` whitelist).
5. **Mocked externals**: Gemini/Google TTS responses are mocked via MSW. Real AI calls only in a nightly job, not per-PR.
6. **No real PII**: factories generate fake names, emails, phone numbers via `@snaplet/copycat`.

---

# Sub-Plan A: Foundation (must land first)

## Task A1: Test-DB seed + reset script

**Files:**
- Create: `apps/web/scripts/reset-test-db.ts`
- Create: `apps/web/scripts/seed-test-db.ts`
- Modify: `apps/web/package.json` (add `test:seed`, `test:reset` scripts)

- [ ] **Step 1**: `reset-test-db.ts` truncates these tables (in FK order): `assessment_responses`, `assessment_sessions`, `ai_tutor_interactions`, `student_knowledge_state`, `learning_style_profile`, `formative_responses`, `summative_results`, `student_badges`, `points_history`, `announcement_reads`, `class_announcements`, `class_materials`, `enrollments`, `classes`, `student_profiles`, `teacher_profiles`, `school_staff_credentials`, `schools`. Hard-coded prod URL whitelist; aborts if `NEXT_PUBLIC_SUPABASE_URL` matches prod.

- [ ] **Step 2**: `seed-test-db.ts` creates:
  - 1 school: `seed-school-1` with active PIN `123456`
  - 1 super_admin: `superadmin@test.atal`
  - 1 admin: `admin@test.atal`
  - 2 teachers: `teacher1@test.atal` (with class) and `teacher2@test.atal` (without class, for empty-state tests)
  - 1 class: `Class-1A` owned by teacher1, code `TEST01`
  - 3 students: `student1@test.atal` (enrolled in Class-1A), `student2@test.atal` (also enrolled), `student3@test.atal` (not enrolled — for empty-state tests)
  - Baseline curriculum: 1 module with 2 topics (en/hi/as content)

- [ ] **Step 3**: `npm run test:seed` works against local Supabase. Verify with `select count(*) from user_profiles` returning 7.

- [ ] **Step 4**: Commit `test(seed): test-DB reset + deterministic seed for 4 roles`

---

## Task A2: Role auth fixture for Playwright

**Files:**
- Create: `apps/web/tests/fixtures/auth.ts`
- Create: `apps/web/tests/fixtures/global-setup.ts`

- [ ] **Step 1**: Auth fixture exports `loginAs(page, role)` that POSTs credentials and stores the resulting Supabase session in `page.context().storageState`. Saved to disk for re-use across specs (per Playwright best practice).

```typescript
import { test as base, expect } from "@playwright/test";

type Role = "student" | "teacher" | "admin" | "super_admin";

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  student:     { email: "student1@test.atal",   password: "TestPass1!" },
  teacher:     { email: "teacher1@test.atal",   password: "TestPass1!" },
  admin:       { email: "admin@test.atal",      password: "TestPass1!" },
  super_admin: { email: "superadmin@test.atal", password: "TestPass1!" },
};

export const test = base.extend<{ loginAs: (role: Role) => Promise<void> }>({
  loginAs: async ({ page }, use) => {
    await use(async (role) => {
      const c = CREDENTIALS[role];
      await page.goto("/student/start"); // or correct entry per role
      await page.getByLabel(/email/i).fill(c.email);
      await page.getByLabel(/password/i).fill(c.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/(app|admin)\//);
    });
  },
});
```

Adapt selectors to actual UI. Use `storageState` reuse for speed.

- [ ] **Step 2**: `global-setup.ts` calls reset+seed before the whole run.

- [ ] **Step 3**: Commit.

---

# Sub-Plan B: Authentication & Role Gating (4 specs)

Each tests login + logout + role-redirect for one role.

## Task B1: Student auth E2E

**File:** `apps/web/tests/e2e/auth/student.spec.ts`

Scenarios (each = one `test()` block):
1. Sign up with class code → lands on dashboard
2. Sign in with valid email/password → lands on `/app/dashboard`
3. Sign in with wrong password → error toast
4. Forgot password → OTP email sent (assert via API spy)
5. Already logged in → visiting `/student/start` redirects to dashboard
6. Tries to visit `/app/teacher/dashboard` → redirected (role guard)
7. Tries to visit `/admin/*` → redirected

## Task B2: Teacher auth E2E

**File:** `apps/web/tests/e2e/auth/teacher.spec.ts`

Scenarios:
1. Sign up with school PIN `123456` → enters profile step
2. Sign in → lands on `/app/teacher/dashboard`
3. Wrong PIN → error, no profile created
4. Forgot password → OTP flow
5. Tries to visit `/app/student/dashboard` → redirected? (Or shared?) — check actual behaviour.
6. Tries to visit `/admin/*` → redirected

## Task B3: Admin auth E2E

**File:** `apps/web/tests/e2e/auth/admin.spec.ts`

Scenarios:
1. Sign in to `/admin/login` → lands on `/admin/dashboard` (or `/admin/pins` per role check)
2. Wrong password → 401, stays on login
3. Visits `/admin/admins` → redirected to `/admin/pins` (regular admin can't manage admins)
4. Tries to visit `/app/teacher/*` → redirected to admin home
5. Logout → cleared session

## Task B4: Super-admin auth E2E

**File:** `apps/web/tests/e2e/auth/super-admin.spec.ts`

Scenarios:
1. Sign in → lands on `/admin/dashboard` with `/admin/admins` accessible
2. Visits `/admin/admins` → list of admins renders (must include `admin@test.atal`)
3. Promotes a teacher to admin via UI → assert next login lands on `/admin/*`
4. Demotes admin back → re-test

---

# Sub-Plan C: Student Features E2E (12 specs)

Each scenario assumes pre-seeded student `student1@test.atal` enrolled in `Class-1A`.

## Task C1: Dashboard rendering

**File:** `apps/web/tests/e2e/student/dashboard.spec.ts`

Scenarios:
1. Stats cards show 0 for fresh student (no completed assessments)
2. After mock-completing 1 lesson via seeded data, "Avg Score" card updates
3. Pre-assessment CTA visible if not done; dismissed state persists via localStorage
4. Hindi language switch updates all dashboard labels (verify 5 labels translated)

## Task C2: Module & topic navigation

**File:** `apps/web/tests/e2e/student/learn.spec.ts`

Scenarios:
1. `/app/learn` lists seeded module
2. Click module → see topic list with progress bars
3. Locked topic shows lock icon and disabled state
4. Click unlocked topic → lesson player loads
5. Empty curriculum (delete seed for one student) → empty state shown

## Task C3: Lesson player

**File:** `apps/web/tests/e2e/student/lesson-player.spec.ts`

Scenarios:
1. Lesson chunks render in order (concept → example → practice → checkpoint)
2. Checkpoint correct answer advances lesson
3. Checkpoint wrong answer shows feedback, doesn't advance
4. Language switch mid-lesson re-fetches (verify network call)
5. Image alt text uses translated fallback when `visualDescription` missing

## Task C4: AI Tutor chat

**File:** `apps/web/tests/e2e/student/ai-tutor.spec.ts`

Scenarios (with MSW mocked Gemini responses):
1. Send text message → streamed response renders
2. Switch to voice input → recording UI shown
3. Switch language to Hindi mid-conversation → next response in Hindi
4. Send disallowed content (test moderation regex) → blocked response from server
5. Rate limit: spam 15 messages → 429 toast appears
6. `onFinish` moderation triggers log entry (intercept via API spy)

## Task C5: Voice TTS + STT

**File:** `apps/web/tests/e2e/student/voice.spec.ts`

Scenarios (MSW mocks Google Cloud TTS):
1. Click TTS on a lesson chunk → audio element receives Base64
2. Assamese TTS → fallback notice visible
3. STT button → mock recognition result populates input
4. Network failure on TTS → graceful error toast, lesson continues

## Task C6: Assessment runner

**File:** `apps/web/tests/e2e/student/assessment.spec.ts`

Scenarios:
1. Start pre-assessment → 5 questions render
2. Answer all correctly → score 100%, badge awarded
3. Answer with focus blur (alt-tab) → blur count increments
4. Submit → results page shows breakdown
5. IRT engine: hardest item should appear only after 3 correct in a row (mock the bank)

## Task C7: Gamification

**File:** `apps/web/tests/e2e/student/gamification.spec.ts`

Scenarios:
1. Lesson completion awards points (verify points_history insert)
2. Points history page shows entries with relative timestamps
3. Badge unlock triggers toast + appears on dashboard
4. Streak increments on consecutive-day activity (manipulate seed timestamps)
5. Class leaderboard ranks student1 above student2 after extra points

## Task C8: Class membership

**File:** `apps/web/tests/e2e/student/classes.spec.ts`

Scenarios:
1. `/app/student/classes` lists Class-1A
2. Join new class via code → enrollment row created
3. Wrong code → error toast
4. Class detail page shows teacher info + announcements + materials
5. Announcement read receipt inserted on view

## Task C9: Offline / PWA sync

**File:** `apps/web/tests/e2e/student/offline-sync.spec.ts`

Scenarios:
1. Go offline (page.context().setOffline(true)) → submit lesson result → queued in IndexedDB
2. Go online → queue replays via `/api/progress/sync`
3. Server-side malformed item dropped silently per H14
4. Rewards (`pointsAwarded`, `badgesEarned`) surface to user after sync
5. 401 on sync → redirect to login

## Task C10: Settings + GDPR

**File:** `apps/web/tests/e2e/student/settings.spec.ts`

Scenarios:
1. Edit name + save → `student_profiles` row updates
2. Switch language → cookie `atal-app-language` set + `<html lang>` updates on reload
3. Click "Export my data" → JSON download triggered, contains 11 sections
4. Click "Delete account" with confirmation → `archive_and_delete_user` RPC fired, auth.users row gone, archive row exists

## Task C11: Rate limiting (negative)

**File:** `apps/web/tests/e2e/student/rate-limits.spec.ts`

Scenarios:
1. AI tutor: 10 messages/min limit → 11th returns 429
2. TTS: 10 calls/min → 11th 429
3. Imagen: 10 calls/min → 11th 429
4. Rate-limit fail-closed: stop Redis (mock) → assert requests blocked

## Task C12: A11y smoke (per role)

**File:** `apps/web/tests/e2e/student/a11y.spec.ts`

- Axe scan of: `/app/dashboard`, `/app/learn`, `/app/learn/[m]/[t]`, `/app/ai-tools/tutor`, `/app/settings`
- Assert WCAG AA: 0 violations
- Assert `prefers-reduced-motion: reduce` → no `motion-*` animations applied
- Assert focus visible on all interactive elements via tab traversal

---

# Sub-Plan D: Teacher Features E2E (8 specs)

## Task D1: Teacher dashboard

**File:** `apps/web/tests/e2e/teacher/dashboard.spec.ts`

Scenarios:
1. Dashboard renders with stats: 1 class, 2 students, X assessments
2. Real-time progress grid updates when seeded student submits assessment
3. AI interactions log shows seeded entries

## Task D2: Class CRUD

**File:** `apps/web/tests/e2e/teacher/class-crud.spec.ts`

Scenarios:
1. Create class "Class-2B" → row in `classes`, code generated
2. Edit class name → revalidate path triggers UI refresh
3. Archive class → soft-delete or hide
4. Delete class → cascade enrollments

## Task D3: Enrollment

**File:** `apps/web/tests/e2e/teacher/enrollment.spec.ts`

Scenarios:
1. Search students by username → results scoped to teacher's classes (RLS test)
2. Add student3 to Class-1A → enrollment row
3. Duplicate enrollment → graceful "already enrolled" error
4. Remove student → enrollment row deleted

## Task D4: Announcements

**File:** `apps/web/tests/e2e/teacher/announcements.spec.ts`

Scenarios:
1. Create announcement with priority=high → row in `class_announcements`
2. List shows announcement; student sees it; read receipt counter increments
3. Teacher2 cannot read teacher1's announcements (RLS isolation test)
4. Delete announcement → cascade `announcement_reads`

## Task D5: Materials upload

**File:** `apps/web/tests/e2e/teacher/materials.spec.ts`

Scenarios:
1. Upload PDF (mock 1MB file) → row in `class_materials` + storage object
2. Upload >50MB → blocked client-side
3. Upload wrong MIME → blocked
4. Delete material → row + storage object both removed
5. Student sees material in class detail

## Task D6: Analytics

**File:** `apps/web/tests/e2e/teacher/analytics.spec.ts`

Scenarios:
1. Class analytics page shows mastery aggregation
2. Question analytics shows per-item correctness
3. Export CSV → file downloads, formula-injection sanitization verified (cells starting with `=` are quoted)
4. 7-day rolling window respects timezones

## Task D7: Class assessment results

**File:** `apps/web/tests/e2e/teacher/assessment-results.spec.ts`

Scenarios:
1. View class results → 2 students listed with scores
2. TOCTOU: log out, hand-edit `class_id` in URL → still rejected by re-verification (RLS test)
3. Empty class → empty state, no crash

## Task D8: Teacher settings

**File:** `apps/web/tests/e2e/teacher/settings.spec.ts`

Scenarios:
1. Edit profile (subject, village) → row updates
2. school_id and school_code are read-only after onboarding
3. Language switch persists across sessions

---

# Sub-Plan E: Admin Features E2E (5 specs)

## Task E1: Admin dashboard metrics

**File:** `apps/web/tests/e2e/admin/dashboard.spec.ts`

Scenarios:
1. Loads with schools=1, teachers=2, students=3 (per seed)
2. SWR refetch on focus (sub02 disabled focus revalidate, so test that it does NOT refetch on tab focus)
3. Error toast on `/api/admin/stats` 500 → retry button works

## Task E2: School + PIN management

**File:** `apps/web/tests/e2e/admin/pins.spec.ts`

Scenarios:
1. List schools — verify seeded school appears
2. Rotate PIN for seeded school → new PIN shown once, then masked
3. Rotate with custom PIN `654321` → applied, validated against `/^\d{4,6}$/`
4. Schema cache error (PGRST202) → user-friendly message
5. Rate limit: rotate >5/min → 429

## Task E3: User management

**File:** `apps/web/tests/e2e/admin/users.spec.ts`

Scenarios:
1. Admin lists all teachers and students
2. Admin cannot delete a user (delete is super_admin only) → 403
3. Admin cannot navigate to `/admin/admins` → redirected to `/admin/pins`

## Task E4: Feature flags

**File:** `apps/web/tests/e2e/admin/feature-flags.spec.ts`

Scenarios:
1. Toggle flag → row updates
2. Realtime propagation: open in 2 tabs, toggle in tab A, tab B updates
3. Rollout % field validates 0-100
4. Whitelist user IDs are uuid-validated

## Task E5: Audit log

**File:** `apps/web/tests/e2e/admin/audit-log.spec.ts`

Scenarios:
1. Trigger a user deletion → audit_log entry created with `action="user.delete"`, `target_id=<uuid>`
2. Non-admin cannot SELECT from audit_log (RLS test — fire SQL via API as student token, expect empty result)

---

# Sub-Plan F: Super-admin Features E2E (4 specs)

## Task F1: Admin lifecycle

**File:** `apps/web/tests/e2e/super-admin/admin-lifecycle.spec.ts`

Scenarios:
1. List admins — shows 1 admin + 1 super_admin
2. Create new admin `admin2@test.atal` → can immediately log in
3. Reset admin password → admin must re-login with new password
4. Cannot reset own (super_admin) password through this UI → error
5. Delete admin2 → row gone, cannot log in
6. Cannot delete self (super_admin) → 403

## Task F2: Role promotion

**File:** `apps/web/tests/e2e/super-admin/role-promotion.spec.ts`

Scenarios:
1. Promote `teacher2@test.atal` to admin → next login lands on admin dashboard
2. Cannot promote a deleted user → error
3. Cannot promote with malformed email → validation error
4. Demote back to teacher → next login lands on teacher dashboard

## Task F3: Cascade delete

**File:** `apps/web/tests/e2e/super-admin/cascade-delete.spec.ts`

Scenarios (uses C1 archive-and-delete):
1. Delete `student2@test.atal` → archive row written with full payload
2. Verify each of the 8 student tables has 0 rows for that user
3. Re-create same email → fresh user (no leftover state)
4. Archive table is readable only by admins (RLS positive + negative tests)

## Task F4: Regular admin denial

**File:** `apps/web/tests/e2e/super-admin/admin-denial.spec.ts`

Scenarios:
1. Login as admin, hit super-admin endpoints directly via fetch:
   - `setAdminRole` → 403
   - `deleteUserByEmail` → 403
   - `listAdminAccounts` → 403
   - `createAdminAccount` → 403
   - `resetAdminPassword` (someone else) → 403
2. Each returns generic error to client; specific reason in server logs

---

# Sub-Plan G: API + RLS tests (Jest, no browser)

## Task G1: Auth-gate sweep

**File:** `apps/web/__tests__/api/auth-gate.test.ts`

For each protected route, hit it with:
- No auth → 401
- Wrong role → 403
- Correct role → 200

Routes to sweep (one parameterized test):
- `/api/tutor/chat`
- `/api/voice/tts`
- `/api/imagen/generate`
- `/api/lesson/generate`
- `/api/lesson/download`
- `/api/modules/[moduleId]/units`
- `/api/check-auth-config`
- `/api/progress/sync`
- `/api/account/export`
- `/api/admin/stats`
- `/api/health` (no auth — 200 always)

## Task G2: RLS isolation matrix

**File:** `apps/web/__tests__/rls/isolation.test.ts`

Using two student JWTs (student1, student2), verify:
- student1 cannot read student2's `assessment_sessions`
- student1 cannot read student2's `student_knowledge_state`
- student1 cannot read student2's `points_history`
- student1 cannot read student2's `ai_tutor_interactions`
- student1 cannot insert announcement_reads for student2

Using two teacher JWTs (teacher1, teacher2):
- teacher1 cannot read teacher2's classes
- teacher1 cannot read teacher2's class_materials
- teacher1 cannot read teacher2's announcement read receipts

## Task G3: RPC contract tests

**File:** `apps/web/__tests__/rpc/contracts.test.ts`

For each RPC, test:
- Valid args → expected result
- Wrong types → error
- Wrong caller role → 42501

RPCs to cover:
- `update_progress_atomic`
- `upsert_generated_lesson`
- `batch_check_and_award_badges`
- `get_announcement_read_count`
- `get_unread_announcements`
- `archive_and_delete_user`
- `rotate_staff_pin`

## Task G4: Rate-limit fail-closed test

**File:** `apps/web/__tests__/rate-limit/fail-closed.test.ts`

- Mock Redis throwing `ECONNREFUSED` on every call.
- Security-critical configs (OTP, PIN, login) → return `false` (blocked).
- Non-critical configs → fall back to local in-memory limiter.

---

# Sub-Plan H: CI integration

## Task H1: Wire all 3 layers into CI

**File:** `.github/workflows/ci.yml`

- [ ] Add `npm run -w apps/web test` step (unit + API) — already in sub05 T9.
- [ ] Add `npm run -w apps/web test:e2e:critical` step that runs the 4 auth specs + 3 student happy-path specs only (smoke set).
- [ ] Add nightly job `test:e2e:full` that runs all 40 Playwright specs against a dedicated staging Supabase.
- [ ] Set `--shard 1/4` parallelism.

## Task H2: Test data hygiene

- [ ] Add `pre-push` hook: refuse to push if any test file uses `production` Supabase URL.
- [ ] Document the 2 separate Supabase projects (prod + test) in `docs/TEST_ENVIRONMENTS.md`.

---

# Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tests touch prod DB | Low | URL whitelist in seed/reset scripts; pre-push hook |
| Real AI charges from CI | Med | MSW intercepts all outbound; nightly job has cost cap |
| Flaky Playwright on slow CI | High | `--retries=2`, isolated browser context per test |
| Snowflake user state | Med | Reset between specs (or use storageState per-test) |
| RLS regression silently passes | High | All RLS tests use 2 distinct JWTs and assert empty results |

---

# Execution Order (proposed)

1. **Sub-plan A** (Foundation) — must land first
2. **Sub-plan G** (API + RLS) — fastest feedback for backend correctness
3. **Sub-plan B** (Auth E2E) — unblocks all other E2E by establishing fixtures
4. **Sub-plan C** (Student) + **D** (Teacher) in parallel
5. **Sub-plan E** (Admin) + **F** (Super-admin) in parallel
6. **Sub-plan H** (CI wiring) — last, integrates everything

**Estimated effort**: 5 working days of focused subagent-driven work, ~30 PRs at the project's ≤7-files, ≤500-line size guideline.

---

# Out of scope (separate plans)

- Load testing / performance benchmarks (k6 / artillery)
- Visual regression (Percy / Chromatic)
- Security pen-testing (OWASP ZAP)
- Mobile-specific Playwright projects (this plan covers desktop Chrome; iOS Safari + Android Chrome belong in a mobile QA plan)
- Migration of the 32 "unknown" role users to proper role tagging — separate data-migration workstream

---

**Owner**: TBD. Suggested next action: create issue "E2E suite — kick off with Sub-plan A" and assign to a tester or junior eng.
