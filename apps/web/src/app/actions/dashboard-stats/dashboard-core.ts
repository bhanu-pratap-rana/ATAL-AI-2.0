"use server";

import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { RATE_LIMIT_ERRORS } from "@/lib/constants/error-messages";

import {
  calculateScoreAndTime,
  calculateModuleBreakdown,
  buildResponsesBySessionMap,
  calculateRecentAssessments,
  type ModuleProgress,
  type AssessmentResult,
} from "./progress-analytics";

/**
 * Progress statistics for the student progress page.
 * All data is real, fetched from the database.
 */

export interface ProgressStats {
  coursesCompleted: number;
  assessmentsTaken: number;
  averageScore: number | null;
  totalTimeSpent: number; // in minutes
  moduleBreakdown: ModuleProgress[];
  recentAssessments: AssessmentResult[];
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
