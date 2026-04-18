-- Migration: 169_drop_dead_rpcs.sql
-- Description: Remove seven public RPCs that have no call sites in the
--   application. Each function was confirmed dead via static analysis of all
--   .rpc() calls in apps/web/src. Trigger functions, RLS helpers, and
--   functions with active call sites (update_knowledge_state,
--   match_curriculum_hybrid, submit_assessment, etc.) are intentionally kept.
--
-- Dropped:
--   035  check_email_exists          — documented but never wired to a form
--   030  check_username_available    — superseded by server-side uniqueness check
--   136  get_announcement_read_count — superseded by get_announcements_with_reads
--   137  get_class_materials         — feature not shipped; no UI call site
--   147  get_module_unit_count       — superseded by get_module_units_with_topics
--   137  increment_material_view     — download counter used; view counter not
--   045  match_curriculum_cosine     — unused cosine variant; match_curriculum
--                                      (L2) and match_curriculum_hybrid are used

DROP FUNCTION IF EXISTS public.check_email_exists(text);
DROP FUNCTION IF EXISTS public.check_username_available(text);
DROP FUNCTION IF EXISTS public.get_announcement_read_count(uuid);
DROP FUNCTION IF EXISTS public.get_class_materials(uuid);
DROP FUNCTION IF EXISTS public.get_module_unit_count(text);
DROP FUNCTION IF EXISTS public.increment_material_view(uuid);
DROP FUNCTION IF EXISTS public.match_curriculum_cosine(vector, double precision, integer, text, text);
