# Final Bug Roundup — 2026-05-12

**Branch:** `fix/admin-portal-bugs-2026-05-12`
**Quality gates passing:** `tsc --noEmit` ✅ · `eslint --max-warnings 0` ✅ · `npm test` 32/32 ✅ · `npm run build` ✅

## Bugs Fixed (9)

| # | Title | Severity | Fix |
|---|-------|----------|-----|
| **B1** | `/admin/questions` 403 — IRT Item Bank inaccessible to super_admin | CRITICAL | Migrations 173/174/175 (RLS hardening + RPC fallback) + refactor of page to use service_role server actions in [`apps/web/src/app/actions/admin-irt.ts`](../../../apps/web/src/app/actions/admin-irt.ts). |
| **B2** | DataModal does not close on `Escape` key (a11y) | Minor | Added `keydown` listener in [`DataModal.tsx`](../../../apps/web/src/components/admin/modals/DataModal.tsx). |
| **B3** | PeriodicSync "Permission not granted" warning flooded dev console | Cosmetic | Downgraded `warn` → `debug` in [`background-sync.ts`](../../../apps/web/src/lib/offline/background-sync.ts). |
| **B5** | Create-admin failed with "Failed to access user database" | High | Refactored [`createAdminUser`](../../../apps/web/src/app/actions/admin-auth.ts) to short-circuit on super_admin auth and skip the broken `auth.admin.listUsers()` probe. |
| **B6** | `All Admin Accounts` list always empty + dashboard `totalAdmins: 0` | High | Supabase Auth admin REST endpoint returns "Database error finding users" on this project. Worked around with new migration 175 RPC `public.list_admin_users()` (SECURITY DEFINER) and routed `listAdminAccounts` + `getDashboardMetrics` through it. Also patched `auth-logger.error` to not pass trailing `undefined` (which made the Supabase error invisible behind a Console Ninja crash). |
| **B7** | `/app/settings` crashed 500: "Attempted to call getTranslation() from the server" | High | Extracted pure translation logic to new [`apps/web/src/lib/i18n/translation-core.ts`](../../../apps/web/src/lib/i18n/translation-core.ts) so server components can import it without crossing a `"use client"` boundary. |
| **U1** | Top banner read "Student Portal" for teacher on `/app/settings` | Minor | [`AppTopHeader`](../../../apps/web/src/components/ui/app-top-header.tsx) now picks the portal config from `user.app_metadata.role` (with pathname as fallback). |
| **B8** | Teacher email could silently sign in via student form | Medium | Added role-gate to [`SignInEmailForm`](../../../apps/web/src/components/student/SignInEmailForm.tsx) and [`SignInPhoneForm`](../../../apps/web/src/components/student/SignInPhoneForm.tsx) — teacher/admin accounts now get rejected with a clear "use the X login page" message. |
| **B9** | Jest config typo `setupFilesAfterFramework` — `jest.setup.ts` never loaded | Medium | Renamed to correct `setupFilesAfterEnv` in [`jest.config.js`](../../../apps/web/jest.config.js). |

**Plus 3 ESLint errors in `playwright-visual-test.mjs`** (empty / unused-`(e)` catch blocks) cleaned up.
**Plus 1 false positive** (B4 — "stuck confirm modal", was actually `<dialog open=false>` content remaining in DOM per spec).

## Pages Verified Live

### Admin portal (12 of 13 walked + all drill-ins)
- `/admin/dashboard` (tiles, modal search, Escape, ×, Close)
- `/admin/admins` (now lists 2 admins ✅ after B6 fix)
- `/admin/pins` (3-step wizard: search → select → generate)
- `/admin/features` (5 flag toggles + Refresh)
- `/admin/setup` (Check Status / Set Admin Role)
- `/admin/create` (access-denied gate active)
- `/admin/manage` (Step 1/Step 2 wizard + confirm dialog)
- `/admin/questions` (now loads 100 questions ✅ after B1 fix)
- Logout + auth gate

### Teacher portal (all 4 nav tabs)
- `/app/teacher/dashboard` (31 students, real-time grid)
- `/app/teacher/analytics/questions` (62% success rate, M1–M5 modules)
- `/app/teacher/classes` (31 student cards + working search)
- `/app/settings` (now renders cleanly + correct banner ✅ after B7/U1)
- Sign out + auth gate

## Open Items (not bugs, scope decisions)

| # | Item | Type | Notes |
|---|------|------|-------|
| U2 | No per-student drill-in route from teacher's student list | Missing feature | Would need a new `/app/teacher/students/[id]` page + design + data layer. Product decision. |
| U3 | Teacher dashboard chrome strings hardcoded English; language toggle persists but doesn't fully apply | i18n coverage | Bulk translation work — not a bug. |

## Manual Tests Still Awaiting User Verification

From [`docs/superpowers/plans/2026-05-12-manual-test-plan.md`](2026-05-12-manual-test-plan.md):
- M3 / M4 — edit + filter IRT questions
- M6 — set admin role on `/admin/setup`
- M7 — toggle a feature flag
- M8 — delete user confirm flow
- M9–M11 — full teacher / student / role-isolation walks
- M12–M15 — mobile / offline / concurrent session / rate limit

## Commits On This Branch

```
815ffde fix(test): jest setupFiles option typo + silent catch-error lint
5de677f fix(auth): cross-role login + portal banner respect actual role
8339fa8 docs(test-plan): teacher portal verification report (B7 fixed + walkthrough)
3ff6569 fix(i18n): make getTranslation server-safe by extracting to translation-core
aa0e80a docs(test-plan): record M1/M2/M5 PASS results and B6 fix
87a1622 fix(admin): work around broken Supabase Auth admin API for user listing
b415662 docs(test-plan): manual test plan for write paths Playwright couldn't fire
4b59593 docs(test-plan): run 3 verification — all 4 admin bugs resolved
4810fcc fix(admin): route /admin/questions through service_role action
7fa6922 fix(admin): allow super_admin to create admins without bootstrap probe
edc1420 docs(test-plan): run 2 verification — B2/B3 fixed, B1 awaiting DB push
b1561e9 fix(admin): resolve irt_item_bank 403, modal Escape close, log noise
```

## Migrations Applied to Production Supabase

- `m173` — JWT-path admin policy on `irt_item_bank` (defense-in-depth)
- `m174` — `current_user_role()` SECURITY DEFINER helper + policy (defense-in-depth)
- `m175` — `list_admin_users()` RPC, the actual workaround for B6

## Verdict

**All bugs fixed.** The branch is ready to push / open a PR / merge. Remaining items (U2, U3) are product/scope decisions that need your judgement, not engineering bugs.
