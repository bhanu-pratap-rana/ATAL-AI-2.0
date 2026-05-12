# Admin Portal — Full Option Verification — 2026-05-12

**Account tested:** `atal.app.ai@gmail.com` (super_admin)
**Driver:** Playwright MCP, Chromium 1280×800, dev server `http://localhost:3000`
**Screenshots:** [`tests/.screenshots/2026-05-12-e2e-smoke/`](../../../tests/.screenshots/2026-05-12-e2e-smoke/)

## Verdict

**12 of 13 admin options work. 1 broken: `/admin/questions` (IRT Item Bank) — RLS 403 for super_admin.**

## Option-by-Option Result

| # | Option | Route | Result | Screenshot |
|---|--------|-------|--------|-----------|
| 1 | Dashboard banner + welcome | `/admin/dashboard` | ✅ Live email shown | `07-admin-dashboard.png` |
| 2 | Schools tile (393) → modal list | `/admin/dashboard` → DataModal | ✅ All 393 rows render w/ district, DISE code, PIN status | `10-admin-schools-modal.png` |
| 3 | Teachers tile (3) → modal list | DataModal | ✅ 3 rows w/ email, school, phone, joined date | `11-admin-teachers-modal.png` |
| 4 | Students tile (31) → modal list | DataModal | ✅ 31 rows; Bengali/Assamese script renders correctly (i18n verified) | `12-admin-students-modal.png` |
| 5 | Active PINs tile (5) → modal list | DataModal | ✅ Title "Schools with Active PINs (5)" | `13-admin-active-pins.png` |
| 6 | Inactive PINs tile (388) → modal list | DataModal | ✅ Title "Schools without PINs (388)" | `14-admin-inactive-pins.png` |
| 7 | Manage Admins | `/admin/admins` | ✅ Empty state + role legend render | `08-admin-manage-admins.png` |
| 8 | Create Admin form | `/admin/admins` (toggle) | ✅ Email + password + confirm-password form appears inline | `15-admin-create-form.png` |
| 9 | PIN Management — 3-step wizard | `/admin/pins` | ✅ Step 1 Find School → Step 2 PIN Status → Step 3 Generate/Rotate PIN; "Generate New PIN" button visible | `09-admin-pins.png`, `16-admin-pin-selected.png` |
| 10 | Admin Role Setup | `/admin/setup` | ✅ Renders "Set admin role for a user account" — Check Status / Set Admin Role | `17-admin-setup.png` |
| 11 | First-time-setup gate | `/admin/create` | ✅ Correctly shows "Access Denied — Admin Account Already Exists" | `18-admin-create.png` |
| 12 | Feature Flags | `/admin/features` | ✅ 5 flags rendered (3 enabled: Adaptive Learning 100%, Badge Automation 100%, Offline Sync 100%; 2 disabled: Teacher Assessment Creation 0%, Voice AI Tutor 10%) | `19-admin-features.png` |
| 13 | **IRT Item Bank** | `/admin/questions` | ❌ **BROKEN** — "Failed to load questions" + 403 from Supabase REST | `20-admin-questions.png` |
| 14 | Admin Account Management (Delete + Create wizard) | `/admin/manage` | ✅ Step 1 Delete / Step 2 Create renders, confirmation dialog implemented | `21-admin-manage.png` |
| 15 | Logout | Header button | ✅ Clears session → redirects to `/admin/login`; revisiting `/admin/dashboard` after logout also redirects to login (auth gate confirmed) | `22-admin-logout-redirect.png` |

## Bugs Found

