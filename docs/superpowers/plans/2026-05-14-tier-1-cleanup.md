# Production-Ready Branch — Tier 1 Cleanup + Code Hygiene + Dedup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task is one PR. Project rule: review in <10 min, ≤7 files, ≤500 lines per PR. Every PR has Implementer → Spec Review → Code Quality Review before merge.

**Goal:** Ship `fix/admin-portal-bugs-2026-05-12` as a production-ready branch with: (a) correct identity/onboarding behaviour, (b) zero duplicate logic/screens/backend, (c) zero dead code, (d) zero junk files in the repo, (e) full code-review pass on every change.

**Audience:** Rural Kamrup schools running the Assam Digital Initiative. Real production traffic, low-end Android devices, 3G connections, Indian institutional email addresses.

**Architecture:** Sequential PRs, each independently shippable. PR-37 is done. The remaining 9 are scoped to each be reviewable in <10 minutes.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Supabase Auth · Tailwind v4 · Jest (existing test runner — NOT Vitest) · Playwright MCP (manual E2E).

**Branch state at plan start:**
- Branch: `fix/admin-portal-bugs-2026-05-12`
- HEAD: `423a31d` (PR-37.1 follow-up)
- Test runner: Jest. Use `npm test -- <path>` to run a single file. `apps/web/__tests__/lib/` is the existing convention.

---

## Status

| PR | Title | Status | Commit |
|----|-------|--------|--------|
| 37 | Email validator: TLD-based + dedup `validateEmail` | ✅ Done | `969ad03` |
| 37.1 | Port tests to Jest, restore re-export | ✅ Done | `423a31d` |
| 38 | `autoComplete` attributes on every auth input | ⬜ Next |  |
| 39 | Keep email-first default + auth-flow consolidation | ⬜ Pending |  |
| 40 | Hydration audit + centralized date formatter | ⬜ Pending |  |
| 41 | Repo hygiene: junk files + .gitignore | ⬜ Pending |  |
| 42 | Duplicate screens/components hunt | ⬜ Pending |  |
| 43 | Duplicate backend logic hunt | ⬜ Pending |  |
| 44 | Code hygiene sweep (lint, comments, strictness) | ⬜ Pending |  |
| 45 | A11y full sweep (axe-core) | ⬜ Pending |  |
| 46 | Final production-readiness review | ⬜ Pending |  |

---

## PR-38 — autoComplete attributes on every auth input

**Why:** Chrome's autofill heuristics cross-contaminate forms that share input shape. During PR-33→36 manual testing the admin login field auto-prefilled with a student email because no `autocomplete` value was set. Standard WHATWG values fix this with zero behaviour change.

**Files (≤8):**
- `apps/web/src/components/auth/student/SignInStep.tsx`
- `apps/web/src/components/auth/student/SignUpStep.tsx`
- `apps/web/src/components/auth/student/ForgotPasswordStep.tsx`
- `apps/web/src/components/auth/teacher/TeacherLoginStep.tsx`
- `apps/web/src/components/auth/teacher/TeacherSignUpStep.tsx`
- `apps/web/src/components/auth/teacher/TeacherForgotPasswordStep.tsx`
- `apps/web/src/components/auth/teacher/TeacherSetPasswordStep.tsx`
- `apps/web/src/app/(public)/admin/login/page.tsx`

**Rule:**
- Sign-in email field → `autoComplete="username"`
- Sign-up email field → `autoComplete="email"`
- Phone field → `autoComplete="tel"`
- Username field → `autoComplete="username"`
- Password on sign-in → `autoComplete="current-password"`
- Password on sign-up / reset / confirm → `autoComplete="new-password"`

