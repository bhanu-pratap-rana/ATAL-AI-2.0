# Atal AI — Master Issue List (consolidated)

**Date:** 2026-05-12
**Inputs:** 11 fixed bugs + 4 parallel audits (code-graph, frontend, backend, database) + Supabase advisors (security + performance) + Playwright manual walk of 3 portals + design-system v5 spec + (pending) rural-Assam UX audit.

Each row: **ID | Title | Severity | Type | Source | Status | Sub-plan**

Severity: `BLOCKER` > `HIGH` > `MED` > `LOW` > `INFO`
Type: `SEC` (security) / `DB` (database) / `BE` (backend) / `FE` (frontend) / `UX` (user experience) / `PERF` (performance) / `ARCH` (architecture) / `DESIGN` (design system) / `I18N` (localization) / `A11Y` (accessibility) / `OPS` (deployment)

## Already-shipped fixes on `fix/admin-portal-bugs-2026-05-12`

| ID | Title | Status |
|---|---|---|
| B1 | `/admin/questions` 403 → server-action route via createAdminClient | ✅ Fixed |
| B2 | DataModal Escape close | ✅ Fixed |
| B3 | PeriodicSync log noise downgraded to debug | ✅ Fixed |
| B5 | Create-admin bootstrap probe failure | ✅ Fixed |
| B6 | Admin list empty (auth.admin.listUsers broken) → m175 RPC | ✅ Fixed |
| B7 | `/app/settings` server/client boundary on getTranslation | ✅ Fixed |
| U1 | Banner picks portal from URL, not user role | ✅ Fixed |
| B8 | Student login accepts teacher emails silently | ✅ Fixed |
| B9 | Jest setupFiles config typo | ✅ Fixed |
| U4 | Student classes shows "Teacher: Not available" | ✅ Fixed |
| U5 | Duplicate Roll 7 in Class 9th A → m176 partial unique index | ✅ Fixed |
| m177 | 11 SECDEF bucket A+D functions locked down | ✅ Applied |

## Open issues — grouped by sub-plan

### Sub-plan 1 — SECDEF lockdown (P1 PR-3..PR-5)

| ID | Title | Severity | Source |
|---|---|---|---|
| SEC-1 | 36 bucket-B SECDEF functions still callable by `anon` | HIGH | Supabase advisor |
| SEC-2 | Anonymous sign-in enabled (31 advisor instances) | HIGH | Supabase advisor |
| SEC-3 | HaveIBeenPwned password check disabled | MED | Supabase advisor |
| SEC-4 | `lesson-assets` bucket allows directory listing | MED | Supabase advisor |
| SEC-5 | Hardcoded super-admin email whitelist (`isSuperAdminEmail`) | MED | Code-graph audit |
| SEC-6 | No audit-log on admin mutations | MED | Code-graph audit |

### Sub-plan 2 — Database schema hygiene

| ID | Title | Severity | Source |
|---|---|---|---|
| DB-1 | `apps/web/src/types/database.ts` stale by 24 days | HIGH | DB audit |
| DB-2 | 5 tables possibly missing `ENABLE ROW LEVEL SECURITY` statement in source | MED | DB audit |
| DB-3 | `student_knowledge_state.module_id`/`topic_id` missing FK to `modules`/`topics` | HIGH | DB audit |
| DB-4 | `classes.teacher_id` is nullable | MED | DB audit |
| DB-5 | `irt_item_bank.options` JSONB lacks CHECK constraint | MED | DB audit |
| DB-6 | `usernames.username` indexed but not UNIQUE | HIGH | DB audit |
| DB-7 | 7 tables missing `updated_at` auto-trigger | LOW | DB audit |
| DB-8 | 9 multi-permissive RLS policies on `assessment_responses` and `irt_item_bank` | MED | Supabase advisor |
| DB-9 | 68 unused indexes (write overhead) | LOW | Supabase advisor |
| DB-10 | No CHECK constraint on `learning_style_profile` percentages summing to 100 | LOW | DB audit |

### Sub-plan 3 — Frontend loading/error/Suspense gaps

| ID | Title | Severity | Source |
|---|---|---|---|
| FE-1 | 29/32 `/app/*` routes missing `loading.tsx` | HIGH | FE audit |
| FE-2 | 15/32 `/app/*` routes missing `error.tsx` | HIGH | FE audit |
| FE-3 | Only 9 Suspense boundaries in entire app | MED | FE audit |
| FE-4 | Lesson player has no skeleton for the bulky RPC fetch | MED | FE audit |

### Sub-plan 4 — Frontend consistency

| ID | Title | Severity | Source |
|---|---|---|---|
| FE-5 | 172 raw `<button>` instead of `@/components/ui/Button` | MED | FE audit |
| FE-6 | 17 hardcoded hex colors in JSX (`page.tsx`, `StudentStepComponents.tsx`, ui-preview) | LOW-MED | FE audit |
| FE-7 | Repeated card pattern 30×; input focus styles 3× — candidates for `@apply` | LOW | FE audit |
| FE-8 | 90% of inline styles concentrated in ui-preview demo (acceptable) | LOW | FE audit |

### Sub-plan 5 — i18n coverage

| ID | Title | Severity | Source |
|---|---|---|---|
| I18N-1 | Admin pages have ~50+ hardcoded English strings | MED | FE audit |
| I18N-2 | "Continue Learning", "Back to Assessments", "Loading..." not translated | MED | FE audit |
| I18N-3 | No `en.json`/`hi.json`/`as.json` keys for B5/B7 error toasts | MED | branch state |
| I18N-4 | No CI lint rule preventing hardcoded JSX literals | LOW | FE audit |

