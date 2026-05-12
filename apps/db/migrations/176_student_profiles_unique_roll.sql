-- Migration 176: enforce unique roll number per class on student_profiles
--
-- Background: U5 — the teacher dashboard for "Class 9th A" displayed two
-- students at Roll No. 7 (Bhanu Pratap Rana and দীপক শৰ্মা). On
-- inspection their student_profiles.class_name strings differ ("Class 9"
-- vs "Class 9th A"), so the rows weren't strictly duplicates, but the
-- shared teacher_dashboard view (joined via the enrollments table)
-- surfaces both in the same list.
--
-- This index doesn't fix the visible side-effect by itself (that needs a
-- sync of student_profiles.class_name to the enrolled class), but it
-- prevents the obvious failure mode: two genuine students claiming the
-- same roll inside the same class_name. The condition guards against
-- existing rows where class_name or roll_number is NULL.

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_unique_roll_per_class
  ON public.student_profiles (class_name, roll_number)
  WHERE class_name IS NOT NULL AND roll_number IS NOT NULL;

COMMENT ON INDEX public.student_profiles_unique_roll_per_class IS
  'Prevents two students claiming the same roll number inside the same class_name string. NULL-safe partial index.';
