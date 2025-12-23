# ATAL AI Database Documentation

> **Last Updated:** December 23, 2025 (44 migrations)
> **Database:** Supabase (PostgreSQL)
> **Project ID:** hnlsqznoviwnyrkskfay

## Table of Contents

- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
  - [users](#users)
  - [student_profiles](#student_profiles)
  - [teacher_profiles](#teacher_profiles)
  - [schools](#schools)
  - [school_staff_credentials](#school_staff_credentials)
  - [usernames](#usernames)
  - [classes](#classes)
  - [enrollments](#enrollments)
  - [assessment_sessions](#assessment_sessions)
  - [assessment_responses](#assessment_responses)
  - [irt_item_bank](#irt_item_bank)
- [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
- [Database Functions](#database-functions)
- [Indexes](#indexes)
- [Security Model](#security-model)
- [Advisor Warnings](#advisor-warnings)
- [Migration History](#migration-history)

---

## Overview

The ATAL AI database supports an educational assessment platform with the following key features:

> **Important Schema Note:** The `teacher_profiles` and `student_profiles` tables use `user_id` as their primary key (NOT `id`). When querying these tables, always use `.select('user_id')` or `.eq('user_id', ...)` - never `.select('id')` which will cause column not found errors.

- **Multi-Auth Support**: Students can sign in via Email+OTP, Phone+OTP, or Username (Quick Start)
- **Teacher Management**: Teachers sign in with email/phone and manage classes
- **Class Enrollment**: Students join classes using class code + PIN
- **Assessment Tracking**: Track assessment sessions and individual responses
- **School Verification**: Teachers verified against school staff credentials

### Current Statistics (Live from Supabase)

| Table | Row Count | RLS Enabled |
|-------|-----------|-------------|
| users | 4 | Yes |
| student_profiles | 2 | Yes |
| teacher_profiles | 1 | Yes |
| schools | 393 | Yes |
| school_staff_credentials | 5 | Yes |
| usernames | 1 | Yes |
| classes | 23 | Yes |
| enrollments | 2 | Yes |
| assessment_sessions | 42 | Yes |
| assessment_responses | 0 | Yes |
| irt_item_bank | 180 | Yes |

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   auth.users    │     │     schools     │     │school_staff_    │
│   (Supabase)    │     │                 │     │credentials      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │◄────│ school_id (FK)  │
│ email           │     │ school_code     │     │ pin_hash        │
│ ...             │     │ school_name     │     │ rotated_at      │
└────────┬────────┘     │ district        │     └─────────────────┘
         │              │ block           │
         │              │ address         │
         │              └────────┬────────┘
         │                       │
    ┌────┴────┐                  │
    │         │                  │
    ▼         ▼                  │
┌─────────┐ ┌─────────────┐      │
│ student │ │  teacher    │      │
│_profiles│ │ _profiles   │◄─────┘
├─────────┤ ├─────────────┤
│user_id  │ │ user_id(PK) │
│ (PK,FK) │ │ school_id   │
│name     │ │ (FK)        │
│phone    │ │ name        │
│school_id│ │ phone       │
│(FK)     │ │ school_code │
│gender   │ │ gender      │
│village  │ │ village     │
└────┬────┘ └──────┬──────┘
     │             │
     │             │ teacher_id
     │             ▼
     │      ┌─────────────┐      ┌─────────────┐
     │      │   classes   │      │  usernames  │
     │      ├─────────────┤      ├─────────────┤
     │      │ id (PK)     │      │ id (PK)     │
     │      │ name        │      │ user_id(FK) │
     │      │ subject     │      │ username    │
     │      │ class_code  │      └─────────────┘
     │      │ join_pin    │
     │      │ teacher_id  │
     │      │ (FK)        │
     │      └──────┬──────┘
     │             │
     │    ┌────────┴────────┐
     │    │                 │
     │    ▼                 ▼
     │ ┌─────────────┐ ┌─────────────────┐
     │ │ enrollments │ │assessment_      │
     │ ├─────────────┤ │sessions         │
     │ │ id (PK)     │ ├─────────────────┤
     └─┤ student_id  │ │ id (PK)         │
       │ (FK)        │ │ user_id (FK)    │
       │ class_id    │ │ class_id (FK)   │
       │ (FK)        │ │ started_at      │
       └─────────────┘ │ submitted_at    │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │assessment_      │
                       │responses        │
                       ├─────────────────┤
                       │ id (PK)         │
                       │ session_id (FK) │
                       │ item_id         │
                       │ module          │
                       │ chosen_option   │
                       │ is_correct      │
                       │ rt_ms           │
                       └─────────────────┘
```

---

## Tables

### users

> **Purpose:** Legacy users table for role tracking. Main auth handled by `auth.users`.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | PRIMARY KEY | User ID |
| `email` | `text` | NO | - | UNIQUE | User email |
| `role` | `text` | NO | - | CHECK (role IN ('student', 'teacher')) | User role |
| `created_at` | `timestamp` | YES | `now()` | - | Creation timestamp |

**RLS Enabled:** Yes
**Rows:** 4

---

### student_profiles

> **Purpose:** Stores profile details for all students (email, phone, or username authenticated). This is mandatory data collected after sign-in.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `user_id` | `uuid` | NO | - | PRIMARY KEY, FK → auth.users | User ID |
| `name` | `text` | NO | - | - | Student's full name |
| `phone` | `text` | YES | - | - | Phone number (records only, no OTP) |
| `roll_number` | `text` | YES | - | - | School roll number |
| `school_id` | `uuid` | YES | - | FK → schools | Reference to schools table |
| `school_name` | `text` | YES | - | - | Denormalized school name (fallback) |
| `class_name` | `text` | YES | - | - | Class level (e.g., "Class 5") |
| `village` | `text` | YES | - | - | Village or location name |
| `gender` | `text` | NO | - | CHECK (gender IN ('male', 'female')) | Student gender |
| `created_at` | `timestamptz` | YES | `now()` | - | Creation timestamp |
| `updated_at` | `timestamptz` | YES | `now()` | - | Last update timestamp |

**RLS Enabled:** Yes
**Rows:** 2
**Index:** `idx_student_profiles_school_id` on `school_id`

---

### teacher_profiles

> **Purpose:** Stores profile details for teachers. Only verified users (email/phone authenticated + school PIN) can have teacher profiles.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `user_id` | `uuid` | NO | - | PRIMARY KEY, FK → auth.users | User ID |
| `school_id` | `uuid` | NO | - | FK → schools | School reference |
| `name` | `text` | NO | - | - | Teacher's full name |
| `phone` | `text` | YES | - | - | Phone number |
| `subject` | `text` | YES | - | - | Subject taught |
| `school_code` | `text` | NO | - | - | School code |
| `gender` | `text` | YES | - | CHECK (gender IN ('male', 'female')) | Teacher gender |
| `village` | `text` | YES | - | - | Village or location name |
| `created_at` | `timestamptz` | YES | `now()` | - | Creation timestamp |
| `updated_at` | `timestamptz` | YES | `now()` | - | Last update timestamp |

**RLS Enabled:** Yes
**Rows:** 1
**Index:** `idx_teacher_profiles_school_id` on `school_id`

---

### schools

> **Purpose:** Master list of schools (393 schools from Kamrup Rural district, Assam).

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PRIMARY KEY | School ID |
| `school_code` | `text` | NO | - | UNIQUE | Unique school code (SEBA format) |
| `school_name` | `text` | NO | - | - | School name |
| `district` | `text` | NO | - | - | District name |
| `block` | `text` | YES | - | - | Block name |
| `address` | `text` | YES | - | - | School address |
| `created_at` | `timestamptz` | YES | `now()` | - | Creation timestamp |

**RLS Enabled:** Yes
**Rows:** 393
**Index:** `idx_schools_district` on `district`

---

### school_staff_credentials

> **Purpose:** Stores hashed PINs for school staff authentication. Only accessible via service role (server-side).

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PRIMARY KEY | Credential ID |
| `school_id` | `uuid` | NO | - | UNIQUE, FK → schools | School reference |
| `pin_hash` | `text` | NO | - | - | Bcrypt hashed PIN (4-8 digits) |
| `rotated_at` | `timestamptz` | YES | - | - | Last PIN rotation timestamp |
| `created_at` | `timestamptz` | YES | `now()` | - | Creation timestamp |
| `updated_at` | `timestamptz` | YES | `now()` | - | Last update timestamp |
| `deleted_at` | `timestamptz` | YES | - | - | Soft delete timestamp |

**RLS Enabled:** Yes
**Rows:** 5
**Security:** Only accessible via `service_role` (server actions)
**Indexes:** `idx_school_staff_credentials_rotated_at`, `idx_school_staff_credentials_deleted_at`

---

### usernames

> **Purpose:** Lookup table for username-based authentication. Maps usernames to auth.users for students using Quick Start (no email/phone required).

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PRIMARY KEY | Record ID |
| `user_id` | `uuid` | NO | - | FK → auth.users ON DELETE CASCADE | User reference |
| `username` | `text` | NO | - | UNIQUE | Unique username (case-insensitive) |
| `created_at` | `timestamptz` | YES | `now()` | - | Creation timestamp |

**RLS Enabled:** Yes
**Rows:** 1
**Indexes:** `idx_usernames_username`, `idx_usernames_user_id`
**Security:** Service role has full access, authenticated users can read their own record, anon can check availability

---

### classes

> **Purpose:** Classes created by teachers. Students join via class code + PIN.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | PRIMARY KEY | Class ID |
| `name` | `text` | NO | - | - | Class name |
| `subject` | `text` | YES | - | - | Subject taught |
| `teacher_id` | `uuid` | YES | - | FK → users | Teacher who created the class |
| `class_code` | `text` | YES | - | UNIQUE | 6-character alphanumeric code |
| `join_pin` | `text` | YES | - | - | 4-digit PIN for joining |
| `created_at` | `timestamp` | YES | `now()` | - | Creation timestamp |

**RLS Enabled:** Yes
**Rows:** 23
**Index:** `idx_classes_class_code`, `idx_classes_teacher_id`
**Auto-generated:** `class_code` and `join_pin` are auto-generated on insert via trigger

---

### enrollments

> **Purpose:** Links students to classes they've joined.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `uuid_generate_v4()` | PRIMARY KEY | Enrollment ID |
| `class_id` | `uuid` | YES | - | FK → classes | Class reference |
| `student_id` | `uuid` | YES | - | FK → users | Student reference |
| `created_at` | `timestamp` | YES | `now()` | - | Creation timestamp |
| `enrolled_at` | `timestamptz` | YES | `now()` | - | When student enrolled |

**RLS Enabled:** Yes
**Rows:** 2
**Indexes:** `idx_enrollments_class_id`, `idx_enrollments_student_id`, `idx_enrollments_enrolled_at`
**Unique Constraint:** `(class_id, student_id)` - Student can only enroll once per class

---

### assessment_sessions

> **Purpose:** Tracks assessment attempts by students.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PRIMARY KEY | Session ID |
| `user_id` | `uuid` | NO | - | FK → users | Student taking the assessment |
| `class_id` | `uuid` | YES | - | FK → classes | Class context (optional) |
| `started_at` | `timestamptz` | NO | `now()` | - | When assessment started |
| `submitted_at` | `timestamptz` | YES | - | - | When assessment was submitted |
| `created_at` | `timestamptz` | NO | `now()` | - | Creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | - | Last update timestamp |

**RLS Enabled:** Yes
**Rows:** 42
**Index:** `idx_assessment_sessions_submitted` on `submitted_at`

---

### assessment_responses

> **Purpose:** Individual question responses within an assessment session.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PRIMARY KEY | Response ID |
| `session_id` | `uuid` | NO | - | FK → assessment_sessions | Session reference |
| `user_id` | `uuid` | YES | - | FK → auth.users | User who answered (denormalized) |
| `item_id` | `text` | NO | - | - | Question identifier |
| `module` | `text` | NO | - | - | Assessment module name |
| `chosen_option` | `text` | YES | - | - | Selected answer option |
| `is_correct` | `boolean` | YES | - | - | Whether answer was correct |
| `rt_ms` | `integer` | YES | - | - | Response time in milliseconds |
| `focus_blur_count` | `integer` | YES | `0` | - | Tab switch count (anti-cheat) |
| `created_at` | `timestamptz` | NO | `now()` | - | Response timestamp |

**RLS Enabled:** Yes
**Rows:** 0
**Indexes:** `idx_assessment_responses_session_id`, `idx_assessment_responses_module`, `idx_assessment_responses_item_id`, `idx_assessment_responses_session_module`, `idx_assessment_responses_user_id`
**Trigger:** `set_assessment_response_user_id_trigger` auto-populates `user_id` from session on INSERT

---

### irt_item_bank

> **Purpose:** IRT-calibrated item bank for Computerized Adaptive Testing (CAT). Stores assessment questions with Item Response Theory (IRT) 3-Parameter Logistic (3PL) model parameters for adaptive item selection and ability estimation.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PRIMARY KEY | Item ID |
| `item_code` | `varchar` | NO | - | UNIQUE | Unique item identifier (e.g., CAT_EN_DDF_001) |
| `category` | `varchar` | NO | - | CHECK | Digital literacy category (5 domains) |
| `level` | `varchar` | NO | `'basic'` | CHECK (basic, intermediate, advanced) | Difficulty level label |
| `question_text` | `text` | NO | - | - | Question text displayed to student |
| `options` | `jsonb` | NO | - | - | Answer options: `[{id: "A", text: "..."}]` |
| `correct_answer` | `integer` | NO | - | CHECK (1-4) | Index of correct answer (1-based) |
| `difficulty` | `numeric` | NO | `0` | CHECK (-4 to 4) | IRT difficulty parameter (b) |
| `discrimination` | `numeric` | NO | `1` | CHECK (0.1 to 3.0) | IRT discrimination parameter (a) |
| `guessing` | `numeric` | NO | `0.25` | CHECK (0 to 0.5) | IRT guessing parameter (c) |
| `language` | `varchar` | NO | `'en'` | CHECK (en, hi, as) | Language code |
| `source_language` | `varchar` | YES | `'en'` | CHECK (en, hi, as) | Original language of item |
| `cultural_context` | `varchar` | YES | `'northeast_india'` | - | Cultural context tag |
| `times_administered` | `integer` | YES | `0` | - | Number of times item was used |
| `times_correct` | `integer` | YES | `0` | - | Number of correct responses |
| `point_biserial` | `numeric` | YES | - | - | Point-biserial correlation coefficient |
| `estimated_time_seconds` | `integer` | YES | `30` | - | Expected response time |
| `min_time_ms` | `integer` | YES | `3000` | - | Minimum response time threshold |
| `is_active` | `boolean` | YES | `true` | - | Whether item is available for selection |
| `review_state` | `varchar` | YES | `'approved'` | CHECK (draft, needs_translation, review, approved) | Content review status |
| `created_at` | `timestamptz` | YES | `now()` | - | Creation timestamp |
| `updated_at` | `timestamptz` | YES | `now()` | - | Last update timestamp |
| `created_by` | `uuid` | YES | - | FK → auth.users | Creator user ID |
| `updated_by` | `uuid` | YES | - | FK → auth.users | Last updater user ID |

**RLS Enabled:** Yes
**Rows:** 180 (80 English, 50 Hindi, 50 Assamese)

**Categories (5 Digital Literacy Domains):**
- `contextual_application` - Applying digital skills to real-world scenarios
- `digital_content_creation` - Creating documents, presentations, media
- `digital_device_familiarity` - Hardware and device knowledge
- `internet_web_awareness` - Internet safety, browsing, email
- `problem_solving_aptitude` - Troubleshooting and logical thinking

**IRT 3PL Model:**
```
P(correct) = c + (1-c) / (1 + exp(-a*(θ-b)))

Where:
- θ (theta) = Student ability estimate (-4 to +4)
- a = Discrimination parameter (how well item differentiates abilities)
- b = Difficulty parameter (ability level where P(correct) = 0.5 + c/2)
- c = Guessing parameter (probability of correct answer by chance)
```

**Indexes:**
- `idx_irt_item_bank_category` on `category`
- `idx_irt_item_bank_language` on `language`
- `idx_irt_item_bank_active` on `is_active`
- `idx_irt_item_bank_difficulty` on `difficulty`
- `idx_irt_item_bank_discrimination` on `discrimination`
- `idx_irt_item_bank_adaptive_query` on `(language, is_active, category, difficulty)` - Composite index for CAT queries

**Trigger:** `trigger_update_irt_item_bank_updated_at` auto-updates `updated_at` on changes

---

## Row Level Security (RLS) Policies

### users

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `users_self_read` | SELECT | authenticated | `id = (SELECT auth.uid())` |
| `users_self_update` | UPDATE | authenticated | `id = (SELECT auth.uid())` |

### student_profiles

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `student_profile_self_select` | SELECT | public | `user_id = (SELECT auth.uid())` |
| `student_profile_teacher_select` | SELECT | public | `is_teacher() AND user_id IN get_teacher_student_ids()` |
| `student_profile_self_insert` | INSERT | public | `user_id = (SELECT auth.uid())` |
| `student_profile_self_update` | UPDATE | public | `user_id = (SELECT auth.uid())` |

> **Note:** Multiple permissive SELECT policies exist for `student_profiles`. This is intentional to allow both self-access and teacher roster access. Performance impact is minimal at current scale.

### teacher_profiles

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `teacher_self_read` | SELECT | authenticated | `user_id = (SELECT auth.uid())` |
| `teacher_self_insert` | INSERT | authenticated | `user_id = (SELECT auth.uid())` |
| `teacher_self_update` | UPDATE | authenticated | `user_id = (SELECT auth.uid())` |

### schools

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `schools_read` | SELECT | authenticated | `true` (all authenticated users can read) |

### school_staff_credentials

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `staff_creds_read_service_only` | SELECT | public | `auth.jwt()->>'role' = 'service_role'` |
| `staff_creds_insert_service_only` | INSERT | public | `auth.jwt()->>'role' = 'service_role'` |
| `staff_creds_update_service_only` | UPDATE | public | `auth.jwt()->>'role' = 'service_role'` |

### classes

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `classes_select` | SELECT | public | `teacher_id = (SELECT auth.uid()) OR id IN get_user_enrolled_class_ids()` |
| `classes_join_lookup` | SELECT | authenticated | `true` (allows students to look up class for joining) |
| `classes_insert` | INSERT | authenticated | `teacher_id = (SELECT auth.uid()) AND EXISTS(teacher_profile)` |
| `classes_update` | UPDATE | authenticated | `teacher_id = (SELECT auth.uid()) AND EXISTS(teacher_profile)` |
| `classes_delete` | DELETE | authenticated | `teacher_id = (SELECT auth.uid()) AND EXISTS(teacher_profile)` |

> **Note:** The `classes_join_lookup` policy allows any authenticated user to SELECT classes. This enables the join flow where students need to look up a class by code before they are enrolled. Security is maintained through PIN validation in the application layer.

### enrollments

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `enrollments_select` | SELECT | public | `student_id = (SELECT auth.uid()) OR class_id IN get_teacher_class_ids()` |
| `enrollments_insert` | INSERT | authenticated | Self-enroll OR teacher of class (with profile) |
| `enrollments_update` | UPDATE | authenticated | Teacher of class (with profile) |
| `enrollments_delete` | DELETE | authenticated | Teacher of class (with profile) |

### assessment_sessions

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `assessment_sessions_select` | SELECT | authenticated | Own session OR teacher of class |
| `assessment_sessions_insert` | INSERT | authenticated | `user_id = (SELECT auth.uid())` |
| `assessment_sessions_update` | UPDATE | authenticated | `user_id = (SELECT auth.uid())` |

### assessment_responses

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `assessment_responses_select` | SELECT | authenticated | Session belongs to user OR teacher of class |
| `assessment_responses_insert` | INSERT | authenticated | Session belongs to user |

### usernames

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `usernames_service_role_all` | ALL | service_role | `true` (full access for server-side operations) |
| `usernames_self_read` | SELECT | authenticated | `user_id = (SELECT auth.uid())` (InitPlan pattern) |
| `usernames_public_exists_check` | SELECT | anon | `true` (for availability check during registration) |

### irt_item_bank

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `irt_item_bank_authenticated_read` | SELECT | authenticated | `is_active = true AND review_state = 'approved' AND (SELECT auth.uid()) IS NOT NULL` |
| `irt_item_bank_anon_read` | SELECT | anon | `is_active = true AND review_state = 'approved'` |
| `irt_item_bank_service_all` | ALL | service_role | `true` (full access for admin operations) |
| `irt_item_bank_admin_all` | ALL | authenticated | Admin role check via `raw_app_meta_data->>'role'` |

> **Note:** The `irt_item_bank` table uses separate policies for `authenticated` and `anon` roles instead of `auth.role()` for better performance. Anonymous access is intentional to support guest assessments.

---

## Database Functions

### Trigger Functions

| Function | Security | Search Path | Description |
|----------|----------|-------------|-------------|
| `auto_generate_class_credentials()` | INVOKER | public | Auto-generates `class_code` and `join_pin` on class insert |
| `create_user_on_teacher_profile()` | DEFINER | "" | Creates user record when teacher profile is created |
| `create_user_on_student_profile()` | DEFINER | "" | Creates user record when student profile is created |
| `ensure_user_exists_for_enrollment()` | DEFINER | "" | Ensures user exists in public.users before enrollment |
| `update_assessment_session_updated_at()` | INVOKER | public | Updates `updated_at` timestamp on session changes |
| `update_student_profile_updated_at()` | INVOKER | "" | Updates `updated_at` timestamp on student profile changes |
| `update_teacher_profile_updated_at()` | INVOKER | "" | Updates `updated_at` timestamp on teacher profile changes |
| `set_assessment_response_user_id()` | DEFINER | public | Auto-populates `user_id` from session on response insert |

### Utility Functions

| Function | Security | Search Path | Description |
|----------|----------|-------------|-------------|
| `generate_class_code()` | INVOKER | public | Generates 6-character alphanumeric class code |
| `generate_join_pin()` | INVOKER | public | Generates 4-digit numeric PIN |
| `check_email_exists(p_email)` | DEFINER | public | Checks if email exists in auth.users |
| `check_username_available(p_username)` | DEFINER | public | Returns true if username is available for registration |
| `get_user_id_by_username(p_username)` | DEFINER | public | Returns user_id from username for login (service_role only) |

### Security Functions (SECURITY DEFINER) - 13 Total

| Function | Returns | Search Path | Description |
|----------|---------|-------------|-------------|
| `verify_staff_pin(p_school_id, p_pin)` | record | public | Verifies PIN against stored hash (service_role only) |
| `rotate_staff_pin(p_school_id, p_new_pin)` | record | public | Rotates/creates PIN for school (service_role only) |
| `check_email_exists(p_email)` | TABLE | public | Checks if email exists in auth.users |
| `check_username_available(p_username)` | BOOLEAN | public | Returns true if username is available for registration |
| `get_user_id_by_username(p_username)` | UUID | public | Returns user_id from username for login (service_role only) |
| `get_user_enrolled_class_ids(p_user_id)` | SETOF UUID | public | Returns class IDs where student is enrolled |
| `get_teacher_class_ids(p_user_id)` | SETOF UUID | public | Returns class IDs owned by teacher |
| `is_teacher()` | BOOLEAN | public | Checks if current user has a teacher profile |
| `get_teacher_student_ids()` | SETOF UUID | public | Returns student IDs enrolled in teacher's classes |
| `is_class_teacher(p_class_id)` | BOOLEAN | public | Checks if current user is teacher of specific class |
| `is_enrolled_in_class(p_class_id)` | BOOLEAN | public | Checks if current user is enrolled in specific class |
| `get_class_roster(p_class_id)` | TABLE | public | Returns student roster for a class (teacher only) |
| `search_students_for_teacher(p_search_query, p_limit)` | TABLE | public | Searches students in teacher's classes |

> **Usage Note:** Functions that take `p_user_id` should be called with `(SELECT auth.uid())` in RLS policies for optimal performance (InitPlan pattern). Functions without parameters use `auth.uid()` internally.

#### Required Extensions

| Extension | Schema | Purpose | Required By |
|-----------|--------|---------|-------------|
| `pgcrypto` | extensions | Bcrypt password hashing | `rotate_staff_pin`, `verify_staff_pin` |

> **Security Note:** The `pgcrypto` extension has been moved to the `extensions` schema for better security isolation (migration 044). All authenticated, anon, and service_role users have USAGE permission on this schema.

---

## Indexes

### Current Indexes

| Table | Index Name | Column(s) | Status |
|-------|------------|-----------|--------|
| `student_profiles` | `idx_student_profiles_school_id` | `school_id` | Unused (low data) |
| `teacher_profiles` | `idx_teacher_profiles_school_id` | `school_id` | Unused (low data) |
| `schools` | `idx_schools_district` | `district` | Unused (low data) |
| `classes` | `idx_classes_class_code` | `class_code` | Unused (low data) |
| `classes` | `idx_classes_teacher_id` | `teacher_id` | Unused (low data) |
| `enrollments` | `idx_enrollments_class_id` | `class_id` | Unused (low data) |
| `enrollments` | `idx_enrollments_student_id` | `student_id` | Unused (low data) |
| `school_staff_credentials` | `idx_school_staff_credentials_rotated_at` | `rotated_at` | Unused (low data) |
| `school_staff_credentials` | `idx_school_staff_credentials_deleted_at` | `deleted_at` | Unused (low data) |
| `usernames` | `idx_usernames_username` | `username` | Unused (low data) |
| `assessment_sessions` | `idx_assessment_sessions_submitted` | `submitted_at` | Unused (low data) |
| `assessment_responses` | `idx_assessment_responses_session_id` | `session_id` | Unused (low data) |
| `assessment_responses` | `idx_assessment_responses_module` | `module` | Unused (low data) |
| `assessment_responses` | `idx_assessment_responses_item_id` | `item_id` | Unused (low data) |
| `assessment_responses` | `idx_assessment_responses_session_module` | `session_id, module` | Unused (low data) |

> **Note:** All indexes show as "unused" because the database has low data volume. These indexes will become essential as the application scales. Do NOT remove them.

---

## Security Model

### User Types

| Type | Authentication | Profile Table | Can Manage Classes | Can Take Assessments |
|------|----------------|---------------|-------------------|---------------------|
| Email Student | Email + OTP | student_profiles | No | Yes |
| Phone Student | Phone + OTP | student_profiles | No | Yes |
| Username Student | Username + Password | student_profiles | No | Yes |
| Teacher | Email/Phone + OTP + School PIN | teacher_profiles | Yes | No |
| Admin | Email + Password | - | Super access | - |

### Access Control Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Authentication (Supabase Auth)                              │
│     ├── Email + OTP → Students & Teachers                       │
│     ├── Phone + OTP → Students & Teachers                       │
│     └── Username + Password → Students only (Quick Start)       │
│                                                                 │
│  2. Authorization (RLS Policies)                                │
│     ├── teacher_profiles existence → Teacher privileges         │
│     ├── enrollments → Class membership verification             │
│     ├── SECURITY DEFINER functions → Bypass RLS safely          │
│     └── service_role → Server-side operations only              │
│                                                                 │
│  3. Data Access                                                 │
│     ├── Students: Own profile, enrolled classes, own sessions   │
│     ├── Teachers: Own profile, own classes, enrolled students   │
│     └── Service: PIN verification, credential management        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Security Features

1. **No anonymous teachers**: Only users with `teacher_profiles` can create/manage classes
2. **School PIN verification**: Teachers must verify with school staff PIN during registration
3. **Bcrypt hashing**: School staff PINs use pgcrypto's `crypt()` with `gen_salt('bf', 10)` (cost factor 10)
4. **Service role isolation**: `school_staff_credentials` only accessible via server actions
5. **Self-enrollment**: Students can enroll themselves using class code + PIN
6. **Teacher verification**: All class management operations require `teacher_profiles` existence
7. **InitPlan optimization**: RLS policies use `(SELECT auth.uid())` pattern for performance

---

## Advisor Warnings

### Security Advisories

| Level | Issue | Description | Status |
|-------|-------|-------------|--------|
| WARN | Anonymous Access Policies | Multiple tables allow authenticated access | **EXPECTED** - Required for student workflow |
| ~~WARN~~ | ~~Extension in Public~~ | ~~pgcrypto in public schema~~ | **RESOLVED** - Moved to extensions schema (migration 044) |
| WARN | Leaked Password Protection | Disabled in Supabase Auth settings | **TODO** - Consider enabling |

### Performance Advisories

| Level | Issue | Table | Description | Status |
|-------|-------|-------|-------------|--------|
| WARN | Multiple Permissive Policies | `classes` | 2 SELECT policies for `authenticated` | **EXPECTED** - Required for join lookup |
| WARN | Multiple Permissive Policies | `student_profiles` | 2 SELECT policies for various roles | **EXPECTED** - Required for teacher roster |
| INFO | Unused Indexes | Multiple tables | 15 indexes not yet used | **EXPECTED** - Low data volume |

---

## Migration History

| Version | Timestamp | Name | Description |
|---------|-----------|------|-------------|
| 001 | 20251107083407 | create_initial_schema | users, classes, enrollments tables |
| 002 | 20251110052725 | enable_rls_policies | Basic RLS policies |
| 003 | 20251110052735 | seed_test_data | Test data |
| 004 | 20251110055402 | add_class_code_and_pin | Class joining credentials |
| 005 | 20251110060032 | auto_generate_class_codes | Auto-generate trigger |
| 006 | 20251110062446 | create_assessment_schema | Assessment tables |
| 007 | 20251114115321 | kamrup_rural_schools_phase1 | School data imports |
| 008 | 20251119063048 | fix_staff_credentials_rls | Fix staff credentials RLS |
| 009 | 20251119090214 | auto_create_user_on_teacher_profile | Auto create user trigger |
| 010 | 20251119092416 | add_subject_to_classes | Add subject to classes |
| 011 | 20251121162024 | create_check_email_exists_function | Email check function |
| 012 | 20251123154956 | update_kamrup_rural_schools_with_blocks | Add blocks to schools |
| 013 | 20251202071044 | add_missing_staff_credentials_columns | Add staff credential columns |
| 014 | 20251202072838 | create_rotate_staff_pin_function | PIN rotation function |
| 015 | 20251204041914 | create_verify_staff_pin_function | PIN verification function |
| 016 | 20251204041953 | fix_function_search_path_security | Function security fix |
| 017 | 20251204045458 | fix_rls_initplan_performance | Performance optimization |
| 018 | 20251204045726 | fix_remaining_rls_initplan_v3 | RLS performance fix v3 |
| 019 | 20251204045903 | fix_staff_creds_rls_initplan | Staff creds RLS fix |
| 020 | 20251204050300 | fix_anonymous_access_and_permissive_policies | Anonymous student workflow |
| 021 | 20251204051010 | fix_anonymous_student_workflow | Anonymous workflow fix |
| 022 | 20251204051102 | fix_initplan_for_is_anonymous_checks | Anonymous check fix |
| 023 | 20251204051336 | fix_initplan_with_proper_wrapping | Init plan wrapping fix |
| 024 | 20251204052309 | create_student_profiles_table | Student profiles table |
| 025 | 20251204052415 | add_gender_and_location_to_teacher_profiles | Teacher profile fields |
| 026 | 20251204052650 | fix_all_advisor_warnings | Security & performance fixes |
| 027 | 20251205062712 | fix_classes_rls_infinite_recursion | Fix RLS circular dependency (attempt 1) |
| 028 | 20251205063154 | fix_rls_recursion_v2 | Fix RLS with SECURITY DEFINER helper functions |
| 029 | 20251208090750 | fix_student_profiles_rls_with_security_definer | Add is_teacher(), get_teacher_student_ids() |
| 030 | 20251213091847 | fix_student_profiles_rls_initplan | Fix student_profiles RLS with InitPlan pattern |
| 031 | 20251213115803 | add_missing_foreign_key_indexes | Add idx_classes_teacher_id, idx_enrollments_student_id |
| 032 | 20251215000000 | fix_usernames_rls_initplan | Fix usernames RLS with InitPlan pattern |
| 033 | 20251215100000 | fix_classes_rls_for_join | Add classes_join_lookup policy for student join flow |
| 034 | 20251215110000 | add_teacher_roster_access | Policies for teachers to view student profiles |
| 035 | 20251218000000 | create_check_email_exists_function | SECURITY DEFINER function for email check |
| 036 | 20251218000100 | add_missing_foreign_key_indexes | Add missing FK indexes |
| 037 | 20251218134700 | fix_security_definer_search_paths | Fix SET search_path on SECURITY DEFINER functions |
| 038 | 20251222063949 | add_user_id_to_assessment_responses | Add denormalized user_id column to assessment_responses |
| 039 | 20251222063958 | add_enrolled_at_to_enrollments | Add explicit enrolled_at column to enrollments |
| 040 | 20251222071552 | create_irt_item_bank | Create IRT item bank table with 3PL parameters |
| 041 | 20251222093218 | create_irt_item_bank | Seed 30 English IRT items (6 per category) |
| 042 | 20251222094859 | fix_irt_item_bank_rls_policies | Fix RLS policies: replace auth.role() with InitPlan pattern |
| 043 | 20251223075030 | fix_rls_and_roster_issues | Fix IRT admin policy with JWT metadata, fix get_class_roster timestamp |
| 044 | 20251223085943 | move_pgcrypto_to_extensions_schema | Move pgcrypto from public to extensions schema for security |

---

## Common Queries

### Check if user has teacher profile
```sql
SELECT EXISTS(
  SELECT 1 FROM teacher_profiles
  WHERE user_id = auth.uid()
);
```

### Get classes for enrolled student
```sql
SELECT c.* FROM classes c
JOIN enrollments e ON e.class_id = c.id
WHERE e.student_id = auth.uid();
```

### Get students in a teacher's class
```sql
SELECT sp.* FROM student_profiles sp
JOIN enrollments e ON e.student_id = sp.user_id
JOIN classes c ON c.id = e.class_id
WHERE c.teacher_id = auth.uid();
```

### Verify class code and PIN (client-side)
```sql
SELECT id FROM classes
WHERE class_code = $1 AND join_pin = $2;
```

### Get assessment history for student
```sql
SELECT
  s.id,
  s.started_at,
  s.submitted_at,
  COUNT(r.id) as total_questions,
  SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END) as correct_answers
FROM assessment_sessions s
LEFT JOIN assessment_responses r ON r.session_id = s.id
WHERE s.user_id = auth.uid() AND s.submitted_at IS NOT NULL
GROUP BY s.id
ORDER BY s.submitted_at DESC;
```

---

## Recommended Improvements

### High Priority

1. **Enable Leaked Password Protection** - Enable in Supabase Auth settings to prevent use of compromised passwords

### Low Priority (Future)

2. ~~**Move pgcrypto to extensions schema**~~ - ✅ **COMPLETED** (migration 044)
3. **Add assessment_templates table** - For teacher-created assessments
4. **Add class_invites table** - For tracking invite link usage

### Completed Improvements (Migration 038-044)

- **Added `user_id` column to assessment_responses** - Denormalized for better query performance
- **Added `enrolled_at` column to enrollments** - Explicit enrollment timestamp
- **Created `irt_item_bank` table** - IRT 3PL model for Computerized Adaptive Testing (CAT)
- **Seeded 180 IRT items** - 80 English, 50 Hindi, 50 Assamese across 5 digital literacy categories
- **Fixed IRT RLS policies** - Replaced deprecated `auth.role()` with InitPlan pattern for performance
- **Fixed IRT admin policy** - Changed from auth.users query to JWT metadata check (migration 043)
- **Fixed get_class_roster function** - Corrected timestamp type mismatch (migration 043)
- **Moved pgcrypto to extensions schema** - Improved security isolation (migration 044)

---

*This documentation is maintained alongside database migrations. Update when schema changes.*
