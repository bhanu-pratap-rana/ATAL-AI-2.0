-- =====================================================
-- QUICK SCHEMA VERIFICATION FOR practice_questions
-- =====================================================
--
-- Copy and paste each query below into Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query)
-- Run each query and SAVE THE RESULTS
--
-- Location: https://app.supabase.com/project/hnlsqznoviwnyrkskfay/sql/new
--
-- =====================================================

-- ✅ QUERY 1: GET ACTUAL COLUMN SCHEMA (MOST IMPORTANT)
-- Copy this entire query and run it first
-- This shows you EXACTLY what columns exist in the database
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'practice_questions'
ORDER BY ordinal_position;

-- Expected output:
-- Should show a table with columns like:
-- ordinal_position | column_name      | data_type | is_nullable | column_default
-- 1                | id               | uuid      | NO          | gen_random_uuid()
-- 2                | topic_id         | text      | NO          | NULL
-- ... etc ...

-- =====================================================

-- ✅ QUERY 2: VERIFY ROW COUNT
-- This confirms the table has 450 rows as expected
SELECT COUNT(*) as total_rows FROM practice_questions;

-- Expected: 450

-- =====================================================

-- ✅ QUERY 3: VERIFY DATA TYPES WITH SAMPLE ROW
-- This shows you the actual data to understand structure
SELECT * FROM practice_questions LIMIT 1 \gx

-- Look at the output - does every column from Query 1 have data?

-- =====================================================

-- ✅ QUERY 4: CHECK EACH IMPORTANT COLUMN EXISTS
-- Run these individually to verify specific columns

-- Does student_id column exist?
SELECT EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'practice_questions' AND column_name = 'student_id'
) as student_id_exists;
-- Expected: true or false

-- Does created_at column exist?
SELECT EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'practice_questions' AND column_name = 'created_at'
) as created_at_exists;
-- Expected: true or false

-- Does updated_at column exist?
SELECT EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'practice_questions' AND column_name = 'updated_at'
) as updated_at_exists;
-- Expected: true or false

-- Does difficulty column exist?
SELECT EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'practice_questions' AND column_name = 'difficulty'
) as difficulty_exists;
-- Expected: true or false

-- =====================================================

-- ✅ QUERY 5: GET COMPLETE COLUMN LIST AS CSV (FOR COMPARISON)
-- This creates a formatted list you can paste into the analysis
SELECT
  string_agg(
    column_name || ' (' || data_type || (CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END) || ')',
    ', '
    ORDER BY ordinal_position
  ) as all_columns
FROM information_schema.columns
WHERE table_name = 'practice_questions';

-- Expected: A single cell with comma-separated columns

-- =====================================================
-- INSTRUCTIONS:
--
-- 1. Go to https://app.supabase.com/project/hnlsqznoviwnyrkskfay/sql/new
-- 2. Copy Query 1 (from SELECT ... to ORDER BY ordinal_position;)
-- 3. Paste into Supabase SQL Editor
-- 4. Click "Run" button
-- 5. SAVE THE RESULTS (screenshot or copy the table)
-- 6. Repeat for Queries 2-5
-- 7. Compare results with expected output
-- 8. Share results for schema reconciliation
--
-- =====================================================
-- SCHEMA RECONCILIATION TEMPLATE:
--
-- After running Query 1, fill in this table:
--
-- Column Name | Data Type | Nullable? | Default | From 047? | In 058?
-- ------------|-----------|-----------|---------|-----------|--------
-- id          | uuid      | NO        | random  | NO        | YES
-- topic_id    | text      | NO        | NULL    | YES       | YES
-- module_id   | text      | NO        | NULL    | YES       | YES
-- language    | text      | NO        | NULL    | YES       | YES
-- question    | text      | NO        | NULL    | YES       | YES
-- options     | jsonb     | NO        | NULL    | YES       | YES
-- correct_idx | integer   | NO        | NULL    | YES       | YES
-- explanation | text      | YES       | NULL    | YES       | YES
-- order_index | integer   | YES       | NULL    | YES       | YES
-- student_id  | ?         | ?         | ?       | NO        | YES   <- VERIFY
-- created_at  | ?         | ?         | ?       | NO        | YES   <- VERIFY
-- updated_at  | ?         | ?         | ?       | NO        | YES   <- VERIFY
-- difficulty  | ?         | ?         | ?       | NO        | NO    <- VERIFY
-- [ANY OTHER] | ?         | ?         | ?       | ?         | ?     <- FIND
--
-- Once you fill this in, we'll know exactly what to do!
--
-- =====================================================
