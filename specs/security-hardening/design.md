# Security Hardening — Design Spec

**Status:** Draft · Awaiting approval
**Owner:** Bhanu Pratap Rana
**Date:** 2026-05-12
**Related:** Supabase Security Advisor (124 WARN findings), `apps/db/migrations/170_*`, `apps/db/migrations/173_*`–`175_*`

## Problem

Supabase's database-linter flags 124 security warnings on production. The dominant categories are:

1. **91 SECURITY DEFINER RPCs callable from `anon` and/or `authenticated` roles.** A `SECURITY DEFINER` function executes with the privileges of its owner (typically `postgres`), so any caller can effectively bypass RLS for whatever the function does. When the EXECUTE grant is given to `anon` or `authenticated`, every visitor or logged-in user can fire those privileged operations directly through `/rest/v1/rpc/<name>`. The only ones currently locked down are `list_admin_users` (added in m175) and a handful of recent ones (`get_student_streak`, `check_curriculum_completion`, etc.).
2. **31 advisor instances of `auth_allow_anonymous_sign_ins`.** Supabase Auth has anonymous sign-in enabled. Each anonymous JWT carries `aud=authenticated` once issued, which means anonymous visitors gain access to every authenticated-only RLS path. The app does not actually need anonymous sign-in (every entry point requires a real student/teacher/admin account).
3. **1 leaked-password-protection finding.** Supabase's HaveIBeenPwned integration is disabled. Compromised passwords slip through during student/teacher registration.
4. **1 public-bucket finding.** `storage.objects` has a broad SELECT policy on bucket `lesson-assets` that allows clients to list every object in the bucket. Direct URL access works without listing — the list policy is excessive surface area.

## Goals

- Every public-schema function is callable only by the roles that actually need it.
- Anonymous sign-in is disabled (or scoped if any guest flow turns out to depend on it).
- HaveIBeenPwned check is enabled on Supabase Auth.
- `lesson-assets` bucket grants object-fetch but not directory listing.
- Zero net loss of functionality — existing student / teacher / admin flows continue to work.
- Roll-out is reversible. Every migration has a documented `down` recipe.

## Non-Goals

- Refactoring the SECURITY DEFINER pattern itself. We keep the existing functions; we only tighten EXECUTE grants.
- Touching RLS policies (already addressed in m170 / m172 / m173 / m174 / m176).
- Rewriting auth providers or magic-link flows.

## Design

### 1. SECURITY DEFINER EXECUTE-grant audit

Each function gets classified into one of four buckets based on which routes / server actions actually call it. The audit lives in [`specs/security-hardening/rpc-audit.csv`](./rpc-audit.csv) — produced by inspecting `grep -rn 'rpc("\?<name>\?"' apps/web/src` for every name.

| Bucket | Intended caller | EXECUTE grant after migration |
|---|---|---|
| **A. Service-role only** | Server-side `createAdminClient()` only. The RPC is privileged (writes auth.users, reads cross-tenant data, etc.). | `service_role` only |
| **B. Authenticated + role-checked** | Called from a logged-in client (browser) but the function itself checks `auth.uid()` / role at the top. | `authenticated` only |
| **C. Anonymous-permitted** | Genuinely needs guest access (e.g. a "look up curriculum module by id" RPC used pre-login). | `anon` + `authenticated` |
| **D. Internal trigger** | Used by a trigger only; should not be exposed via REST at all. | `service_role` only, plus revoke from `PUBLIC` |

**Default classification:** bucket **A** unless the audit shows a real client-side caller.

The migration that lands this is one of:
- `apps/db/migrations/177_lockdown_security_definer_anon.sql` — for everything that drops to bucket A or D.
- `apps/db/migrations/178_lockdown_security_definer_authenticated.sql` — for functions that drop from `anon+authenticated` to `authenticated`-only.

Each function gets:

```sql
REVOKE EXECUTE ON FUNCTION public.<name>(<args>) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO <bucket-roles>;
```

We never `DROP` a function. Reverting is `GRANT EXECUTE … TO anon, authenticated;`.

### 2. Anonymous sign-in

We disable anonymous sign-in via the Supabase project setting (Authentication → Providers → Anonymous → off). The change is config-only and applied via the Supabase Studio (no migration). We document it in `specs/security-hardening/decisions.md`.

