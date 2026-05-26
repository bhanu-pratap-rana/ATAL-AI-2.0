-- Migration 198: fix infinite RLS recursion between enrollments + classes
--
-- F38 (SP14 full-pass E2E with demo accounts): joinClass for a demo
-- student returned "Failed to enroll in class" and the postgres log
-- carried:
--
--   42P17: infinite recursion detected in policy for relation "enrollments"
--
-- Root cause: a cyclic dependency between the SELECT/INSERT/UPDATE/
-- DELETE policies of `classes` and `enrollments`.
--
--   * `classes_select` USING
--       (teacher_id = auth.uid())
--       OR EXISTS (SELECT 1 FROM enrollments e WHERE
--                  e.class_id = classes.id AND e.student_id = auth.uid())
--
--   * `enrollments_insert/update/delete` references
--       EXISTS (SELECT 1 FROM classes c WHERE
--               c.id = enrollments.class_id AND c.teacher_id = auth.uid())
--
-- Each subselect re-triggered the other table's policy. Postgres'
-- planner detects the cycle at planning time even when one branch
-- of an OR would short-circuit at runtime.
--
-- Two SECURITY DEFINER helpers were already defined for exactly this
-- purpose (migrations 188-191):
--
--   public.is_class_teacher(p_class_id uuid) -> boolean
--   public.is_enrolled_in_class(p_class_id uuid) -> boolean
--
-- Both bypass RLS internally because they are owned by `postgres` and
-- marked SECURITY DEFINER. Calling them inside a policy breaks the
-- cross-table cycle while preserving the exact same authorization
-- semantics (teacher of the class, or student enrolled in it).

-- ── classes ──
DROP POLICY IF EXISTS classes_select ON public.classes;
CREATE POLICY classes_select ON public.classes
  FOR SELECT TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    OR public.is_enrolled_in_class(classes.id)
  );

-- ── enrollments ──
DROP POLICY IF EXISTS enrollments_insert ON public.enrollments;
CREATE POLICY enrollments_insert ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    OR (
      EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = (SELECT auth.uid()))
      AND public.is_class_teacher(class_id)
    )
  );

DROP POLICY IF EXISTS enrollments_update ON public.enrollments;
CREATE POLICY enrollments_update ON public.enrollments
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = (SELECT auth.uid()))
    AND public.is_class_teacher(class_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = (SELECT auth.uid()))
    AND public.is_class_teacher(class_id)
  );

DROP POLICY IF EXISTS enrollments_delete ON public.enrollments;
CREATE POLICY enrollments_delete ON public.enrollments
  FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.teacher_profiles tp WHERE tp.user_id = (SELECT auth.uid()))
    AND public.is_class_teacher(class_id)
  );
