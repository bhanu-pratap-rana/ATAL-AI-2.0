"use server";

/**
 * Gamification Server Actions
 *
 * Server-side actions for awarding points and checking badges.
 * These wrap the GamificationService for use from client components.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase-server";
import { gamificationService } from "@/lib/services/gamification-service";
import { authLogger } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";

/**
 * Award points for completing a lesson
 * Called from client components after lesson completion
 */
export async function awardLessonCompletionPoints(
  moduleId: string,
  topicId: string,
  score: number,
): Promise<{
  success: boolean;
  pointsAwarded?: number;
  newBadges?: Array<{ id: string; name_en: string }>;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const isAllowed = await checkRateLimit(`gamification:${user.id}`, RATE_LIMITS.gamification);
    if (!isAllowed) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    // PR-68: reject score=0 awards. With PR-64's stricter calculateScore
    // (returns 0 on missing/undefined input), an unmount cleanup or
    // double-fire after a partial lesson would otherwise hand out the
    // 10-point base activity bonus + badge check for free. A legitimate
    // zero-score completion shouldn't earn lesson points either.
    if (!Number.isFinite(score) || score <= 0) {
      authLogger.debug("[awardLessonCompletionPoints] Skipped — non-positive score", {
        userId: user.id,
        moduleId,
        topicId,
        score,
      });
      return { success: true, pointsAwarded: 0, newBadges: [] };
    }

    authLogger.debug("[awardLessonCompletionPoints] Awarding points", {
      userId: user.id,
      moduleId,
      topicId,
      score,
    });

    // Use triggerActivityCheck which awards points and checks badges
    const newBadges = await gamificationService.triggerActivityCheck(
      user.id,
      "lesson",
    );

    // Bonus points for high scores
    let bonusPoints = 0;
    if (score >= 90) {
      bonusPoints = 5;
      await gamificationService.awardPoints(
        user.id,
        bonusPoints,
        "high_score_bonus",
        `Scored ${score}% on ${topicId}`,
      );
    }

    authLogger.success("[awardLessonCompletionPoints] Points awarded", {
      userId: user.id,
      basePoints: 10,
      bonusPoints,
      newBadgesCount: newBadges.length,
    });

    // Revalidate dashboard to show updated points
    revalidatePath("/app/student/dashboard");

    return {
      success: true,
      pointsAwarded: 10 + bonusPoints,
      newBadges: newBadges.map((b) => ({ id: b.id, name_en: b.name_en })),
    };
  } catch (error) {
    authLogger.error(
      "[awardLessonCompletionPoints] Error",
      error instanceof Error ? error : { error: String(error) },
    );
    return {
      success: false,
      error: "Failed to award points",
    };
  }
}
