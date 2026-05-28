-- Migration 201: Teacher visibility into enrolled students' activity
--
-- Closes findings F-PROD-TCH01 (teacher dashboard shows "No AI tutor
-- interactions yet" while interactions exist) and F-PROD-TCH03
-- (teacher assessments page shows 0 while sessions exist).
--
-- Root cause:
--   * ai_tutor_interactions had no teacher policy at all — only the
--     student themselves could read their interactions.
--   * assessment_responses_read joined on session.class_id, but
--     student-initiated sessions (from dashboard) have class_id = NULL,
--     so the teacher branch never matched.
--
-- Fix: scope teacher reads to *enrollments* (teachers can see any
-- enrolled student's activity), not to session.class_id.

-- ---------- ai_tutor_interactions ----------
DROP POLICY IF EXISTS ai_tutor_interactions_teacher_select ON ai_tutor_interactions;
CREATE POLICY ai_tutor_interactions_teacher_select ON ai_tutor_interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      WHERE e.student_id = ai_tutor_interactions.student_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

-- ---------- assessment_responses ----------
-- Existing assessment_responses_read joins on session.class_id, so
-- dashboard-started sessions (class_id NULL) are invisible to the
-- teacher. Add a parallel policy that resolves via enrollments.
DROP POLICY IF EXISTS assessment_responses_teacher_select ON assessment_responses;
CREATE POLICY assessment_responses_teacher_select ON assessment_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM assessment_sessions s
      JOIN enrollments e ON e.student_id = s.user_id
      JOIN classes c ON c.id = e.class_id
      WHERE s.id = assessment_responses.session_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

-- ---------- assessment_sessions ----------
-- The existing assessment_sessions_select policy already uses
-- enrollments-JOIN-classes for the teacher branch, so it works
-- regardless of session.class_id. No change needed there; this
-- comment is intentional to document the asymmetry: sessions are
-- already correctly visible, only responses + tutor interactions
-- needed teacher policies.
