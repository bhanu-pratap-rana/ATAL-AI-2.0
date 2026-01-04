-- =====================================================
-- Migration 127: Fix get_school_metrics Schema References
-- =====================================================
--
-- Purpose: Fix Migration 125 bugs
-- Bug #1: References non-existent 'pins' table (should be 'school_staff_credentials')
-- Bug #2: References non-existent 'classes.school_id' column (classes has no school_id)
--
-- Fix: Drop buggy function and recreate with correct schema references
--
-- =====================================================

-- Drop the buggy function from Migration 125
DROP FUNCTION IF EXISTS get_school_metrics();

-- Recreate with corrected schema references
CREATE OR REPLACE FUNCTION get_school_metrics()
RETURNS TABLE (
  school_id UUID,
  school_name TEXT,
  teacher_count BIGINT,
  student_count BIGINT,
  active_pin_count BIGINT,
  total_classes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check if caller is admin
  SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role' INTO v_user_role;

  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    s.id as school_id,
    s.name as school_name,
    COUNT(DISTINCT tp.user_id) as teacher_count,
    COUNT(DISTINCT sp.user_id) as student_count,
    -- FIX #1: Use school_staff_credentials instead of 'pins' (which doesn't exist)
    COUNT(DISTINCT ssc.id) FILTER (WHERE ssc.deleted_at IS NULL) as active_pin_count,
    -- FIX #2: Join classes via teacher_profiles (classes has no school_id column)
    -- classes.teacher_id → teacher_profiles.user_id → teacher_profiles.school_id
    COUNT(DISTINCT c.id) as total_classes
  FROM schools s
  LEFT JOIN teacher_profiles tp ON tp.school_id = s.id
  LEFT JOIN student_profiles sp ON sp.school_id = s.id
  LEFT JOIN school_staff_credentials ssc ON ssc.school_id = s.id  -- ✅ Correct table name
  LEFT JOIN classes c ON c.teacher_id = tp.user_id                -- ✅ Indirect join via teachers
  GROUP BY s.id, s.name
  ORDER BY s.name;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_school_metrics() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_school_metrics IS 
'Returns aggregated metrics for all schools (admin only). Fixed schema references from Migration 125.';

-- =====================================================
-- Verification
-- =====================================================
-- Test: SELECT * FROM get_school_metrics();
-- Expected: Returns school metrics without error
-- =====================================================

