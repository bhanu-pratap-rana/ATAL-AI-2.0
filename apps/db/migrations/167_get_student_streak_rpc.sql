-- Migration 167: get_student_streak RPC (H6)
--
-- Streak calculation previously ran in the server action and used the
-- Node.js runtime's local timezone. On Vercel that is UTC — so for a
-- student doing work at 01:30 IST (= 20:00 UTC the previous day), the
-- activity would be bucketed into the previous UTC date and a streak
-- that the student perceives as intact appears broken (or vice-versa).
--
-- This function buckets every activity timestamp by (ts AT TIME ZONE
-- 'Asia/Kolkata')::date, which is what the student experiences as
-- "today" regardless of server timezone. Activity spans three tables
-- (assessment_sessions, ai_tutor_interactions, student_knowledge_state),
-- UNIONed and walked in descending order.
--
-- Authorization: student themselves, service_role, or a teacher of a
-- class the student is enrolled in. Anything else raises 42501.

CREATE OR REPLACE FUNCTION public.get_student_streak(p_student_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak   integer := 0;
  v_today    date    := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_expected date    := v_today;
  v_first    boolean := true;
  r          RECORD;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_student_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.classes c ON c.id = e.class_id
      WHERE e.student_id = p_student_id
        AND c.teacher_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'get_student_streak: not authorized for student %', p_student_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  FOR r IN
    SELECT activity_date FROM (
      SELECT DISTINCT (started_at AT TIME ZONE 'Asia/Kolkata')::date AS activity_date
        FROM public.assessment_sessions
        WHERE user_id = p_student_id AND started_at IS NOT NULL
      UNION
      SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Kolkata')::date
        FROM public.ai_tutor_interactions
        WHERE student_id = p_student_id AND created_at IS NOT NULL
      UNION
      SELECT DISTINCT (last_attempt_at AT TIME ZONE 'Asia/Kolkata')::date
        FROM public.student_knowledge_state
        WHERE student_id = p_student_id AND last_attempt_at IS NOT NULL
    ) activity
    WHERE activity_date <= v_today
    ORDER BY activity_date DESC
    LIMIT 365
  LOOP
    IF v_first THEN
      -- Allow skipping today: if the most recent activity is today OR
      -- yesterday, the streak starts there. Older than yesterday → 0.
      IF r.activity_date = v_today THEN
        v_expected := v_today;
      ELSIF r.activity_date = v_today - 1 THEN
        v_expected := v_today - 1;
      ELSE
        RETURN 0;
      END IF;
      v_first := false;
    END IF;

    IF r.activity_date = v_expected THEN
      v_streak   := v_streak + 1;
      v_expected := v_expected - 1;
    ELSIF r.activity_date < v_expected THEN
      -- Gap: streak broken
      EXIT;
    END IF;
    -- activity_date > v_expected only happens on the very first iteration
    -- when we haven't yet fixed v_expected; already handled above.
  END LOOP;

  RETURN v_streak;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_streak(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_student_streak(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_student_streak IS
  'Consecutive-day activity streak for a student, bucketed by Asia/Kolkata date. Replaces client-side midnight math (H6).';

NOTIFY pgrst, 'reload schema';
