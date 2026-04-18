"use server";

import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { RATE_LIMIT_ERRORS } from "@/lib/constants/error-messages";

import {
  calculateScoreAndTime,
  calculateModuleBreakdown,
  buildResponsesBySessionMap,
  calculateRecentAssessments,
  calculateStreak,
  type ModuleProgress,
  type AssessmentResult,
} from "./progress-analytics";
import { getRecentActivity, type RecentActivity } from "./activity-tracking";

/**
 * Dashboard statistics for students and teachers
 * All data is real, fetched from the database
 */

export interface DashboardStats {
  classesCount: number;
  assessmentsCount: number;
  averageScore: number | null;
  streakDays: number;
  recentActivity: RecentActivity[];
}

export interface ProgressStats {
  coursesCompleted: number;
  assessmentsTaken: number;
  averageScore: number | null;
  totalTimeSpent: number; // in minutes
  moduleBreakdown: ModuleProgress[];
  recentAssessments: AssessmentResult[];
}

/**
 * Get dashboard stats for the current user
 * Returns real data from database with proper empty states
 */
export async function getDashboardStats(): Promise<{
  success: boolean;
  data?: DashboardStats;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // SECURITY: Verify user has an authorized role (student, teacher, or admin)
    const role = user.app_metadata?.role;
    const isTeacher = isTeacherOrHigher(role);
    const isStudent = role === "student" || role === undefined; // Default to student if no explicit role

    if (!isTeacher && !isStudent) {
      authLogger.warn(
        "[getDashboardStats] Unauthorized role attempted to access dashboard",
        {
          userId: user.id,
          role,
        },
      );
      return { success: false, error: "Unauthorized" };
    }

    // SECURITY: Rate limit dashboard stats to prevent abuse
    const rateLimitKey = `dashboard-stats:${user.id}`;
    const isAllowed = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.dashboardStats,
    );
    if (!isAllowed) {
      authLogger.warn("[getDashboardStats] Rate limit exceeded", {
        userId: user.id,
      });
      return {
        success: false,
        error: RATE_LIMIT_ERRORS.WAIT_BEFORE_RETRY,
      };
    }

    const supabase = await createClient();

    const classesCountPromise = isTeacher
      ? supabase
          .from("classes")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", user.id)
      : supabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id);

    const assessmentsCountPromise = supabase
      .from("assessment_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("submitted_at", "is", null);

    // OI-4 atomic pattern: single query + JS count, no race between total/correct.
    const responsesPromise = supabase
      .from("assessment_responses")
      .select("is_correct")
      .eq("user_id", user.id);

    const streakPromise = calculateStreak(supabase, user.id);
    const recentActivityPromise = getRecentActivity(supabase, user.id, isTeacher);

    const [
      classesResult,
      assessmentsResult,
      responsesResult,
      streakDays,
      recentActivity,
    ] = await Promise.all([
      classesCountPromise,
      assessmentsCountPromise,
      responsesPromise,
      streakPromise,
      recentActivityPromise,
    ]);

    const classesCount = classesResult.count ?? 0;
    const assessmentsCount = assessmentsResult.count ?? 0;

    if (responsesResult.error) {
      authLogger.error("[getDashboardStats] Error fetching responses", {
        error: responsesResult.error,
      });
    }

    const rows = responsesResult.data ?? [];
    let averageScore: number | null = null;
    if (rows.length > 0) {
      const correct = rows.filter((r) => r.is_correct === true).length;
      averageScore = Math.round((correct / rows.length) * 100);
    }

    return {
      success: true,
      data: {
        classesCount,
        assessmentsCount,
        averageScore,
        streakDays,
        recentActivity,
      },
    };
  } catch (error) {
    authLogger.error(
      "[getDashboardStats] Error",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: "Failed to load dashboard stats" };
  }
}

/**
 * Get detailed progress stats for progress page
 * CRITICAL FIX: Reduced complexity from 23 to <15 by extracting helper functions
 */
export async function getProgressStats(): Promise<{
  success: boolean;
  data?: ProgressStats;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const rateLimitKey = `progress-stats:${user.id}`;
    const isAllowed = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.dashboardStats,
    );
    if (!isAllowed) {
      authLogger.warn("[getProgressStats] Rate limit exceeded", {
        userId: user.id,
      });
      return {
        success: false,
        error: RATE_LIMIT_ERRORS.WAIT_BEFORE_RETRY,
      };
    }

    const supabase = await createClient();

    const [sessionsResult, responsesResult] = await Promise.all([
      supabase
        .from("assessment_sessions")
        .select("id, started_at, submitted_at")
        .eq("user_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(1000),
      supabase
        .from("assessment_responses")
        .select("is_correct, module, rt_ms, session_id")
        .eq("user_id", user.id)
        .limit(25000),
    ]);

    const sessions = sessionsResult.data;
    const responses = responsesResult.data;
    const assessmentsTaken = sessions?.length || 0;

    const { averageScore, totalTimeSpent } = calculateScoreAndTime(responses);
    const moduleBreakdown = calculateModuleBreakdown(responses);
    const responsesBySession = buildResponsesBySessionMap(responses);
    const recentAssessments = calculateRecentAssessments(
      sessions,
      responsesBySession,
    );
    const coursesCompleted = recentAssessments.filter(
      (a) => a.score >= 60,
    ).length;

    return {
      success: true,
      data: {
        coursesCompleted,
        assessmentsTaken,
        averageScore,
        totalTimeSpent,
        moduleBreakdown,
        recentAssessments,
      },
    };
  } catch (error) {
    authLogger.error(
      "[getProgressStats] Error",
      error instanceof Error ? error : undefined,
    );
    return { success: false, error: "Failed to load progress stats" };
  }
}
