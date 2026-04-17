# Changelog

All notable changes to ATAL AI are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.1.0] - 2026-04-17 — Audit remediation

Closes the critical, high, and medium findings from the v1.0.0.0 production audit.
All twelve commits sit on `fix/v1.0.0.0-audit-remediation`.

### Security
- **C1 — Close unprotected render window on role-gated dashboards** (`ecccf36`, `96d84ae`).
  Student, teacher, and admin dashboards and admin sub-pages (`/app/admin/performance`,
  `/app/admin/schools`) now verify role server-side in the page before any markup renders.
  Previously a brief client-side check left a render window where a cross-role user could
  see partial UI. `96d84ae` closed the admin/schools gap missed in the original C1 commit
  — split the former 820-line `page.tsx` into a server page + `SchoolsClient.tsx`.
- **C2 — Fail-closed rate limiter for auth/PIN/OTP endpoints** (`2bf2248`). Added a `failMode`
  configuration to `RateLimitConfig`; security-critical endpoints (login, PIN verify, OTP)
  now reject on Redis outage instead of degrading to local in-memory limits. Prevents brute
  force attempts from sliding through during an infra incident.
- **H4 — No-store cache on teacher student-search** (`0d77134`). Removed the 60-second cache
  on `/api/teacher/students/search`; a teacher's query should never be served from another
  teacher's cache entry.

### Changed
- **C3 — Auto-replay queued mutations on online + mount** (`ed3e771`). Offline sync queue now
  triggers on both `online` events and component mount so a user who returns after a long
  offline session drains pending writes without manual intervention.
- **H1 — StudentProgressGrid realtime subscription scoped to class roster** (`239ca2a`). The
  teacher grid's realtime channel previously subscribed to all progress rows. Now filters
  server-side by `class_id` so unrelated students' activity no longer rerenders the grid.
- **H3 — Atomic `upsert_learning_style_profile` RPC** (`908446d`). Migration 166 adds the RPC;
  client now calls it instead of a multi-step insert/update. Drops dead helper functions
  from the previous try/catch flow.
- **H5 — Prefer `.maybeSingle()` for nullable reads per rule.md** (`d1cac5c`). Learning
  profile and announcement INSERT+SELECT flows no longer throw on zero-row results.
- **H6 — Streak bucketing uses Asia/Kolkata date via `get_student_streak` RPC** (`1197467`).
  Migration 167 adds timezone-aware streak calculation. Replaces the 85-line client-side
  date loop with a single RPC call.
- **Advisor-diff fix — `auth_rls_initplan` on `assessment_sessions` + four
  `function_search_path_mutable`.** Migration 168 rewraps two bare `auth.uid()` calls in
  `assessment_sessions_select` with `(select auth.uid())` (same OI-4 pattern as
  `assessment_responses`), and pins `search_path = public, extensions` on
  `get_assessment_comparison`, `has_assessment_type`, `get_connection_stats`, and
  `check_curriculum_completion`. Both advisor regressions clear; `auth_rls_initplan` count
  back to 0.

### Design system
- **OI-5 — Centralize role gradients on CSS custom properties** (`dc8017f`). Twenty-five
  components migrated from inline gradient literals (`linear-gradient(135deg, ...)`) to
  `var(--gradient-primary)`, `var(--gradient-teacher)`, and `var(--gradient-admin)`. Byte
  identical output; future recolors happen in one place (`globals.css`).

### Accessibility
- **OI-3 — 44×44 tap targets and ARIA labels on icon-only controls** (`36d068c`).
  `AppTopHeader` sign-out button, `BottomNav` tab links, and the non-compact
  `SyncStatusIndicator` now meet WCAG 2.5.5 AAA. Added `aria-label` and `aria-current="page"`.

### i18n
- **Role and skill labels now translate** (`fb65443`). Added `role` and `skill` namespaces to
  `en.json` / `hi.json` / `as.json`. Server components read the preference from a new
  `atal-app-language` cookie (mirrored alongside localStorage by `LanguageProvider.setLanguage`)
  via `getServerLanguage()`, so the settings page role banner and student assessments skill
  badges localize without a client-boundary hoist.

### Tests
- **Task 15 — E2E suite scaffold** (`9ebe01c`). New `tests/e2e/` directory with
  `00-pwa-install.spec.ts` (manifest shape + service-worker registration + head link) and
  `02-role-gating.spec.ts` (parameterized unauthenticated redirect over eleven protected
  paths). Remaining eight specs deferred — see `tests/e2e/README.md` for per-spec blockers
  (Supabase MCP test branch, `@axe-core/playwright` dep, visual baselines).

