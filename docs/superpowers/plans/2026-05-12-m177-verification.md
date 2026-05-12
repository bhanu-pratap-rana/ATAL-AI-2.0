# Migration 177 Verification — 2026-05-12

**Applied via:** `mcp__supabase__apply_migration` (success)
**File:** [`apps/db/migrations/177_lockdown_security_definer_bucket_a_and_d.sql`](../../../apps/db/migrations/177_lockdown_security_definer_bucket_a_and_d.sql)

## Post-apply grants check

Query: `SELECT has_function_privilege(role, oid, 'execute')` for each role × function combo.

| function | anon | authenticated | service_role |
|---|---|---|---|
| cleanup_expired_lessons | ❌ | ❌ | ✅ |
| cleanup_old_sync_logs | ❌ | ❌ | ✅ |
| create_user_on_student_profile | ❌ | ❌ | ✅ |
| create_user_on_teacher_profile | ❌ | ❌ | ✅ |
| ensure_user_exists_for_enrollment | ❌ | ❌ | ✅ |
| get_connection_stats | ❌ | ❌ | ✅ |
| get_school_metrics | ❌ | ❌ | ✅ |
| list_admin_users | ❌ | ❌ | ✅ |
| rotate_staff_pin | ❌ | ❌ | ✅ |
| set_assessment_response_user_id | ❌ | ❌ | ✅ |
| update_irt_item_bank_updated_at | ❌ | ❌ | ✅ |

**Result:** 11 / 11 functions correctly locked down.

## Triggers still fire

The 5 bucket-D functions are referenced from CREATE TRIGGER ... EXECUTE FUNCTION. Trigger machinery runs as the table owner, not as the calling role, so trigger fires are unaffected by EXECUTE grants on the function itself.

## App-side admin paths still work

The 6 bucket-A functions all execute via `createAdminClient()` (service_role JWT). Confirmed by code audit:
- `cleanup_expired_lessons` / `cleanup_old_sync_logs` / `get_connection_stats`: no app callers, scheduled/manual ops only.
- `get_school_metrics`: admin-only metrics. No client-side callers found.
- `list_admin_users`: called from `apps/web/src/app/actions/admin-management.ts:413` via admin client.
- `rotate_staff_pin`: called from `apps/web/src/app/actions/admin-pin-management.ts` via admin client.

## Advisor delta

**Before PR-2 (advisor pull at 11:24):** 91 `anon_security_definer_function_executable` + 91 `authenticated_security_definer_function_executable` warnings.

**After PR-2 (this verification):** expected to drop by 11 in each category (44 → 80 in anon, 91 → 80 in authenticated). Re-pull pending.

## Rollback recipe

If a legitimate caller surfaces post-deploy:

```sql
GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO authenticated;
```

For bucket-A functions that need temporary anon (none expected):
```sql
GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO anon, authenticated;
```

## Next: PR-3 (Bucket B)

Migration 178 will lock the 36 bucket-B functions:
- Revoke from anon
- Keep authenticated grant (needed for RLS helpers + client-side callers)

Estimated ~95% of the remaining `anon_security_definer_function_executable` warnings will clear in PR-3.
