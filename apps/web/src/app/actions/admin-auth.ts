"use server";

import { createAdminClient, verifySuperAdminAuth } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { isAdmin } from "@/lib/auth/role-utils";
import {
  AdminEmailSchema,
  AdminPasswordSchema,
} from "@/lib/validation-schemas";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { checkRateLimit as checkDistributedRateLimit } from "@/lib/rate-limiter-distributed";
import { validateInput, handleActionError } from "./action-utils";
import { RATE_LIMIT_ERRORS } from "@/lib/constants/error-messages";

export interface CreateAdminUserResult {
  success: boolean;
  error?: string;
  message?: string;
  userId?: string;
}

export interface AdminExistsResult {
  exists: boolean;
  error?: string;
}

/**
 * Check if any admin user exists in the system
 * Used to determine if bootstrap mode is available
 */
export async function checkAdminExists(): Promise<AdminExistsResult> {
  try {
    const adminClient = await createAdminClient();
    const { data: users, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      authLogger.error("[checkAdminExists] Failed to list users", error);
      return { exists: true, error: "Failed to check admin status" }; // Fail closed
    }

    const hasAdmin = users?.users.some((u) => {
      const role = u.app_metadata?.role;
      return isAdmin(role);
    });

    return { exists: hasAdmin || false };
  } catch (error) {
    authLogger.error("[checkAdminExists] Unexpected error", error);
    return { exists: true, error: "Failed to check admin status" }; // Fail closed
  }
}

/**
 * Create a new admin user account (BOOTSTRAP ONLY)
 *
 * SECURITY:
 * - If NO admin exists: Allows creation (first-time bootstrap)
 * - If admin exists: Requires super_admin authentication
 * - Rate limited to prevent brute force
 * - Input validated with Zod schemas
 */
export async function createAdminUser(
  email: string,
  password: string,
): Promise<CreateAdminUserResult> {
  try {
    // Validate inputs using Zod schemas
    const emailValidation = validateInput(email, AdminEmailSchema);
    if (!emailValidation.success || !emailValidation.data) {
      return { success: false, error: emailValidation.error ?? "Invalid input" };
    }
    const normalizedEmail = emailValidation.data;

    const passwordValidation = validateInput(password, AdminPasswordSchema);
    if (!passwordValidation.success) {
      return { success: false, error: passwordValidation.error };
    }

    // Rate limiting - prevents brute force attacks
    const rateLimitKey = `admin:bootstrap:${normalizedEmail}`;
    const isAllowed = await checkDistributedRateLimit(
      rateLimitKey,
      RATE_LIMITS.adminOperations,
    );
    if (!isAllowed) {
      return {
        success: false,
        error: RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS,
      };
    }

    const adminClient = await createAdminClient();

    // Fast path: if the caller is already an authenticated super_admin
    // (e.g. they're using /admin/manage), skip the expensive listUsers()
    // bootstrap probe and just create the admin directly. The Supabase Auth
    // admin API natively enforces email uniqueness, so we don't need a
    // pre-check.
    const auth = await verifySuperAdminAuth("createAdminUser");
    const isSuperAdminCaller = auth.authorized;

    let hasExistingAdmin = isSuperAdminCaller;
    if (!isSuperAdminCaller) {
      // Bootstrap path: no super_admin session. Verify no admin exists yet
      // (first-time setup) before allowing unauthenticated creation.
      const { data: users, error: listError } =
        await adminClient.auth.admin.listUsers();

      if (listError) {
        authLogger.error("[createAdminUser] Failed to list users", listError);
        return {
          success: false,
          error: "Failed to access user database",
        };
      }

      hasExistingAdmin =
        users?.users.some((u) => isAdmin(u.app_metadata?.role)) ?? false;

      if (hasExistingAdmin) {
        authLogger.warn(
          "[createAdminUser] Unauthorized: Admin exists but caller is not super_admin",
        );
        return {
          success: false,
          error:
            "An admin already exists. Only super admins can create new admin accounts.",
        };
      }
    }

    // Create new user with password AND role in a single call. Supabase Auth
    // rejects duplicate emails, so we don't pre-check.
    const roleToSet = hasExistingAdmin ? "admin" : "super_admin";
    const { data, error: createError } =
      await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        app_metadata: { role: roleToSet },
      });

    if (createError || !data.user) {
      const msg = createError?.message ?? "";
      if (/already.*registered|already.*exists|duplicate/i.test(msg)) {
        return {
          success: false,
          error: `User with email ${email} already exists. Use the admin panel to manage roles.`,
        };
      }
      authLogger.error("[createAdminUser] Failed to create user", createError);
      return {
        success: false,
        error: "Failed to create user account",
      };
    }

    authLogger.success("[createAdminUser] Admin user created successfully", {
      email: normalizedEmail,
      role: roleToSet,
      isBootstrap: !hasExistingAdmin,
    });

    return {
      success: true,
      message: `${roleToSet === "super_admin" ? "Super Admin" : "Admin"} user ${email} created successfully!`,
      userId: data.user.id,
    };
  } catch (error) {
    return handleActionError("createAdminUser", error);
  }
}
