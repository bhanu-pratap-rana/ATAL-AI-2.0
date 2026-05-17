-- Migration 199: create demo accounts for E2E testing
--
-- Three deterministic demo accounts that exercise every role-gated
-- flow without needing to share real credentials with the agent
-- driving the tests. User explicitly authorized creating these
-- in-session ("create a demo users for each one for the students for
-- the teacher for the admin ... use your claude code, skills, and
-- test ... completely"). The .com TLD is required by the client-side
-- VALID_TLDS whitelist in apps/web/src/lib/auth-constants.
--
-- Cleanup (when the demo accounts are no longer needed) — delete in
-- this order (the enrollment + profile rows cascade via app-level
-- handling, not FK):
--
--   DELETE FROM public.enrollments WHERE student_id IN (
--     '11111111-1111-1111-1111-111111111111',
--     '22222222-2222-2222-2222-222222222222'
--   );
--   DELETE FROM public.classes WHERE teacher_id =
--     '22222222-2222-2222-2222-222222222222';
--   DELETE FROM public.student_profiles WHERE user_id =
--     '11111111-1111-1111-1111-111111111111';
--   DELETE FROM public.teacher_profiles WHERE user_id =
--     '22222222-2222-2222-2222-222222222222';
--   DELETE FROM public.users WHERE id IN (
--     '11111111-1111-1111-1111-111111111111',
--     '22222222-2222-2222-2222-222222222222',
--     '33333333-3333-3333-3333-333333333333'
--   );
--   DELETE FROM auth.users WHERE id IN (
--     '11111111-1111-1111-1111-111111111111',
--     '22222222-2222-2222-2222-222222222222',
--     '33333333-3333-3333-3333-333333333333'
--   );

DO $$
DECLARE
  v_student_id uuid := '11111111-1111-1111-1111-111111111111';
  v_teacher_id uuid := '22222222-2222-2222-2222-222222222222';
  v_admin_id   uuid := '33333333-3333-3333-3333-333333333333';
  v_school_id  uuid;
BEGIN
  -- Pick an existing school for the teacher profile. School code
  -- 14H0846 (A D M HIGH SCHOOL) is in the seed data.
  SELECT id INTO v_school_id FROM public.schools WHERE school_code = '14H0846' LIMIT 1;

  -- ============================================================
  -- DEMO STUDENT  email=demo.student@atal.com  pw=DemoStudent2026!
  -- ============================================================
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_anonymous, is_sso_user,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, phone_change, phone_change_token,
    email_change_token_current, reauthentication_token
  ) VALUES (
    v_student_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo.student@atal.com',
    crypt('DemoStudent2026!', gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'student'),
    '{}'::jsonb,
    NOW(), NOW(), false, false,
    '', '', '', '', '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    email = EXCLUDED.email,
    updated_at = NOW();

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_student_id::text, v_student_id,
    jsonb_build_object('sub', v_student_id::text, 'email', 'demo.student@atal.com', 'email_verified', true),
    'email', NOW(), NOW(), NOW()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

  INSERT INTO public.users (id, email, role, created_at)
  VALUES (v_student_id, 'demo.student@atal.com', 'student', NOW())
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

  INSERT INTO public.student_profiles (user_id, name, gender, roll_number, school_id, class_name, created_at, updated_at)
  VALUES (v_student_id, 'Demo Student', 'female', 'DEMO-S-001', v_school_id, 'Class 8', NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, gender = EXCLUDED.gender, updated_at = NOW();

  -- ============================================================
  -- DEMO TEACHER  email=demo.teacher@atal.com  pw=DemoTeacher2026!
  -- ============================================================
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_anonymous, is_sso_user,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, phone_change, phone_change_token,
    email_change_token_current, reauthentication_token
  ) VALUES (
    v_teacher_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo.teacher@atal.com',
    crypt('DemoTeacher2026!', gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'teacher'),
    '{}'::jsonb,
    NOW(), NOW(), false, false,
    '', '', '', '', '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    email = EXCLUDED.email,
    updated_at = NOW();

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_teacher_id::text, v_teacher_id,
    jsonb_build_object('sub', v_teacher_id::text, 'email', 'demo.teacher@atal.com', 'email_verified', true),
    'email', NOW(), NOW(), NOW()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

  INSERT INTO public.users (id, email, role, created_at)
  VALUES (v_teacher_id, 'demo.teacher@atal.com', 'teacher', NOW())
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;

  INSERT INTO public.teacher_profiles (user_id, school_id, school_code, name, phone, subject, gender, created_at, updated_at)
  VALUES (v_teacher_id, v_school_id, '14H0846', 'Demo Teacher', '+919999000001', 'Digital Literacy', 'male', NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

  -- ============================================================
  -- DEMO ADMIN    email=demo.admin@atal.com    pw=DemoAdmin2026!
  -- ============================================================
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_anonymous, is_sso_user,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, phone_change, phone_change_token,
    email_change_token_current, reauthentication_token
  ) VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo.admin@atal.com',
    crypt('DemoAdmin2026!', gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'admin'),
    '{}'::jsonb,
    NOW(), NOW(), false, false,
    '', '', '', '', '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    email = EXCLUDED.email,
    updated_at = NOW();

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_admin_id::text, v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'demo.admin@atal.com', 'email_verified', true),
    'email', NOW(), NOW(), NOW()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

  INSERT INTO public.users (id, email, role, created_at)
  VALUES (v_admin_id, 'demo.admin@atal.com', 'admin', NOW())
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email;
END $$;