### B1 — `/admin/questions` (IRT Item Bank) returns 403 for super_admin (CRITICAL)
- **Repro:** Logged in as super_admin, navigate to `/admin/questions`. UI shows "Failed to load questions. Please try again." Console: `Failed to load resource: 403` from `irt_item_bank?select=...`.
- **Network:** `GET https://hnlsqznoviwnyrkskfay.supabase.co/rest/v1/irt_item_bank?...` → **403**.
- **Root cause:** Migration `170_tighten_irt_item_bank_rls.sql` (line 16-29) wraps the policy creation in `IF NOT EXISTS`, so it never replaces the broken policy from migration `039_fix_irt_item_bank_rls_policies.sql` (line 59-76). The old policy uses `EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' IN ('admin','super_admin'))` — but RLS runs as the user's grant role, which does **not** have SELECT on `auth.users`. The EXISTS sub-query silently returns false → 403.
- **Fix:** Either:
  - Drop the old policy first (`DROP POLICY IF EXISTS "irt_item_bank_admin_all" ON irt_item_bank;`) at the top of `170_tighten_irt_item_bank_rls.sql` and remove the `IF NOT EXISTS` guard, **or**
  - Switch the new policy to `(SELECT auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin','super_admin')` and force it to replace.
- **Files:**
  - [`apps/db/migrations/170_tighten_irt_item_bank_rls.sql:16-29`](../../../apps/db/migrations/170_tighten_irt_item_bank_rls.sql#L16-L29)
  - [`apps/db/migrations/039_fix_irt_item_bank_rls_policies.sql:59-76`](../../../apps/db/migrations/039_fix_irt_item_bank_rls_policies.sql#L59-L76)
  - Frontend that triggers it: [`apps/web/src/app/(public)/admin/questions/page.tsx:73`](../../../apps/web/src/app/(public)/admin/questions/page.tsx#L73)
- **Severity:** Blocks all super_admin question management (categories, levels, languages, individual question editing). 0 questions visible in the bank from this UI.

### B2 — DataModal does not close on Escape key (a11y)
- **Repro:** Open any dashboard metric drill-in modal, press Escape. Modal stays open.
- **Workaround:** Click the `[aria-label="Close modal"]` X icon or "Close" button.
- **Fix:** Add a `keydown` listener for `Escape` in `DataModal`.
- **File:** [`apps/web/src/components/admin/DashboardMetrics.tsx:395`](../../../apps/web/src/components/admin/DashboardMetrics.tsx#L395)

### B3 — `[PeriodicSync] Permission not granted` warning floods console in dev (cosmetic)
- Service worker calls `periodicSync.register()` unconditionally.
- **Fix:** Guard with `permissions.query({ name: 'periodic-background-sync' })` before registering, or filter the warning in dev.

## Console / Network Health

- **Dashboard + 5 modals:** 0 errors. Only PeriodicSync warning (B3).
- **Manage Admins / Create Admin form:** 0 errors.
- **PIN Management:** 0 errors. School list and 3-step wizard load cleanly.
- **`/admin/setup` / `/admin/create` / `/admin/features` / `/admin/manage`:** 0 errors.
- **`/admin/questions`:** 2 errors (B1).
- **Auth `/auth/v1/user`:** 200 OK throughout.

## Coverage Gaps (not yet exercised)

- **Inside-modal interactions:** clicking an individual school/teacher/student row inside a DataModal. Need to confirm whether row-click opens a detail panel.
- **Mutations not executed:** Did not actually create a new admin, generate a PIN, set admin role, or toggle a feature flag. UI verified; write-path 200/RLS not yet confirmed end-to-end.
- **`/admin/admins` Reset Password / Delete actions:** Not exercised because the admins list was empty.
- **Multi-role isolation:** Did not log in as student or teacher to confirm they cannot reach any `/admin/*` route.

## Recommended Next Steps

1. **Fix B1 (RLS).** Author migration `173_force_irt_item_bank_admin_policy.sql` that drops + recreates the admin policy using JWT-based role check. Required before super_admin can manage assessment questions.
2. **Fix B2 (Escape key).** 5-line patch in `DataModal`.
3. **Add Playwright spec** that signs in as super_admin and asserts each option in the table above renders without console errors. This is exactly what sub-plan E of the master E2E plan (`docs/superpowers/plans/2026-05-12-e2e-test-plan.md`) covers.