### Deferred
- **T14 — FK index `idx_practice_questions_student_id`** is already present since
  migration 067. Dead-RPC cleanup for the thirty-six candidate RPCs requires
  `pg_stat_user_functions` call-count verification and is deferred; no functions dropped
  in this release.

## [1.0.0.0] - 2026-04-02 — Production Ready

This release marks ATAL AI's production readiness milestone. Security, performance, and data
integrity work from Phase 2 code quality hardening — the platform is now safe to ship to
students and teachers.

### Security
- **IRT answer key protected (OI-1 closed):** Column-level RLS applied to `irt_item_bank`.
  `correct_answer`, difficulty/discrimination/guessing IRT parameters, `scoring_key`,
  `model_answer`, and `answer_explanation` are no longer accessible to authenticated students.
  16 safe columns (question text, options, unit metadata) remain readable for lesson rendering.
  Students can no longer reverse-engineer correct answers from the API.
- **RLS query plan optimized (OI-4 closed):** `assessment_responses` select policy now wraps
  `auth.uid()` in `(SELECT auth.uid())` — Postgres caches the value once per query instead of
  re-evaluating the function on every row. Scales cleanly as response tables grow.

### Added
- **AverageScore streams independently:** Student dashboard Avg Score card is now an async
  Server Component wrapped in `<Suspense>`. The rest of the dashboard renders immediately — the
  score streams in when its two-query fetch completes. No more waiting on the slowest card.
- **Sync log broadcasts realtime (OI-2 closed):** `sync_log` added to `supabase_realtime`
  publication. PWA offline sync events now broadcast to subscribed clients — ready for
  `BackgroundSyncInitializer` re-activation.

### Changed
- **Average score = correctness %, not IRT mastery:** Avg Score card now reads from
  `assessment_responses` (correct items ÷ total items × 100). Matches the calculation on the
  `/progress` page. Removes dependence on the `mastery_score` IRT scale (0–1) which was
  confusing to display as a student-facing metric.
- **AverageScore query is atomic:** Rewrote from two separate COUNT round-trips to a single
  `.select("is_correct")` query — eliminates the non-atomic race window between total and
  correct counts. Dashboard no longer crashes on Supabase errors; falls back to "--" gracefully.

## [0.1.0.0] - 2026-04-02

### Added
- **Trilingual i18n:** All microlearning lesson strings (LessonPlayer, LessonCompletionModal) now
  use `getTranslation()` — fully externalized for English, Hindi, and Assamese. No more
  hardcoded labels in components.
- **OTP brute-force protection:** `resetPasswordWithOtp` now enforces `checkOtpVerifyRateLimit`
  (5 attempts per 15 minutes) — students can no longer guess OTP codes for password reset.
- **Streak counts all activity:** Student dashboard streak now includes AI Tutor sessions and
  Assessment completions alongside lesson views, matching the streak logic on the `/learn` page.
- **Offline sync skeleton:** `<Suspense>` for AdaptiveRecommendations now shows a height-matched
  skeleton placeholder instead of `null`, preventing layout shift when recommendations load.

### Changed
- **Brand gradient token unified:** CSS variable `--gradient-primary` updated to match the
  orange→gold (`#F98819` → `#FFD166`) used consistently across the app. All inline gradient
  literals in student dashboard, main dashboard, and curriculum pages replaced with
  `var(--gradient-primary)`.
- **Sync queue performance:** `getStatus()` and `getFailedItems()` now use indexed Dexie
  `.where().count()` queries instead of loading all IndexedDB rows into memory and filtering
  in JavaScript.
- **Responsive sync UI:** Sync status subscription callbacks in `SyncStatusIndicator` and
  `OfflineBanner` now wrap `setStatus` in React 19 `startTransition`, keeping the UI
  responsive on low-end Android devices during background sync.
- **Redundant subscriber calls eliminated:** `notifySubscribers()` in the sync queue checks for
  actual state changes before invoking subscribers — no spurious re-renders on every sync tick.
- **Redis error safety:** `redis-rate-limiter.server.ts` now registers an `on('error')` handler
  to prevent unhandled EventEmitter errors from crashing the Node process when Redis is
  unreachable.

### Fixed
- **CLS on lesson images (FINDING-008):** Loading placeholder height now matches loaded image
  container height (`h-[200px] md:h-[250px]`), eliminating a ~40px layout shift on mobile
  during lesson playback.
- **Brand color consistency (FINDING-001–007):** Teacher portal CTAs, assessment stat colors,
  and arbitrary `text-[11px]` sizes all aligned to the brand design system — orange gradient
  for primary actions, Tailwind type scale for text sizes.
- **Streak under-count (FINDING-011):** Dashboard was only counting lesson activity for the
  daily streak. Students using the AI Tutor or completing assessments now see their streak
  correctly maintained.
