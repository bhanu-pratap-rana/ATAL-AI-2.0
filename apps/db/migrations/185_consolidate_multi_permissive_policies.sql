-- Migration 185: consolidate multi-permissive RLS policies
--
-- Supabase Performance Advisor flagged 9 multi-permissive policy
-- combinations on `assessment_responses` and `irt_item_bank`. When
-- two PERMISSIVE policies exist for the same (role, action), Postgres
-- must evaluate BOTH on every row — wasted CPU.
--
-- This migration consolidates them.
--
-- assessment_responses:
--   Drop separate `student_select` + `teacher_select`; replace with
--   one `assessment_responses_read` that ORs both conditions in a
--   single policy.
--
-- irt_item_bank:
--   The `admin_all` policy (FOR ALL, admin/super_admin via JWT) already
--   covers DELETE/INSERT/UPDATE. The three legacy `admin_delete`,
--   `admin_insert`, `admin_update` policies (created_by = auth.uid())
--   are duplicate coverage — they ran on every admin write but added
--   no extra capability beyond admin_all. Drop them.
--
-- Rollback recipes are inline as comments before each statement.

-- ─── assessment_responses ───
-- Rollback:
--   CREATE POLICY assessment_responses_student_select ON public.assessment_responses
--     FOR SELECT TO public USING (user_id = (SELECT auth.uid()));
--   CREATE POLICY assessment_responses_teacher_select ON public.assessment_responses
--     FOR SELECT TO public USING (
--       EXISTS (SELECT 1 FROM assessment_sessions s JOIN classes c ON c.id = s.class_id
--               WHERE s.id = session_id AND c.teacher_id = (SELECT auth.uid())));
--   DROP POLICY IF EXISTS assessment_responses_read ON public.assessment_responses;

DROP POLICY IF EXISTS assessment_responses_student_select ON public.assessment_responses;
DROP POLICY IF EXISTS assessment_responses_teacher_select ON public.assessment_responses;

CREATE POLICY assessment_responses_read
  ON public.assessment_responses
  FOR SELECT
  TO authenticated
  USING (
    -- student sees their own responses
    user_id = (SELECT auth.uid())
    OR
    -- teacher of the class sees responses for that class
    EXISTS (
      SELECT 1
      FROM public.assessment_sessions s
      JOIN public.classes c ON c.id = s.class_id
      WHERE s.id = assessment_responses.session_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

-- ─── irt_item_bank ───
-- Rollback:
--   CREATE POLICY irt_item_bank_admin_delete ON public.irt_item_bank
--     FOR DELETE TO authenticated USING ((SELECT auth.uid()) = created_by);
--   CREATE POLICY irt_item_bank_admin_insert ON public.irt_item_bank
--     FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = created_by);
--   CREATE POLICY irt_item_bank_admin_update ON public.irt_item_bank
--     FOR UPDATE TO authenticated
--     USING ((SELECT auth.uid()) = created_by)
--     WITH CHECK ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS irt_item_bank_admin_delete ON public.irt_item_bank;
DROP POLICY IF EXISTS irt_item_bank_admin_insert ON public.irt_item_bank;
DROP POLICY IF EXISTS irt_item_bank_admin_update ON public.irt_item_bank;

NOTIFY pgrst, 'reload schema';
