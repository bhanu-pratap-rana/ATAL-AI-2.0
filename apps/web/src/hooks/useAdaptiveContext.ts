"use client";

/**
 * Fetches the current student's adaptive learning context — their
 * preferred learning style + current mastery on a given topic — so the
 * lesson generator can adapt difficulty and presentation.
 *
 * Why this hook exists: before this, `useDynamicLesson` always called
 * /api/lesson/generate with the hardcoded default `learningStyle: "text"`
 * and no `masteryLevel`, so AI-generated lessons were identical for
 * every student regardless of their behaviour profile or scores. The
 * adaptive plumbing existed end-to-end (DB tables populated,
 * AdaptiveLearningService implemented, API route accepting the
 * params) — the client just never read its own user profile.
 *
 * Returns sensible defaults while loading or for fresh students with
 * no profile rows yet, so first-lesson generation never blocks.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { clientLogger } from "@/lib/client-logger";

export type LearningStyle = "visual" | "text" | "auditory";

interface AdaptiveContext {
  /** From learning_style_profile.preferred_style, defaults to "text" */
  learningStyle: LearningStyle;
  /** From student_knowledge_state.mastery_score for this topic, 0-100. Null when no attempts yet. */
  masteryLevel: number | null;
  /** True while either query is still loading */
  loading: boolean;
}

export function useAdaptiveContext(topicId: string | null): AdaptiveContext {
  const [learningStyle, setLearningStyle] = useState<LearningStyle>("text");
  const [masteryLevel, setMasteryLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const fetchContext = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const [profileRes, masteryRes] = await Promise.all([
          // F35: filter by `student_id` — the actual column on
          // `learning_style_profile`. The earlier `.eq("user_id", ...)`
          // returned 42703 `column ... does not exist` and surfaced as
          // four 400s per lesson load. All other callers
          // (learning-profile-queries, adaptive-service, admin-delete)
          // already use student_id.
          supabase
            .from("learning_style_profile")
            .select("preferred_style")
            .eq("student_id", user.id)
            .maybeSingle(),
          topicId
            ? supabase
                .from("student_knowledge_state")
                .select("mastery_score")
                .eq("student_id", user.id)
                .eq("topic_id", topicId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (cancelled) return;

        const style = profileRes.data?.preferred_style as LearningStyle | undefined;
        if (style === "visual" || style === "text" || style === "auditory") {
          setLearningStyle(style);
        }

        const score = masteryRes.data?.mastery_score;
        setMasteryLevel(typeof score === "number" ? score : null);
      } catch (err) {
        clientLogger.warn(
          "[useAdaptiveContext] Failed to load adaptive context — falling back to defaults",
          { err: err instanceof Error ? err.message : String(err) },
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContext();
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  return { learningStyle, masteryLevel, loading };
}
