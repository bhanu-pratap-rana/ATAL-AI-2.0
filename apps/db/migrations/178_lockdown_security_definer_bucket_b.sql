-- Migration 178: lockdown SECURITY DEFINER bucket B functions
--
-- Per specs/security-hardening/rpc-audit.csv, bucket B = functions that
-- are called from authenticated user sessions (server actions, client
-- code, or RLS-policy expressions). They need `authenticated` EXECUTE,
-- but NOT `anon`. This migration revokes anon EXECUTE on all 36.
--
-- The 11 RLS-helper functions (is_teacher, is_class_teacher, etc.) MUST
-- keep authenticated EXECUTE so RLS policies that call them continue
-- to evaluate. We leave the authenticated grant in place explicitly.
--
-- Bucket C (get_user_id_by_username, verify_staff_pin) is intentionally
-- LEFT OUT — those are pre-auth lookups that require anon access.
--
-- Rollback: GRANT EXECUTE ON FUNCTION public.<name>(<args>) TO anon;

DO $$
DECLARE
  fn record;
  bucket_b text[] := ARRAY[
    -- RLS helpers (must keep authenticated EXECUTE)
    'current_user_role',
    'is_class_teacher',
    'is_enrolled_in_class',
    'is_teacher',
    'get_teacher_class_ids',
    'get_teacher_student_ids',
    'get_user_enrolled_class_ids',
    'teacher_has_student_access',
    -- Already anon-locked (idempotent listing)
    'check_curriculum_completion',
    'get_assessment_comparison',
    'get_student_streak',
    'has_assessment_type',
    'upsert_learning_style_profile',
    -- Server actions / authenticated callers
    'batch_check_and_award_badges',
    'get_announcements_with_reads',
    'get_class_leaderboard',
    'get_class_roster',
    'get_class_student_progress',
    'get_module_topics',
    'get_module_units_with_topics',
    'get_modules_with_counts',
    'get_topic',
    'get_topic_context',
    'get_unread_announcements',
    'increment_auditory_score',
    'increment_material_download',
    'increment_text_score',
    'increment_visual_score',
    'match_curriculum',
    'match_curriculum_hybrid',
    'search_students_for_teacher',
    'submit_assessment',
    'update_knowledge_state',
    'update_progress_atomic',
    'upsert_generated_lesson',
    'upsert_student_profile'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname = ANY(bucket_b)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      fn.proname, fn.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
      fn.proname, fn.args
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
