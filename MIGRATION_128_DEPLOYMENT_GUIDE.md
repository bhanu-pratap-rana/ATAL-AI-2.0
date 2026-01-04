# Migration 128: Deployment Guide

**Migration:** `apps/db/migrations/128_add_missing_indexes.sql`  
**Date:** January 5, 2026  
**Type:** Performance Optimization  
**Impact:** 10-100x faster queries  
**Downtime:** Zero (uses CONCURRENTLY)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Verify Migration File
```bash
# Check migration file exists and is valid
cat apps/db/migrations/128_add_missing_indexes.sql
```

### 2. Check Current Database State
```sql
-- Check if indexes already exist (should return 0 rows)
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_assessment_responses_session_user',
    'idx_assessment_sessions_user_time',
    'idx_assessment_sessions_class_time',
    'idx_student_knowledge_state_student_module',
    'idx_school_staff_credentials_active'
  );
```

### 3. Check Database Load
```sql
-- Check current active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Should be < 80% of max_connections for safe deployment
```

---

## 🚀 DEPLOYMENT STEPS

### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Navigate to project root
cd /path/to/Atal-ai-1.0

# 2. Link to your Supabase project (if not already linked)
npx supabase link --project-ref your-project-ref

# 3. Apply migration
npx supabase db push

# OR apply specific migration
npx supabase migration up 128
```

### Option B: Using Supabase Dashboard SQL Editor

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Navigate to: SQL Editor

2. **Copy Migration SQL**
   ```bash
   # Copy contents of migration file
   cat apps/db/migrations/128_add_missing_indexes.sql
   ```

3. **Execute in SQL Editor**
   - Paste the SQL
   - Click "Run" or press `Ctrl+Enter`
   - Wait for completion (may take 1-5 minutes)

4. **Verify Success**
   ```sql
   -- Check all indexes were created
   SELECT 
     indexname,
     pg_size_pretty(pg_relation_size(indexrelid)) as size
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname IN (
       'idx_assessment_responses_session_user',
       'idx_assessment_sessions_user_time',
       'idx_assessment_sessions_class_time',
       'idx_student_knowledge_state_student_module',
       'idx_school_staff_credentials_active'
     )
   ORDER BY indexname;
   ```

### Option C: Using psql (Direct Database Access)

```bash
# Connect to database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run migration
\i apps/db/migrations/128_add_missing_indexes.sql

# Or copy-paste SQL directly
```

---

## ⏱️ EXPECTED DURATION

| Index | Estimated Time | Size |
|-------|---------------|------|
| `idx_assessment_responses_session_user` | 1-2 min | ~5-10 MB |
| `idx_assessment_sessions_user_time` | 30-60 sec | ~3-5 MB |
| `idx_assessment_sessions_class_time` | 30-60 sec | ~3-5 MB |
| `idx_student_knowledge_state_student_module` | 30-60 sec | ~2-4 MB |
| `idx_school_staff_credentials_active` | 15-30 sec | ~1-2 MB |
| **Total** | **3-6 minutes** | **~15-26 MB** |

**Note:** Times may vary based on:
- Table sizes
- Database load
- Server resources

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Verify Indexes Created

```sql
-- Check all indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  idx_scan as usage_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_assessment_responses_session_user',
    'idx_assessment_sessions_user_time',
    'idx_assessment_sessions_class_time',
    'idx_student_knowledge_state_student_module',
    'idx_school_staff_credentials_active'
  )
ORDER BY tablename, indexname;
```

**Expected Result:** 5 rows, all with `usage_count >= 0`

### 2. Check Index Usage

```sql
-- Monitor index usage over time
SELECT 
  indexname,
  idx_scan as total_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_assessment_responses_session_user',
    'idx_assessment_sessions_user_time',
    'idx_assessment_sessions_class_time',
    'idx_student_knowledge_state_student_module',
    'idx_school_staff_credentials_active'
  )
ORDER BY idx_scan DESC;
```

### 3. Test Query Performance

```sql
-- Test assessment response query (should use new index)
EXPLAIN ANALYZE
SELECT * 
FROM assessment_responses 
WHERE session_id = '00000000-0000-0000-0000-000000000001'
  AND user_id = '00000000-0000-0000-0000-000000000002';

-- Should show: Index Scan using idx_assessment_responses_session_user
```

---

## 🔍 MONITORING

### Performance Monitoring Queries

See `PERFORMANCE_MONITORING_QUERIES.sql` for detailed monitoring queries.

### Key Metrics to Watch

1. **Index Usage**
   - Monitor `idx_scan` in `pg_stat_user_indexes`
   - Should increase over time as queries use indexes

2. **Query Performance**
   - Check `EXPLAIN ANALYZE` output
   - Should show "Index Scan" instead of "Seq Scan"

3. **Database Load**
   - Monitor CPU and memory usage
   - Should decrease as queries become faster

---

## 🚨 ROLLBACK PLAN

If issues occur, indexes can be dropped safely:

```sql
-- Drop indexes (if needed)
DROP INDEX CONCURRENTLY IF EXISTS idx_assessment_responses_session_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_assessment_sessions_user_time;
DROP INDEX CONCURRENTLY IF EXISTS idx_assessment_sessions_class_time;
DROP INDEX CONCURRENTLY IF EXISTS idx_student_knowledge_state_student_module;
DROP INDEX CONCURRENTLY IF EXISTS idx_school_staff_credentials_active;
```

**Note:** Dropping indexes will revert performance improvements but won't break functionality.

---

## 📊 EXPECTED PERFORMANCE IMPROVEMENTS

| Query Type | Before | After | Improvement |
|------------|--------|-------|-------------|
| Assessment responses | 50-200ms | 5-20ms | **10-50x faster** |
| Session history | 100-500ms | 5-25ms | **20-100x faster** |
| Knowledge state | 30-150ms | 3-15ms | **10-30x faster** |
| School metrics | 20-100ms | 4-20ms | **5-10x faster** |

---

## ✅ SUCCESS CRITERIA

- [ ] All 5 indexes created successfully
- [ ] No errors in Supabase logs
- [ ] Indexes appear in `pg_stat_user_indexes`
- [ ] Query performance improved (check EXPLAIN ANALYZE)
- [ ] No application errors
- [ ] Database load stable

---

## 📞 SUPPORT

If you encounter issues:
1. Check Supabase logs for errors
2. Verify database connection
3. Check table sizes (very large tables may take longer)
4. Ensure sufficient disk space
5. Review `PERFORMANCE_MONITORING_QUERIES.sql` for diagnostics

---

*Migration 128 Deployment Guide - January 5, 2026*