### Sub-plan 6 — Component decomposition (god classes)

| ID | Title | Severity | Source |
|---|---|---|---|
| ARCH-1 | `useTeacherOnboarding` 1017 LOC, 256 outgoing deps | HIGH | Graph |
| ARCH-2 | `LessonPage` 954 LOC | HIGH | Graph |
| ARCH-3 | `AssessmentRunner` 812 LOC | HIGH | Graph |
| ARCH-4 | `SignUpStep` 766 LOC | HIGH | Graph |
| ARCH-5 | `134_seed_curriculum_content.sql` 13197 LOC | MED | Graph |
| ARCH-6 | `createClient` (server) has 128 incoming calls — pages instantiating instead of using middleware | MED | Graph |
| ARCH-7 | `admin-metrics.ts` 966 LOC, `teacher-communication.ts` 956 LOC | MED | Graph |
| ARCH-8 | `rate-limiter-distributed.ts` 973 LOC — already a re-export shim; underlying modules may need split | LOW | Graph |

### Sub-plan 7 — Design system v5 (Assam aesthetic, modern animations)

| ID | Title | Severity | Source |
|---|---|---|---|
| DESIGN-1 | No v5 design tokens (Muga gold, Brahmaputra blue, Bihu red, tea-garden green) | HIGH | spec |
| DESIGN-2 | Typography hardcoded to system fonts; Sora + Noto Sans Bengali/Devanagari not wired | HIGH | spec |
| DESIGN-3 | No `motion` library; no shared spring variants | HIGH | spec |
| DESIGN-4 | No Mascot component reuse of the logo robot | MED | spec |
| DESIGN-5 | No StreakFlame, MugaCard, Brahmaputra-progress components | MED | spec |
| DESIGN-6 | Dark mode tokens partially defined but not applied per screen | MED | spec |
| DESIGN-7 | No confetti / Bihu-themed celebrations | LOW | spec |

### Sub-plan 8 — UX for rural Assam (results from pending audit)

(Placeholder — pending background agent output. Will include: bandwidth/offline UX, touch ergonomics, cognitive load, family/shared device patterns, AI tutor UX, assessment UX, teacher offline flows, empty-state delight.)

### Sub-plan 9 — Performance hardening

| ID | Title | Severity | Source |
|---|---|---|---|
| PERF-1 | No Lighthouse Mobile measurement of canonical dashboards | MED | Audit gap |
| PERF-2 | 68 unused indexes — drop after 2-week observation | LOW | DB audit |
| PERF-3 | No prefetch hints for adjacent learn/M*/T* routes | LOW | FE audit |
| PERF-4 | No Suspense around slow server-component fetches → blocks render | MED | FE audit |
| PERF-5 | Dashboard stats fetch via Promise.all but no Suspense wrapper → still blocks first paint | MED | BE audit |
| PERF-6 | Lesson generator has `maxDuration=60` but no progress indicator while waiting | MED | BE audit |

### Sub-plan 10 — Accessibility

| ID | Title | Severity | Source |
|---|---|---|---|
| A11Y-1 | Some `<button>` lack `min-h-[44px]` (touch target) | MED | UX audit pending |
| A11Y-2 | `aria-label` audit passed; verify with axe-core in CI | INFO | FE audit + axe spec |
| A11Y-3 | `prefers-reduced-motion` not honored across animations (when added) | MED | spec |
| A11Y-4 | Modal close: Escape works (B2 fixed), Tab-trap not verified | LOW | spec gap |

### Sub-plan 11 — Operations / CI / Observability

| ID | Title | Severity | Source |
|---|---|---|---|
| OPS-1 | No CI workflow file checked in (`.github/workflows`) | HIGH | repo state |
| OPS-2 | No automated `get_advisors` polling in CI | MED | infra gap |
| OPS-3 | No Sentry / error tracking wired in (auth-logger references but no DSN config visible) | MED | code search |
| OPS-4 | No health-check endpoint at `/api/health` for readiness probes | MED | repo state |
| OPS-5 | E2E test plan (`docs/superpowers/plans/2026-05-12-e2e-test-plan.md`) not yet implemented in `tests/` | MED | plan state |

### Sub-plan 12 — Documentation

| ID | Title | Severity | Source |
|---|---|---|---|
| DOC-1 | `apps/web/src/types/database.ts` regeneration not in package.json scripts | LOW | DB audit |
| DOC-2 | `docs/DATABASE.md` may be out of date vs migrations 165–177 | LOW | claude.md |
| DOC-3 | Per-feature `specs/<feature>/design.md` only exists for 5 of N features | LOW | claudemd |
| DOC-4 | No public README explaining the project / setup / Assam audience | LOW | repo state |

## Issue volume summary

| Type | Open | Closed |
|---|---|---|
| SEC | 6 | 1 (m177) |
| DB | 10 | 0 |
| FE | 4 | 0 |
| I18N | 4 | 0 |
| ARCH | 8 | 0 |
| DESIGN | 7 | 0 |
| UX | TBD | 0 |
| PERF | 6 | 0 |
| A11Y | 4 | 0 |
| OPS | 5 | 0 |
| DOC | 4 | 0 |
| **TOTAL** | **~58 + UX** | **12** |

## Definition of "production-ready"

When all sub-plans 1, 2, 3, 5, 8, 9, 10, 11 are GREEN (✅), the codebase is production-ready for rural-Assam launch.
Sub-plans 4, 6, 7, 12 are polish — can ship post-launch.