**Steps:**
- [ ] Audit current state: `grep -rn 'autoComplete' apps/web/src/components/auth/ apps/web/src/app/\(public\)/admin/login/`
- [ ] Apply the rule above. Touch only `<Input>` / `<input>` JSX.
- [ ] `node_modules/.bin/tsc --noEmit` → 0
- [ ] `npm run build` → 0
- [ ] Playwright smoke: open `/admin/login` in incognito, type into email field, confirm Chrome doesn't suggest a student credential
- [ ] Commit: `fix(auth): SP13 PR-38 — proper autocomplete attributes on every auth input`

---

## PR-39 — Email-first default (KEEP) + auth-flow consolidation

**Direction change from initial plan:** Email-first stays as the default per user. Use this PR slot to **find and remove duplicate auth screens / forms / flows** — there are likely two paths for the same user journey.

**Suspected duplicates to confirm and consolidate:**
- `apps/web/src/components/auth/student/SignInStep.tsx` AND `apps/web/src/components/student/SignInEmailForm.tsx` — both implement student email sign-in
- `apps/web/src/components/auth/student/SignUpStep.tsx` AND `apps/web/src/components/student/SignUpEmailFlow.tsx` — both implement student email signup
- `apps/web/src/components/auth/student/ForgotPasswordStep.tsx` AND `apps/web/src/components/student/ForgotPasswordFlow.tsx` — both implement forgot-password
- `apps/web/src/components/auth/EmailOTPForm.tsx` — used by which path? If only one, fine; if neither, dead.

**Step 1 — Survey.** Before any deletion, map who imports each duplicate. Spawn an Explore agent or grep:

```bash
grep -rn "SignInEmailForm\|SignUpEmailFlow\|ForgotPasswordFlow\|EmailOTPForm" apps/web/src/ --include="*.tsx" --include="*.ts"
```

**Step 2 — Pick the canonical form for each pair.** Heuristics:
- The one used by the current `/student/start` page is canonical.
- If both have callers, consolidate at the call site.
- If one has no callers, it's dead → delete.

**Step 3 — Delete the loser.** Including the file. Including any unused exports it had.

**Step 4 — Verify nothing imports the deleted module.** `tsc --noEmit` will catch it.

**Step 5 — Confirm email default is still in place.** Read `apps/web/src/hooks/useAuthState.ts:199-200`. Both `signinTab` and `signupTab` must remain `"email"`. Do not change.

**Verification:**
- `node_modules/.bin/tsc --noEmit` → 0
- `npm run build` → 0
- `npm test` → all green (including the 37 in validation-utils.test.ts)
- Playwright smoke: student sign-in flow works end-to-end as before

**Commit:** `refactor(auth): SP13 PR-39 — consolidate duplicate student auth screens, keep email-first default`

---

## PR-40 — Hydration audit + centralized date formatter

**Why:** `new Date(x).toLocaleDateString()` in Server Components produces different output server-side (server locale) vs client-side (browser locale) → "Text content did not match" hydration warnings.

**Files (≤6):**
- Create: `apps/web/src/lib/date-format.ts`
- Create: `apps/web/__tests__/lib/date-format.test.ts`
- Modify: `apps/web/src/app/app/settings/page.tsx` (line 171 — confirmed Server Component)
- Modify: `apps/web/src/app/app/student/classes/page.tsx` (line 195)
- Modify: `apps/web/src/app/app/assessments/[sessionId]/page.tsx` (line 160)
- Modify: `apps/web/src/app/app/teacher/assessments/[classId]/page.tsx` (line 20)

**Behaviour change:** Replace `new Date(iso).toLocaleDateString()` in Server Components with `formatDate(iso)` from the new helper. The helper uses a fixed `Intl.DateTimeFormat("en-IN", ...)` so SSR and CSR produce identical strings.

**Test cases (Jest format):**

```ts
import { formatDate, formatDateTime } from "@/lib/date-format";

describe("formatDate", () => {
  it("uses en-IN locale deterministically", () => {
    expect(formatDate("2026-05-14T00:00:00Z")).toMatch(/14\/0?5\/2026/);
  });
  it("returns empty string on empty/invalid input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("includes a time component", () => {
    expect(formatDateTime("2026-05-14T10:30:00Z")).toMatch(/2026/);
  });
});
```

