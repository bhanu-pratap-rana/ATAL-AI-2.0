/**
 * Admin and authentication utility functions
 * @internal - Server-side only
 */

import { createAdminClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { validateSupabaseAuthUsers } from "@/lib/validation/rpc-schemas";

/**
 * Supabase Admin API User type wrapper
 * Uses flexible typing for compatibility with Supabase SDK
 * @internal
 */
export type SupabaseAuthUser = Record<string, unknown> & {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

/**
 * Fetch all auth users with pagination support
 * Handles unlimited users without memory overflow
 *
 * @param adminClient - Supabase admin client
 * @returns Array of all auth users across all pages
 */
export async function fetchAllAuthUsers(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
) {
  const allUsers: SupabaseAuthUser[] = [];
  let page = 1;
  const perPage = 1000;

  try {
    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        perPage,
        page,
      });

      if (error) {
        authLogger.error("[fetchAllAuthUsers] Error fetching auth users page", {
          page,
          error: error.message,
        });
        break;
      }

      if (!data?.users || data.users.length === 0) {
        break;
      }

      // Validate and type-check users from Supabase admin API
      try {
        const validatedUsers = validateSupabaseAuthUsers(data.users);
        allUsers.push(...validatedUsers);
      } catch (error) {
        authLogger.error("[fetchAllAuthUsers] Failed to validate users", {
          error: error instanceof Error ? error.message : String(error),
          page,
        });
        // Continue with next page instead of failing completely
        break;
      }

      // Break if we got fewer users than requested (reached end)
      if (data.users.length < perPage) {
        break;
      }

      page++;
    }

    return allUsers;
  } catch (error) {
    authLogger.error("[fetchAllAuthUsers] Unexpected error", error);
    return allUsers; // Return what we got so far
  }
}

/**
 * Find user by email with pagination support
 * Safely searches across all auth users
 *
 * @param adminClient - Supabase admin client
 * @param email - Email to search for (will be lowercased)
 * @returns User object or undefined if not found
 */
export async function findAuthUserByEmail(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  email: string,
) {
  const normalizedEmail = email.toLowerCase();
  const allUsers = await fetchAllAuthUsers(adminClient);
  return allUsers.find((u) => u.email?.toLowerCase() === normalizedEmail);
}

/**
 * Find user by ID with pagination support
 * Safely searches across all auth users
 *
 * @param adminClient - Supabase admin client
 * @param userId - User ID to search for
 * @returns User object or undefined if not found
 */
export async function findAuthUserById(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
) {
  const allUsers = await fetchAllAuthUsers(adminClient);
  return allUsers.find((u) => u.id === userId);
}
