-- =====================================================
-- Migration 164: Fix verify_staff_pin and rotate_staff_pin pgcrypto references
-- =====================================================
-- Purpose: Fix broken crypt/gen_salt references in PIN functions
--
-- ROOT CAUSE:
--   Migration 026 correctly fixed functions to use extensions.crypt()
--   Migration 037 later re-created them with public.crypt() — undoing the fix
--   Migration 041 moved pgcrypto to extensions schema
--   Result: public.crypt() doesn't exist, PIN verification/rotation fails
--
-- FIX: Restore extensions.crypt() and extensions.gen_salt() references
--      while keeping the security improvements from migration 037
--      (service_role check, SET search_path)
-- =====================================================

-- ============================================================================
-- Fix 1: verify_staff_pin() — use extensions.crypt() for bcrypt comparison
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_staff_pin(
  p_school_id UUID,
  p_pin TEXT
) RETURNS TABLE (
  is_valid BOOLEAN,
  pin_id UUID,
  school_id UUID
) AS $$
DECLARE
  v_pin_hash TEXT;
  v_pin_id UUID;
  v_school_id UUID;
BEGIN
  -- Security: Only allow service role to call this function
  IF (auth.jwt() ->> 'role') != 'service_role' THEN
    RAISE EXCEPTION 'verify_staff_pin: Unauthorized - only service role can verify PINs';
  END IF;

  -- Get the PIN hash for this school
  SELECT
    id,
    ssc.school_id,
    pin_hash
  INTO
    v_pin_id,
    v_school_id,
    v_pin_hash
  FROM public.school_staff_credentials ssc
  WHERE ssc.school_id = p_school_id
  AND deleted_at IS NULL;

  -- If no PIN found, return false (not valid)
  IF v_pin_hash IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Compare PIN using bcrypt (FIX: use extensions schema where pgcrypto lives)
  IF extensions.crypt(p_pin, v_pin_hash) = v_pin_hash THEN
    RETURN QUERY SELECT TRUE, v_pin_id, v_school_id;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

COMMENT ON FUNCTION public.verify_staff_pin(UUID, TEXT) IS
  'Verifies staff PIN against bcrypt hash. Service role only. Uses extensions.crypt() for pgcrypto.';

-- ============================================================================
-- Fix 2: rotate_staff_pin() — use extensions.crypt() and extensions.gen_salt()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rotate_staff_pin(
  p_school_id UUID,
  p_new_pin TEXT
) RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  new_pin TEXT
) AS $$
DECLARE
  v_new_hash TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Security: Only allow service role (from verified server actions)
  IF (auth.jwt() ->> 'role') != 'service_role' THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'Unauthorized: Only server actions can rotate PINs'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Validate PIN format (4-8 digits)
  IF NOT (p_new_pin ~ '^\d{4,8}$') THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'Invalid PIN format: Must be 4-8 digits'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Hash the new PIN using bcrypt (FIX: use extensions schema where pgcrypto lives)
  v_new_hash := extensions.crypt(p_new_pin, extensions.gen_salt('bf', 10));

  -- Check if PIN already exists for school
  SELECT EXISTS(
    SELECT 1 FROM public.school_staff_credentials
    WHERE school_staff_credentials.school_id = p_school_id AND deleted_at IS NULL
  ) INTO v_exists;

  IF v_exists THEN
    -- Update existing PIN
    UPDATE public.school_staff_credentials
    SET
      pin_hash = v_new_hash,
      rotated_at = NOW(),
      updated_at = NOW()
    WHERE school_staff_credentials.school_id = p_school_id AND deleted_at IS NULL;
  ELSE
    -- Insert new PIN
    INSERT INTO public.school_staff_credentials (
      school_id,
      pin_hash,
      rotated_at,
      created_at,
      updated_at
    ) VALUES (
      p_school_id,
      v_new_hash,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  -- Return success with the PIN (to be sent to admin via secure channel)
  RETURN QUERY SELECT
    TRUE::BOOLEAN,
    NULL::TEXT,
    p_new_pin::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

COMMENT ON FUNCTION public.rotate_staff_pin(UUID, TEXT) IS
  'Rotates staff PIN with bcrypt hashing. Service role only. Uses extensions.crypt()/gen_salt() for pgcrypto.';

-- ============================================================================
-- Ensure permissions are granted
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rotate_staff_pin(UUID, TEXT) TO service_role;
