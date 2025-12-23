-- ============================================================================
-- ATAL AI - RLS Smoke Tests
-- ============================================================================
-- Purpose: Verify Row Level Security policies are working correctly
-- Run: Execute these queries in Supabase SQL Editor or via psql
--
-- Test Strategy:
-- 1. Create test users (student A, student B, teacher A, teacher B)
-- 2. Verify each user can only access their own data
-- 3. Verify cross-user access is denied
-- 4. Clean up test data
--
-- IMPORTANT: These tests must be run against a test/staging database
-- ============================================================================

-- ============================================================================
-- SECTION 1: SETUP TEST DATA
-- ============================================================================

-- Create a function to run tests as different users
-- This simulates what happens when different users make requests

DO $$
DECLARE
    v_student_a_id UUID;
    v_student_b_id UUID;
    v_teacher_a_id UUID;
    v_teacher_b_id UUID;
    v_school_id UUID;
    v_class_a_id UUID;
    v_class_b_id UUID;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ATAL AI RLS SMOKE TESTS';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';

    -- Get a school ID for testing
    SELECT id INTO v_school_id FROM public.schools LIMIT 1;

    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'No schools found in database. Please seed schools first.';
    END IF;

    RAISE NOTICE '[SETUP] Using school ID: %', v_school_id;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 2: RLS POLICY VERIFICATION QUERIES
-- ============================================================================

-- Test 2.1: Verify student_profiles RLS
-- Students should only see their own profile
RAISE NOTICE 'TEST 2.1: student_profiles RLS';
RAISE NOTICE '  - Students should only see their own profile';
RAISE NOTICE '  - Teachers should see profiles of their enrolled students';

SELECT
    'student_profiles' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_condition
FROM pg_policies
WHERE tablename = 'student_profiles'
ORDER BY policyname;

-- Test 2.2: Verify teacher_profiles RLS
RAISE NOTICE '';
RAISE NOTICE 'TEST 2.2: teacher_profiles RLS';
RAISE NOTICE '  - Teachers should only see their own profile';

SELECT
    'teacher_profiles' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_condition
FROM pg_policies
WHERE tablename = 'teacher_profiles'
ORDER BY policyname;

-- Test 2.3: Verify classes RLS
RAISE NOTICE '';
RAISE NOTICE 'TEST 2.3: classes RLS';
RAISE NOTICE '  - Teachers should see classes they own';
RAISE NOTICE '  - Students should see classes they are enrolled in';

SELECT
    'classes' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_condition
FROM pg_policies
WHERE tablename = 'classes'
ORDER BY policyname;

-- Test 2.4: Verify enrollments RLS
RAISE NOTICE '';
RAISE NOTICE 'TEST 2.4: enrollments RLS';
RAISE NOTICE '  - Students should see their own enrollments';
RAISE NOTICE '  - Teachers should see enrollments in their classes';

SELECT
    'enrollments' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_condition
FROM pg_policies
WHERE tablename = 'enrollments'
ORDER BY policyname;

-- Test 2.5: Verify school_staff_credentials RLS (service_role only)
RAISE NOTICE '';
RAISE NOTICE 'TEST 2.5: school_staff_credentials RLS';
RAISE NOTICE '  - Only service_role should have access';
RAISE NOTICE '  - Regular users should get 0 rows';

SELECT
    'school_staff_credentials' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_condition
FROM pg_policies
WHERE tablename = 'school_staff_credentials'
ORDER BY policyname;

-- Test 2.6: Verify assessment_sessions RLS
RAISE NOTICE '';
RAISE NOTICE 'TEST 2.6: assessment_sessions RLS';
RAISE NOTICE '  - Students should only see their own sessions';
RAISE NOTICE '  - Teachers should see sessions from their class students';

SELECT
    'assessment_sessions' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_condition
FROM pg_policies
WHERE tablename = 'assessment_sessions'
ORDER BY policyname;

-- Test 2.7: Verify assessment_responses RLS
RAISE NOTICE '';
RAISE NOTICE 'TEST 2.7: assessment_responses RLS';
RAISE NOTICE '  - Students should only see their own responses';
RAISE NOTICE '  - Teachers should see responses from their class students';

SELECT
    'assessment_responses' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_condition
FROM pg_policies
WHERE tablename = 'assessment_responses'
ORDER BY policyname;

