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
- Vertex AI / Imagen in production: Requires GCP service account + Vercel secrets.
- Comprehensive E2E flows: Teacher/student authenticated tests need real Supabase creds in CI.
- sw.js cache quota: Add `navigator.storage.estimate()` before caching to prevent storage exhaustion on low-end Android.
- Security audit unblocked: `npm audit --audit-level=high` has `continue-on-error: true`. Change to blocking once known vulnerabilities are patched.
- CI on feature branches: Currently only runs on pushes to `main`. Add `push: branches: ['feature/**']` to catch regressions earlier.
- Redis rate limiting for other server actions: Only OTP functions use Redis-backed rate limiting. Teacher/student/admin mutations could also benefit.
