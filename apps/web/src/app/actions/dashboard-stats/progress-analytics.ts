/**
 * Progress analytics and calculation utilities
 * Pure functions for performance metrics and statistical analysis
 */

import { SupabaseClient } from "@supabase/supabase-js";

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
    const module = response.module || "Unknown";
    const current = moduleMap.get(module) || { attempted: 0, correct: 0 };
    current.attempted++;
    if (response.is_correct) current.correct++;
    moduleMap.set(module, current);
  }

  const moduleBreakdown: ModuleProgress[] = [];
  for (const [module, stats] of moduleMap) {
    moduleBreakdown.push({
      module,
      questionsAttempted: stats.attempted,
      correctAnswers: stats.correct,
      averageScore: Math.round((stats.correct / stats.attempted) * 100),
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

/**
 * Calculate consecutive days with activity (streak)
 * PERFORMANCE: Uses Set-based lookup (O(1)) instead of array includes (O(n))
 */
export async function calculateStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    // Get all session dates for the user
    const { data: sessions } = await supabase
      .from("assessment_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (!sessions || sessions.length === 0) return 0;

    // PERFORMANCE FIX: Convert dates array to Set for O(1) lookup
    // Old: dates.includes(dateKey) is O(n) inside 365-iteration loop = O(n²)
    // New: dateSet.has(dateKey) is O(1) inside loop = O(n)
    const dateSet = new Set(
      sessions.map((s: { started_at: string }) => {
        const date = new Date(s.started_at);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }),
    );

    // Calculate streak from today
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;

      if (dateSet.has(dateKey)) {
        streak++;
      } else if (i > 0) {
        // Allow skipping today (user might not have done activity yet today)
        break;
      }
    }

    return streak;
  } catch (_error) {
    return 0;
  }
}
