-- 195_widen_users_role_check_and_add_updated_at_triggers.sql
--
-- PR-66 audit M2 + H6 — NOT YET APPLIED to live DB; review before
-- running. This migration is two unrelated cleanups:
--
-- (1) `users.role` CHECK forbids 'admin'/'super_admin' (was originally
--     `IN ('student','teacher')`). PR-65 worked around this by routing
--     admin role lookups through auth.jwt() -> app_metadata, but the
--     constraint would continue to silently corrupt any future
--     server-side write that tries role='admin'. Widen the CHECK.
--
-- (2) Six tables with `updated_at` columns lacked BEFORE UPDATE
--     triggers, so service-role direct upserts could leave updated_at
--     stale. Add the canonical `tg_set_updated_at` trigger.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'teacher', 'admin', 'super_admin'));

CREATE OR REPLACE TRIGGER set_learning_style_profile_updated_at
  BEFORE UPDATE ON public.learning_style_profile
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE TRIGGER set_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE TRIGGER set_school_staff_credentials_updated_at
  BEFORE UPDATE ON public.school_staff_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE TRIGGER set_student_knowledge_state_updated_at
  BEFORE UPDATE ON public.student_knowledge_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE TRIGGER set_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE TRIGGER set_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
