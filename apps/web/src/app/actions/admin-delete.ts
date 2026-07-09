"use server";

import { createAdminClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { handleActionError } from "./action-utils";
import { RATE_LIMIT_ERRORS } from "@/lib/constants/error-messages";

/**
 * Valid database table names for user cascade deletion
 * SECURITY: Whitelist of tables to prevent injection attacks
 */
type ValidTable =
  | "ai_tutor_interactions"
  | "formative_responses"
  | "assessment_responses"
  | "assessment_sessions"
  | "student_knowledge_state"
  | "learning_style_profile"
  | "points_history"
  | "student_badges"
  | "enrollments"
  | "student_profiles"
  | "teacher_profiles"
  | "usernames";

/**
 * Validate table name is in whitelist
 * SECURITY: Prevents SQL injection by restricting to known tables
 */
function isValidTable(table: string): table is ValidTable {
  const validTables: Record<ValidTable, boolean> = {
    ai_tutor_interactions: true,
    formative_responses: true,
    assessment_responses: true,
    assessment_sessions: true,
    student_knowledge_state: true,
    learning_style_profile: true,
    points_history: true,
    student_badges: true,
    enrollments: true,
    student_profiles: true,
    teacher_profiles: true,
    usernames: true,
  };
  return table in validTables;
}

export interface DeleteUserResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Delete the currently authenticated user's own account
 * Performs cascade deletion of all user data and then deletes auth user
 * SECURITY: Only allows deleting the caller's own account (no escalation possible)
 */
export async function deleteOwnAccount(): Promise<DeleteUserResult> {
  try {
    // 1. Verify the user is authenticated
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // 2. Rate limit to prevent abuse
    const isAllowed = await checkRateLimit(
      `account-deletion:${user.id}`,
      RATE_LIMITS.accountDeletion,
    );
    if (!isAllowed) {
      return { success: false, error: RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS };
    }

    // 3. Prevent super_admin self-deletion (must be done by another super_admin)
    const role = user.app_metadata?.role as string | undefined;
    if (role === "super_admin") {
      return {
        success: false,
        error:
          "Super admin accounts cannot be self-deleted. Contact another super admin.",
      };
    }

    authLogger.info("[deleteOwnAccount] User initiated self-deletion", {
      userId: user.id,
      email: user.email,
      role,
    });

    const adminClient = await createAdminClient();
    const userId = user.id;

    // 4. Cascade delete all user data from all tables
    const tablesAndConditions = [
      ["ai_tutor_interactions", "student_id"],
      ["formative_responses", "student_id"],
      ["assessment_responses", "user_id"],
      ["assessment_sessions", "user_id"],
      ["student_knowledge_state", "student_id"],
      ["learning_style_profile", "student_id"],
      ["points_history", "student_id"],
      ["student_badges", "student_id"],
      ["enrollments", "student_id"],
      ["student_profiles", "user_id"],
      ["teacher_profiles", "user_id"],
      ["usernames", "user_id"],
    ];

    await Promise.all(
      tablesAndConditions.map(async ([table, column]) => {
        try {
          if (!isValidTable(table)) return;

          const { error: deleteError } = await adminClient
            .from(table)
            .delete()
            .eq(column, userId);

          if (deleteError) {
            authLogger.warn(
              `[deleteOwnAccount] Error deleting from ${table}`,
              { error: deleteError.message, userId },
            );
          }
        } catch (tableError) {
          authLogger.warn(
            `[deleteOwnAccount] Failed to delete from ${table}`,
            {
              error:
                tableError instanceof Error
                  ? tableError.message
                  : String(tableError),
              userId,
            },
          );
        }
      }),
    );

    // 5. Delete from public.users table
    try {
      const { error: usersDeleteError } = await adminClient
        .from("users")
        .delete()
        .eq("id", userId);

      if (usersDeleteError) {
        authLogger.warn("[deleteOwnAccount] Error deleting from users table", {
          error: usersDeleteError.message,
          userId,
        });
      }
    } catch (usersError) {
      authLogger.warn("[deleteOwnAccount] Failed to delete from users table", {
        error:
          usersError instanceof Error
            ? usersError.message
            : String(usersError),
        userId,
      });
    }

    // 6. Delete the auth user
    const { error: authDeleteError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      authLogger.error(
        "[deleteOwnAccount] Failed to delete auth user",
        authDeleteError,
      );
      return {
        success: false,
        error: "Failed to delete account. Please try again.",
      };
    }

    authLogger.success(
      "[deleteOwnAccount] User account deleted successfully",
      { userId, email: user.email },
    );

    return {
      success: true,
      message: "Your account and all associated data have been permanently deleted.",
    };
  } catch (error) {
    return handleActionError("deleteOwnAccount", error);
  }
}
