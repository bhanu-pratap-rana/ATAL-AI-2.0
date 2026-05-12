# Atal AI — Master Execution Plan (Production-Ready for Rural Assam)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (dispatch fresh subagent per task, two-stage review). Each sub-plan ships as ≤ 10-minute-review PR (CLAUDE.md rule).

**Goal:** Take the codebase from "11 bugs fixed + audit complete" to **production-ready for rural-Assam launch**, redesigned to feel like a culturally-rooted Assam educator app.

**Driver:** [`docs/superpowers/plans/2026-05-12-master-issue-list.md`](./2026-05-12-master-issue-list.md) — 58+ open issues across 12 sub-plans.

**Sequencing rule:** sub-plans run in priority order. **Each sub-plan is shippable on its own**; do not block a later sub-plan on an earlier one's polish. Within a sub-plan, tasks run sequentially per subagent-driven-development.

**Estimated total effort:** ~52 engineer-hours. ~3 weeks at 1-2h/day.

---

## SP1 — SECDEF lockdown (P1 PR-3 → PR-5) — **DO FIRST**

**Why first:** highest impact per hour. Clears ~113 of 124 Supabase Security Advisor warnings. Pure DB + Studio config — zero UI risk.

| Task | Files | Effort | PR# |
|---|---|---|---|
| T1.1 — m178 lock 36 bucket-B SECDEF (revoke anon, keep authenticated) | `apps/db/migrations/178_*.sql` + extend grants test | 1h | 1 |
| T1.2 — m179 drop `lesson-assets` broad SELECT policy | `apps/db/migrations/179_*.sql` | 30m | 2 |
| T1.3 — Studio: disable anon sign-in, enable HIBP. Document in `specs/security-hardening/decisions.md`. i18n toast string. | `specs/security-hardening/decisions.md` + `lib/i18n/locales/*.json` + `actions/auth/auth-common.ts` | 1h | 3 |
| T1.4 — Re-pull advisors, commit verification report | `docs/superpowers/plans/2026-05-12-p1-final.md` | 30m | 4 |

**Acceptance:** advisor warn count for `*_security_definer_function_executable`, `auth_allow_anonymous_sign_ins`, `auth_leaked_password_protection`, `public_bucket_allows_listing` all → 0 (or single-digit with comment-justified exceptions).

---

## SP2 — Database hygiene

| Task | Files | Effort | PR# |
|---|---|---|---|
| T2.1 — Regenerate `types/database.ts` from latest migration | one-line script in `package.json` + commit refreshed types | 30m | 5 |
| T2.2 — m180 add missing `ENABLE ROW LEVEL SECURITY` for 5 tables (idempotent) | `apps/db/migrations/180_*.sql` | 30m | 5 |
| T2.3 — m181 add FK constraints on `student_knowledge_state.module_id/topic_id` | `apps/db/migrations/181_*.sql` (after data backfill check) | 1h | 6 |
| T2.4 — m182 enforce `NOT NULL` on `classes.teacher_id` (backfill orphan classes first) | `apps/db/migrations/182_*.sql` | 30m | 6 |
| T2.5 — m183 UNIQUE constraint on `usernames.username` (dedupe first if needed) | `apps/db/migrations/183_*.sql` | 30m | 6 |
| T2.6 — m184 JSONB CHECK on `irt_item_bank.options` (array + bounded length) | `apps/db/migrations/184_*.sql` | 30m | 7 |
| T2.7 — m185 add `updated_at` auto-trigger to 7 tables | `apps/db/migrations/185_*.sql` | 30m | 7 |
| T2.8 — m186 consolidate 9 multi-permissive policies on `assessment_responses` + `irt_item_bank` | `apps/db/migrations/186_*.sql` | 1h | 8 |
| T2.9 — m187 drop the 68 unused indexes (after 2-week observation — schedule reminder) | `apps/db/migrations/187_*.sql` | scheduled | post-launch |

**Acceptance:** advisor `unused_index` count drops to 0; `multiple_permissive_policies` count → 0; all FK and uniqueness invariants enforced; types match latest migration.

---

## SP3 — Frontend resilience (loading + error + Suspense)

| Task | Files | Effort | PR# |
|---|---|---|---|
| T3.1 — Add shared skeleton primitives: `<DashboardSkeleton>`, `<TableSkeleton>`, `<CardSkeleton>` | `apps/web/src/components/skeletons/` (new) | 1.5h | 9 |
| T3.2 — Add `loading.tsx` for 10 highest-traffic routes (student dashboard, learn, learn/M, learn/M/T, ai-tools, assessments, teacher dashboard, teacher analytics, admin dashboard, admin pins) | 10 new files | 2h | 9 |
| T3.3 — Add `error.tsx` for 10 critical routes (same list) with friendly fallback + retry CTA + i18n | 10 new files | 2h | 10 |
| T3.4 — Wrap slow server-component fetches with `<Suspense>`. Focus: teacher dashboard stats, admin metric drill-ins, learn module list | 4 file edits | 2h | 11 |

