-- Migration 166: upsert_learning_style_profile RPC (H3)
--
-- Eliminates the read-then-insert race in the learning style profile
-- write path. Two concurrent requests from the same student could both
-- observe no existing row and then both INSERT, with the second failing
-- on the unique constraint (23505). Callers previously either ignored
-- the warn or used `.upsert(..., {ignoreDuplicates: true}).single()`,
-- which throws PGRST116 when the insert is a no-op.
--
-- The RPC performs INSERT ... ON CONFLICT (student_id) DO UPDATE in a
-- single statement and RETURNS the resulting row. Runs as SECURITY DEFINER
-- so it can bypass RLS for the write, but we gate the authorization inside
-- the function body: the student themselves, or service_role, only.

CREATE OR REPLACE FUNCTION public.upsert_learning_style_profile(
  p_student_id      uuid,
  p_visual_score    numeric,
  p_text_score      numeric,
  p_auditory_score  numeric,
  p_dominant_style  text DEFAULT NULL
)
RETURNS public.learning_style_profile
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role   text := auth.role();
  v_row    public.learning_style_profile;
BEGIN
  IF v_role <> 'service_role' AND v_caller IS DISTINCT FROM p_student_id THEN
    RAISE EXCEPTION 'upsert_learning_style_profile: not authorized for student %', p_student_id
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.learning_style_profile (
    student_id, visual_score, text_score, auditory_score,
    preferred_style, images_viewed, voice_replays, text_read_time_seconds
  ) VALUES (
    p_student_id, p_visual_score, p_text_score, p_auditory_score,
    COALESCE(p_dominant_style, 'text'), 0, 0, 0
  )
  ON CONFLICT (student_id) DO UPDATE SET
    visual_score    = EXCLUDED.visual_score,
    text_score      = EXCLUDED.text_score,
    auditory_score  = EXCLUDED.auditory_score,
    preferred_style = COALESCE(EXCLUDED.preferred_style, learning_style_profile.preferred_style),
    updated_at      = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_learning_style_profile(uuid, numeric, numeric, numeric, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.upsert_learning_style_profile(uuid, numeric, numeric, numeric, text) TO authenticated;

COMMENT ON FUNCTION public.upsert_learning_style_profile IS
  'Atomic upsert of learning_style_profile scores by student_id. Replaces read-then-insert race (H3).';

NOTIFY pgrst, 'reload schema';
