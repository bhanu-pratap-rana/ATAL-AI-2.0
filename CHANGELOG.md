# Changelog

All notable changes to ATAL AI are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
