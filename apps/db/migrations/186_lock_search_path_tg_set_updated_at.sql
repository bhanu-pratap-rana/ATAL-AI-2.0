-- Migration 186: lock search_path on public.tg_set_updated_at()
--
-- The Supabase database advisor flags this function with
-- `function_search_path_mutable` (WARN). Functions without an explicit
-- search_path resolve unqualified identifiers using whatever the caller's
-- search_path happens to be. For a SECURITY INVOKER trigger function this
-- is low-impact, but it is still a hardening recommendation:
--
--   https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
-- The body only ever references `NEW.updated_at` and `now()` — both
-- resolved by built-in PG semantics — so locking the search_path to
-- `public, pg_temp` is a no-op for correctness and silences the advisor.
--
-- Rollback:
--   ALTER FUNCTION public.tg_set_updated_at() RESET search_path;

ALTER FUNCTION public.tg_set_updated_at() SET search_path = public, pg_temp;
