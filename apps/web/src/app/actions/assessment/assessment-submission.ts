"use server";

import { revalidatePath } from "next/cache";
import { verifyStudentAuth, createClient } from "@/lib/supabase-server";
import { AssessmentSubmitSchema } from "@/lib/validation-schemas";
import { authLogger } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { validateSubmitAssessmentResponse } from "@/lib/rpc-validators";
import { handleZodError } from "@/lib/action-error-handler";
import { updateTheta, CATEGORIES } from "./irt-models";
import { gamificationService } from "@/lib/services/gamification-service";

/**
 * Assessment submission and scoring logic
 * Handles submission validation, scoring, and gamification
 */

/**
 * IRT Item structure for scoring calculations
 */
interface IRTItemResponse {
  item: {
    id: string;
    item_code: string;
    category: string;
    question_text: string;
    options: Array<{ id: string; text: string }>;
    correct_answer: number;
    difficulty: number;
    discrimination: number;
    guessing: number;
  };
  correct: boolean;
}

/**
 * Category score structure
 */
interface CategoryScore {
  theta: number;
  correct: number;
  total: number;
}

/**
 * Helper: Convert response array to IRTItem format for scoring
 */
function convertResponsesToIRTItems(
  responses: Array<{
    itemId: string;
    isCorrect: boolean;
    difficulty: number;
    discrimination: number;
    guessing: number;
    category: string;
  }>,
) {
  return responses.map((r) => ({
    item: {
      id: r.itemId,
      item_code: "",
      category: r.category,
      question_text: "",
      options: [],
      correct_answer: 0,
      difficulty: r.difficulty,
      discrimination: r.discrimination,
      guessing: r.guessing,
    },
    correct: r.isCorrect,
  }));
}

/**
 * Helper: Calculate category-level scores
 */
function calculateCategoryScores(
  itemResponses: IRTItemResponse[],
): Record<string, CategoryScore> {
  const categoryScores: Record<string, CategoryScore> = {};

  for (const category of CATEGORIES) {
    const categoryResponses = itemResponses.filter(
      (r) => r.item.category === category,
    );
    if (categoryResponses.length > 0) {
      const { theta: catTheta } = updateTheta(0, categoryResponses);
      const correct = categoryResponses.filter((r) => r.correct).length;
      categoryScores[category] = {
        theta: catTheta,
        correct,
        total: categoryResponses.length,
      };
    }
  }

  return categoryScores;
}

/**
 * Helper: Convert theta to proficiency level
 */
function getProficiencyLevel(t: number): string {
  if (t >= 1.5) return "Advanced";
  if (t >= 0.5) return "Proficient";
  if (t >= -0.5) return "Developing";
  if (t >= -1.5) return "Basic";
  return "Beginner";
}

/**
 * Helper: Convert theta to percentage score
 */
function thetaToPercent(t: number): number {
  const normalized = (t + 3) / 6;
  return Math.round(Math.max(0, Math.min(100, normalized * 100)));
}

/**
 * Helper: Format category scores for response
 */
function formatCategoryScores(categoryScores: Record<string, CategoryScore>) {
  return Object.fromEntries(
    Object.entries(categoryScores).map(([cat, data]) => [
      cat,
      {
        theta: data.theta,
        score: thetaToPercent(data.theta),
        proficiency: getProficiencyLevel(data.theta),
        correct: data.correct,
        total: data.total,
      },
    ]),
  );
}

/**
 * Calculate IRT-based score from assessment responses
 * CRITICAL FIX: Reduced complexity from 18 to <15 by extracting helper functions
 */
export async function calculateIRTScore(
  responses: Array<{
    itemId: string;
    isCorrect: boolean;
    difficulty: number;
    discrimination: number;
    guessing: number;
    category: string;
  }>,
) {
  const itemResponses = convertResponsesToIRTItems(responses);
  const { theta, se } = updateTheta(0, itemResponses);
  const categoryScores = calculateCategoryScores(itemResponses);

  return {
    overallTheta: theta,
    standardError: se,
    overallScore: thetaToPercent(theta),
    proficiencyLevel: getProficiencyLevel(theta),
    categoryScores: formatCategoryScores(categoryScores),
  };
}

/**
 * Start a new assessment session
 * @param classId - Optional class context
 * @param sessionType - 'pre' | 'adaptive' | 'post' (default: 'adaptive')
 */
