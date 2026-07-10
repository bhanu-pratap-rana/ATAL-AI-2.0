"use server";

import { createAdminClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { findAuthUserByEmail } from "@/lib/admin-utils";
import { AuthEmailSchema } from "@/lib/validation-schemas";

/**
 * Authentication verification and role management
 * Handles user existence checks, role verification, and session management
 */

/**
 * Check if email exists in the system and determine role
 *
 * Role hierarchy:
 * - Student: Can only be student (cannot become teacher/admin)
 * - Teacher: Can be teacher, can be promoted to admin
 * - Admin: Teacher with admin privileges
 * - Super Admin: Only Atal AI (system account)
 *
 * Rules:
 * - Student email cannot be used for teacher/admin signup
 * - Teacher email cannot be used for student signup
 * - Existing auth users must login, not create new account
 */
export async function checkEmailExistsInAuth(email: string): Promise<{
  exists: boolean;
  role?: "student" | "teacher" | "admin" | "super_admin" | "unknown";
  hasStudentProfile?: boolean;
  hasTeacherProfile?: boolean;
}> {
  try {
    // Validate and normalize email
    const trimmedEmail = AuthEmailSchema.parse(email);

    // Use admin client to check auth.users (bypasses RLS)
    const adminClient = await createAdminClient();

    // Check if user exists in Supabase auth (with pagination support)
    const existingAuthUser = await findAuthUserByEmail(
      adminClient,
      trimmedEmail,
    );

    if (!existingAuthUser) {
      authLogger.debug(
        "[checkEmailExistsInAuth] Email not found in auth.users",
      );
      return { exists: false };
    }

    // User exists in auth - check their profiles
    const userId = existingAuthUser.id;

    // Check student_profiles
    const { data: studentProfile } = await adminClient
      .from("student_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    // Check teacher_profiles
    const { data: teacherProfile } = await adminClient
      .from("teacher_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const hasStudentProfile = studentProfile !== null;
    const hasTeacherProfile = teacherProfile !== null;

    // Determine role based on profiles and app_metadata
    let role: "student" | "teacher" | "admin" | "super_admin" | "unknown" =
      "unknown";
    const appRole = existingAuthUser.app_metadata?.role;

    if (appRole === "super_admin") {
      role = "super_admin";
    } else if (appRole === "admin") {
      role = "admin";
    } else if (hasTeacherProfile || appRole === "teacher") {
      role = "teacher";
    } else if (hasStudentProfile) {
      role = "student";
    }

    authLogger.info("[checkEmailExistsInAuth] Email exists", {
      role,
      hasStudentProfile,
      hasTeacherProfile,
      appRole,
    });

    return {
      exists: true,
      role,
      hasStudentProfile,
      hasTeacherProfile,
    };
  } catch (error) {
    authLogger.error("[checkEmailExistsInAuth] Unexpected error", error);
    return { exists: false };
  }
}

