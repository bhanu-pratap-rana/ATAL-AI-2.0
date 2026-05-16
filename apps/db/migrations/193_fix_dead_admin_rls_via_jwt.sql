-- 193_fix_dead_admin_rls_via_jwt.sql
--
-- PR-65 audit: six admin RLS policies on badges, practice_questions and
-- feature_flags gated on `users.role = 'admin'`, but `public.users` has
-- a CHECK constraint forbidding role = 'admin' (only student/teacher).
-- That made the policies permanently unreachable under user JWTs, so
-- admin writes to these tables silently failed unless they went through
-- the service-role client. Switch the gate to
-- `auth.jwt() -> 'app_metadata' ->> 'role'` which matches how
-- `getRoleFromMetadata()` reads the role on the app side.

DROP POLICY IF EXISTS badges_admin_delete ON public.badges;
DROP POLICY IF EXISTS badges_admin_update ON public.badges;
CREATE POLICY badges_admin_delete ON public.badges FOR DELETE TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY badges_admin_update ON public.badges FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS practice_questions_admin_delete ON public.practice_questions;
DROP POLICY IF EXISTS practice_questions_admin_update ON public.practice_questions;
CREATE POLICY practice_questions_admin_delete ON public.practice_questions FOR DELETE TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY practice_questions_admin_update ON public.practice_questions FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS feature_flags_admin_delete ON public.feature_flags;
DROP POLICY IF EXISTS feature_flags_admin_update ON public.feature_flags;
CREATE POLICY feature_flags_admin_delete ON public.feature_flags FOR DELETE TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'));
CREATE POLICY feature_flags_admin_update ON public.feature_flags FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'super_admin'));