export async function startAssessment(classId?: string, sessionType: "pre" | "adaptive" | "post" = "adaptive") {
  try {
    const auth = await verifyStudentAuth("startAssessment");
    if (!auth.authorized) {
      return auth.error;
    }

    // SECURITY: Rate limit assessment session creation to prevent abuse
    const rateLimitKey = `assessment-start:${auth.user.id}`;
    const isAllowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.assessmentSubmission);
    if (!isAllowed) {
      return { success: false, error: "Too many requests. Please wait before starting another assessment." };
    }

    const supabase = await createClient();

    // For pre/post assessments, check if one already exists OR is in
    // progress. PR-64 widened the check vs PR-62: previously we only
    // looked at `submitted_at IS NOT NULL`, so a student who started
    // but never submitted could open unlimited new pre-sessions
    // (and TOCTOU between SELECT + INSERT let two concurrent calls
    // both pass the check). Now we reject if ANY pre/post row exists
    // for the user, and rely on the unique partial index added in
    // migration 188 to prevent the race.
    if (sessionType === "pre" || sessionType === "post") {
      const { data: existing } = await supabase
        .from("assessment_sessions")
        .select("id, submitted_at")
        .eq("user_id", auth.user.id)
        .eq("session_type", sessionType)
        .limit(1);

      const existingRow = existing?.[0];
      if (existingRow) {
        return {
          success: false,
          error: existingRow.submitted_at
            ? `You have already completed a ${sessionType}-assessment.`
            : `You already have a ${sessionType}-assessment in progress.`,
        };
      }
    }

    const { data, error } = await supabase
      .from("assessment_sessions")
      .insert({
        user_id: auth.user.id,
        class_id: classId || null,
        session_type: sessionType,
        started_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      authLogger.error("[startAssessment] DB error", { error: error.message });
      return { success: false, error: "Failed to start assessment" };
    }

    return { success: true, sessionId: data.id };
  } catch (error) {
    authLogger.error("[startAssessment] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

interface AssessmentResponse {
  itemId: string;
  module: string;
  isCorrect: boolean;
  rtMs: number;
  focusBlurCount: number;
  chosenOption: string;
}

/**
 * Submit assessment responses and calculate scores
 * CRITICAL FIX: Reduced complexity from 21 to <15 by extracting helpers
 */
export async function submitAssessment(
  sessionId: string,
  responses: AssessmentResponse[],
) {
  try {
    let validatedData;
    try {
      validatedData = AssessmentSubmitSchema.parse({
        sessionId,
        responses,
      });
    } catch (error) {
      return handleZodError(error);
    }

    const auth = await verifyStudentAuth("submitAssessment");
    if (!auth.authorized) {
      return auth.error;
    }

    const rateLimitKey = `assessment-submit:${auth.user.id}`;
    const isAllowed = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.assessmentSubmission,
    );
    if (!isAllowed) {
      authLogger.warn("[submitAssessment] Rate limit exceeded", {
        userId: auth.user.id,
        sessionId,
      });
      return {
        success: false,
        error:
          "Too many assessment submissions. Please wait before trying again.",
      };
    }

    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("user_id")
      .eq("id", validatedData.sessionId)
      .maybeSingle();

    if (sessionError) {
      return { success: false, error: "Failed to verify session" };
    }

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.user_id !== auth.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const rpcResponses = validatedData.responses.map((r) => ({
      itemId: r.itemId,
      module: r.module,
      isCorrect: r.isCorrect,
      rtMs: r.rtMs,
      focusBlurCount: r.focusBlurCount,
      chosenOption: r.chosenOption,
    }));

    const { data: rpcResultRaw, error: rpcError } = await supabase.rpc(
      "submit_assessment",
      {
        p_session_id: validatedData.sessionId,
        p_user_id: auth.user.id,
        p_responses: rpcResponses,
      },
    );

    if (rpcError) {
      authLogger.error("[submitAssessment] RPC function call failed", {
        userId: auth.user.id,
        sessionId: validatedData.sessionId,
        rpcError: rpcError.message,
      });
      return {
        success: false,
        error: "Failed to submit assessment. Please try again.",
      };
    }

    const validationResult = validateSubmitAssessmentResponse(rpcResultRaw);
    if (!validationResult.success) {
      authLogger.error("[submitAssessment] RPC response validation failed", {
        userId: auth.user.id,
        sessionId: validatedData.sessionId,
        validationError: validationResult.error,
      });
      return {
        success: false,
        error: "Failed to submit assessment. Please try again.",
      };
    }

    const rpcResult = validationResult.data;

    if (!rpcResult.success) {
      const errorMessage =
        rpcResult.error || "Unknown error during assessment submission";
      authLogger.warn("[submitAssessment] RPC function returned error", {
        errorMessage,
      });
      return { success: false, error: errorMessage };
    }

    // Use RPC response data for scoring directly
    // The RPC function (submit_assessment) already calculated the score
    const score = rpcResult.score ?? 0;
    const totalQuestions = rpcResult.totalQuestions ?? 0;
    const correctAnswers = rpcResult.correctAnswers ?? 0;
    const moduleBreakdown = rpcResult.moduleBreakdown ?? {};

    // Calculate proficiency level from score percentage
    const getPercentageProficiencyLevel = (scorePercent: number): string => {
      if (scorePercent >= 90) return "Advanced";
      if (scorePercent >= 75) return "Proficient";
      if (scorePercent >= 60) return "Developing";
      if (scorePercent >= 40) return "Basic";
      return "Beginner";
    };

    // Convert moduleBreakdown to categoryScores format
    const categoryScores = Object.fromEntries(
      Object.entries(moduleBreakdown).map(([module, data]) => {
        const moduleData = data as { correct?: number; total?: number };
        const correct = moduleData?.correct ?? 0;
        const total = moduleData?.total ?? 0;
        return [
          module,
          {
            correct,
            total,
            score: total > 0 ? Math.round((correct / total) * 100) : 0,
          },
        ];
      }),
    );

    authLogger.info("[submitAssessment] Assessment submitted successfully", {
      userId: auth.user.id,
      sessionId: validatedData.sessionId,
      score,
      totalQuestions,
      correctAnswers,
    });

    revalidatePath("/app/student/dashboard");
    revalidatePath("/app/progress");

    // Award gamification points for completing an assessment (non-blocking).
    // Failure here must not abort the submission — log and move on.
    gamificationService.triggerActivityCheck(auth.user.id, "assessment").catch((err) => {
      authLogger.warn("[submitAssessment] gamification triggerActivityCheck failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return {
      success: true,
      score,
      level: getPercentageProficiencyLevel(score),
      categoryScores,
    };
  } catch (error) {
    return handleZodError(error);
  }
}
