# TODOS — Deferred Work

Items captured from Phase 5 engineering review (2026-03-28).

## Phase 6 — BackgroundSync Mutation Replay (Deferred)

sw.js now registers `sync` event and messages clients. But the client-side `SyncQueue`
(in `lib/offline/sync-queue.ts`) needs to be connected to the `BackgroundSyncInitializer`
message listener. Currently `triggerMutationSync()` is called on SW message — this is
wired in `BackgroundSyncInitializer.tsx`. Verify end-to-end with:
1. Go offline
2. Submit an assessment
3. Come back online
4. Check that the queued mutation syncs to Supabase

## Other Deferred Items

- i18n system: Assamese/Hindi translations are hardcoded in components. Full rewrite is multi-quarter.
  **Partial v0.1.0.0 (2026-04-02):** LessonPlayer and LessonCompletionModal now use `getTranslation()`. Remaining components still use inline strings.
- Vertex AI / Imagen in production: Requires GCP service account + Vercel secrets.
- Comprehensive E2E flows: Teacher/student authenticated tests need real Supabase creds in CI.
- sw.js cache quota: Add `navigator.storage.estimate()` before caching to prevent storage exhaustion on low-end Android.
- Security audit unblocked: `npm audit --audit-level=high` has `continue-on-error: true`. Change to blocking once known vulnerabilities are patched.
- CI on feature branches: Currently only runs on pushes to `main`. Add `push: branches: ['feature/**']` to catch regressions earlier.
- Redis rate limiting for other server actions: Only OTP functions use Redis-backed rate limiting. Teacher/student/admin mutations could also benefit.

## Open Items from v0.1.0.0 Production Readiness Manifest

- **OI-1 (Medium — Security):** `correct_answer` column on `irt_item_bank` visible to authenticated students. Add column-level `REVOKE/GRANT SELECT` or a masking view. SQL: `REVOKE SELECT ON irt_item_bank FROM authenticated; GRANT SELECT (id, question_text, options, difficulty, discrimination, guessing, unit_id, created_by, created_at, updated_at) ON irt_item_bank TO authenticated;`
- **OI-2 (Low — Realtime):** `sync_log` table not added to `supabase_realtime` publication. Run: `ALTER PUBLICATION supabase_realtime ADD TABLE sync_log;` — needed when BackgroundSyncInitializer is re-enabled.
- **OI-3 (Low — A11y):** `SyncStatusIndicator.tsx:196` sync `<Button>` is icon-only with no `aria-label`. Add `aria-label="Sync pending changes"` and change from `size="sm"` (36px) to `size="default"` or `min-h-[44px]`.
- **OI-4 (Low — Perf):** RLS policies use `auth.uid()` directly (re-evaluated per row). Wrap in `(SELECT auth.uid())` for better query plan. Requires a Supabase migration touching ~30 policies.
- **OI-5 (Low — Design):** 26 remaining `style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" }}` inline literals across `ai-tools/tutor`, `assessments`, `progress`, `student/classes`, `settings`, `app-top-header`, `StudentStepComponents`. Replace with `var(--gradient-primary)`.
