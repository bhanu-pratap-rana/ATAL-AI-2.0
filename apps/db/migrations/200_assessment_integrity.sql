-- Migration 200: Assessment integrity fixes
--
-- Closes findings F-DATA-01 (skipped questions not persisted) and
-- F-DATA-02 (score denominator wrong). Adds:
--   * assessment_sessions.total_questions — honest denominator
--   * assessment_responses.is_skipped — explicit skip intent
-- Backfills existing rows so legacy sessions display sensibly.

-- 1. Total questions per session (set at start, immutable thereafter)
ALTER TABLE assessment_sessions
  ADD COLUMN IF NOT EXISTS total_questions integer;

COMMENT ON COLUMN assessment_sessions.total_questions IS
  'Total questions presented in the session. Used as the score denominator. NULL only on legacy rows; new rows must set this at insert time.';

-- 2. Explicit skip flag (NULL chosen_option was ambiguous; this is unambiguous)
ALTER TABLE assessment_responses
  ADD COLUMN IF NOT EXISTS is_skipped boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN assessment_responses.is_skipped IS
  'TRUE when the student explicitly skipped the question (chose no answer). Distinguished from “answered but wrong”.';

-- 3. Backfill total_questions for legacy sessions using whatever rows exist.
-- This is best-effort — legacy sessions where the student skipped questions
-- will have an undercount; new sessions get the real value at start time.
UPDATE assessment_sessions s
SET total_questions = sub.cnt
FROM (
  SELECT session_id, COUNT(*) AS cnt
  FROM assessment_responses
  GROUP BY session_id
) sub
WHERE s.id = sub.session_id
  AND s.total_questions IS NULL;

-- 4. Index for teacher queries (filter skipped, aggregate per student)
CREATE INDEX IF NOT EXISTS idx_assessment_responses_session_skipped
  ON assessment_responses(session_id, is_skipped);
