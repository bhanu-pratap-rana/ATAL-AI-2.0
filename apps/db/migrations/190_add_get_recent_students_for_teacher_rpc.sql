-- 190_add_get_recent_students_for_teacher_rpc.sql
--
-- PR-62 (audit 2026-05-15): collapse the 3-step teacher-dashboard waterfall
--   classes(teacher) → enrollments(class_id) → student_profiles(student_id)
-- into one SECURITY DEFINER call. Saves 2 RTTs on every teacher landing-page
-- load (matters most on low-end Android over 4G).
--
-- The function is SECURITY DEFINER but only ever returns students enrolled
-- in classes owned by the caller (auth.uid()), so it doesn't widen any
-- existing access surface — it just replaces the same logic done in three
-- separate RLS-bound queries.

CREATE OR REPLACE FUNCTION public.get_recent_students_for_teacher(
  p_limit integer DEFAULT 5
)
RETURNS TABLE(
  user_id uuid,
  name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_teacher_id uuid;
BEGIN
  v_teacher_id := auth.uid();

  IF v_teacher_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT is_teacher() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH recent AS (
    SELECT DISTINCT ON (e.student_id) e.student_id, e.created_at
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE c.teacher_id = v_teacher_id
    ORDER BY e.student_id, e.created_at DESC
  )
  SELECT sp.user_id, sp.name
  FROM recent r
  JOIN student_profiles sp ON sp.user_id = r.student_id
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recent_students_for_teacher(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recent_students_for_teacher(integer) TO authenticated;

COMMENT ON FUNCTION public.get_recent_students_for_teacher(integer) IS
  'Returns the most recently enrolled students across the calling teacher''s own classes. Replaces the classes→enrollments→profiles waterfall on teacher dashboard.';
