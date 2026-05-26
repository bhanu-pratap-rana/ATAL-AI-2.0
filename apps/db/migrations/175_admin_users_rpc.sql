-- Migration 175: list_admin_users RPC + dashboard admin counter
--
-- Background: Supabase Auth admin API call `auth.admin.listUsers()` is
-- currently failing on this project with "Database error finding users"
-- (a known Supabase infra issue when something in the auth schema is
-- mis-aligned). That breaks:
--   - /admin/admins  (empty list, "No admin accounts found")
--   - /admin/dashboard totalAdmins counter (always 0)
--   - any other admin server action that paginates auth.users.
--
-- Fix: expose `auth.users` (filtered to admins) through a SECURITY
-- DEFINER RPC so callers can hit the database directly via service_role
-- and bypass the broken Auth admin endpoint.

CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    u.id,
    u.email::text,
    (u.raw_app_meta_data ->> 'role')::text AS role,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  WHERE u.raw_app_meta_data ->> 'role' IN ('admin', 'super_admin')
  ORDER BY u.created_at ASC
$$;

COMMENT ON FUNCTION public.list_admin_users() IS
  'Returns all admin/super_admin users. SECURITY DEFINER so callers can fetch even when the Supabase Auth admin REST API is unavailable.';

REVOKE ALL ON FUNCTION public.list_admin_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO service_role;

NOTIFY pgrst, 'reload schema';
