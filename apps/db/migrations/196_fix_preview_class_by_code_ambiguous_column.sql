-- Migration 196: fix preview_class_by_code ambiguous column error
--
-- F31 (SP14 E2E session): /join?code=X&pin=Y deep-link Continue-as-Guest
-- flow surfaced a Postgres 42702 error inside `preview_class_by_code`:
--
--   column reference "class_id" is ambiguous
--   It could refer to either a PL/pgSQL variable or a table column.
--
-- The RPC was declared `RETURNS TABLE(class_id uuid, ...)` and the body
-- contained `WHERE class_id = c.id` inside a `(SELECT ... FROM enrollments)`
-- subquery. Inside that subquery, `class_id` could resolve to either the
-- RETURNS TABLE OUT param or `enrollments.class_id` — Postgres refuses to
-- pick. Qualifying the column with the `e.` alias on the enrollments
-- subquery removes the ambiguity.
--
-- Only the inner subquery is changed; the GRANT/REVOKE policy is left as
-- migration 191 declared it.

CREATE OR REPLACE FUNCTION public.preview_class_by_code(p_class_code text)
RETURNS TABLE(class_id uuid, class_name text, subject text, teacher_name text, student_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT c.id, c.name, c.subject,
    COALESCE(tp.name, 'Unknown Teacher') AS teacher_name,
    COALESCE((SELECT COUNT(*)::INTEGER FROM enrollments e WHERE e.class_id = c.id), 0) AS student_count
  FROM classes c LEFT JOIN teacher_profiles tp ON tp.user_id = c.teacher_id
  WHERE c.class_code = p_class_code LIMIT 1;
END; $$;

REVOKE ALL ON FUNCTION public.preview_class_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_class_by_code(text) TO authenticated;
