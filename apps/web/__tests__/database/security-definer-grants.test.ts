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

const LOCKED_FUNCTIONS = [
  // Bucket A — service_role only via app
  "cleanup_expired_lessons()",
  "cleanup_old_sync_logs()",
  "get_connection_stats()",
  "get_school_metrics()",
  "list_admin_users()",
  "rotate_staff_pin(uuid, text)",
  // Bucket D — trigger-fired
  "create_user_on_student_profile()",
  "create_user_on_teacher_profile()",
  "ensure_user_exists_for_enrollment()",
  "set_assessment_response_user_id()",
  "update_irt_item_bank_updated_at()",
] as const;

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
});
