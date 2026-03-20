import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import Link from "next/link";
import {
  Clock,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";

/**
 * Class Performance Analytics Page
 *
 * Shows teachers class performance analytics:
 * - Syllabus completion by module (progress bars)
 * - Growth and at-risk summary tiles
 * - Most/least difficult questions
 * - Question success rates and response times
 *
 * Data comes from formative_responses table joined with practice_questions.
 */

interface QuestionStats {
  questionId: string;
  questionText: string;
  topicId: string;
  moduleId: string;
  totalAttempts: number;
  correctCount: number;
  avgTimeMs: number;
  hintUsageCount: number;
  difficulty: string | null;
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 80) return "text-emerald-600";
  if (rate >= 60) return "text-amber-600";
  if (rate >= 40) return "text-accent";
  return "text-red-600";
}

function getModuleBarColor(rate: number): string {
  if (rate >= 70) return "bg-emerald-500";
  if (rate >= 40) return "bg-amber-400";
  return "bg-red-400";
}

interface QuestionRaw {
  id: string;
  question: string;
  topic_id: string;
  module_id: string;
  difficulty: string | null;
}

interface ResponseRaw {
  question_id: string;
  is_correct: boolean;
  response_time_ms: number | null;
  ai_hint_requested: boolean;
}

function buildStatsMap(questions: QuestionRaw[]): Map<string, QuestionStats> {
  const statsMap = new Map<string, QuestionStats>();
  for (const q of questions) {
    statsMap.set(q.id, {
      questionId: q.id,
      questionText: q.question,
      topicId: q.topic_id,
      moduleId: q.module_id,
      totalAttempts: 0,
      correctCount: 0,
      avgTimeMs: 0,
      hintUsageCount: 0,
      difficulty: q.difficulty,
    });
  }
  return statsMap;
}

function applyResponses(statsMap: Map<string, QuestionStats>, responses: ResponseRaw[]): void {
  const timeAccumulator = new Map<string, { total: number; count: number }>();
  for (const r of responses) {
    const stats = statsMap.get(r.question_id);
    if (!stats) continue;
    stats.totalAttempts++;
    if (r.is_correct) stats.correctCount++;
    if (r.ai_hint_requested) stats.hintUsageCount++;
    if (r.response_time_ms) {
      const timeData = timeAccumulator.get(r.question_id) ?? { total: 0, count: 0 };
      timeData.total += r.response_time_ms;
      timeData.count++;
      timeAccumulator.set(r.question_id, timeData);
    }
  }
  for (const [questionId, timeData] of timeAccumulator) {
    const stats = statsMap.get(questionId);
    if (stats && timeData.count > 0) {
      stats.avgTimeMs = Math.round(timeData.total / timeData.count);
    }
  }
}

function buildModuleStats(questionStats: QuestionStats[]): Record<string, { total: number; correct: number; questions: number }> {
  return questionStats.reduce(
    (acc, q) => {
      if (!acc[q.moduleId]) acc[q.moduleId] = { total: 0, correct: 0, questions: 0 };
      acc[q.moduleId].total += q.totalAttempts;
      acc[q.moduleId].correct += q.correctCount;
      acc[q.moduleId].questions++;
      return acc;
    },
    {} as Record<string, { total: number; correct: number; questions: number }>
  );
}

