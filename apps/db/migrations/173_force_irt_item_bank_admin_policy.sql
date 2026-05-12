-- Migration 173: Force-replace irt_item_bank admin RLS policy
--
-- Problem: Migration 039 created policy `irt_item_bank_admin_all` using
--   EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND
--           raw_app_meta_data->>'role' IN ('admin','super_admin'))
-- RLS runs in the requesting user's grant role (`authenticated`), which does
-- NOT have SELECT on `auth.users`. The EXISTS sub-query silently returns
-- false, so the policy denies every row → super_admin gets 403 from
-- `/rest/v1/irt_item_bank`.
--
-- Migration 170 attempted to fix this with a JWT-based check, but guarded
-- the CREATE inside `IF NOT EXISTS`, so the broken policy from 039 was
-- never replaced.
--
-- Fix: Unconditionally DROP the old policy and CREATE a JWT-based one.
-- `auth.jwt() -> 'app_metadata' ->> 'role'` reads directly from the JWT,
-- which is always accessible to the authenticated role.

DROP POLICY IF EXISTS "irt_item_bank_admin_all" ON irt_item_bank;

CREATE POLICY "irt_item_bank_admin_all"
  ON irt_item_bank
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role')
      = ANY (ARRAY['admin', 'super_admin'])
  )
  WITH CHECK (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role')
      = ANY (ARRAY['admin', 'super_admin'])
  );

COMMENT ON POLICY "irt_item_bank_admin_all" ON irt_item_bank IS
  'Admin/super_admin full access. Uses JWT app_metadata.role check (not auth.users JOIN, which fails under RLS).';

NOTIFY pgrst, 'reload schema';