**Helper:**

```ts
const DATE_FMT = new Intl.DateTimeFormat("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
const DATETIME_FMT = new Intl.DateTimeFormat("en-IN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true });

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_FMT.format(d);
}
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATETIME_FMT.format(d);
}
```

**Steps:**
- [ ] Write the Jest test, run it, watch it fail (no helper yet)
- [ ] Create `date-format.ts`
- [ ] Replace the 4 Server-Component call sites
- [ ] `npm test -- __tests__/lib/date-format.test.ts` → green
- [ ] `node_modules/.bin/tsc --noEmit` → 0
- [ ] `npm run build` → 0 (no hydration warnings)
- [ ] Commit: `fix(ssr): SP13 PR-40 — centralized date formatter kills locale-dependent SSR drift`

---

## PR-41 — Repo hygiene: junk files + .gitignore

**Why:** The repo root currently has 13 untracked `_verify_*.png` screenshots and a `.playwright-mcp/` directory that shouldn't be checked in. Per user: no junk files.

**Steps:**
- [ ] List the offenders: `git status --short` (untracked items at repo root)
- [ ] Read `.gitignore` to confirm patterns
- [ ] Add to `.gitignore`:
  ```
  # Manual QA screenshots (Playwright MCP, etc.)
  /_verify_*.png
  /.playwright-mcp/
  ```
- [ ] Delete the existing tracked-or-untracked junk: `rm -f _verify_*.png && rm -rf .playwright-mcp/`
- [ ] Survey other suspicious top-level files: any `*.test-result*`, `playwright-report/`, `*.bak`, `*.log` should be evaluated
- [ ] Confirm `git status` is clean apart from `.gitignore` modification
- [ ] Commit: `chore: SP13 PR-41 — ignore Playwright MCP artefacts, remove tracked screenshots`

---

## PR-42 — Duplicate screens / components hunt

**Why:** User flagged that duplicate screens cause confusion. PR-39 catches the student auth pair. This PR catches the rest of the codebase.

**Method (Explore agent):**

```
Spawn Explore subagent with prompt:
  "Find duplicate React components in apps/web/src/. Two components are
   considered duplicates if they:
   (a) render the same visual surface (banner + form + button)
   (b) are imported in different code paths but produce identical user-facing UI
   (c) share >70% identical JSX
   For each pair, report: file paths, callers, and which is canonical.
   Search breadth: thorough."
```

**Likely candidates the user-driven survey would surface:**
- Modal patterns (`DeleteConfirmDialog` vs ad-hoc modals)
- Card components for stats tiles (admin, teacher, student — possibly 3 copies)
- Button banner-action patterns (PR-33 hardcoded the pattern in 6+ files)
- Auth-step shell (PR-35 noted: 8 teacher auth steps all repeat `<AuthCard>` + `<Button variant="ghost" bg=...>`)
- Empty-state cards (each list has its own)

**Decision tree per duplicate found:**
- If a single canonical form exists → consolidate callers, delete losers.
- If both are "alive" → extract a shared primitive into `apps/web/src/components/system/` or `components/shared/`.
- If a duplicate is unused → delete it.

**Constraint:** No PR-42 commit may delete more than 1500 lines without a separate code-quality review pass. If the hunt finds more, split into PR-42a / PR-42b.

**Verification:**
- `tsc --noEmit`, `npm run build`, `npm test` all green
- Playwright smoke: every role's main flow (student dashboard, teacher classes, admin schools, admin/admins, settings) still works
- Bundle size: `npm run build` "First Load JS" should not grow

**Commit:** `refactor(ui): SP13 PR-42 — consolidate duplicate components / screens`

---

## PR-43 — Duplicate backend logic hunt

**Why:** Project memory notes that server actions were already split by domain (PR-31 era) but earlier work left re-export shims. Hunt for: duplicate manager functions, duplicate Supabase helpers, duplicate route handlers doing the same thing under different paths.