function formatTime(ms: number): string {
  if (ms < 1000) return "<1s";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default async function PracticeQuestionAnalyticsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/teacher/start");
  }

  const supabase = await createClient();

  // Verify teacher role (teacher_profiles PK is user_id, not id)
  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!teacherProfile) {
    redirect("/teacher/start");
  }

  // Fetch practice questions (bounded)
  const { data: questions, error: questionsError } = await supabase
    .from("practice_questions")
    .select("id, question, topic_id, module_id, difficulty")
    .order("module_id")
    .limit(500);

  if (questionsError) {
    authLogger.error("[QuestionAnalytics] Failed to fetch questions:", { error: questionsError.message });
  }

  // Fetch formative responses (bounded to prevent unbounded scan)
  const { data: responses, error: responsesError } = await supabase
    .from("formative_responses")
    .select("question_id, is_correct, response_time_ms, ai_hint_requested")
    .limit(10000);

  if (responsesError) {
    authLogger.error("[QuestionAnalytics] Failed to fetch responses:", { error: responsesError.message });
  }

  // Aggregate stats by question
  const statsMap = buildStatsMap(questions ?? []);
  applyResponses(statsMap, responses ?? []);

  // Convert to array and filter questions with at least 1 attempt
  const questionStats = Array.from(statsMap.values()).filter((s) => s.totalAttempts > 0);
  const sortedStats = [...questionStats].sort((a, b) => b.totalAttempts - a.totalAttempts);

  // Calculate overall metrics
  const totalAttempts = questionStats.reduce((sum, q) => sum + q.totalAttempts, 0);
  const totalCorrect = questionStats.reduce((sum, q) => sum + q.correctCount, 0);
  const overallSuccessRate = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Find hardest and easiest questions
  const questionsWithMinAttempts = questionStats.filter((q) => q.totalAttempts >= 3);
  const sortedByDifficulty = [...questionsWithMinAttempts].sort(
    (a, b) => a.correctCount / a.totalAttempts - b.correctCount / b.totalAttempts
  );
  const hardestQuestions = sortedByDifficulty.slice(0, 5);
  const easiestQuestions = sortedByDifficulty.slice(-5).reverse();

  const moduleStats = buildModuleStats(questionStats);

  const atRiskCount = hardestQuestions.length;
  const growthDisplay = overallSuccessRate > 0 ? `+${Math.min(overallSuccessRate, 99)}%` : "N/A";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)" }}>
          <Link href="/app/teacher/dashboard" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">Class Performance 📊</h1>
          <p className="text-white/80 text-sm font-bold">Syllabus completion and question analytics</p>
        </div>

        {/* Growth + At-Risk Tiles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600">{growthDisplay}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Success Rate</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-red-600">{atRiskCount}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">At-Risk Topics</p>
            </div>
          </div>
        </div>

        {/* Syllabus Completion */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Syllabus Completion</p>
          {Object.keys(moduleStats).length === 0 ? (
            <p className="text-slate-400 font-bold text-center py-4">No module data available yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(moduleStats).map(([moduleId, stats]) => {
                const successRate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                const barColor = getModuleBarColor(successRate);
                return (
                  <div key={moduleId}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-slate-700 capitalize">{moduleId.replaceAll("_", " ")}</p>
                      <p className="text-sm font-black text-slate-500">{successRate}%</p>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${successRate}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{stats.total} attempts • {stats.questions} questions</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hardest Questions */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" /> Most Challenging
            </h2>
            {hardestQuestions.length === 0 ? (
              <p className="text-slate-400 font-bold text-center py-4 text-sm">Not enough data yet (min. 3 attempts)</p>
            ) : (
              <div className="space-y-3">
                {hardestQuestions.map((q, index) => {
                  const rate = Math.round((q.correctCount / q.totalAttempts) * 100);
                  return (
                    <div key={q.questionId} className="p-3 bg-red-50 rounded-2xl border border-red-100">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-black shrink-0">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 line-clamp-2">{q.questionText}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-bold">
                            <span className={getSuccessRateColor(rate)}>{rate}% success</span>
                            <span>• {q.totalAttempts} attempts</span>
                            {q.hintUsageCount > 0 && (
                              <span className="flex items-center gap-1"><Lightbulb className="w-3 h-3" />{q.hintUsageCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Easiest Questions */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Well-Mastered
            </h2>
            {easiestQuestions.length === 0 ? (
              <p className="text-slate-400 font-bold text-center py-4 text-sm">Not enough data yet (min. 3 attempts)</p>
            ) : (
              <div className="space-y-3">
                {easiestQuestions.map((q, index) => {
                  const rate = Math.round((q.correctCount / q.totalAttempts) * 100);
                  return (
                    <div key={q.questionId} className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 line-clamp-2">{q.questionText}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-bold">
                            <span className={getSuccessRateColor(rate)}>{rate}% success</span>
                            <span>• {q.totalAttempts} attempts</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(q.avgTimeMs)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* All Questions Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-black text-slate-800 text-lg mb-4">All Question Performance</h2>
          {sortedStats.length === 0 ? (
            <p className="text-slate-400 font-bold text-center py-8">No practice question responses recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Question</th>
                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Module</th>
                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attempts</th>
                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Success</th>
                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Time</th>
                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hints</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.slice(0, 20).map((q) => {
                    const rate = Math.round((q.correctCount / q.totalAttempts) * 100);
                    return (
                      <tr key={q.questionId} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-3 max-w-[300px]"><p className="truncate font-bold text-slate-700">{q.questionText}</p></td>
                        <td className="py-3 px-3 text-center capitalize text-slate-500 font-bold text-xs">{q.moduleId.replaceAll("_", " ")}</td>
                        <td className="py-3 px-3 text-center font-black text-slate-700">{q.totalAttempts}</td>
                        <td className="py-3 px-3 text-center"><span className={`font-black ${getSuccessRateColor(rate)}`}>{rate}%</span></td>
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{formatTime(q.avgTimeMs)}</td>
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">
                          {q.hintUsageCount > 0 ? (
                            <span className="flex items-center justify-center gap-1"><Lightbulb className="w-4 h-4 text-amber-500" />{q.hintUsageCount}</span>
                          ) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sortedStats.length > 20 && (
                <p className="text-center text-xs font-black text-slate-400 mt-3">Showing top 20 of {sortedStats.length} questions</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
