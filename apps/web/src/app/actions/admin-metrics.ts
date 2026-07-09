"use server";

import { createAdminClient } from "@/lib/supabase-server";
import { fetchAllAuthUsers, verifyAdminAuthAndRateLimit } from "@/lib/admin-utils";
import { authLogger } from "@/lib/auth-logger";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { queryCache } from "@/lib/cache/query-cache";
import type { SupabaseAuthUser } from "@/types/auth";

export interface DashboardMetrics {
  totalSchools: number;
  totalTeachers: number;
  totalStudents: number;
  activePins: number;
  inactivePins: number;
  totalAdmins: number;
}

/**
 * Note: Supabase query results have complex inferred types based on the select clause.
 * Using explicit type assertions in map callbacks for type safety.
 */

/**
 * Internal function to fetch dashboard metrics from database
 * This is wrapped by getDashboardMetrics() with query caching
 */
async function fetchDashboardMetricsFromDB(): Promise<DashboardMetrics> {
  const supabase = await createAdminClient();

  // PERFORMANCE: Run all metric queries in parallel to avoid N+1 query pattern
  // This significantly improves dashboard load time, especially under load
  const [
    { count: schoolCount, error: schoolError },
    { count: profileCount, error: teacherError },
    { count: activePinCount, error: activePinError },
    { data: allCredentials, error: credentialsError },
    { count: studentProfileCount, error: studentError },
    authUsersResult,
  ] = await Promise.all([
    // Query 1: Get school count
    supabase.from("schools").select("*", { count: "exact", head: true }),

    // Query 2: Get teacher count from teacher_profiles table
    supabase
      .from("teacher_profiles")
      .select("*", { count: "exact", head: true }),

    // Query 3: Get active PINs (deleted_at is NULL)
    supabase
      .from("school_staff_credentials")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),

    // Query 4: Get all schools with ANY credential (to calculate schools without PINs)
    supabase
      .from("school_staff_credentials")
      .select("school_id"),

    // Query 5: Get student count from student_profiles table
    supabase
      .from("student_profiles")
      .select("*", { count: "exact", head: true }),

    // Query 6: Get admin count via list_admin_users RPC (Supabase auth
    // admin REST endpoint is unreliable on this project — see migration 175).
    // Falls back to fetchAllAuthUsers if the RPC isn't available.
    (async () => {
      try {
        const { data, error } = await supabase.rpc("list_admin_users");
        if (!error && Array.isArray(data)) {
          return {
            adminCount: data.length,
            authUsers: null,
            error: null,
          };
        }
        const authUsers = await fetchAllAuthUsers(supabase);
        return { adminCount: null, authUsers, error: null };
      } catch (error) {
        return { adminCount: null, authUsers: null, error };
      }
    })(),
  ]);

  // Check for errors
  if (schoolError) {
    authLogger.error(
      "[getDashboardMetrics] Failed to get school count",
      schoolError,
    );
    throw schoolError;
  }

  if (authUsersResult.error) {
    authLogger.error(
      "[getDashboardMetrics] Failed to fetch auth users for admin count",
      authUsersResult.error,
    );
    // Don't throw — admin count is non-critical, fall through with 0
  }

  // Extract counts with error handling for individual queries
  let teacherCount = 0;
  if (teacherError) {
    authLogger.error(
      "[getDashboardMetrics] Failed to get teacher count from profiles",
      teacherError,
    );
  } else {
    teacherCount = profileCount || 0;
  }

  let studentCount = 0;
  if (studentError) {
    authLogger.error(
      "[getDashboardMetrics] Failed to get student count from profiles, trying fallback",
      studentError,
    );
    // Fallback: try a simpler count query
    try {
      const { count, error } = await supabase
        .from("student_profiles")
        .select("user_id", { count: "exact", head: true });
      if (!error && count !== null) {
        studentCount = count;
      }
    } catch {
      // Fallback also failed, keep 0
    }
  } else {
    studentCount = studentProfileCount || 0;
  }

  const activePins = activePinCount || 0;

  // Calculate schools without PINs: total schools - schools with any credential
  const schoolsWithPINs = new Set(
    (allCredentials || []).map((c: { school_id: string }) => c.school_id),
  ).size;
  const inactivePins = Math.max(0, (schoolCount || 0) - schoolsWithPINs);

  if (activePinError) {
    authLogger.error(
      "[getDashboardMetrics] Failed to get active PIN count",
      activePinError,
    );
  }
  if (credentialsError) {
    authLogger.error(
      "[getDashboardMetrics] Failed to get credentials for inactive PIN count",
      credentialsError,
    );
  }

  // Count admins: prefer RPC result; fall back to authUsers if available.
  let adminCount = authUsersResult.adminCount ?? 0;
  let authTeacherCount = 0;
  const authUsers = authUsersResult.authUsers;
  if (authUsers && authUsers.length > 0) {
    if (authUsersResult.adminCount === null) {
      adminCount = authUsers.filter(
        (u: SupabaseAuthUser) =>
          u.app_metadata?.role === "admin" ||
          u.app_metadata?.role === "super_admin",
      ).length;
    }
    authTeacherCount = authUsers.filter(
      (u: SupabaseAuthUser) => u.app_metadata?.role === "teacher",
    ).length;
  }

  // Use the higher count between profiles and auth users
  const finalTeacherCount = Math.max(teacherCount, authTeacherCount);

  const result: DashboardMetrics = {
    totalSchools: schoolCount || 0,
    totalTeachers: finalTeacherCount,
    totalStudents: studentCount,
    activePins: activePins,
    inactivePins: inactivePins,
    totalAdmins: adminCount,
  };

  // CACHE GUARD (PR-61): in the dev session leading up to MVP launch a
  // race between hot-reload restarts and the in-process queryCache wrote
  // a `{ teachers: 0, students: 0, schools: 394 }` snapshot to the
  // 5-minute cache, then served it for 5 minutes to every admin even
  // though the underlying queries returned correct numbers seconds
  // later. The cause was a transient null from PostgREST count headers
  // during the restart window — Supabase JS treats that as `count: null`
  // which JS-coerces to 0 via the `|| 0` fallback below, hiding the
  // failure. Detection here: if school count is non-zero (table has
  // rows) and BOTH teacher + student counts are zero, the row reads
  // are obviously inconsistent — surface as a thrown error so the
  // caller falls into the cache miss path next time instead of pinning
  // bad data for 5 minutes.
  if ((result.totalSchools ?? 0) > 0 && result.totalTeachers === 0 && result.totalStudents === 0) {
    throw new Error("DASHBOARD_METRICS_INCONSISTENT_ZEROS");
  }

  return result;
}

/**
 * Get dashboard metrics for super admin dashboard
 * SECURITY: Requires admin or super_admin role
 * PERFORMANCE: Results cached for 5 minutes to reduce database load
 */
export async function getDashboardMetrics(): Promise<{
  success: boolean;
  data?: DashboardMetrics;
  error?: string;
}> {
  try {
    // SECURITY: Verify admin authorization and check rate limits
    const authResult = await verifyAdminAuthAndRateLimit(
      "getDashboardMetrics",
      RATE_LIMITS.adminMetrics,
    );
    if (!authResult.authorized) {
      return authResult.error;
    }

    // PERFORMANCE: Use query cache - 5 minute TTL for dashboard metrics
    // This reduces database load significantly as this query is called frequently
    const metrics = await queryCache.getOrFetch(
      "admin:dashboard:metrics",
      fetchDashboardMetricsFromDB,
      5 * 60 * 1000, // 5 minutes
    );

    authLogger.info("[getDashboardMetrics] Metrics fetched successfully", {
      ...metrics,
    });
    return {
      success: true,
      data: metrics,
    };
  } catch (error) {
    authLogger.error("[getDashboardMetrics] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
