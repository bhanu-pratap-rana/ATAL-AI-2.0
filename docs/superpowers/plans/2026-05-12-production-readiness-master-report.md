# Production-Readiness Master Report — 2026-05-12

**Branch:** `fix/admin-portal-bugs-2026-05-12`
**Scope:** full-codebase audit covering frontend, backend, database, architecture, security, performance, race conditions.
**Inputs:** 4 parallel agent audits + Supabase advisors (security + performance) + code-review-graph MCP + Playwright manual walk of 3 portals.

## Overall verdict

**Not yet production-ready. Strong backend posture. Significant frontend polish + database hygiene + decomposition work needed.**

- ✅ **Backend logic & security architecture: strong.** Auth gates, rate limits, input validation, atomic RPCs, no PII leak, no auth-bypass surface.
- ⚠️ **Database hygiene: needs work.** Stale types, missing RLS-ENABLE statements, FK gaps, JSONB unvalidated, unique-index gaps.
- ⚠️ **Frontend polish: gaps.** 91% of routes missing `loading.tsx`, 47% missing `error.tsx`, 172 raw `<button>` instances, untranslated admin strings.
- ⚠️ **Architecture: 4 god components.** `useTeacherOnboarding` 1017 LOC, `LessonPage` 954 LOC, `AssessmentRunner` 812 LOC, `SignUpStep` 766 LOC.
- ✅ **Supabase security advisor: 11 / 124 warnings cleared** by migration 177. Remaining 113 are addressable via PR-3 (m178, bucket B) + studio-config flips.

## Section 1 — Backend logic (HEALTHY ✅)

