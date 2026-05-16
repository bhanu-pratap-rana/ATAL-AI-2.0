-- Migration 197: fix get_class_leaderboard ambiguous student_id (42702)
--
-- F34 (SP14 full-pass E2E session): on the student dashboard the panel
-- BadgesLeaderboardPanel calls supabase.rpc("get_class_leaderboard")
-- four times during mount and StrictMode double-invoke; each call
-- returned 400 with:
--
--   42702: column reference "student_id" is ambiguous
--          It could refer to either a PL/pgSQL variable or a table column.
--
-- The RPC declared `RETURNS TABLE(student_id uuid, student_name text,
-- total_points bigint, rank integer)`. Inside the body a CTE re-used
-- those same column names (`SELECT e.student_id, COALESCE(...) AS
-- student_name, ... AS total_points`). At the outer SELECT
-- (`sp.student_id, sp.student_name, sp.total_points`) Postgres could
-- not decide whether the reference targeted the CTE column or the
-- RETURNS TABLE OUT param, so it bailed at execution time.
--
-- Rename the CTE columns to sid / sname / pts so they cannot collide
-- with the OUT param names. Output columns, types, ordering, and the
-- GRANT/REVOKE policy from migration 191 are preserved -- the JS
-- client and the generated TypeScript types in apps/web are
-- unchanged.

CREATE OR REPLACE FUNCTION public.get_class_leaderboard(p_class_id text, p_limit integer DEFAULT 10)
RETURNS TABLE(student_id uuid, student_name text, total_points bigint, rank integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_caller uuid;
  v_class_uuid uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    v_class_uuid := p_class_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF NOT (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = v_class_uuid AND c.teacher_id = v_caller)
    OR EXISTS (SELECT 1 FROM enrollments en WHERE en.class_id = v_class_uuid AND en.student_id = v_caller)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH sp AS (
    SELECT
      e.student_id AS sid,
      COALESCE(prof.name, 'Unknown') AS sname,
      COALESCE(SUM(ph.points), 0) AS pts
    FROM enrollments e
    LEFT JOIN student_profiles prof ON prof.user_id = e.student_id
    LEFT JOIN points_history ph ON ph.student_id = e.student_id
    WHERE e.class_id = v_class_uuid
    GROUP BY e.student_id, prof.name
  )
  SELECT
    sp.sid,
    sp.sname,
    sp.pts,
    (ROW_NUMBER() OVER (ORDER BY sp.pts DESC))::INTEGER
  FROM sp
  ORDER BY sp.pts DESC
  LIMIT p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_class_leaderboard(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_leaderboard(text, integer) TO authenticated;
