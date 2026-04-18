-- Migration 168: Fix auth_rls_initplan on assessment_sessions + harden function search_path
--
-- Closes two advisor lints uncovered by the v1.0.0.0 post-ship scan:
--
-- 1. Performance: `auth_rls_initplan` WARN on public.assessment_sessions_select.
--    Bare `auth.uid()` was being re-evaluated per row. Wrapping in `(select auth.uid())`
--    lets Postgres cache the subquery result once per query. Same OI-4 pattern applied to
--    assessment_responses in migration 163.
--
-- 2. Security: `function_search_path_mutable` WARN on four public functions.
--    An attacker with schema creation rights on an accessible schema could shadow
--    built-ins. Pinning `search_path = public, extensions` removes that surface.

DROP POLICY IF EXISTS assessment_sessions_select ON public.assessment_sessions;

CREATE POLICY assessment_sessions_select
  ON public.assessment_sessions
  FOR SELECT
  USING (
    ((select auth.uid()) IS NOT NULL)
    AND (
      user_id = (select auth.uid())
      OR EXISTS (
        SELECT 1
        FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        WHERE e.student_id = assessment_sessions.user_id
          AND c.teacher_id = (select auth.uid())
      )
    )
  );

ALTER FUNCTION public.get_assessment_comparison(p_user_id uuid)
  SET search_path = public, extensions;
ALTER FUNCTION public.has_assessment_type(p_user_id uuid, p_type text)
  SET search_path = public, extensions;
ALTER FUNCTION public.get_connection_stats()
  SET search_path = public, extensions;
ALTER FUNCTION public.check_curriculum_completion(p_student_id uuid)
  SET search_path = public, extensions;
