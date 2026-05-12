# SP2 — Database Hygiene · Verification Report

**Status:** ✅ Complete. All 8 tasks landed in production.

## Migration audit trail

| # | Task | Migration | Result |
|---|---|---|---|
| T2.1 | Regenerate `apps/web/src/types/database.ts` from latest schema | (file regen) | ✅ 51,865 bytes; +11 lines diff vs Apr-18 |
| T2.2 | Verify RLS enabled on all public tables | (verify) | ✅ All 31 tables `rls_enabled=true`; no migration needed |
| T2.3 | FK constraints on `student_knowledge_state.module_id/topic_id` | m180 | ✅ Applied (0 orphans pre-flight) |
| T2.4 | `classes.teacher_id NOT NULL` | m181 | ✅ Applied (0 NULL pre-flight) |
| T2.5 | UNIQUE `usernames.username` | m182 (downgraded to cleanup) | ✅ Unique index already existed; dropped the redundant `idx_usernames_username` to save write overhead |
| T2.6 | CHECK `irt_item_bank.options` is array of 2–6 | m183 | ✅ Applied (0 bad shapes pre-flight) |
| T2.7 | `updated_at` auto-trigger on relevant tables | m184 | ✅ Generic `tg_set_updated_at()` helper introduced + attached to `feature_flags`. Other 6 candidate tables turned out to be append-only (no `updated_at` column) — no trigger needed. |
| T2.8 | Consolidate multi-permissive RLS policies | m185 | ✅ Applied. `assessment_responses`: 2 SELECT policies → 1 with OR. `irt_item_bank`: 3 created-by-specific policies dropped (admin_all already covered). |

## Performance Advisor delta

**Before SP2:**
- `multiple_permissive_policies` (WARN): **9**
- `unused_index` (INFO): 65

**After SP2:**
- `multiple_permissive_policies` (WARN): **0** ✅
- `unused_index` (INFO): 65 (unchanged — those are post-launch cleanup candidates, requires production usage data to know which to keep)

**Net cleared: 9 WARN.**

## DB invariants now enforced

```sql
-- Every student_knowledge_state row references a real module + topic
SELECT count(*) FROM public.student_knowledge_state sks
  LEFT JOIN public.modules m ON m.id = sks.module_id
  LEFT JOIN public.topics t ON t.id = sks.topic_id
  WHERE m.id IS NULL OR t.id IS NULL;
-- Always returns 0.

-- Every class has a teacher
SELECT count(*) FROM public.classes WHERE teacher_id IS NULL;
-- Always returns 0.

-- Every username is unique (was already enforced; now without duplicate index)
SELECT username, count(*) FROM public.usernames GROUP BY username HAVING count(*) > 1;
-- Always returns 0 rows.

-- Every irt_item_bank.options is a JSON array of 2-6 items
SELECT count(*) FROM public.irt_item_bank
  WHERE jsonb_typeof(options) <> 'array'
     OR jsonb_array_length(options) NOT BETWEEN 2 AND 6;
-- Always returns 0.

-- Updating feature_flags auto-bumps updated_at
UPDATE public.feature_flags SET enabled = enabled WHERE name = 'voice_ai_tutor';
SELECT updated_at FROM public.feature_flags WHERE name = 'voice_ai_tutor';
-- updated_at reflects the recent timestamp.
```

## Rollback recipes (per migration)

All five migrations are reversible. Each migration file has the `Rollback:` recipe in its header comment.

## What's deferred to post-launch

- **65 unused indexes (m187 / SP9 T9.x):** Drop after 2-week production observation confirms zero usage. Write overhead today but not user-visible.
- The unused indexes survive this PR because dropping them now risks killing an index that would be used once real production traffic starts.

## Next: SP3 — Frontend resilience

Per master plan:
- T3.1 — shared skeleton primitives (`<DashboardSkeleton>`, `<TableSkeleton>`, `<CardSkeleton>`)
- T3.2 — `loading.tsx` for 10 highest-traffic routes
- T3.3 — `error.tsx` for 10 critical routes
- T3.4 — Suspense around slow server-component fetches

ETA ~7h, 4 PRs.
