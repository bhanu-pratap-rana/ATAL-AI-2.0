-- ============================================================================
-- ATAL AI - Quick RLS Verification
-- ============================================================================
-- Run this in Supabase SQL Editor to verify RLS is properly configured
-- ============================================================================

-- 1. Check RLS is enabled on all tables
SELECT '1. RLS ENABLED STATUS' as section;
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '✓ RLS ON' ELSE '✗ RLS OFF' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'student_profiles', 'teacher_profiles', 'schools',
    'school_staff_credentials', 'classes', 'enrollments',
    'assessment_sessions', 'assessment_responses'
)
ORDER BY tablename;

-- 2. List all RLS policies
SELECT '2. ALL RLS POLICIES' as section;
SELECT
    tablename,
    policyname,
    cmd as operation,
    CASE WHEN permissive = 'PERMISSIVE' THEN 'ALLOW' ELSE 'DENY' END as type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 3. Verify SECURITY DEFINER functions exist
SELECT '3. SECURITY DEFINER FUNCTIONS' as section;
SELECT
    proname as function_name,
    '✓ EXISTS' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
AND proname IN (
    'get_user_enrolled_class_ids',
    'get_teacher_class_ids',
    'is_class_teacher',
    'is_enrolled_in_class',
    'is_teacher',
    'get_teacher_student_ids',
    'verify_staff_pin',
    'rotate_staff_pin'
)
ORDER BY proname;

-- 4. Test school_staff_credentials is service_role only
-- This should return 0 rows when run as authenticated user
SELECT '4. STAFF CREDENTIALS ACCESS TEST' as section;
SELECT
    COUNT(*) as row_count,
    CASE WHEN COUNT(*) = 0 THEN '✓ SECURE (no access)' ELSE '⚠ CHECK POLICIES' END as status
FROM school_staff_credentials;

-- 5. Policy count summary
SELECT '5. POLICY COUNT SUMMARY' as section;
SELECT
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 6. Check for potential security issues
SELECT '6. SECURITY WARNINGS' as section;
SELECT
    tablename,
    policyname,
    '⚠ Open SELECT policy (qual = true)' as warning
FROM pg_policies
WHERE schemaname = 'public'
AND cmd = 'SELECT'
AND qual::text = 'true'
AND tablename NOT IN ('schools'); -- schools is intentionally readable by all

-- Summary
SELECT '============================================' as section;
SELECT 'RLS QUICK CHECK COMPLETE' as result;
SELECT 'Review any warnings above' as next_step;
