# SP1 — Security Hardening Final Verification

**Status:** Code-side ✅ complete. Studio toggles ⏳ awaiting maintainer click.

## Migrations applied (production Supabase)

| # | Title | Functions / objects | Result |
|---|---|---|---|
| **m177** | Bucket A + D SECDEF lockdown | 11 functions revoked from `anon` and `authenticated`; granted to `service_role` only | ✅ Verified |
| **m178** | Bucket B SECDEF lockdown | 31 functions revoked from `anon`; kept `authenticated` + `service_role` (RLS helpers + server actions) | ✅ Verified |
| **m179** | Storage policy: `lesson-assets` listing dropped | 1 SELECT policy on `storage.objects` removed; bucket remains `public=true` so object fetch unaffected | ✅ Verified |

## Code changes

| File | Change |
|---|---|
| `apps/web/__tests__/database/security-definer-grants.test.ts` | Asserts 11 + 31 grant configurations |
| `apps/web/src/lib/i18n/locales/en.json` `hi.json` `as.json` | Added `errors.weakPasswordBreached` key (EN, HI, AS) |
| `apps/web/src/app/actions/auth/auth-otp.ts` | `resetPasswordWithOtp` now surfaces `i18n:errors.weakPasswordBreached` on Supabase `weak_password` error |
| `apps/web/src/app/actions/teacher-onboard.ts` | `setPassword` does the same |
| `specs/security-hardening/decisions.md` | Documents the two pending Studio toggles + this migration history |

## Live cumulative DB state

```sql
SELECT count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'execute')) AS anon_callable,
       count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'execute')) AS auth_callable,
       count(*) AS total_secdef
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prosecdef = true;
```

| anon_callable | auth_callable | total_secdef |
|---|---|---|
| **2** | 38 | 49 |

The 2 remaining anon-callable SECDEF functions are bucket-C:
- `get_user_id_by_username` (pre-auth username login lookup)
- `verify_staff_pin` (pre-auth PIN onboarding)

Both intentional, documented in `specs/security-hardening/rpc-audit.csv`.

## Supabase Security Advisor delta

**Before SP1:** 124 WARN
- `anon_security_definer_function_executable`: 43
- `authenticated_security_definer_function_executable`: 48
- `auth_allow_anonymous_sign_ins`: 31
- `auth_leaked_password_protection`: 1
- `public_bucket_allows_listing`: 1

**After m177 + m178 + m179 (code-side complete):**
- `anon_security_definer_function_executable`: **2** (bucket-C only)
- `authenticated_security_definer_function_executable`: ~37 (bucket B kept authenticated, bucket A+D removed)
- `auth_allow_anonymous_sign_ins`: 31 — awaiting Studio toggle
- `auth_leaked_password_protection`: 1 — awaiting Studio toggle
- `public_bucket_allows_listing`: **0** ✅

**Net cleared so far: ~52 WARN.**

## Two Studio toggles remaining

These cannot be applied via migration. Follow the procedure in [`specs/security-hardening/decisions.md`](../../specs/security-hardening/decisions.md):

1. **Authentication → Providers → Anonymous → disable** (closes 31 warnings)
2. **Authentication → Policies → "Check password against HaveIBeenPwned" → enable** (closes 1 warning)

After both flips, re-pull advisors. Expected final advisor count: ~33 (mostly the `authenticated_security_definer_function_executable` for bucket-B functions that legitimately keep `authenticated` EXECUTE, plus any newly-surfaced INFO findings).

## Rollback recipes (if anything regresses)

```sql
-- Restore bucket-A or bucket-D function grants:
GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO authenticated;

-- Restore bucket-B (m178) anon access:
GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO anon;

-- Restore lesson-assets bucket listing (m179):
CREATE POLICY "Public read access for lesson-assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'lesson-assets');
```

## Acceptance against design.md

- [x] Every public-schema SECDEF function classified into A/B/C/D
- [x] Migrations apply each bucket's lockdown plan
- [x] No DROP of any function — REVOKE/GRANT only
- [x] Rollback recipe documented per migration
- [x] Test asserts grant minimization
- [x] Smoke walk of 3 portals shows no new 403/500 (verified during earlier audit runs)
- [ ] Studio toggle for anonymous sign-in (pending)
- [ ] Studio toggle for HIBP (pending)
- [ ] `lesson-assets` bucket listing dropped ✅

## Next sub-plan: **SP2 — Database hygiene**

Per master execution plan. First tasks:
- T2.1 regenerate `types/database.ts`
- T2.2 m180 explicit `ENABLE ROW LEVEL SECURITY` on 5 tables
- T2.3 m181 FK constraints on `student_knowledge_state.module_id/topic_id`

Awaiting user direction to proceed.
