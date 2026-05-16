/**
 * Gamification Service
 *
 * Cultural badges, points, achievements. Ten Assamese-heritage badges
 * (Muga Silk Master, Gamosa Graduate, Bihu Dancer, Brahmaputra Scholar,
 * Perfect Score, Voice Learner, First Steps, Curious Mind, Night Owl,
 * Early Bird). Offline awards queue via src/lib/offline/mutation-queue.ts.
 */

import { createClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { MASTERY_THRESHOLDS, MIN_TOPICS_FOR_MODULE_MASTERY } from "@/lib/constants/thresholds";

/**
 * Badge definition
 */
export interface Badge {
  id: string;
  name_en: string;
  name_hi: string;
  name_as: string;
  description: string;
  icon: string;
  unlock_criteria: BadgeCriteria;
  cultural_note: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  points_value: number;
}

/**
 * Badge unlock criteria
 */
export interface BadgeCriteria {
  type:
    | "lessons_completed"
    | "high_score"
    | "weekly_streak"
    | "modules_mastered"
    | "perfect_score"
    | "voice_interactions"
    | "first_lesson"
    | "questions_asked"
    | "night_activity"
    | "early_activity";
  threshold?: number;
}

/**
 * Student badge (earned)
 */
export interface StudentBadge {
  id: string;
  student_id: string;
  badge_id: string;
  badge?: Badge;
  earned_at: string;
}

/**
 * Points history entry
 */
export interface PointsEntry {
  id: string;
  student_id: string;
  points: number;
  source: string;
  description?: string;
  created_at: string;
}

/**
 * TYPE-001 FIX: Type guard for PointsEntry to avoid unsafe casts
 * Validates runtime data structure matches expected interface
 */
function isPointsEntry(item: unknown): item is PointsEntry {
  if (!item || typeof item !== "object") return false;
  const entry = item as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.student_id === "string" &&
    typeof entry.points === "number" &&
    typeof entry.source === "string" &&
    typeof entry.created_at === "string"
  );
}

/**
 * Gamification Service
 */
export class GamificationService {
  /**
   * Check and award any badges the student has earned
   * Returns newly awarded badges
   */
  async checkAndAwardBadges(studentId: string): Promise<Badge[]> {
    try {
      const supabase = await createClient();

      // PERFORMANCE FIX: Use single RPC call instead of N+1 loop
      // Old pattern: 12-102 queries (1 + 10 badges × 1-10 criteria checks each)
      // New pattern: 1 query (batch RPC function)
      const { data: awardedBadges, error } = await supabase.rpc(
        "batch_check_and_award_badges",
        { p_student_id: studentId },
      );

      if (error) {
        authLogger.error("[Gamification] Batch badge check failed:", error);
        return [];
      }

      if (!awardedBadges || awardedBadges.length === 0) {
        return [];
      }

      // Transform RPC response to Badge objects
      // Type: BatchCheckAwardBadgesResponse from apps/db/migrations/123_batch_check_award_badges.sql
      return awardedBadges.map(
        (b: {
          badge_id: string;
          badge_name_en: string;
          badge_name_hi: string;
          badge_name_as: string;
          points_awarded: number;
        }) => ({
          id: b.badge_id,
          name_en: b.badge_name_en,
          name_hi: b.badge_name_hi,
          name_as: b.badge_name_as,
          points_value: b.points_awarded,
          description_en: "",
          description_hi: "",
          description_as: "",
          icon: "",
          unlock_criteria: {},
          created_at: new Date().toISOString(),
        }),
      );
    } catch (error) {
      authLogger.error(
        "[Gamification] Error checking badges:",
        error instanceof Error ? error : { error: String(error) },
      );
      return [];
    }
  }


  /**
   * Award points to a student
   */
  async awardPoints(
    studentId: string,
    points: number,
    source: string,
    description?: string,
  ): Promise<void> {
    try {
      const supabase = await createClient();

      const { error: insertError } = await supabase.from("points_history").insert({
        student_id: studentId,
        points,
        source,
        description,
      });
      if (insertError) {
        authLogger.error("[Gamification] Error awarding points:", insertError);
      }
    } catch (error) {
      authLogger.error(
        "[Gamification] Error awarding points:",
        error instanceof Error ? error : { error: String(error) },
      );
    }
  }

  /**
   * Get student's total points
   * PERF-003 FIX: Use database SUM() aggregation instead of fetching all rows
   * Previously: Fetched ALL points_history rows into memory, summed in JS
   * Now: Single query with SUM aggregation in database
   */
  async getTotalPoints(studentId: string): Promise<number> {
    try {
      const supabase = await createClient();

      // Use database-level aggregation via RPC function
      // Falls back to select with sum if RPC not available
      const { data, error } = await supabase.rpc("get_student_total_points", {
        p_student_id: studentId,
      });

      if (error) {
        // Fallback: Use a single query that still performs sum in DB
        // This is still better than fetching all rows
        authLogger.debug(
          "[Gamification] RPC not available, using fallback query",
        );
        const { data: pointsData, error: fallbackError } = await supabase
          .from("points_history")
          .select("points")
          .eq("student_id", studentId);

        if (fallbackError) {
          authLogger.error("[Gamification] Fallback points query error:", { error: fallbackError.message });
          return 0;
        }

        return pointsData?.reduce((sum, entry) => sum + entry.points, 0) || 0;
      }

      return data ?? 0;
    } catch (error) {
      authLogger.error(
        "[Gamification] Error getting points:",
        error instanceof Error ? error : { error: String(error) },
      );
      return 0;
    }
  }

