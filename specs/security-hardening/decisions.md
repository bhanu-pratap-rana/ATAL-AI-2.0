# Security Hardening — Decisions Log

## 2026-05-12 · Disable anonymous sign-in

**Status:** Pending Studio toggle (config-only, no migration).

**Decision:** Disable `auth.allow_anonymous_sign_ins` for the project.

**Why:** the app has no guest / anonymous-preview flow today. Every entry
point (`/student/start`, `/teacher/start`, `/admin/login`) requires real
credentials. Anonymous sign-in adds 31 advisor warnings and gives every
anon visitor a JWT with `aud=authenticated` — meaning anonymous attackers
can reach RLS paths intended for logged-in users.

**Pre-flight check (run once before flipping):**

```sql
SELECT count(*) FROM auth.users WHERE is_anonymous = true;
```

If zero, safe to disable. If non-zero, decide whether to revoke those
sessions (sign-out scope=others) or leave them to expire naturally.

**Action:** In Supabase Studio → Authentication → Providers → Anonymous
→ toggle off.

**Rollback:** toggle back on; existing anon JWTs are valid for their
configured lifetime (default 1 hour) regardless of this setting.

**Acceptance:** Re-run `mcp__supabase__get_advisors type=security`; the
31 `auth_allow_anonymous_sign_ins` warnings should be gone.

---

## 2026-05-12 · Enable HaveIBeenPwned check

**Status:** Pending Studio toggle (config-only, no migration).

**Decision:** Enable Supabase Auth's HaveIBeenPwned (HIBP) compromised-
password check.

**Why:** student / teacher signups currently accept any password ≥ 8
characters. HIBP rejects passwords found in known breach corpora (e.g.
`123456789`, `qwerty`, `password1`). For rural-Assam students reusing
passwords across services, this is a real attack-surface reduction.

**Action:** In Supabase Studio → Authentication → Policies → toggle
**"Check password against HaveIBeenPwned"** on.

**Side effect:** When a user tries to set a breached password, the
Supabase Auth call returns `error.code === "weak_password"`. Both
`auth-otp.ts:resetPasswordWithOtp` and `teacher-onboard.ts:setPassword`
detect this and return `error: "i18n:errors.weakPasswordBreached"`
(added in this PR — wired to friendly EN/HI/AS translations).

**Rollback:** toggle off in Studio. Currently-set passwords are
unaffected.

**Acceptance:** Re-run `mcp__supabase__get_advisors type=security`; the
1 `auth_leaked_password_protection` warning should be gone.

---

## 2026-05-12 · `lesson-assets` bucket listing locked

**Status:** ✅ Applied — migration `179_restrict_lesson_assets_listing.sql`.

**Decision:** Drop the broad `Public read access for lesson-assets` SELECT
policy on `storage.objects`.

**Why:** the bucket is `public = true`, so direct object URLs continue to
work via Supabase's built-in public-bucket short-circuit. The dropped
policy was the only enabler of `/storage/v1/object/list/lesson-assets`
(directory listing), which the app never uses and which leaks the full
file inventory to anonymous clients.

**Verified post-apply:** `pg_policies` count of the named policy is 0;
`storage.buckets.public` for `lesson-assets` is `true`.

**Rollback:**
```sql
CREATE POLICY "Public read access for lesson-assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'lesson-assets');
```

---

## 2026-05-12 · SECDEF lockdown progression

**Status:** ✅ m177 + m178 + m179 applied.

| Migration | Functions / objects | Verified |
|---|---|---|
| m177 | 11 bucket-A + D (service-role only) | ✅ |
| m178 | 31 bucket-B (authenticated only) | ✅ |
| m179 | 1 storage.objects policy dropped | ✅ |

Remaining open security-advisor concerns covered by Studio toggles
documented above. Bucket-C (`get_user_id_by_username`, `verify_staff_pin`)
intentionally still callable by `anon` — they are pre-auth lookups.
