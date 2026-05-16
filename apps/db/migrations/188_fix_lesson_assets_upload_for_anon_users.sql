-- 188_fix_lesson_assets_upload_for_anon_users.sql
--
-- PR-60 (audit 2026-05-15): the storage RLS policy for the `lesson-assets`
-- bucket previously required `auth.role() = 'authenticated'`, but the
-- anonymous-student flow (SP13 PR-47) signs users in with role 'anonymous'.
-- Loosen to `auth.uid() IS NOT NULL` so anon students can also upload
-- lesson-related artefacts (the bucket is read-public, write-gated).

DROP POLICY IF EXISTS "Allow authenticated uploads to lesson-assets"
  ON storage.objects;

CREATE POLICY "Allow auth+anon uploads to lesson-assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'lesson-assets'
    AND auth.uid() IS NOT NULL
  );
