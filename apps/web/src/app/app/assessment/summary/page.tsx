import { redirect } from "next/navigation";
import { createAdminClient, createClient, getCurrentUser } from "@/lib/supabase-server";
import { AssessmentSummary } from "@/components/assessment/AssessmentSummary";
import { calculateIRTScore } from "@/app/actions/assessment";

export default async function AssessmentSummaryPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ session?: string }>;
}>) {
  const resolvedParams = await searchParams;
  const sessionId = resolvedParams.session;

  if (!sessionId) {
    redirect("/app/assessment/start");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/student/start");
  }

  const supabase = await createClient();

  // PERF: Fetch session and responses in parallel (both use sessionId from URL)
  const [sessionResult, responsesResult] = await Promise.all([
    supabase
      .from("assessment_sessions")
      .select("id, user_id, started_at, submitted_at, session_type")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("assessment_responses")
      .select("id, item_id, module, chosen_option, is_correct, rt_ms, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  const { data: session, error: sessionError } = sessionResult;
  const { data: responses, error: responsesError } = responsesResult;

  if (sessionError || !session || session.user_id !== user.id) {
    redirect("/app/assessment/start");
  }

  const sessionType = (session.session_type as "pre" | "adaptive" | "post") || "adaptive";

  if (responsesError || !responses || responses.length === 0) {
    redirect("/app/assessment/start");
  }

  // Fetch IRT parameters via admin client — item bank is restricted to service_role
  const itemIds = responses.map((r) => r.item_id);
  const adminSupabase = await createAdminClient();
  const { data: irtItems } = await adminSupabase
    .from("irt_item_bank")
    .select("id, difficulty, discrimination, guessing, category")
    .in("id", itemIds);

  // Create a map of item IDs to IRT parameters
  const irtParamsMap = new Map(
    irtItems?.map((item) => [
      item.id,
      {
        difficulty: Number(item.difficulty) || 0,
        discrimination: Number(item.discrimination) || 1,
        guessing: Number(item.guessing) || 0.2,
        category: item.category,
      },
    ]) || [],
  );

  // Calculate IRT-based score if we have IRT parameters
  let irtScore = null;
  if ((irtItems?.length ?? 0) > 0) {
    const irtResponses = responses.map((r) => {
      const params = irtParamsMap.get(r.item_id);
      return {
        itemId: r.item_id,
        isCorrect: r.is_correct,
        difficulty: params?.difficulty || 0,
        discrimination: params?.discrimination || 1,
        guessing: params?.guessing || 0.2,
        category: params?.category || r.module,
      };
    });
    irtScore = await calculateIRTScore(irtResponses);
  }

  // Calculate statistics
  const totalQuestions = responses.length;
  const correctAnswers = responses.filter((r) => r.is_correct).length;

  // F41: the user-facing "Overall Score" is now the raw correctness
  // percentage (`correctAnswers / totalQuestions`) instead of the IRT
  // mastery estimate. The IRT estimate is mathematically defensible
  // but it floors at 0% for low-ability latent estimates, which
  // contradicts the "8/30 Correct Answers" displayed in the very next
  // card — users see "0% Overall Score" right next to "8/30" and
  // assume the score widget is broken. The IRT-derived θ and mastery
  // badge are unchanged; only the headline percentage swaps to the
  // intuitive measure, matching the team's earlier standardisation
  // for the dashboard "Avg Score" widget.
  const score =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  // Group by module with IRT-enhanced data
  const moduleBreakdown = responses.reduce(
    (acc, r) => {
      if (!acc[r.module]) {
        acc[r.module] = { total: 0, correct: 0 };
      }
      acc[r.module].total++;
      if (r.is_correct) {
        acc[r.module].correct++;
      }
      return acc;
    },
    {} as Record<string, { total: number; correct: number }>,
  );

  // Calculate average response time
  const avgResponseTime = Math.round(
    responses.reduce((sum, r) => sum + (r.rt_ms || 0), 0) / totalQuestions,
  );

  // For post-assessments, fetch comparison data
  let comparisonData = null;
  if (sessionType === "post") {
    const { data: comparison, error: compError } = await supabase.rpc("get_assessment_comparison", {
      p_user_id: user.id,
    });
    if (compError) {
      // Non-critical: comparison is optional enhancement
    }
    if (comparison) {
      comparisonData = comparison as {
        pre: { score: number; modules: Record<string, { score: number; total: number; correct: number }> } | null;
        post: { score: number; modules: Record<string, { score: number; total: number; correct: number }> } | null;
      };
    }
  }

  return (
    <AssessmentSummary
      score={score}
      totalQuestions={totalQuestions}
      correctAnswers={correctAnswers}
      moduleBreakdown={moduleBreakdown}
      avgResponseTime={avgResponseTime}
      sessionType={sessionType}
      comparisonData={comparisonData}
      irtData={
        irtScore
          ? {
              theta: irtScore.overallTheta,
              standardError: irtScore.standardError,
              proficiencyLevel: irtScore.proficiencyLevel,
              categoryScores: irtScore.categoryScores,
            }
          : undefined
      }
    />
  );
}
