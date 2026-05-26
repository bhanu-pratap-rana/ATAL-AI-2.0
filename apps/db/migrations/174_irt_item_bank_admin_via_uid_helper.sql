-- Migration 174: irt_item_bank admin RLS via SECURITY DEFINER helper
--
-- Background: migration 173 rewrote `irt_item_bank_admin_all` to check
-- `auth.jwt() -> 'app_metadata' ->> 'role'`. In practice the JWT does not
-- always carry `app_metadata.role` (depends on auth hook config), so even
-- a super_admin gets 403 from /rest/v1/irt_item_bank.
--
-- Fix: introduce a SECURITY DEFINER helper `public.current_user_role()`
-- that reads `raw_app_meta_data->>'role'` from `auth.users`. SECURITY DEFINER
-- executes with the function owner's privileges (postgres), so the lookup
-- succeeds even though the calling user (`authenticated`) has no SELECT on
-- `auth.users`. The function is marked STABLE and granted to authenticated.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (raw_app_meta_data ->> 'role')::text
  FROM auth.users
  WHERE id = (SELECT auth.uid())
  LIMIT 1
$$;

COMMENT ON FUNCTION public.current_user_role() IS
  'Returns the calling user''s app_metadata.role from auth.users. SECURITY DEFINER so RLS users can use it in policies.';

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Replace the irt_item_bank admin policy to use the helper.
DROP POLICY IF EXISTS "irt_item_bank_admin_all" ON irt_item_bank;

CREATE POLICY "irt_item_bank_admin_all"
  ON irt_item_bank
  FOR ALL
  TO authenticated
  USING (
    public.current_user_role() = ANY (ARRAY['admin', 'super_admin'])
  )
  WITH CHECK (
    public.current_user_role() = ANY (ARRAY['admin', 'super_admin'])
  );

COMMENT ON POLICY "irt_item_bank_admin_all" ON irt_item_bank IS
  'Admin/super_admin full access via SECURITY DEFINER helper. Works regardless of JWT app_metadata propagation.';

NOTIFY pgrst, 'reload schema';