**Acceptance:** `npm run dev` walk shows skeleton on every nav; deliberate error injection in dashboard fetch shows `error.tsx`, not crash; Lighthouse "First-Contentful-Paint" improves measurably on student dashboard.

---

## SP4 — UI consistency (frontend polish)

| Task | Files | Effort | PR# |
|---|---|---|---|
| T4.1 — Migrate 172 raw `<button>` → `Button` component (skip ui-preview demo) | grep+edit ~25 files | 3h | 12 |
| T4.2 — Replace 17 hardcoded hex colors with CSS variables | `page.tsx`, `StudentStepComponents.tsx`, others | 1h | 13 |
| T4.3 — Extract repeated card + input styles into Tailwind `@apply` rules in `globals.css` | `globals.css` + ~30 component edits | 2h | 13 |
| T4.4 — Add `min-h-[44px]` to assessment nav buttons to fix 320px overflow | `QuestionNavigation.tsx` etc. | 30m | 13 |

**Acceptance:** zero raw `<button>` outside of demo files; zero `style={{ ... #... }}` in JSX outside demo; visual snapshot diff confirms no regression.

---

## SP5 — i18n completeness

| Task | Files | Effort | PR# |
|---|---|---|---|
| T5.1 — Extract all hardcoded English JSX literals from admin pages into i18n keys | `app/(public)/admin/*` + `lib/i18n/locales/en.json`/`hi.json`/`as.json` | 3h | 14 |
| T5.2 — Translate the new keys to Hindi + Assamese (use professional translation or a clearly-marked machine pass) | 2 JSON files | 2h | 14 |
| T5.3 — Add `i18n-keys` ESLint rule (custom) that fails CI when a JSX text literal is detected | `eslint.config.mjs` | 1h | 15 |

**Acceptance:** `npm run lint -- --rule i18n-keys/no-literal-jsx` returns 0; manual language toggle shows full translation, no English fall-through.

---

## SP6 — Rural-Assam UX fixes (from pending audit)

Tasks defined after the running UX agent completes. Likely to include:
- T6.1 — Offline-resumable assessment progress (save answer-by-answer, not at end)
- T6.2 — Larger touch targets on student forms (44px min)
- T6.3 — Plain-language error messages (replace "Unauthorized" / "Rate limit exceeded")
- T6.4 — Bandwidth-aware image variants (low-res preview, full-res progressive)
- T6.5 — "Ask Parent" / "Ask Teacher" CTA on the AI tutor
- T6.6 — Voice-first sign-up option (existing Whisper integration if any)
- T6.7 — Bihu-celebration milestone moments

Each task = its own PR. ~6-10 PRs total.

---

## SP7 — Design system v5 (Assam aesthetic, modern animations)

Per [`specs/design-system/design.md`](../../../specs/design-system/design.md) + [`docs/superpowers/plans/2026-05-12-p3-design-system-rewrite.md`](./2026-05-12-p3-design-system-rewrite.md). 4 phases, ~20 PRs:

- **Phase A — foundation** (4 PRs): install motion, v5 tokens, next/font, system primitives.
- **Phase B — anchor screens** (4 PRs): /student/start, /app/student/dashboard, /app/learn, lesson player.
- **Phase C — supporting screens** (11 PRs): teacher dashboard, classes, analytics, admin dashboard, admin sub-pages, settings, ai-tools, assessments, progress, join, reset-password.
- **Phase D — polish** (3 PRs): confetti, Bihu seasonal banner, mascot empty-states.

**Acceptance:** every route consumes v5 tokens; mascot appears on login + dashboard + empty states; Lighthouse Mobile ≥ 90 on canonical dashboards; dark mode toggles work everywhere.

---

## SP8 — Component decomposition

| Task | Files | Effort | PR# |
|---|---|---|---|
| T8.1 — Decompose `useTeacherOnboarding` (1017 LOC) into `useTeacherEmailOtp`, `useTeacherPasswordSet`, `useTeacherSchoolMatch`, `useTeacherLogin` | `hooks/useTeacherOnboarding.ts` → 4 new hooks + slim wrapper | 4h | 35 |
| T8.2 — Decompose `LessonPage` (954 LOC) into route-level data-fetch + 4 sub-components | `app/learn/[m]/[t]/page.tsx` + new `components/lesson/*` | 3h | 36 |
| T8.3 — Decompose `AssessmentRunner` (812 LOC) into state-machine + UI sub-components | `components/assessment/AssessmentRunner.tsx` → split | 3h | 37 |
| T8.4 — Decompose `SignUpStep` (766 LOC) per role | `components/auth/student/SignUpStep.tsx` → split | 3h | 38 |

