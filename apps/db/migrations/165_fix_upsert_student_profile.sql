-- ============================================================================
-- FIX: upsert_student_profile RPC — align with actual student_profiles schema
-- ============================================================================
-- The original migration (051) referenced columns that don't exist in the table:
--   date_of_birth, location, medium, board, class
-- Actual columns (from 023):
--   user_id, name, phone, roll_number, school_id, school_name, class_name, village, gender
--
-- This migration drops the old function and recreates it with correct columns.
-- ============================================================================

-- Drop old function (all overloads)
DROP FUNCTION IF EXISTS upsert_student_profile(uuid, text, text, text, text, text, text, text, text);

-- Recreate with correct column names matching student_profiles table
CREATE OR REPLACE FUNCTION upsert_student_profile(
  p_user_id uuid,
  p_name text,
  p_gender text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_roll_number text DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_school_name text DEFAULT NULL,
  p_class_name text DEFAULT NULL,
  p_village text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  INSERT INTO student_profiles (
    user_id, name, gender, phone, roll_number,
    school_id, school_name, class_name, village,
    created_at, updated_at
  ) VALUES (
    p_user_id,
    p_name,
    COALESCE(p_gender, 'male'),  -- gender is NOT NULL, default to 'male'
    p_phone,
    p_roll_number,
    p_school_id,
    p_school_name,
    p_class_name,
    p_village,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, student_profiles.name),
    gender = COALESCE(EXCLUDED.gender, student_profiles.gender),
    phone = COALESCE(EXCLUDED.phone, student_profiles.phone),
    roll_number = COALESCE(EXCLUDED.roll_number, student_profiles.roll_number),
    school_id = COALESCE(EXCLUDED.school_id, student_profiles.school_id),
    school_name = COALESCE(EXCLUDED.school_name, student_profiles.school_name),
    class_name = COALESCE(EXCLUDED.class_name, student_profiles.class_name),
    village = COALESCE(EXCLUDED.village, student_profiles.village),
    updated_at = NOW()
  RETURNING jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'name', name,
    'gender', gender
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'upsert_student_profile error: % (%)', SQLERRM, SQLSTATE;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to save profile. Please try again.',
    'code', 'PROFILE_SAVE_ERROR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION upsert_student_profile TO authenticated;

COMMENT ON FUNCTION upsert_student_profile IS
  'Atomic UPSERT for student profiles — aligned with actual student_profiles schema (migration 023). '
  'Uses COALESCE in ON CONFLICT to preserve existing values when new values are NULL.';
