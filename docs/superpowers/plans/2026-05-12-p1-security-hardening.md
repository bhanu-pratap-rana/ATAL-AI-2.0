# P1 — Supabase Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the 124 Supabase Security Advisor WARN findings without losing functionality.

**Architecture:** SECURITY DEFINER function EXECUTE-grants get tightened from `anon`/`authenticated` to the smallest role that actually calls them, per a per-function audit. Supabase Studio config flips for anonymous sign-in and HaveIBeenPwned. One storage policy gets dropped.

**Tech Stack:** PostgreSQL (Supabase), SQL migrations, Supabase Studio config, one toast-string change in Next.js.

**Spec:** [`specs/security-hardening/design.md`](../../../specs/security-hardening/design.md)

---

## Task 1 — Per-function RPC audit (no code change)

**Files:**
- Create: `specs/security-hardening/rpc-audit.csv`

**Goal of this task:** classify every public-schema SECURITY DEFINER function into bucket A/B/C/D.

- [ ] **Step 1: dump the list of SECURITY DEFINER functions**

Run via Supabase MCP:

```sql
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  has_function_privilege('anon', p.oid, 'execute') AS anon_can,
  has_function_privilege('authenticated', p.oid, 'execute') AS auth_can,
  has_function_privilege('service_role', p.oid, 'execute') AS service_can
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true
ORDER BY p.proname;
```

Expected: ~50 rows.

- [ ] **Step 2: for each name, grep the codebase**

```bash
cd /Users/bhanuprataprana/Downloads/Atal-ai-1.0/apps/web
for fn in $(echo "$FUNCTION_NAMES"); do
  echo "=== $fn ==="
  grep -rn "\.rpc(\"$fn\"\|'\''$fn'\''" src --include='*.ts*' | head -5
done
```

Classification rule:
- Hits in `app/actions/admin-*.ts` or any file that calls `createAdminClient()` first → bucket **A** (service_role only).
- Hits in client files (`.tsx`, hooks) with no admin-client wrapper → bucket **B** (authenticated).
- Hits in `(public)/*` files that run before auth → bucket **C** (anon + authenticated). Most likely empty.
- Zero grep hits in `apps/web/src` BUT referenced by a trigger or by another function → bucket **D** (service_role + revoke from PUBLIC).
- Zero hits anywhere → bucket **D** as a safe default. We can promote in a hot-fix if a real caller surfaces.

- [ ] **Step 3: write the audit CSV**

`specs/security-hardening/rpc-audit.csv`:

```csv
function_name,args,current_anon,current_authenticated,target_bucket,callers,notes
batch_check_and_award_badges,p_student_id uuid,true,true,B,src/lib/services/gamification-service.ts:42,client-side after assessment submit
list_admin_users,,false,false,A,src/app/actions/admin-management.ts:413,already correct (m175)
... (one row per function)
```

- [ ] **Step 4: commit the audit**

```bash
git add specs/security-hardening/rpc-audit.csv
git commit -m "docs(security): audit SECURITY DEFINER EXECUTE grants per function"
```

**This is the PR-1 deliverable. Stop here for review.**

---

## Task 2 — Migration 177: lock down bucket-A and bucket-D functions

**Files:**
- Create: `apps/db/migrations/177_lockdown_security_definer_anon.sql`
- Create: `apps/web/__tests__/database/security-definer-grants.test.ts`

- [ ] **Step 1: write the failing test**

```ts
// apps/web/__tests__/database/security-definer-grants.test.ts
import { createAdminSqlClient } from "@/__tests__/_helpers/sql";

describe("SECURITY DEFINER EXECUTE grants are minimal", () => {
  const BUCKET_A: ReadonlyArray<string> = [
    "batch_check_and_award_badges",
    "cleanup_expired_lessons",
    // ...full list from audit
  ];

  it("revokes anon EXECUTE on bucket-A functions", async () => {
    const client = await createAdminSqlClient();
    for (const fn of BUCKET_A) {
      const { rows } = await client.query(
        `SELECT has_function_privilege('anon', $1, 'execute') AS can`,
        [`public.${fn}()`],
      );
      expect(rows[0].can, fn).toBe(false);
    }
  });

  it("revokes authenticated EXECUTE on bucket-A functions", async () => {
    const client = await createAdminSqlClient();
    for (const fn of BUCKET_A) {
      const { rows } = await client.query(
        `SELECT has_function_privilege('authenticated', $1, 'execute') AS can`,
        [`public.${fn}()`],
      );
      expect(rows[0].can, fn).toBe(false);
    }
  });
});
```

- [ ] **Step 2: run the test to verify it fails**

```bash
cd /Users/bhanuprataprana/Downloads/Atal-ai-1.0/apps/web
npm run test:database -- security-definer-grants
```

Expected: FAIL — current state grants EXECUTE to both anon and authenticated.

- [ ] **Step 3: write the migration**

