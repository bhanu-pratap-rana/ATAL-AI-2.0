-- 187_fix_learning_style_preferred_style_generation.sql
--
-- PR-60 (audit 2026-05-15): `learning_style_profile.preferred_style` was a
-- GENERATED ALWAYS AS column with a stale `'visual-text'` placeholder
-- expression. Every row inherited the same value and `upsert_learning_style_profile`'s
-- `p_dominant_style` arg was ignored. Replace with a proper max-of-3-scores
-- derivation. Backfill existing rows.

ALTER TABLE public.learning_style_profile
  DROP COLUMN IF EXISTS preferred_style;

ALTER TABLE public.learning_style_profile
  ADD COLUMN preferred_style text GENERATED ALWAYS AS (
    CASE
      WHEN visual_score >= text_score AND visual_score >= auditory_score THEN 'visual'
      WHEN text_score >= auditory_score THEN 'text'
      ELSE 'auditory'
    END
  ) STORED;