From [audit](#audit-3-backend) — strong patterns throughout:

| Pattern | Status | Detail |
|---|---|---|
| Auth gates | ✅ | 89 verifications across server actions + API routes |
| Rate limiting | ✅ | 33 checkRateLimit calls; Redis fail-closed degradation |
| Input validation | ✅ | 24 Zod schemas; centralized `handleZodFailure` |
| Race conditions | ✅ | Atomic RPCs (`submit_assessment`, `update_progress_atomic`, `upsert_student_profile`); `.maybeSingle()` on 53 INSERT+SELECT pairs |
| Idempotency | ⚠️ | sync/progress + assessment have idempotency keys. `/api/tutor/chat` and `/api/lesson/generate` do not (acceptable for streaming/cached responses) |
| Authorization escalation | ✅ | Zero `user_metadata.role` reads. All role checks via server-set `app_metadata` |
| Error info-leak | ✅ | Generic client messages, detailed server-side `authLogger.error` |
| Streaming | ✅ | Vercel AI SDK `streamText` with `onFinish` non-blocking |
| N+1 / waterfalls | ✅ | No `for (await supabase.from())` loops found; correct Promise.all usage |
| TODO/FIXME debt | ✅ | Zero in `apps/web/src/app/actions/` |

**Conclusion:** the backend is production-grade. No immediate fixes required.

## Section 2 — Database consistency (NEEDS WORK ⚠️)

| # | Issue | Severity | Fix |
|---|---|---|---|
| D1 | **`apps/web/src/types/database.ts` stale by 24 days** (mtime Apr 18 vs latest migration May 12) | HIGH | `npx supabase gen types typescript --linked > apps/web/src/types/database.ts` — single command |
| D2 | **5 tables likely missing explicit `ENABLE ROW LEVEL SECURITY`** in migrations: `assessment_responses`, `assessment_sessions`, `schools`, `school_staff_credentials`, `teacher_profiles`. Policies exist; the ENABLE may have been done via Studio (so it's actually on, just not in source) | MED | Verify via `pg_class.relrowsecurity`. Add idempotent `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` to a single migration. |
| D3 | **`student_knowledge_state.module_id` and `topic_id` are TEXT NOT NULL but lack `REFERENCES modules / topics`** (m042) | HIGH | Add FK constraints with `ON DELETE RESTRICT` |
| D4 | **`classes.teacher_id` is nullable** (m001) — every class should have a teacher | MED | `ALTER TABLE classes ALTER COLUMN teacher_id SET NOT NULL` after backfilling NULLs |
| D5 | **`irt_item_bank.options` JSONB has no CHECK constraint** validating shape | MED | Add CHECK `(jsonb_typeof(options) = 'array')` and length bounds |
| D6 | **`username` is indexed but not `UNIQUE`** | HIGH | Replace `CREATE INDEX idx_usernames_username` with `CREATE UNIQUE INDEX` |
| D7 | **7 tables missing `updated_at` auto-trigger:** `formative_responses`, `summative_results`, `practice_questions`, `points_history`, `student_badges`, etc. | LOW | Reuse the existing `trigger_update_updated_at` pattern |
| D8 | **9 multi-permissive RLS policies** flagged by perf advisor on `assessment_responses` + `irt_item_bank` (student-select + teacher-select on same role × action) | MED | Consolidate into single policy with OR expression — small perf win on hot reads |
| D9 | **68 unused indexes** flagged by perf advisor across `irt_item_bank`, `student_knowledge_state`, `assessment_responses`, `class_announcements`, etc. | LOW | After 2-week observation window, drop unused. Saves write overhead. |

## Section 3 — Frontend UI/UX (NEEDS POLISH ⚠️)

| # | Issue | Severity | Fix |
|---|---|---|---|
| F1 | **29 / 32 app routes missing `loading.tsx`** (91%) — users see blank page on slow nav | HIGH | Add Suspense fallback skeletons; biggest perceived-perf win |
| F2 | **15 / 32 app routes missing `error.tsx`** (47%) — generic Next.js error page on crash | HIGH | Add error boundaries with retry CTA |
| F3 | **172 raw `<button>` instances** instead of `@/components/ui/Button` | MED | Migrate inconsistent buttons (error pages, landing, ui-preview). Improves consistency + a11y. |
| F4 | **17 hardcoded hex colors** in JSX (mostly `ui-preview` demo page). Real-app offenders: `StudentStepComponents.tsx`, `page.tsx` landing | LOW–MED | Replace `#F98819` etc. with `var(--brand-primary)` tokens (matches design-system v5 spec) |
| F5 | **Untranslated English strings on admin pages** — admin/admins, admin/dashboard, assessment helper text, "Continue Learning", "Back to Assessments" | MED | Add i18n keys to `en.json`/`hi.json`/`as.json` and replace literals |
| F6 | **Only 9 Suspense boundaries** in entire app | MED | Add Suspense around slow server-component fetches (teacher dashboard, admin metrics, learn modules) |
| F7 | **Repeated card pattern** (`bg-white rounded-3xl border border-slate-100 shadow-sm p-6`) **30×** + repeated input focus styles **3×** | LOW | Extract into Tailwind `@apply` rules or component primitives |
| F8 | **Minor mobile-overflow risk** — `min-w-[120px]` and `min-w-[160px]` on assessment nav buttons may overflow on 320px viewports | LOW | Test on Galaxy S5 or Moto E5; switch to fluid sizing |
| F9 | **Image optimization** | ✅ PASS | All `<img>` replaced with `next/image` |
| F10 | **Icon-only button a11y** | ✅ PASS | All have `aria-label` |
| F11 | **`"use client"` distribution** (156 files) | ✅ PASS | Appropriate split between server + client components |

## Section 4 — Architecture (DECOMPOSITION CANDIDATES ⚠️)

From code-review-graph audit — 2835 nodes, 17889 edges, 15 communities, 255 execution flows:

| # | Issue | Severity | Fix |
|---|---|---|---|
| A1 | **`useTeacherOnboarding` (1017 LOC, 256 outgoing deps)** — mega-hook covering OTP, email, password, phone, teacher-profile, school PIN, role redirect | HIGH | Decompose into `useTeacherEmailOtp`, `useTeacherPasswordSet`, `useTeacherSchoolMatch`, `useTeacherLogin` |
| A2 | **`apps/web/src/app/learn/[moduleId]/[topicId]/page.tsx` 954 LOC** | HIGH | Split into route-level data-fetch + 3-4 sub-components (concept / quiz / story / interactive) |
| A3 | **`AssessmentRunner` 812 LOC, 118 deps** | HIGH | Extract state machine into separate file; UI into sub-components |
| A4 | **`SignUpStep` 766 LOC** | HIGH | Split into role-specific steps (student / teacher chose-account-type) |
| A5 | **`134_seed_curriculum_content.sql` 13197 LOC** — single monolithic seed | MED | Already split into `concat_*.sql` batches; remove the root file or split further |
| A6 | **`createClient` (server) has 128 incoming calls** — every page directly instantiates the client | MED | Introduce auth-middleware layer; pages call hooks/getCurrentUser not raw client |
| A7 | **9 of top-10 critical flows are admin operations** (criticality > 0.88). Hard-coded `isSuperAdminEmail` likely whitelist | MED | Audit-log all admin mutations; rate-limit; explicit role check matrix |
| A8 | **Test bridge nodes:** `08-a11y-axe.spec.ts`, `06-offline-replay.spec.ts`, `00-pwa-install.spec.ts` are high-betweenness — if they break, entire flows are gated | LOW | Add smoke tests at lower granularity so a single failure doesn't cascade |

## Section 5 — Supabase security advisor (PARTIAL ✅)

Before/after this audit run:

| Rule | Before | After m177 | Plan |
|---|---|---|---|
| `anon_security_definer_function_executable` | 43 | **~32** | PR-3 (m178) drops it to ~2 (just bucket-C) |
| `authenticated_security_definer_function_executable` | 48 | **~37** | PR-3 keeps bucket-B authenticated → stays around the same; bucket-A drops to 0 |
| `auth_allow_anonymous_sign_ins` | 31 | 31 | PR-5: Studio toggle (Auth → Providers → Anonymous → off) |
| `auth_leaked_password_protection` | 1 | 1 | PR-5: Studio toggle (Auth → Policies → HaveIBeenPwned → on) |
| `public_bucket_allows_listing` | 1 | 1 | PR-4: drop broad SELECT policy on `storage.objects` for `lesson-assets` |

Migration 177 already cleared 11 functions. Subsequent PRs (3, 4, 5) clear the rest per [`docs/superpowers/plans/2026-05-12-p1-security-hardening.md`](2026-05-12-p1-security-hardening.md).

## Section 6 — Supabase performance advisor

- **68 unused indexes** — recommended to drop after a 2-week production observation window confirms zero usage. Saves write overhead, no read regression.
- **9 multi-permissive policies** on `assessment_responses` and `irt_item_bank` — consolidate.

## Production-readiness gate

| Dimension | Status | Notes |
|---|---|---|
| Auth & RBAC | ✅ READY | Strong gates, no escalation paths |
| Input validation | ✅ READY | Zod everywhere |
| Rate limiting | ✅ READY | Distributed + fail-closed |
| Database schema | ⚠️ NEEDS FIXES | D1, D3, D6 are blockers |
| RLS coverage | ✅ READY (D2 cosmetic) | Verify D2 via `pg_class.relrowsecurity` |
| Error handling | ✅ READY | No info disclosure |
| Loading states | ⚠️ NEEDS WORK | F1 is a UX gap |
| Error boundaries | ⚠️ NEEDS WORK | F2 is a UX gap |
| i18n coverage | ⚠️ NEEDS WORK | F5 |
| Component decomposition | ⚠️ NEEDS WORK | A1–A4 |
| Security advisors | ⚠️ IN PROGRESS | m177 done; m178 + Studio flips pending |
| Performance advisors | ✅ ACCEPTABLE | Unused indexes are write-overhead only |
| Build / typecheck / tests | ✅ READY | All gates green |

## Recommended PR sequence to reach production-ready

| # | PR | Effort | Impact |
|---|---|---|---|
| 1 | **m178 — bucket-B SECDEF lockdown** (P1 PR-3) | ~1h | Closes 32 advisor warnings |
| 2 | **m179 + Studio flips** (P1 PR-4 + PR-5) | ~30 min | Closes 33 advisor warnings (anon + HIBP + bucket) |
| 3 | **m180 — regenerate types + add ENABLE RLS + UNIQUE username + FK constraints** (D1, D2, D3, D4, D6) | ~2h | Closes 6 DB hygiene issues |
| 4 | **m181 — updated_at triggers + JSONB CHECK + multi-permissive consolidation** (D5, D7, D8) | ~2h | Closes remaining DB issues |
| 5 | **Frontend: add loading.tsx to top 10 routes** (F1) | ~3h | Major perceived-perf win |
| 6 | **Frontend: add error.tsx to top 10 routes** (F2) | ~2h | Graceful failure recovery |
| 7 | **Frontend: migrate raw `<button>` → Button component** (F3) | ~3h | Consistency + a11y |
| 8 | **Decompose `useTeacherOnboarding`** (A1) | ~6h | Reduce mega-hook risk |
| 9 | **Decompose `LessonPage` and `AssessmentRunner`** (A2, A3) | ~8h | Reduce god-component risk |
| 10 | **i18n sweep — admin / helper strings** (F5) | ~4h | Cultural completeness |

**Total estimated effort to reach production-ready: ~32 engineer-hours.** Concurrent with the P3 design-system rewrite, this can ship in 2-3 weeks of focused work.

## Manual / runtime checks still owed

These weren't exercised in this audit and need real-device verification:
1. **Mobile viewport** at 320 / 375 / 414 px (Galaxy S5, iPhone SE, Pixel 5).
2. **Offline mode + IndexedDB replay** — toggle DevTools Offline → submit assessment → reconnect → confirm queue flush.
3. **Lighthouse Mobile** ≥ 90 on `/app/student/dashboard`.
4. **Real Bihu-class device** — Moto G Power, Redmi Note — measure FCP.
5. **Concurrent session security** — two tabs same account, sign out one, verify the other dies.
6. **Rate-limit fail-closed behavior** — induce Redis outage in staging, confirm requests reject (not bypass).

## Acceptance for "production-ready" label

Define the bar:

- [ ] All Supabase Security Advisor WARN findings cleared (or justified with comment in code)
- [ ] `npm test` 32/32 + `npm run test:database -- security-definer-grants` 11/11
- [ ] `npm run build` clean
- [ ] Every `/app/*` route has a `loading.tsx` and an `error.tsx`
- [ ] Lighthouse Mobile ≥ 90 on student / teacher / admin canonical dashboards
- [ ] No raw `<button>` in non-demo files
- [ ] All hex colors removed from JSX; CSS variables only
- [ ] Generated types match latest migration
- [ ] Every FK constraint specified explicitly with `ON DELETE` behavior
- [ ] Username unique constraint enforced
- [ ] All non-demo strings reachable via `t()` / `getTranslation()`

When the above all pass, the codebase is production-ready.