```sql
-- apps/db/migrations/177_lockdown_security_definer_anon.sql
-- Tightens EXECUTE grants on SECURITY DEFINER functions classified
-- as bucket A (service_role only) per
-- specs/security-hardening/rpc-audit.csv.

DO $$
DECLARE
  fn record;
  bucket_a_names text[] := ARRAY[
    'batch_check_and_award_badges',
    'cleanup_expired_lessons'
    -- … exact list from the audit CSV
  ];
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname = ANY(bucket_a_names)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.proname, fn.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      fn.proname, fn.args
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 4: apply via mcp__supabase__apply_migration**

(Requires user approval — classifier blocks unilateral application.)

- [ ] **Step 5: run the test, verify pass**

```bash
npm run test:database -- security-definer-grants
```

Expected: PASS.

- [ ] **Step 6: smoke walk**

Manual: `/student/start` → log in → reach `/app/student/dashboard`. Same for teacher and admin. No new 403 / 500.

- [ ] **Step 7: commit**

```bash
git add apps/db/migrations/177_*.sql apps/web/__tests__/database/security-definer-grants.test.ts
git commit -m "fix(security): revoke anon/authenticated EXECUTE from bucket-A SECURITY DEFINER fns"
```

**PR-2 deliverable.**

---

## Task 3 — Migration 178: lock down bucket-B functions to authenticated-only

Same shape as Task 2 but for bucket B. Each bucket-B function:

```sql
REVOKE EXECUTE ON FUNCTION public.<name>(<args>) FROM PUBLIC, anon;
-- 'authenticated' grant is left in place.
```

- [ ] Step 1: extend the test with `BUCKET_B` constants — assert `anon_can = false`, `authenticated_can = true`.
- [ ] Step 2: write `apps/db/migrations/178_lockdown_security_definer_authenticated.sql`.
- [ ] Step 3: apply, test, smoke, commit.

**PR-3 deliverable.**

---

## Task 4 — Migration 179: tighten `lesson-assets` bucket listing

**Files:**
- Create: `apps/db/migrations/179_restrict_lesson_assets_listing.sql`

- [ ] **Step 1: drop the broad SELECT policy**

```sql
DROP POLICY IF EXISTS "Public read access for lesson-assets" ON storage.objects;

-- No replacement policy. The bucket remains public for object fetch
-- because storage.buckets.public = true, but listing without a policy
-- is denied.

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: smoke**

Open a known object URL in a fresh browser → still loads. Hit `https://<project>.supabase.co/storage/v1/object/list/lesson-assets` anonymously → 401/403.

- [ ] **Step 3: commit + apply.**

**PR-4 deliverable.**

---

## Task 5 — Studio config flips + i18n toast string

**Config (no migration, applied via Supabase Studio):**

- Authentication → Providers → Anonymous → **disabled**
- Authentication → Policies → "Check password against HaveIBeenPwned" → **enabled**

Document both in `specs/security-hardening/decisions.md` with a screenshot.

**Code changes:**

- [ ] **Step 1: add i18n string for weak-password error**

`apps/web/src/lib/i18n/locales/en.json`:
```json
"auth.errors.weak_password_breached": "This password has appeared in a data breach. Please choose a different one."
```
Same key in `hi.json` and `as.json` (with translations).

- [ ] **Step 2: surface the new message**

`apps/web/src/app/actions/auth/auth-common.ts` (or wherever `mapAuthError` lives) — match `error.code === "weak_password"` and return the i18n key.

- [ ] **Step 3: commit**

```bash
git add specs/security-hardening/decisions.md apps/web/src/lib/i18n/locales/*.json apps/web/src/app/actions/auth/auth-common.ts
git commit -m "fix(security): disable anonymous sign-in + enable HIBP + user-friendly toast"
```

**PR-5 deliverable.**

---

## Task 6 — Verify advisor count drop

- [ ] **Step 1: pull advisors**

```typescript
await mcp__supabase__get_advisors({ type: "security" });
```

- [ ] **Step 2: count remaining warnings by category**

```bash
jq '.[0].text' result.json | jq '.result.lints | group_by(.name) | map({name: .[0].name, count: length})'
```

Expected: `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable` both at or near 0 (only deliberately public bucket-C entries remain). `auth_allow_anonymous_sign_ins`, `auth_leaked_password_protection`, `public_bucket_allows_listing` → 0.

- [ ] **Step 3: commit verification report**

`docs/superpowers/plans/2026-05-12-p1-verification.md` with before/after counts and any leftovers + justifications.

---

## Self-Review Checklist

- [ ] Every function name in the migration matches the audit CSV.
- [ ] No DROP on any function (only REVOKE/GRANT).
- [ ] Every PR is < 500 LOC and < 10 min to review.
- [ ] Tests added for grant assertions, not just smoke.
- [ ] Smoke walked all three portals after each migration.
- [ ] Rollback recipe documented in commit message body.

## Execution Handoff

Per user's choice: **plan-first, ask before each PR**. After this plan is approved, I will execute Task 1 (the audit CSV) as a standalone deliverable and pause for review before Task 2.