**Acceptance:** no file > 500 LOC in `apps/web/src`; each decomposed component has its own focused tests; no behavior change visible in walkthroughs.

---

## SP9 — Performance hardening

| Task | Effort | PR# |
|---|---|---|
| T9.1 — Lighthouse Mobile audit + remediate `/app/student/dashboard` (target ≥ 90) | 2h | 39 |
| T9.2 — Same for `/app/teacher/dashboard`, `/admin/dashboard` | 3h | 40-41 |
| T9.3 — Add `<link rel="prefetch">` for module-list → next-lesson route | 30m | 42 |
| T9.4 — Audit bundle size; flag any > 200 KB gzipped chunk | 1h | 42 |

**Acceptance:** all three canonical dashboards Lighthouse Mobile ≥ 90; no chunk > 200 KB without a documented reason.

---

## SP10 — Accessibility audit

| Task | Effort | PR# |
|---|---|---|
| T10.1 — Wire axe-core into CI (`tests/e2e/08-a11y-axe.spec.ts` exists; need GH action) | 1h | 43 |
| T10.2 — Honor `prefers-reduced-motion` in all `motion` variants | 1h | 43 |
| T10.3 — Tab-trap audit on every Modal / Dialog | 2h | 44 |
| T10.4 — Color-contrast pass: every text-on-background combo ≥ 4.5:1 (3:1 for large) | 2h | 45 |

**Acceptance:** axe-core CI passes; `prefers-reduced-motion` confirmed via Chrome DevTools simulation; all dialogs trap Tab.

---

## SP11 — Operations / CI / observability

| Task | Effort | PR# |
|---|---|---|
| T11.1 — Add `.github/workflows/ci.yml`: lint + typecheck + unit tests + e2e smoke + Lighthouse | 2h | 46 |
| T11.2 — Add `.github/workflows/supabase-advisors.yml`: nightly cron, fails if WARN count > N | 1h | 47 |
| T11.3 — Wire Sentry (or alt) with DSN env var; sample 10% prod errors | 1h | 48 |
| T11.4 — Add `/api/health` route returning DB + Redis status | 30m | 49 |
| T11.5 — Implement the rest of the E2E test plan (`docs/superpowers/plans/2026-05-12-e2e-test-plan.md`) | scheduled | post-launch |

**Acceptance:** main branch protected by green CI; Sentry receives a synthetic error in staging.

---

## SP12 — Documentation

| Task | Effort | PR# |
|---|---|---|
| T12.1 — Update `docs/DATABASE.md` for migrations 165–186 | 2h | 50 |
| T12.2 — Write top-level `README.md` covering project purpose (Assam rural educator app), tech stack, setup, key commands | 1h | 50 |
| T12.3 — Per-feature `specs/<feature>/design.md` for the missing features | 2-4h | 51-54 |

---

## Execution order recommendation

```
Week 1: SP1 (security)  → SP2 (DB hygiene)  → SP3 (FE resilience)
Week 2: SP4 (FE polish) → SP5 (i18n)        → SP6 (UX-Assam)
Week 3: SP7 Phase A+B   → SP8 (decomp)
Post-launch: SP7 Phase C+D, SP9, SP10, SP11, SP12
```

Total PRs: ~50 small, each ≤500 LOC.
Total effort: ~52 engineer-hours.

---

## Definition of Done (production-ready)

- [ ] Supabase Security Advisor: 0 WARN (or each justified in code comment)
- [ ] Supabase Performance Advisor: 0 multi-permissive policies
- [ ] `npm test` + `npm run test:database` + `npm run lint` + `npm run build` all green in CI
- [ ] Lighthouse Mobile ≥ 90 on student / teacher / admin canonical dashboards
- [ ] Every `/app/*` route has `loading.tsx` + `error.tsx`
- [ ] No file > 500 LOC in `apps/web/src/`
- [ ] No raw `<button>` outside demo files
- [ ] No hex color in JSX outside `globals.css`
- [ ] All EN/HI/AS translation keys present (manual translation pass)
- [ ] Generated types match latest migration
- [ ] All FK constraints explicit; `username` UNIQUE; `classes.teacher_id` NOT NULL
- [ ] axe-core CI passes; `prefers-reduced-motion` honored
- [ ] Sentry receives prod errors
- [ ] `/api/health` returns 200 in staging

---

## Execution handoff

Per CLAUDE.md spec-first rule, I will **execute SP1 first** (highest impact, lowest risk). Within SP1, the next concrete task is **T1.1 — write m178 (bucket-B SECDEF lockdown) + extend the grants test**. After that PR ships I'll pause for review before T1.2.

If at any point the user wants to re-order sub-plans, the plan supports parallel branches (e.g. SP3 + SP4 don't conflict; SP7 lives on its own branch).
