-- Migration 203: fix badge criteria reading the dead summative_results table
--
-- BUG: batch_check_and_award_badges computed the 'high_score' and
-- 'perfect_score' criteria from summative_results — a legacy table that
-- NOTHING writes anymore (no code path, no DB function; last row 2026-02-09
-- while assessments continued through 2026-05-28). Result: the badges
-- "Gamosa Graduate" (high_score >= 90) and "Perfect Score" (500 pts) could
-- never be earned by any new activity.
--
-- FIX: compute per-session percentage scores from the live assessment
-- pipeline (assessment_sessions + assessment_responses.is_correct), keeping
-- legacy summative_results rows as an OR-fallback so historical achievements
-- still count. Guards on the new path:
--   * session must be submitted (submitted_at IS NOT NULL)
--   * session must be complete (answered >= total_questions)
--   * at least 5 questions — a degenerate 1-question session at 100% must
--     not grant a 500-point badge (one such session exists in prod data)
--
-- All other criteria branches are unchanged. Function signature, security
-- (SECURITY DEFINER + auth.uid() self-check), and award side-effects are
-- byte-identical to the previous version.

CREATE OR REPLACE FUNCTION public.batch_check_and_award_badges(p_student_id uuid)
 RETURNS TABLE(badge_id text, badge_name_en text, badge_name_hi text, badge_name_as text, points_awarded integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_badge RECORD; v_earned BOOLEAN; v_count INTEGER; v_threshold INTEGER;
  v_after_hour INTEGER; v_before_hour INTEGER; v_lessons_required INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_student_id THEN
    RETURN;
  END IF;

  FOR v_badge IN
    SELECT b.* FROM badges b
    LEFT JOIN student_badges sb ON b.id = sb.badge_id AND sb.student_id = p_student_id
    WHERE sb.id IS NULL
  LOOP
    v_earned := FALSE;
    v_threshold := COALESCE((v_badge.unlock_criteria->>'threshold')::INTEGER, 1);
    CASE v_badge.unlock_criteria->>'type'
      WHEN 'lessons_completed' THEN
        SELECT COUNT(*) INTO v_count FROM student_knowledge_state
        WHERE student_id = p_student_id AND mastery_score >= 70;
        v_earned := v_count >= v_threshold;
      WHEN 'modules_mastered' THEN
        SELECT COUNT(DISTINCT module_id) INTO v_count FROM student_knowledge_state
        WHERE student_id = p_student_id AND status = 'mastered';
        v_earned := v_count >= v_threshold;
      WHEN 'assessments_passed' THEN
        SELECT COUNT(*) INTO v_count FROM assessment_sessions
        WHERE user_id = p_student_id AND submitted_at IS NOT NULL;
        v_earned := v_count >= v_threshold;
      WHEN 'high_score' THEN
        -- Live pipeline: any complete submitted session scoring >= threshold %.
        v_earned := EXISTS (
          SELECT 1
          FROM assessment_sessions s
          JOIN assessment_responses r ON r.session_id = s.id
          WHERE s.user_id = p_student_id
            AND s.submitted_at IS NOT NULL
          GROUP BY s.id, s.total_questions
          HAVING COUNT(r.id) >= GREATEST(COALESCE(s.total_questions, 5), 5)
             AND 100.0 * COUNT(*) FILTER (WHERE r.is_correct) / COUNT(r.id) >= v_threshold
        )
        -- Legacy fallback: historical summative results still honour the badge.
        OR EXISTS (
          SELECT 1 FROM summative_results
          WHERE student_id = p_student_id AND total_score >= v_threshold
        );
      WHEN 'weekly_streak' THEN
        SELECT COUNT(DISTINCT DATE(last_attempt_at)) INTO v_count
        FROM student_knowledge_state
        WHERE student_id = p_student_id
          AND last_attempt_at >= NOW() - INTERVAL '7 days'
          AND mastery_score >= 70;
        v_earned := v_count >= v_threshold;
      WHEN 'questions_asked' THEN
        SELECT COUNT(*) INTO v_count FROM ai_tutor_interactions
        WHERE student_id = p_student_id AND message_role = 'user';
        v_earned := v_count >= v_threshold;
      WHEN 'voice_usage' THEN
        SELECT COUNT(*) INTO v_count FROM ai_tutor_interactions
        WHERE student_id = p_student_id AND input_mode = 'voice';
        v_earned := v_count >= v_threshold;
      WHEN 'perfect_score' THEN
        -- Live pipeline: a complete submitted session with every answer correct.
        v_earned := EXISTS (
          SELECT 1
          FROM assessment_sessions s
          JOIN assessment_responses r ON r.session_id = s.id
          WHERE s.user_id = p_student_id
            AND s.submitted_at IS NOT NULL
          GROUP BY s.id, s.total_questions
          HAVING COUNT(r.id) >= GREATEST(COALESCE(s.total_questions, 5), 5)
             AND COUNT(*) FILTER (WHERE r.is_correct) = COUNT(r.id)
        )
        OR EXISTS (
          SELECT 1 FROM summative_results
          WHERE student_id = p_student_id AND total_score = 100
        );
      WHEN 'time_based' THEN
        v_after_hour := (v_badge.unlock_criteria->>'after_hour')::INTEGER;
        v_before_hour := (v_badge.unlock_criteria->>'before_hour')::INTEGER;
        v_lessons_required := COALESCE((v_badge.unlock_criteria->>'lessons')::INTEGER, 1);
        IF v_after_hour IS NOT NULL THEN
          SELECT COUNT(*) INTO v_count FROM ai_tutor_interactions
          WHERE student_id = p_student_id
            AND EXTRACT(HOUR FROM created_at) >= v_after_hour;
          v_earned := v_count >= v_lessons_required;
        ELSIF v_before_hour IS NOT NULL THEN
          SELECT COUNT(*) INTO v_count FROM ai_tutor_interactions
          WHERE student_id = p_student_id
            AND EXTRACT(HOUR FROM created_at) < v_before_hour;
          v_earned := v_count >= v_lessons_required;
        END IF;
      WHEN 'first_lesson' THEN
        SELECT COUNT(*) INTO v_count FROM student_knowledge_state
        WHERE student_id = p_student_id;
        v_earned := v_count >= 1;
      ELSE CONTINUE;
    END CASE;
    IF v_earned THEN
      INSERT INTO student_badges (student_id, badge_id)
      VALUES (p_student_id, v_badge.id) ON CONFLICT DO NOTHING;
      INSERT INTO points_history (student_id, points, source, description)
      VALUES (p_student_id, v_badge.points_value, 'badge_earned',
              'Earned badge: ' || v_badge.name_en);
      RETURN QUERY SELECT v_badge.id::TEXT, v_badge.name_en::TEXT,
                         v_badge.name_hi::TEXT, v_badge.name_as::TEXT,
                         v_badge.points_value::INTEGER;
    END IF;
  END LOOP;
END;
$function$;
