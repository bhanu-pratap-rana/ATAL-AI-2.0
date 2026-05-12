-- Migration 181: enforce classes.teacher_id NOT NULL
--
-- Every class must have a teacher. Pre-flight confirmed zero NULL rows
-- in production. The teacher_id FK to auth.users / teacher_profiles was
-- already in place from an earlier migration.
--
-- Rollback:
--   ALTER TABLE public.classes ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE public.classes
  ALTER COLUMN teacher_id SET NOT NULL;
