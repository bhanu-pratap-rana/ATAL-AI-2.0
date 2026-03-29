import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase-server";
import Link from "next/link";
import { AssessmentBreakdown } from "@/components/assessment/AssessmentBreakdown";
import { ArrowLeft, Clock, CheckCircle, XCircle, BarChart3 } from "lucide-react";

/**
 * Assessment Detail Page
 *
 * Shows detailed per-question breakdown for a completed assessment session.
 * Displays:
 * - Overall score and stats
 * - Per-question analysis with correct/incorrect status
 * - Question text and answer options
 * - Time spent per question
 * - IRT difficulty parameters
 */

interface QuestionDetails {
  id: string;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  difficulty: number | null;
  discrimination: number | null;
  category: string | null;
}


// Get score color helper
function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}


export default async function AssessmentDetailPage({
  params,
}: Readonly<{
  params: Promise<{ sessionId: string }>;
}>) {
  const resolvedParams = await params;
  const sessionId = resolvedParams.sessionId;

  const user = await getCurrentUser();

  if (!user) {
    redirect("/student/start");
  }

  const supabase = await createClient();

  // PERF: Fetch session and responses in parallel (both use sessionId from URL)
  const [sessionResult, responsesResult] = await Promise.all([
    supabase
      .from("assessment_sessions")
      .select("id, user_id, started_at, submitted_at")
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
    redirect("/app/student/assessments");
  }

  if (responsesError || !responses || responses.length === 0) {
    redirect("/app/student/assessments");
  }

  // Fetch IRT item details (depends on response item_ids)
  const itemIds = responses.map((r) => r.item_id);
  const { data: irtItems } = await supabase
    .from("irt_item_bank")
    .select(
      "id, question_text, options, correct_answer, difficulty, discrimination, category"
    )
    .in("id", itemIds);

  // Create question details map
  const questionDetailsMap = new Map<string, QuestionDetails>();

  if (irtItems) {
    for (const item of irtItems) {
      questionDetailsMap.set(item.id, {
        id: item.id,
        question_text: item.question_text || "Question text unavailable",
        options: (item.options as Record<string, string>) || {},
        correct_answer: item.correct_answer || "",
        difficulty: item.difficulty,
        discrimination: item.discrimination,
        category: item.category,
      });
    }
  }

  // Calculate stats
  const totalQuestions = responses.length;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  for (const r of responses) {
    if (r.is_correct === true) correctAnswers++;
    else if (r.is_correct === false) incorrectAnswers++;
  }
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const totalTimeMs = responses.reduce((sum, r) => sum + (r.rt_ms || 0), 0);
  const avgTimeMs = Math.round(totalTimeMs / totalQuestions);

  // Module breakdown
  const moduleStats = responses.reduce(
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
    {} as Record<string, { total: number; correct: number }>
  );

  let scoreLabel = "Keep Learning!";
  if (score >= 80) scoreLabel = "Excellent!";
  else if (score >= 60) scoreLabel = "Good Job!";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" }}>
          <Link href="/app/student/assessments" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Assessments
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">Assessment Details 📊</h1>
          <p className="text-white/80 text-sm font-bold">
            {session.submitted_at
              ? new Date(session.submitted_at).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : "In progress"}
          </p>
        </div>

        {/* Score Summary */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black ${getScoreColor(score)} bg-slate-50 shadow-sm border-4 border-white ring-2 ring-slate-100`}>
                {score}%
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">{scoreLabel}</h2>
                <p className="text-sm font-bold text-slate-500">{correctAnswers} of {totalQuestions} correct</p>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="flex items-center gap-1 justify-center text-emerald-500">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-xl sm:text-2xl font-black">{correctAnswers}</span>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Correct</p>
              </div>
              <div>
                <div className="flex items-center gap-1 justify-center text-red-500">
                  <XCircle className="w-5 h-5" />
                  <span className="text-xl sm:text-2xl font-black">{incorrectAnswers}</span>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Incorrect</p>
              </div>
              <div>
                <div className="flex items-center gap-1 justify-center text-primary">
                  <Clock className="w-5 h-5" />
                  <span className="text-xl sm:text-2xl font-black">{Math.round(avgTimeMs / 1000)}s</span>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Avg Time</p>
              </div>
            </div>
          </div>

          {/* Module Breakdown */}
          <div className="mt-5 pt-5 border-t border-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Performance by Module</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(moduleStats).map(([module, stats]) => {
                const moduleScore = Math.round((stats.correct / stats.total) * 100);
                return (
                  <div key={module} className="p-3 bg-slate-50 rounded-2xl text-center">
                    <div className={`text-lg font-black ${getScoreColor(moduleScore)}`}>{moduleScore}%</div>
                    <div className="text-xs font-bold text-slate-600 capitalize truncate mt-0.5">{module.replaceAll("_", " ")}</div>
                    <div className="text-xs font-bold text-slate-400">{stats.correct}/{stats.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-black text-slate-800 text-lg mb-4">Question-by-Question Breakdown</h2>
          <AssessmentBreakdown responses={responses} questionDetails={questionDetailsMap} />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/app/assessment/start" className="flex-1 py-3 rounded-2xl font-black text-sm text-white text-center transition-all active:scale-95" style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" }}>
            Retake Assessment
          </Link>
          <Link href="/app/learn" className="flex-1 py-3 rounded-2xl font-black text-sm text-slate-700 text-center bg-white border border-slate-200 transition-all active:scale-95">
            Continue Learning
          </Link>
          <Link href="/app/student/dashboard" className="flex-1 py-3 rounded-2xl font-black text-sm text-slate-400 text-center transition-all active:scale-95">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
