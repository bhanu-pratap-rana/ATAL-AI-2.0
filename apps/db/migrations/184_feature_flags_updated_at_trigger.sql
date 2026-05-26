-- Migration 184: updated_at auto-trigger for feature_flags
--
-- The DB audit flagged 7 tables as missing updated_at auto-triggers.
-- On inspection, 6 of them (formative_responses, summative_results,
-- practice_questions, points_history, student_badges, badges) are
-- append-only and have no updated_at column at all — a trigger is not
-- meaningful.
--
-- Only `feature_flags` has an updated_at column without a trigger.
-- This migration introduces a generic `public.tg_set_updated_at()`
-- helper (so future tables can reuse it without inventing a new
-- table-specific function) and attaches it to feature_flags.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS feature_flags_set_updated_at ON public.feature_flags;
--   DROP FUNCTION IF EXISTS public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_set_updated_at() IS
  'Generic BEFORE UPDATE trigger to stamp updated_at = now(). Reusable across all public tables that own an updated_at timestamptz column.';

CREATE TRIGGER feature_flags_set_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
