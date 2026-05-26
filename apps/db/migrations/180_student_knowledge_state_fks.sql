-- Migration 180: enforce FK integrity on student_knowledge_state
--
-- The DB audit (specs/security-hardening/...; master-issue-list.md #DB-3)
-- found that `student_knowledge_state.module_id` and `topic_id` are TEXT
-- NOT NULL but lacked REFERENCES clauses. Without them, an orphan
-- module_id/topic_id can never be detected at write time — only at
-- query time when the JOIN returns NULL.
--
-- Pre-flight (verified before applying): zero orphan rows.
--
-- Rollback:
--   ALTER TABLE public.student_knowledge_state DROP CONSTRAINT IF EXISTS student_knowledge_state_module_fk;
--   ALTER TABLE public.student_knowledge_state DROP CONSTRAINT IF EXISTS student_knowledge_state_topic_fk;

ALTER TABLE public.student_knowledge_state
  ADD CONSTRAINT student_knowledge_state_module_fk
  FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE RESTRICT;

ALTER TABLE public.student_knowledge_state
  ADD CONSTRAINT student_knowledge_state_topic_fk
  FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE RESTRICT;