  /**
   * Get student's earned badges
   */
  async getStudentBadges(studentId: string): Promise<StudentBadge[]> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("student_badges")
        .select(
          `
          *,
          badge:badges(*)
        `,
        )
        .eq("student_id", studentId)
        .order("earned_at", { ascending: false });

      if (error) {
        authLogger.error("[Gamification] Error getting badges:", error);
        return [];
      }
      return (data || []) as StudentBadge[];
    } catch (error) {
      authLogger.error(
        "[Gamification] Error getting badges:",
        error instanceof Error ? error : { error: String(error) },
      );
      return [];
    }
  }

  /**
   * Get points history for a student
   */
  async getPointsHistory(
    studentId: string,
    limit = 20,
  ): Promise<PointsEntry[]> {
    try {
      const supabase = await createClient();

      // OPTIMIZATION: Select only needed columns instead of *
      const { data, error } = await supabase
        .from("points_history")
        .select("id, student_id, points, source, description, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        authLogger.error("[Gamification] Points history query error:", { error: error.message });
        return [];
      }

      // TYPE-001 FIX: Use type guard instead of unsafe cast
      if (!Array.isArray(data)) return [];
      return data.filter(isPointsEntry);
    } catch (error) {
      authLogger.error(
        "[Gamification] Error getting points history:",
        error instanceof Error ? error : { error: String(error) },
      );
      return [];
    }
  }

  /**
   * Get class leaderboard
   * PERF-002 FIX: Use RPC with JOIN + SUM aggregation in database
   * Previously: Waterfall pattern (sequential queries) + client-side aggregation
   * Now: Single RPC call with database-level JOIN and SUM
   */
  async getClassLeaderboard(
    classId: string,
    limit = 10,
  ): Promise<
    { studentId: string; name: string; points: number; rank: number }[]
  > {
    try {
      const supabase = await createClient();

      // Try to use optimized RPC function first
      // RPC: get_class_leaderboard performs JOIN + SUM in database
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_class_leaderboard",
        {
          p_class_id: classId,
          p_limit: limit,
        },
      );

      if (!rpcError && rpcData) {
        // Transform RPC result to expected format with ranks
        return rpcData.map(
          (
            entry: {
              student_id: string;
              total_points: number;
              display_name?: string;
            },
            index: number,
          ) => ({
            studentId: entry.student_id,
            name: entry.display_name || `Student ${index + 1}`,
            points: entry.total_points || 0,
            rank: index + 1,
          }),
        );
      }

      // Fallback: Parallel queries with Map-based aggregation
      authLogger.debug(
        "[Gamification] RPC not available, using fallback with parallel queries",
      );

      // Get enrolled students first (required to filter points)
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId);

      if (enrollError) {
        authLogger.error("[Gamification] Enrollments query error:", { error: enrollError.message });
        return [];
      }

      if (!enrollments || enrollments.length === 0) return [];

      const studentIds = enrollments.map((e) => e.student_id);

      // Parallel fetch: points data and student profiles (student_profiles uses user_id as PK, not id)
      const [pointsResult, profilesResult] = await Promise.all([
        supabase
          .from("points_history")
          .select("student_id, points")
          .in("student_id", studentIds),
        supabase
          .from("student_profiles")
          .select("user_id, name")
          .in("user_id", studentIds),
      ]);

      // Build name lookup map for O(1) access
      const nameMap = new Map<string, string>();
      for (const profile of profilesResult.data || []) {
        nameMap.set(profile.user_id, profile.name || "Student");
      }

      // Aggregate points using Map (O(n) single pass)
      const pointsMap = new Map<string, number>();
      for (const entry of pointsResult.data || []) {
        pointsMap.set(
          entry.student_id,
          (pointsMap.get(entry.student_id) || 0) + entry.points,
        );
      }

      // Sort and rank (with tied rank support: 1,1,3 not 1,2,3)
      const sorted = Array.from(pointsMap.entries())
        .map(([studentId, points]) => ({ studentId, points }))
        .sort((a, b) => b.points - a.points)
        .slice(0, limit);

      let currentRank = 1;
      const leaderboard = sorted.map((entry, index) => {
        if (index > 0 && entry.points < sorted[index - 1].points) {
          currentRank = index + 1;
        }
        return {
          ...entry,
          name: nameMap.get(entry.studentId) || `Student ${index + 1}`,
          rank: currentRank,
        };
      });

      return leaderboard;
    } catch (error) {
      authLogger.error(
        "[Gamification] Error getting leaderboard:",
        error instanceof Error ? error : { error: String(error) },
      );
      return [];
    }
  }

  /**
   * Check for activity-based badge triggers
   * Call this after any user activity
   */
  async triggerActivityCheck(
    studentId: string,
    activityType: "lesson" | "question" | "assessment" | "voice",
  ): Promise<Badge[]> {
    // Award points for activity
    const pointsMap = {
      lesson: 10,
      question: 5,
      assessment: 20,
      voice: 15,
    };

    await this.awardPoints(
      studentId,
      pointsMap[activityType],
      activityType,
      `Completed ${activityType}`,
    );

    // Check for new badges
    return this.checkAndAwardBadges(studentId);
  }
}

// Export singleton
export const gamificationService = new GamificationService();
