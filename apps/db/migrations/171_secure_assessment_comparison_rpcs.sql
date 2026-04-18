-- Migration 171: Secure get_assessment_comparison, check_curriculum_completion,
-- has_assessment_type RPCs
--
-- Problem: Migration 162 created these SECURITY DEFINER functions with no GRANT
-- restrictions and no internal auth.uid() check. PostgreSQL defaults to PUBLIC
-- EXECUTE on SECURITY DEFINER functions, so any anonymous caller can invoke
-- get_assessment_comparison(any_uuid) and read another student's pre/post scores.
--
-- Fix: REVOKE from PUBLIC/anon, GRANT only to authenticated, add caller check.

-- ── get_assessment_comparison ─────────────────────────────────────────────────

REVOKE ALL ON FUNCTION get_assessment_comparison(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_assessment_comparison(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION get_assessment_comparison(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  pre_result  JSONB;
  post_result JSONB;
  pre_session_id  UUID;
  post_session_id UUID;
BEGIN
  -- SECURITY: only the owning student or service_role may call this
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND current_setting('role', TRUE) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get latest pre-assessment session
  SELECT s.id INTO pre_session_id
  FROM assessment_sessions s
  WHERE s.user_id = p_user_id
    AND s.session_type = 'pre'
    AND s.submitted_at IS NOT NULL
  ORDER BY s.submitted_at DESC
  LIMIT 1;

  -- Get latest post-assessment session
  SELECT s.id INTO post_session_id
  FROM assessment_sessions s
  WHERE s.user_id = p_user_id
    AND s.session_type = 'post'
    AND s.submitted_at IS NOT NULL
  ORDER BY s.submitted_at DESC
  LIMIT 1;

  -- Build pre-assessment result
  IF pre_session_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'session_id', s.id,
      'submitted_at', s.submitted_at,
      'total_questions', COUNT(r.id),
      'correct_answers', COUNT(r.id) FILTER (WHERE r.is_correct),
      'score', CASE WHEN COUNT(r.id) > 0
        THEN ROUND(100.0 * COUNT(r.id) FILTER (WHERE r.is_correct) / COUNT(r.id), 1)
        ELSE 0 END,
      'modules', (
        SELECT COALESCE(jsonb_object_agg(
          sub.module,
          jsonb_build_object(
            'total', sub.total,
            'correct', sub.correct,
            'score', CASE WHEN sub.total > 0
              THEN ROUND(100.0 * sub.correct / sub.total, 1)
              ELSE 0 END
          )
        ), '{}'::jsonb)
        FROM (
          SELECT r2.module,
                 COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE r2.is_correct) AS correct
          FROM assessment_responses r2
          WHERE r2.session_id = pre_session_id
          GROUP BY r2.module
        ) sub
      )
    )
    INTO pre_result
    FROM assessment_sessions s
    LEFT JOIN assessment_responses r ON r.session_id = s.id
    WHERE s.id = pre_session_id
    GROUP BY s.id, s.submitted_at;
  END IF;

  -- Build post-assessment result
  IF post_session_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'session_id', s.id,
      'submitted_at', s.submitted_at,
      'total_questions', COUNT(r.id),
      'correct_answers', COUNT(r.id) FILTER (WHERE r.is_correct),
      'score', CASE WHEN COUNT(r.id) > 0
        THEN ROUND(100.0 * COUNT(r.id) FILTER (WHERE r.is_correct) / COUNT(r.id), 1)
        ELSE 0 END,
      'modules', (
        SELECT COALESCE(jsonb_object_agg(
          sub.module,
          jsonb_build_object(
            'total', sub.total,
            'correct', sub.correct,
            'score', CASE WHEN sub.total > 0
              THEN ROUND(100.0 * sub.correct / sub.total, 1)
              ELSE 0 END
          )
        ), '{}'::jsonb)
        FROM (
          SELECT r2.module,
                 COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE r2.is_correct) AS correct
          FROM assessment_responses r2
          WHERE r2.session_id = post_session_id
          GROUP BY r2.module
        ) sub
      )
    )
    INTO post_result
    FROM assessment_sessions s
    LEFT JOIN assessment_responses r ON r.session_id = s.id
    WHERE s.id = post_session_id
    GROUP BY s.id, s.submitted_at;
  END IF;

  RETURN jsonb_build_object('pre', pre_result, 'post', post_result);
END;
$$;

-- ── check_curriculum_completion ───────────────────────────────────────────────

REVOKE ALL ON FUNCTION check_curriculum_completion(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION check_curriculum_completion(UUID) TO authenticated, service_role;

-- ── has_assessment_type ───────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION has_assessment_type(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION has_assessment_type(UUID, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
