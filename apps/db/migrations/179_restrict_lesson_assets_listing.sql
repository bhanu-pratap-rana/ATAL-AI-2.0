-- Migration 179: lock down lesson-assets bucket listing
--
-- Per Supabase Security Advisor finding `public_bucket_allows_listing`:
-- the "Public read access for lesson-assets" SELECT policy on
-- storage.objects lets anonymous clients list every object in the bucket,
-- not just fetch individual objects by URL.
--
-- The bucket is marked `public = true` in storage.buckets, so object URL
-- access (e.g. `/storage/v1/object/public/lesson-assets/foo.png`) works
-- via the built-in public-bucket short-circuit and does NOT need a
-- SELECT policy. Listing is what the policy enables — and listing is
-- excess surface area we never use.
--
-- This migration drops the broad SELECT policy. Object fetches keep
-- working. Listing (`/storage/v1/object/list/lesson-assets`) starts
-- denying anonymous callers.
--
-- Rollback recipe:
--   CREATE POLICY "Public read access for lesson-assets"
--     ON storage.objects FOR SELECT TO public
--     USING (bucket_id = 'lesson-assets');

DROP POLICY IF EXISTS "Public read access for lesson-assets"
  ON storage.objects;

NOTIFY pgrst, 'reload schema';
