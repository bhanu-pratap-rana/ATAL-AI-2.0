"use server";

import { createAdminClient, verifyAdminAuth } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { handleActionError } from "./action-utils";

export interface IRTQuestion {
  id: string;
  item_code: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: number;
  category: string;
  level: string;
  language: string;
  difficulty: number;
  discrimination: number;
  guessing: number;
  is_active: boolean | null;
  times_administered: number | null;
  times_correct: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IRTQuestionUpdate {
  difficulty?: number;
  discrimination?: number;
  guessing?: number;
  is_active?: boolean;
}

const SELECT_COLUMNS =
  "id, item_code, question_text, options, correct_answer, category, level, language, difficulty, discrimination, guessing, is_active, times_administered, times_correct, created_at, updated_at";

async function verifyAdminCaller(functionName: string) {
  return verifyAdminAuth(functionName);
}

/**
 * Fetch IRT questions for the admin panel.
 * Uses service_role (createAdminClient) — bypasses RLS by design.
 * Caller must be admin or super_admin.
 */
export async function getIRTQuestions(filters?: {
  category?: string | null;
  level?: string | null;
  language?: string | null;
  limit?: number;
}): Promise<{ success: true; data: IRTQuestion[] } | { success: false; error: string }> {
  try {
    const auth = await verifyAdminCaller("getIRTQuestions");
    if (!auth.authorized) {
      return auth.error;
    }

    const adminClient = await createAdminClient();
    let query = adminClient
      .from("irt_item_bank")
      .select(SELECT_COLUMNS)
      .order("item_code")
      .limit(filters?.limit ?? 100);

    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.level) query = query.eq("level", filters.level);
    if (filters?.language) query = query.eq("language", filters.language);

    const { data, error } = await query;
    if (error) {
      authLogger.error("[getIRTQuestions] DB error", error);
      return { success: false, error: "Failed to load questions" };
    }

    return { success: true, data: (data ?? []) as IRTQuestion[] };
  } catch (error) {
    return handleActionError("getIRTQuestions", error) as {
      success: false;
      error: string;
    };
  }
}

/**
 * Update IRT question parameters. Admin-only.
 */
export async function updateIRTQuestion(
  questionId: string,
  updates: IRTQuestionUpdate,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const auth = await verifyAdminCaller("updateIRTQuestion");
    if (!auth.authorized) {
      return auth.error;
    }

    const adminClient = await createAdminClient();
    const { error } = await adminClient
      .from("irt_item_bank")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", questionId);

    if (error) {
      authLogger.error("[updateIRTQuestion] DB error", error);
      return { success: false, error: "Failed to update question" };
    }

    authLogger.info("[updateIRTQuestion] Question updated", { questionId });
    return { success: true };
  } catch (error) {
    return handleActionError("updateIRTQuestion", error) as {
      success: false;
      error: string;
    };
  }
}
