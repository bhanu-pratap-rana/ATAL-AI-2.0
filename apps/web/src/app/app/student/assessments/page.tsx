import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Play,
} from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { getTranslation } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n/server";
import type { SupportedLanguage } from "@/lib/i18n";
import {
  formatDurationFromSeconds as formatTime,
  formatRelativeDay as formatRelativeTime,
} from "@/lib/utils/format-date";
import { getScoreBgColor as getScoreCircleColor } from "@/lib/utils/score-helpers";

import { BentoCard } from "@/components/ui/bento-card";
// Get skill level from score
function getSkillLevel(score: number, language: SupportedLanguage): { label: string; color: string } {
  if (score >= 80) return { label: getTranslation("skill.advanced", language), color: "bg-emerald-500 text-white" };
  if (score >= 60)
    return { label: getTranslation("skill.intermediate", language), color: "bg-amber-400 text-white" };
  return { label: getTranslation("skill.beginner", language), color: "bg-info text-white" };
}

interface AssessmentSession {
  id: string;
  started_at: string;
  submitted_at: string | null;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
}

export default async function StudentAssessmentsPage() {
  const supabase = await createClient();
  const language = await getServerLanguage();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/student/start");
  }

  // PERF-012 FIX: Add pagination to prevent fetching unbounded data
  // Limit to most recent 50 assessments - sufficient for student history view
  // For users with 100+ assessments, this prevents memory/timeout issues
  const ASSESSMENT_LIMIT = 50;

  const { data: sessions } = await supabase
    .from("assessment_sessions")
    .select("id, started_at, submitted_at")
    .eq("user_id", user.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(ASSESSMENT_LIMIT);

  // Calculate stats for each session
  // PERF-001 FIX: Batch fetch all responses in one query instead of N+1 queries
  const assessmentHistory: AssessmentSession[] = [];

  // TYPE-003 FIX: Use proper null guard instead of non-null assertion
  if (sessions && sessions.length > 0) {
    // Collect all session IDs for batch query
    const sessionIds = sessions.map((s) => s.id);

    // Batch fetch all responses for all sessions in ONE query
    const { data: allResponses } = await supabase
      .from("assessment_responses")
      .select("session_id, is_correct, rt_ms")
      .in("session_id", sessionIds);

    // Build O(1) lookup map: session_id -> responses[]
    const responsesBySession = new Map<
      string,
      Array<{ is_correct: boolean | null; rt_ms: number | null }>
    >();
    // TYPE-004 FIX: Avoid non-null assertion on Map.get()
    allResponses?.forEach((resp) => {
      const existing = responsesBySession.get(resp.session_id);
      if (existing) {
        existing.push({
          is_correct: resp.is_correct,
          rt_ms: resp.rt_ms,
        });
      } else {
        responsesBySession.set(resp.session_id, [
          {
            is_correct: resp.is_correct,
            rt_ms: resp.rt_ms,
          },
        ]);
      }
    });

    // Process sessions with pre-fetched data (no additional queries)
    for (const session of sessions) {
      const responses = responsesBySession.get(session.id) || [];
      const totalQuestions = responses.length;
      const correctAnswers = responses.filter((r) => r.is_correct).length;
      const score =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;
      const timeSpent = Math.round(
        responses.reduce((sum, r) => sum + (r.rt_ms || 0), 0) / 1000,
      );

      assessmentHistory.push({
        id: session.id,
        started_at: session.started_at,
        submitted_at: session.submitted_at,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent,
      });
    }
  }

  const hasHistory = assessmentHistory.length > 0;

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Banner */}
        <div
          className="rounded-[32px] border-4 border-white p-6 text-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Link
            href="/app/student/dashboard"
            className="inline-flex items-center gap-1.5 text-white/85 text-xs font-black uppercase tracking-widest mb-4 hover:text-white"
          >
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
            Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0 text-white">
              <ClipboardCheck className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black mb-0.5 leading-tight">Assessments</h1>
              <p className="text-white/85 text-sm font-bold">Test your digital literacy skills</p>
            </div>
          </div>
        </div>

        {/* Start New */}
        <BentoCard padding="lg" className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-slate-900 mb-1">Start a New Assessment</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Comprehensive Digital Literacy Test</p>
          </div>
          <Link
            href="/app/assessment/start"
            className="btn-bento gap-2 justify-center shrink-0 px-5 py-3 rounded-2xl text-sm inline-flex"
          >
            <Play size={16} strokeWidth={2.5} aria-hidden="true" />
            Start
          </Link>
        </BentoCard>

        {/* Assessment History */}
        <BentoCard padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-(--bento-purple-d)" strokeWidth={2.25} aria-hidden="true" />
              <span>History</span>
            </h2>
            {hasHistory && (
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{assessmentHistory.length} completed</span>
            )}
          </div>
            {hasHistory ? (
              <div className="space-y-3">
                {assessmentHistory.map((assessment) => {
                  const skillLevel = getSkillLevel(assessment.score, language);
                  return (
                    <div
                      key={assessment.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl gap-3"
                    >
                      <div className="flex items-center gap-4">
                        {/* Score Circle */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg shrink-0 ${getScoreCircleColor(assessment.score)}`}>
                          {assessment.score}%
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-800">
                              Digital Literacy Assessment
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${skillLevel.color}`}
                            >
                              {skillLevel.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {assessment.correctAnswers}/
                            {assessment.totalQuestions} correct •{" "}
                            {formatTime(assessment.timeSpent)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                        <span className="text-xs font-black text-slate-500">
                          {formatRelativeTime(assessment.submitted_at || assessment.started_at)}
                        </span>
                        <Link
                          href={`/app/assessments/${assessment.id}`}
                          className="px-3 py-1.5 rounded-xl border-2 border-slate-200 text-xs font-black text-slate-600 hover:border-orange-400 hover:text-orange-500 transition-all"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="mx-auto mb-4 w-16 h-16 rounded-3xl bg-(--bento-tint-orange) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-orange-d)">
                  <BookOpen className="w-8 h-8" strokeWidth={2.25} aria-hidden="true" />
                </div>
                <p className="font-black text-slate-900 text-lg mb-1">No assessments yet</p>
                <p className="text-sm font-bold text-slate-500 mb-6">Take your first assessment to track progress</p>
                <Link
                  href="/app/assessment/start"
                  className="btn-bento gap-2 justify-center px-6 py-3 rounded-2xl text-sm inline-flex"
                >
                  <Play size={16} strokeWidth={2.5} aria-hidden="true" />
                  Take First Assessment
                </Link>
              </div>
            )}
        </BentoCard>

        {/* Stats Summary */}
        {hasHistory && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: assessmentHistory.length, label: "Total Attempts", color: "bg-orange-50 text-orange-600" },
              { value: `${Math.round(assessmentHistory.reduce((sum, a) => sum + a.score, 0) / assessmentHistory.length)}%`, label: "Avg Score", color: "bg-emerald-50 text-emerald-600" },
              { value: `${Math.max(...assessmentHistory.map((a) => a.score))}%`, label: "Best Score", color: "bg-primary-lightest text-primary" },
              { value: assessmentHistory.filter((a) => a.score >= 60).length, label: "Passed (60%+)", color: "bg-success/10 text-success" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4 text-center">
                <p className={`text-xl sm:text-2xl font-black mb-1 ${stat.color.split(" ")[1]}`}>{stat.value}</p>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
