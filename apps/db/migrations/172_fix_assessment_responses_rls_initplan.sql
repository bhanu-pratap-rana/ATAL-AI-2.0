-- Migration 172: Fix bare auth.uid() in assessment_responses SELECT policy
--
-- Problem: Migration 159 created assessment_responses_select with bare auth.uid()
-- calls that are re-evaluated per row. Migration 168 fixed assessment_sessions
-- but not assessment_responses. This causes initplan performance issues on large
-- assessment_responses tables (re-authenticates on every row scan).
--
-- Fix: Drop and recreate with (SELECT auth.uid()) subquery so it is evaluated
-- once per statement as an initplan.

DROP POLICY IF EXISTS "assessment_responses_select" ON assessment_responses;
DROP POLICY IF EXISTS "Students can view own responses" ON assessment_responses;
DROP POLICY IF EXISTS "Teachers can view responses for their class sessions" ON assessment_responses;

-- Students: own responses only
CREATE POLICY assessment_responses_student_select ON assessment_responses
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Teachers: responses for sessions in their classes
CREATE POLICY assessment_responses_teacher_select ON assessment_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM assessment_sessions s
      JOIN enrollments e ON e.class_id = s.class_id
      JOIN classes c ON c.id = s.class_id
      WHERE s.id = assessment_responses.session_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

NOTIFY pgrst, 'reload schema';
