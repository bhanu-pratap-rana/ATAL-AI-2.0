/**
 * Assert that SECURITY DEFINER EXECUTE grants are minimal per
 * specs/security-hardening/rpc-audit.csv.
 *
 * These functions should be callable ONLY by service_role:
 *   - bucket A (admin/maintenance via createAdminClient)
 *   - bucket D (trigger-fired, zero REST callers)
 *
 * If a future migration accidentally re-grants EXECUTE to anon or
 * authenticated, this test fails.
 */

import { Client } from "pg";

// Functions that MUST deny BOTH anon and authenticated (service_role only).
// From m177: bucket A (admin/maintenance) + bucket D (trigger-only).
const SERVICE_ROLE_ONLY = [
  "cleanup_expired_lessons()",
  "cleanup_old_sync_logs()",
  "get_connection_stats()",
  "get_school_metrics()",
  "list_admin_users()",
  "rotate_staff_pin(uuid, text)",
  "create_user_on_student_profile()",
  "create_user_on_teacher_profile()",
  "ensure_user_exists_for_enrollment()",
  "set_assessment_response_user_id()",
  "update_irt_item_bank_updated_at()",
] as const;

// Functions that MUST deny anon but allow authenticated.
// From m178: bucket B (server actions, client callers, RLS helpers).
const AUTHENTICATED_ONLY = [
  // RLS helpers
  "current_user_role()",
  "is_class_teacher(uuid)",
  "is_enrolled_in_class(uuid)",
  "is_teacher()",
  "get_teacher_class_ids(uuid)",
  "get_teacher_student_ids()",
  "get_user_enrolled_class_ids(uuid)",
  "teacher_has_student_access(uuid, uuid)",
  // Server-action callers
  "batch_check_and_award_badges(uuid)",
  "get_announcements_with_reads(uuid)",
  "get_class_leaderboard(text, integer)",
  "get_class_roster(uuid)",
  "get_class_student_progress(uuid[])",
  "get_module_topics(text)",
  "get_module_units_with_topics(text)",
  "get_modules_with_counts()",
  "get_topic(text)",
  "get_topic_context(text, text, integer)",
  "get_unread_announcements(uuid)",
  "increment_auditory_score(uuid)",
  "increment_material_download(uuid)",
  "increment_text_score(uuid, integer)",
  "increment_visual_score(uuid, integer)",
  "match_curriculum(vector, double precision, integer, text, text)",
  "match_curriculum_hybrid(vector, text, double precision, integer, text, double precision)",
  "search_students_for_teacher(text, integer)",
  "submit_assessment(uuid, uuid, jsonb)",
  "update_knowledge_state(uuid, text, text, boolean, integer, boolean)",
  "update_progress_atomic(uuid, text, text, integer)",
  "upsert_generated_lesson(text, text, text, jsonb, text, timestamp with time zone)",
  "upsert_student_profile(uuid, text, text, text, text, uuid, text, text, text)",
  "check_curriculum_completion(uuid)",
  "get_assessment_comparison(uuid)",
  "get_student_streak(uuid)",
  "has_assessment_type(uuid, text)",
  "upsert_learning_style_profile(uuid, numeric, numeric, numeric, text)",
] as const;

const LOCKED_FUNCTIONS = SERVICE_ROLE_ONLY; // back-compat alias
const ROLES_FORBIDDEN = ["anon", "authenticated"] as const;
const ROLES_ALLOWED = ["service_role"] as const;

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb("SECURITY DEFINER EXECUTE grants", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it.each(LOCKED_FUNCTIONS)(
    "denies anon and authenticated EXECUTE on public.%s",
    async (fn) => {
      for (const role of ROLES_FORBIDDEN) {
        const { rows } = await client.query<{ can: boolean }>(
          "SELECT has_function_privilege($1, $2, 'execute') AS can",
          [role, `public.${fn}`],
        );
        expect(rows[0]?.can).toBe(false);
      }
    },
  );

  it.each(LOCKED_FUNCTIONS)(
    "allows service_role EXECUTE on public.%s",
    async (fn) => {
      for (const role of ROLES_ALLOWED) {
        const { rows } = await client.query<{ can: boolean }>(
          "SELECT has_function_privilege($1, $2, 'execute') AS can",
          [role, `public.${fn}`],
        );
        expect(rows[0]?.can).toBe(true);
      }
    },
  );

  it.each(AUTHENTICATED_ONLY)(
    "denies anon EXECUTE on public.%s (authenticated allowed)",
    async (fn) => {
      const { rows } = await client.query<{ can: boolean }>(
        "SELECT has_function_privilege($1, $2, 'execute') AS can",
        ["anon", `public.${fn}`],
      );
      expect(rows[0]?.can).toBe(false);
    },
  );

  it.each(AUTHENTICATED_ONLY)(
    "allows authenticated and service_role EXECUTE on public.%s",
    async (fn) => {
      for (const role of ["authenticated", "service_role"] as const) {
        const { rows } = await client.query<{ can: boolean }>(
          "SELECT has_function_privilege($1, $2, 'execute') AS can",
          [role, `public.${fn}`],
        );
        expect(rows[0]?.can).toBe(true);
      }
    },
  );
});