Before flipping the switch, we run a one-time SQL count:

```sql
SELECT count(*) FROM auth.users WHERE is_anonymous = true;
```

— if non-zero we keep their session valid (existing JWTs are not invalidated) but no new anon sessions can be created.

### 3. HaveIBeenPwned

Enabled via Supabase Studio (Authentication → Policies → "Check password against HaveIBeenPwned"). Config-only. Documented in decisions.md.

Side effect: `auth.signUp` will reject passwords found in the breach corpus with `code = "weak_password"`. The student signup flow already shows generic error toasts, so no UI change required — but we update the toast message to be specific:

> "This password has appeared in a data breach. Please choose a different one."

This requires a small change in [`apps/web/src/app/actions/auth/auth-common.ts`](../../apps/web/src/app/actions/auth/auth-common.ts) (or wherever `mapAuthError` lives) and an entry in `lib/i18n/locales/en.json` (+ hi.json + as.json).

### 4. `lesson-assets` bucket listing

Drop the broad SELECT policy and replace it with a narrower one. Two options:

**Option A — keep bucket public for object URLs but block listing:**
```sql
DROP POLICY IF EXISTS "Public read access for lesson-assets" ON storage.objects;
-- No replacement: bucket already marked public=true, which grants object fetch
-- via storage.objects' built-in public-bucket short-circuit. Listing requires a
-- policy; without one, listing is denied.
```

**Option B — make bucket private + use signed URLs:** larger change. Defer.

We pick **Option A**. Migration: `apps/db/migrations/179_restrict_lesson_assets_listing.sql`.

## Rollout

Per project rule (PRs ≤10 min to review, ≤500 LOC):

| PR | Files | LOC est. | Review focus |
|---|---|---|---|
| **PR-1** | `specs/security-hardening/rpc-audit.csv` only | <200 | The classification table itself. No code changes. |
| **PR-2** | `apps/db/migrations/177_*.sql` + tests/database script that asserts new grants | ~250 | Bucket A + D revoke-from-anon migration |
| **PR-3** | `apps/db/migrations/178_*.sql` + tests | ~150 | Bucket B revoke-from-anon migration |
| **PR-4** | `apps/db/migrations/179_restrict_lesson_assets_listing.sql` | ~30 | Storage policy |
| **PR-5** | Studio config notes + i18n toast string | ~30 | Document HaveIBeenPwned + anon sign-in disablement |

Each PR can be merged independently. If a Bucket-B function turns out to have an anonymous caller we missed, we move it back to Bucket C in a hot-fix PR — reversible.

## Verification

After each PR:

1. **Database-linter clean-up check.** `mcp__supabase__get_advisors type=security` — the corresponding warning entries should be gone for the functions in that PR.
2. **App smoke.** Run the existing Playwright smoke set + a fresh manual walk of `/student/start` → dashboard, `/teacher/start` → dashboard, `/admin/login` → dashboard. No new 403 / 500.
3. **Test suite.** `npm test` (32/32) + `npm run test:database` for the SQL assertions.
4. **Build.** `npm run build`.

## Rollback

Every migration has a documented `down`. If anything breaks on production:
```sql
GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO anon, authenticated;
```
…can restore the pre-migration grants in seconds.

## Open Questions

- **Q1.** Does the app rely on `anon` reads anywhere (e.g. unauthenticated landing-page calls to `get_modules_with_counts` for a public preview)? Audit will tell.
- **Q2.** Does `auth_allow_anonymous_sign_ins` need to stay enabled for any IT-Bytes-Limited tutorial / preview flow we don't yet support? If not, hard-disable.
- **Q3.** Do we want to add a CI check that fails when a new SECURITY DEFINER function is added without a corresponding EXECUTE-grant line in the migration?

## Acceptance

- Advisor count drops from 91 SECURITY-DEFINER warnings to 0 (or single-digit, all justified).
- `auth_allow_anonymous_sign_ins` warning disappears.
- `auth_leaked_password_protection` warning disappears.
- `public_bucket_allows_listing` warning disappears.
- All Playwright + unit tests still pass.
- No new console errors on a smoke walk of the three portals.
