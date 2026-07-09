-- Migration 204: make the shared lesson cache server-only writable
--
-- SECURITY (from Supabase advisor `authenticated_security_definer_function_executable`):
-- upsert_generated_lesson is SECURITY DEFINER with NO internal auth check and
-- was executable by the `authenticated` role via
-- /rest/v1/rpc/upsert_generated_lesson. The generated_lessons cache is SHARED
-- across all students (keyed module/topic/language, student_id IS NULL), so
-- any logged-in user — including free anonymous guest accounts — could call
-- the RPC directly with arbitrary p_lesson_json and poison the lesson content
-- served to every other student.
--
-- FIX: revoke EXECUTE from authenticated/anon/public. The only legitimate
-- callers are the /api/lesson/generate and /api/lesson/download routes, which
-- now invoke it through the service-role client (createAdminClient) —
-- service_role bypasses grants, so no explicit grant is needed.

REVOKE EXECUTE ON FUNCTION public.upsert_generated_lesson(text, text, text, jsonb, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
