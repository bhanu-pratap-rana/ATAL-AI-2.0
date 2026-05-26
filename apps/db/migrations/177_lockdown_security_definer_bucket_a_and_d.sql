-- Migration 177: lockdown SECURITY DEFINER EXECUTE grants for bucket A + D
--
-- Per specs/security-hardening/rpc-audit.csv:
--
--   Bucket A (service_role only): functions that are admin/maintenance-only
--     in their app callers. Currently callable by anon and authenticated.
--   Bucket D (service_role only, revoke from PUBLIC): trigger-fired
--     functions. They have zero REST callers — every EXECUTE grant is
--     pure attack surface.
--
-- This migration revokes EXECUTE on all of them from PUBLIC, anon, and
-- authenticated. It grants EXECUTE to service_role explicitly so the
-- application admin client and trigger machinery can still call them.
--
-- Rollback recipe (if a legitimate caller is found post-deploy):
--   GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO authenticated;
--
-- See specs/security-hardening/design.md for the bucket-classification
-- approach.

DO $$
DECLARE
  fn record;
  -- Bucket A: maintenance / admin-only via createAdminClient
  bucket_a text[] := ARRAY[
    'cleanup_expired_lessons',
    'cleanup_old_sync_logs',
    'get_connection_stats',
    'get_school_metrics',
    'list_admin_users',   -- already locked in m175; idempotent
    'rotate_staff_pin'
  ];
  -- Bucket D: trigger-only. Never called via REST.
  bucket_d text[] := ARRAY[
    'create_user_on_student_profile',
    'create_user_on_teacher_profile',
    'ensure_user_exists_for_enrollment',
    'set_assessment_response_user_id',
    'update_irt_item_bank_updated_at'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname = ANY(bucket_a || bucket_d)
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
