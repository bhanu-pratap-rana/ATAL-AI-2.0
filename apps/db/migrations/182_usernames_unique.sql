-- Migration 182: clean up redundant usernames index
--
-- Discovery: the DB audit flagged `idx_usernames_username` as non-unique,
-- but a prior migration had already added `usernames_username_unique`
-- (UNIQUE) covering the same column. So uniqueness IS enforced;
-- the non-unique index is just a redundant copy adding write overhead.
--
-- Action: drop the non-unique duplicate. The UNIQUE index continues
-- to serve both lookup and uniqueness.
--
-- Rollback:
--   CREATE INDEX idx_usernames_username ON public.usernames (username);

DROP INDEX IF EXISTS public.idx_usernames_username;
