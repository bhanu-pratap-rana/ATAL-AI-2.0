-- Migration 170: Tighten irt_item_bank RLS
--
-- Problem: The authenticated SELECT policy allowed ANY logged-in user to read
-- ALL active assessment items including correct_answer via the Supabase REST API.
-- A student could bypass the app and query the item bank directly with their JWT.
--
-- Fix: Remove the permissive authenticated SELECT. All server-side access to
-- irt_item_bank now uses createAdminClient() (service_role), which is exempt
-- from RLS. Students and teachers have no direct row-level access.

-- Drop the overly-permissive student/authenticated SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read active items" ON irt_item_bank;
DROP POLICY IF EXISTS "irt_item_bank_authenticated_select" ON irt_item_bank;

-- Admin/super_admin policy (already exists — keep it, just ensure it's present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'irt_item_bank'
      AND policyname = 'irt_item_bank_admin_all'
  ) THEN
    CREATE POLICY irt_item_bank_admin_all ON irt_item_bank
      FOR ALL
      USING (
        (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('admin', 'super_admin')
      );
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
