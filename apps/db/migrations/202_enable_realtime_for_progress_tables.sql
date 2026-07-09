-- Migration 202: enable Supabase Realtime for student-progress tables
--
-- BUG: Three components subscribe to Postgres changes via Supabase Realtime —
--   * StudentProgressGrid.tsx  -> table student_knowledge_state
--   * AIInteractionsLog.tsx     -> table ai_tutor_interactions
--   * BadgesDisplay.tsx         -> table student_badges
-- but only `sync_log` was a member of the `supabase_realtime` publication
-- (puballtables = false). The subscriptions were therefore silent no-ops:
-- writes persisted to the DB immediately, but no change was ever pushed to
-- subscribed clients, so a teacher had to refresh to see student progress and
-- the "Real-time" grid never updated live.
--
-- FIX: add the three tables to the publication. REPLICA IDENTITY FULL is
-- required because StudentProgressGrid filters on `student_id` for UPDATE
-- events (progress is written as an UPDATE via update_progress_atomic);
-- without FULL replica identity, filtered UPDATE/DELETE events do not deliver
-- because the old tuple carries only the primary key.
--
-- SAFE + REVERSIBLE: additive only; no data is modified. Realtime still honors
-- RLS (migration 201 grants teachers SELECT on their students' activity), so
-- clients only receive changes for rows they are already allowed to read.

ALTER TABLE public.student_knowledge_state REPLICA IDENTITY FULL;
ALTER TABLE public.student_badges REPLICA IDENTITY FULL;
ALTER TABLE public.ai_tutor_interactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'student_knowledge_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_knowledge_state;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'student_badges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_badges;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'ai_tutor_interactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_tutor_interactions;
  END IF;
END $$;
