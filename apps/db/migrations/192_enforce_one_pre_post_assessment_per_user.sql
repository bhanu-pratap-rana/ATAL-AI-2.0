-- 192_enforce_one_pre_post_assessment_per_user.sql
--
-- PR-64: backstop the TOCTOU window in startAssessment(). Two concurrent
-- calls used to both pass the "has user already submitted pre/post?"
-- check and both INSERT. The partial unique index below makes a second
-- pre/post INSERT for the same user a CHECK violation, so even under
-- race the database refuses the dup.
--
-- Partial because the index only covers pre/post (regular adaptive
-- sessions can be repeated freely).

CREATE UNIQUE INDEX IF NOT EXISTS uq_assessment_sessions_user_pre_post
  ON public.assessment_sessions (user_id, session_type)
  WHERE session_type IN ('pre', 'post');

COMMENT ON INDEX public.uq_assessment_sessions_user_pre_post IS
  'Backstop for the pre/post duplicate-prevention check in startAssessment(). Migration owner: PR-64 audit lockdown.';