**Method (Explore agent):**

```
Survey apps/web/src/app/api/, apps/web/src/app/actions/, apps/web/src/lib/
for:
  - Two server actions that do the same mutation (e.g. "delete user")
  - Two route handlers reading the same resource
  - Multiple Supabase admin-client constructors
  - Duplicate Zod schemas for the same shape
Report file paths, request shapes, and call sites.
```

**Decision tree:** Same as PR-42 — consolidate or delete.

**Hard rule:** Any change to a server action requires reading the action's callers and confirming the signature stays compatible. Breaking client → server contract is a non-starter.

**Verification:**
- `tsc --noEmit`, `npm run build`, `npm test`
- API smoke: hit each modified route via dev server, confirm 200/2xx response
- Playwright smoke: triggers that hit the modified actions still work

**Commit:** `refactor(api): SP13 PR-43 — consolidate duplicate backend actions / handlers`

---

## PR-44 — Code hygiene sweep

**Why:** User wants "code hygiene from each and every point and aspect". This is a single comprehensive sweep.

**Scope:**
1. **ESLint:** `npx eslint apps/web/src --max-warnings 0`. Fix every warning. No `eslint-disable` for new code.
2. **Comment hygiene per project rule:** Remove WHAT-comments (those that restate the code). Keep WHY-comments only.
3. **Strict null:** No new `!!` force-unwraps. Find existing ones in changed files and assess case-by-case.
4. **Banned patterns:**
   - `console.log` in production code (use `clientLogger` / `serverLogger`)
   - `// TODO` without a ticket/issue link → either fix or delete
   - `any` types → typed properly
   - Inline magic numbers → extract to named constants
5. **Import hygiene:** No unused imports. No deep relative paths (`../../../`). Use `@/` alias.

