/**
 * Demo account credentials (created by migration 199, safe for e2e).
 *
 * These are seeded demo accounts on the project database — tests that
 * mutate data (announcements, assessment submissions, tutor messages)
 * only ever do so as these accounts, and clean up after themselves
 * where the UI provides deletion.
 */
export const DEMO = {
  student: { email: "demo.student@atal.com", password: "DemoStudent2026!" },
  teacher: { email: "demo.teacher@atal.com", password: "DemoTeacher2026!" },
  admin: { email: "demo.admin@atal.com", password: "DemoAdmin2026!" },
} as const;

export const AUTH_DIR = "tests/.auth";
export const STUDENT_STATE = `${AUTH_DIR}/student.json`;
export const TEACHER_STATE = `${AUTH_DIR}/teacher.json`;
export const ADMIN_STATE = `${AUTH_DIR}/admin.json`;