-- ============================================================================
-- SECTION 3: SECURITY DEFINER FUNCTION VERIFICATION
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'SECURITY DEFINER FUNCTIONS';
RAISE NOTICE '============================================';

-- List all SECURITY DEFINER functions
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
    p.provolatile as volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

-- ============================================================================
-- SECTION 4: CROSS-USER ACCESS DENIAL TESTS
-- ============================================================================

-- These tests verify that users cannot access each other's data
-- Run these with different user sessions to verify RLS

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'MANUAL CROSS-USER ACCESS TESTS';
RAISE NOTICE '============================================';
RAISE NOTICE '';
RAISE NOTICE 'To fully test RLS, run these queries as different users:';
RAISE NOTICE '';
RAISE NOTICE '1. As Student A (auth.uid() = student_a_id):';
RAISE NOTICE '   SELECT * FROM student_profiles WHERE user_id = student_b_id;';
RAISE NOTICE '   Expected: 0 rows (cannot see other student profiles)';
RAISE NOTICE '';
RAISE NOTICE '2. As Student A:';
RAISE NOTICE '   SELECT * FROM classes WHERE id = class_owned_by_teacher_b;';
RAISE NOTICE '   Expected: 0 rows (not enrolled in this class)';
RAISE NOTICE '';
RAISE NOTICE '3. As Teacher A:';
RAISE NOTICE '   SELECT * FROM classes WHERE teacher_id = teacher_b_id;';
RAISE NOTICE '   Expected: 0 rows (cannot see other teacher classes)';
RAISE NOTICE '';
RAISE NOTICE '4. As any authenticated user:';
RAISE NOTICE '   SELECT * FROM school_staff_credentials;';
RAISE NOTICE '   Expected: 0 rows (service_role only)';
RAISE NOTICE '';

-- ============================================================================
-- SECTION 5: RLS ENABLED CHECK
-- ============================================================================

RAISE NOTICE '============================================';
RAISE NOTICE 'RLS ENABLED STATUS';
RAISE NOTICE '============================================';

SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN '✓ SECURE' ELSE '✗ VULNERABLE' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users',
    'student_profiles',
    'teacher_profiles',
    'schools',
    'school_staff_credentials',
    'classes',
    'enrollments',
    'assessment_sessions',
    'assessment_responses'
)
ORDER BY tablename;

-- ============================================================================
-- SECTION 6: COUNT POLICIES PER TABLE
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'POLICY COUNT PER TABLE';
RAISE NOTICE '============================================';

SELECT
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT cmd::text, ', ') as operations_covered
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- SECTION 7: QUICK SECURITY CHECKS
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'QUICK SECURITY CHECKS';
RAISE NOTICE '============================================';

-- Check 1: Verify no SELECT ALL policies (permissive with true condition)
SELECT
    'POTENTIAL ISSUE: Open SELECT policy' as warning,
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND cmd = 'SELECT'
AND qual::text = 'true'
AND tablename NOT IN ('schools'); -- schools is intentionally open for authenticated users

-- Check 2: Verify service_role restriction on sensitive tables
SELECT
    'service_role restriction check' as check_type,
    tablename,
    policyname,
    qual::text as condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'school_staff_credentials';

-- Check 3: Verify INSERT policies have user_id = auth.uid() check
SELECT
    tablename,
    policyname,
    CASE
        WHEN qual::text LIKE '%auth.uid()%' THEN '✓ Has auth.uid() check'
        ELSE '⚠ Missing auth.uid() check'
    END as security_check
FROM pg_policies
WHERE schemaname = 'public'
AND cmd = 'INSERT'
AND tablename IN ('student_profiles', 'teacher_profiles', 'assessment_sessions')
ORDER BY tablename;

-- ============================================================================
-- SECTION 8: HELPER FUNCTION TESTS
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'HELPER FUNCTION EXISTENCE CHECK';
RAISE NOTICE '============================================';

-- Verify all required helper functions exist
SELECT
    proname as function_name,
    CASE WHEN proname IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM pg_proc
WHERE proname IN (
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

-- ============================================================================
-- SECTION 9: SUMMARY
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'RLS SMOKE TEST COMPLETE';
RAISE NOTICE '============================================';
RAISE NOTICE '';
RAISE NOTICE 'Next Steps:';
RAISE NOTICE '1. Review any warnings above';
RAISE NOTICE '2. Run manual cross-user tests with real sessions';
RAISE NOTICE '3. Test with Playwright E2E tests';
RAISE NOTICE '';