**Steps (per file touched):**
- [ ] Run lint, capture output
- [ ] Fix warnings file-by-file (don't bulk auto-fix; risk of behaviour change)
- [ ] Re-run lint, verify zero warnings
- [ ] Build + test after each batch

**Bounded scope:** Only files touched in this branch's commits (`git diff main...HEAD --name-only`). Don't sweep the whole codebase in one PR — that's a separate initiative.

**Commit:** `chore(hygiene): SP13 PR-44 — lint clean, no dead code, no banned patterns in changed files`

---

## PR-45 — A11y full sweep

**Why:** Project memory references "3 critical + Dialog-primitive serious finding" from a prior axe-core run. State-government deployments often face WCAG-AA audits.

**Method:**
1. Install / run axe-core via Playwright MCP or the web-audit-tools:a11y-fixer agent
2. For each finding:
   - Critical → must fix this PR
   - Serious → must fix this PR
   - Moderate → fix if trivial, else defer to a tracked follow-up
   - Minor → defer

**Targets to scan (production-facing surfaces):**
- `/student/start` (anonymous)
- `/teacher/start` (anonymous)
- `/admin/login` (anonymous)
- `/app/student/dashboard` (signed-in)
- `/app/teacher/classes`
- `/app/admin/dashboard`
- `/app/settings` (each role)
- Lesson player + assessment screens

**Common a11y bugs to expect:**
- Icon-only buttons missing `aria-label`
- Dialog without `role="dialog"` + focus trap
- Form errors not linked via `aria-describedby`
- Color contrast on the new navy/teacher-blue chips (verify 4.5:1)
- Missing `<label>` for inputs
- Keyboard traps in modals

**Verification:** Re-run axe on each target. Zero critical/serious findings.

**Commit:** `fix(a11y): SP13 PR-45 — clear axe-core critical/serious findings (WCAG-AA)`

---

## PR-46 — Final production-readiness review

**Method:** Dispatch the `solution-architect-cto` agent for a senior architectural review, the `phase-reviewer` for code quality, and the `design-critic` for UX. Three parallel reviews.

**Review surface:** `git diff main...HEAD` since the branch started.

**What each reviewer checks:**

- **solution-architect-cto:** Architecture coherence. Are role-aware patterns consistent? Is the dedup actually deduped? Are abstractions paying for themselves? Are there new cross-cutting concerns? Are migrations safe?

- **phase-reviewer:** Code quality. SOLID, KISS, YAGNI. Test coverage. Naming. Error handling. Dead code traces. Build + lint clean.

- **design-critic:** Visual identity. Role-color compliance. AI-generic patterns. Accessibility (re-verify PR-45). Responsive behaviour. Brand fit for Assam Digital Initiative.

**Acceptance gate:** All three reviewers return APPROVE (not "approve with concerns"). Any objection → fix → re-review.

**Output:** A short "ready to ship" memo at the bottom of this plan file with: branch SHA, commit count, tests-passing count, build status, reviewer sign-offs.

**No commit unless something needs fixing.** This PR is a quality gate, not new code.

---

## Whole-plan verification checklist

After PR-46 returns APPROVE:

- [ ] `git diff main...HEAD --stat` shows reasonable churn (no surprises)
- [ ] `npm test` — all suites pass (count tests passing)
- [ ] `node_modules/.bin/tsc --noEmit` — exits 0
- [ ] `npm run build` — 48 routes compile, no hydration warnings, no React warnings
- [ ] `npx eslint apps/web/src --max-warnings 0` — clean
- [ ] `git status` — clean working tree
- [ ] Playwright smoke on every role (student / teacher / admin / super_admin) — sign in, browse main flows, sign out
- [ ] Real institutional email accepted at signup (`principal@kvs.gov.in`)
- [ ] No duplicate components found by a second-pass grep
- [ ] No dead code reachable from `apps/web/src/app/`
- [ ] No `_verify_*.png` or `.playwright-mcp/` in `git status` or `ls`
- [ ] `axe-core` finds zero critical/serious on the 8 target surfaces

## Out-of-scope (file as separate plans)

- **HIGH PRIORITY — Anonymous sign-in with username + class details (PR-47).**
  User directive 2026-05-14: rural-Kamrup students don't have email or
  phone; their only credential is a username plus the class code their
  teacher gives them. The state machine already has the slots
  (`guestClassCode`, `guestRollNumber`, `guestPin` in useAuthState.ts)
  and the backend handler is in place (`handleAnonymousSignIn` in
  auth-handlers.ts, surfaced and documented in PR-43), but no UI panel
  reads/writes those fields. The Quick Start tab currently runs the
  legacy username + password path instead. Needs:
    1. A new "Class Sign-in" panel in SignInStep that consumes
       `guestClassCode`, `guestRollNumber`, `guestPin` and submits via
       `handleAnonymousSignIn` + class enrolment RPC.
    2. The matching submit handler in useAuthState (writes the new
       anonymous-user's student_profiles row with username + class).
    3. A `setSignupTab("anonymous")` action and a new tab in SignUpStep
       so first-time guest students can register without an email.
    4. Server-side: ensure the anonymous user's class enrolment respects
       RLS (existing classes table policies must accept a
       freshly-created anon UID).
  Estimated 2-3 PRs of work; out of scope for this Tier-1 cleanup pass.
- Bundle-size optimization (Tier 2 in the original audit)
- 165-migration squash baseline (Tier 3)
- Test infrastructure for the 8 deferred E2E specs (Tier 3)
- Capacitor mobile wrapper (Tier 5)
- Rate-limiter and rpc-validators dead-export pruning (PR-43 deferred;
  needs per-export verification of dynamic call patterns)
- Verify `/admin/start` and `/admin/setup` route safety before deletion
  (state-government documentation may link these URLs externally)

---

## Ready-to-ship memo (filled at PR-46)

> _Empty until PR-46 returns. Will be filled with: branch SHA, commit count, test count, reviewer sign-offs._
