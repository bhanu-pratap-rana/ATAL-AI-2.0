-- 189_fix_search_students_scope_to_teacher_roster.sql
--
-- PR-62 (audit 2026-05-15): search_students_for_teacher was returning
-- ALL students globally (only checked is_teacher()), allowing any
-- authenticated teacher to enumerate every minor's name + phone in
-- the system. Tighten to the calling teacher's own enrolled students,
-- and drop `phone` from the return shape — the route already strips
-- it, but no reason to leak PII from the DB layer.

DROP FUNCTION IF EXISTS public.search_students_for_teacher(text, integer);

CREATE OR REPLACE FUNCTION public.search_students_for_teacher(
  p_search_query text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  name text,
  roll_number text,
  class_name text
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
  SELECT
    sp.user_id,
    sp.name,
    sp.roll_number,
    sp.class_name
  FROM student_profiles sp
  WHERE sp.user_id IN (
    SELECT DISTINCT e.student_id
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE c.teacher_id = v_teacher_id
  )
  AND (
    sp.name ILIKE '%' || p_search_query || '%'
    OR sp.roll_number ILIKE '%' || p_search_query || '%'
  )
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_students_for_teacher(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_students_for_teacher(text, integer) TO authenticated;

COMMENT ON FUNCTION public.search_students_for_teacher(text, integer) IS
  'Search students by name/roll within the calling teacher''s own classes. SECURITY DEFINER but restricted via auth.uid() join through enrollments→classes. Replaces v1 which leaked all students globally (PR-62 audit 2026-05-15).';
