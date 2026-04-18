/**
 * Learning Style Profile Database Queries
 *
 * Centralizes database operations for learning style profiles
 * Eliminates duplication across services (adaptive-service, tutor-service, etc.)
 *
 * Usage:
 * ```typescript
 * import { fetchLearningStyleProfile, createDefaultProfile } from '@/lib/database/learning-profile-queries';
 *
 * // In any service
 * const profile = await fetchLearningStyleProfile(studentId);
 * ```
 */

import { createClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import type { Database } from "@/types/database";

type LearningStyleProfileRow =
  Database["public"]["Tables"]["learning_style_profile"]["Row"];

/**
 * Fetch learning style profile for a student
 *
 * @param studentId - Student UUID
 * @returns Profile data or null if not found
 *
 * @example
 * ```typescript
 * const profile = await fetchLearningStyleProfile(studentId);
 * if (!profile) {
 *   console.log("No profile found");
 * }
 * ```
 */
export async function fetchLearningStyleProfile(
  studentId: string,
): Promise<LearningStyleProfileRow | null> {
  try {
    const supabase = await createClient();

    // OPTIMIZATION: Select only needed columns instead of *
    const { data, error } = await supabase
      .from("learning_style_profile")
      .select(
        "id, student_id, visual_score, text_score, auditory_score, preferred_style, images_viewed, voice_replays, text_read_time_seconds, updated_at",
      )
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) {
      authLogger.error("[DB] Error fetching learning style profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    authLogger.error(
      "[DB] Exception fetching learning style profile:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}

/**
 * Create a default learning style profile for a student
 *
 * Initializes equal distribution across all learning styles (33.33% each)
 *
 * @param studentId - Student UUID
 * @returns Created profile data
 *
 * @example
 * ```typescript
 * const profile = await createDefaultProfile(studentId);
 * ```
 */
export async function createDefaultProfile(
  studentId: string,
): Promise<LearningStyleProfileRow | null> {
  try {
    const supabase = await createClient();

    // Atomic upsert via RPC (migration 166) — eliminates the concurrent
    // read-then-insert race where two requests both observe no existing row
    // and both INSERT, with the second failing on the unique constraint.
    const { data, error } = await supabase.rpc(
      "upsert_learning_style_profile",
      {
        p_student_id: studentId,
        p_visual_score: 33.33,
        p_text_score: 33.33,
        p_auditory_score: 33.33,
        p_dominant_style: "text",
      },
    );

    if (error) {
      authLogger.error(
        "[DB] upsert_learning_style_profile RPC failed:",
        error,
      );
      return null;
    }

    return (data as LearningStyleProfileRow) ?? null;
  } catch (error) {
    authLogger.error(
      "[DB] Exception creating default learning profile:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return null;
  }
}

