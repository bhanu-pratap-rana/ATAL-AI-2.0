/**
 * Progress analytics and calculation utilities
 * Pure functions for performance metrics and statistical analysis
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { authLogger } from "@/lib/auth-logger";

export interface ModuleProgress {
  module: string;
  questionsAttempted: number;
  correctAnswers: number;
  averageScore: number;
}

export interface AssessmentResult {
  id: string;
  completedAt: string;
  score: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
}

/**
 * Helper: Calculate average score and total time from responses
 */
export function calculateScoreAndTime(
  responses: Array<{ is_correct: boolean; rt_ms: number | null }> | null,
): { averageScore: number | null; totalTimeSpent: number } {
  if (!responses || responses.length === 0) {
    return { averageScore: null, totalTimeSpent: 0 };
  }

  const correctCount = responses.filter((r) => r.is_correct).length;
  const averageScore = Math.round((correctCount / responses.length) * 100);
  const totalTimeSpent = Math.round(
    responses.reduce((sum, r) => sum + (r.rt_ms || 0), 0) / 60000,
  ); // Convert to minutes

  return { averageScore, totalTimeSpent };
}

/**
 * Helper: Calculate module breakdown from responses
 */
export function calculateModuleBreakdown(
  responses: Array<{ module: string | null; is_correct: boolean }> | null,
): ModuleProgress[] {
  if (!responses || responses.length === 0) {
    return [];
  }

  const moduleMap = new Map<string, { attempted: number; correct: number }>();

  for (const response of responses) {
    const moduleName = response.module || "Unknown";
    const current = moduleMap.get(moduleName) || { attempted: 0, correct: 0 };
    current.attempted++;
    if (response.is_correct) current.correct++;
    moduleMap.set(moduleName, current);
  }

  const moduleBreakdown: ModuleProgress[] = [];
  for (const [module, stats] of moduleMap) {
    moduleBreakdown.push({
      module,
      questionsAttempted: stats.attempted,
      correctAnswers: stats.correct,
      averageScore: stats.attempted > 0
        ? Math.round((stats.correct / stats.attempted) * 100)
        : 0,
    });
  }

  return moduleBreakdown;
}

/**
 * Helper: Build responses map by session for O(1) lookup
 */
export function buildResponsesBySessionMap<T extends { session_id: string }>(
  responses: T[] | null,
): Map<string, T[]> {
  const responsesBySession = new Map<string, T[]>();
  responses?.forEach((r) => {
    const existing = responsesBySession.get(r.session_id) || [];
    existing.push(r);
    responsesBySession.set(r.session_id, existing);
  });
  return responsesBySession;
}

/**
 * Helper: Calculate recent assessments from sessions and responses
 */
export function calculateRecentAssessments(
  sessions: Array<{
    id: string;
    started_at: string;
    submitted_at: string | null;
  }> | null,
  responsesBySession: Map<
    string,
    Array<{ is_correct: boolean; rt_ms: number | null }>
  >,
): AssessmentResult[] {
  if (!sessions || sessions.length === 0) {
    return [];
  }

  const recentAssessments: AssessmentResult[] = [];
  for (const session of sessions.slice(0, 5)) {
    const sessionResponses = responsesBySession.get(session.id) || [];
    const correctCount = sessionResponses.filter((r) => r.is_correct).length;
    const totalQuestions = sessionResponses.length;
    const timeSpent =
      sessionResponses.reduce((sum, r) => sum + (r.rt_ms || 0), 0) / 1000; // seconds

    recentAssessments.push({
      id: session.id,
      completedAt: session.submitted_at || session.started_at,
      score:
        totalQuestions > 0
          ? Math.round((correctCount / totalQuestions) * 100)
          : 0,
      totalQuestions,
      timeSpent: Math.round(timeSpent),
    });
  }

  return recentAssessments;
}

// Delegates to get_student_streak RPC (migration 167) which buckets activity
// timestamps by Asia/Kolkata date. Server-side calculation avoids the
// Vercel-runtime-UTC vs student-local-IST divergence that broke streaks
// around the IST midnight boundary.
export async function calculateStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_student_streak", {
      p_student_id: userId,
    });
    if (error) {
      authLogger.error(
        "[getStreak] get_student_streak RPC failed",
        new Error(error.message),
      );
      return 0;
    }
    return typeof data === "number" ? data : 0;
  } catch (error) {
    authLogger.error(
      "[getStreak] Failed to calculate streak",
      error instanceof Error ? error : new Error(String(error)),
    );
    return 0;
  }
}
