import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { getProgressStats } from "@/app/actions/dashboard-stats";
import { BadgesDisplay } from "@/components/gamification/BadgesDisplay";
import {
  formatDurationFromMinutes as formatTime,
  formatRelativeDay as formatRelativeTime,
} from "@/lib/utils/format-date";
import { getScoreBgColor as getScoreColor } from "@/lib/utils/score-helpers";

import { BentoCard } from "@/components/ui/bento-card";
export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/student/start");
  }

  // Fetch real progress stats
  const result = await getProgressStats();
  const stats = result.success ? result.data : null;

  // Check if user has any data
  const hasData =
    (stats?.assessmentsTaken ?? 0) > 0 || (stats?.moduleBreakdown?.length ?? 0) > 0;

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
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
              <BarChart3 className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black mb-0.5 leading-tight">Progress</h1>
              <p className="text-white/85 text-sm font-bold">Track your learning journey and performance</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: stats?.coursesCompleted ?? 0, label: "Courses Completed", color: "text-orange-600" },
            { value: stats?.assessmentsTaken ?? 0, label: "Assessments Taken", color: "text-blue-600" },
            { value: stats?.averageScore == null ? "--" : `${stats.averageScore}%`, label: "Average Score", color: "text-emerald-600" },
            { value: stats?.totalTimeSpent ? formatTime(stats.totalTimeSpent) : "--", label: "Time Spent", color: "text-purple-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4 text-center">
              <p className={`text-xl sm:text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Module Breakdown */}
        {hasData && (stats?.moduleBreakdown?.length ?? 0) > 0 && (
          <BentoCard padding="lg">
            <h2 className="font-black text-slate-800 text-lg mb-4">Module Performance</h2>
            <div className="space-y-4">
              {stats?.moduleBreakdown?.map((module) => (
                <div key={module.module}>
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <span className="text-sm font-black text-slate-700 truncate min-w-0">{module.module}</span>
                    <span className="text-xs font-bold text-slate-500 shrink-0">
                      {module.correctAnswers}/{module.questionsAttempted} ({module.averageScore}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${getScoreColor(module.averageScore)}`}
                      style={{ width: `${module.averageScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Badges */}
        <BentoCard padding="lg">
          <h2 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#C9A227]" strokeWidth={2.25} aria-hidden="true" />
            <span>My Badges</span>
          </h2>
          <BadgesDisplay studentId={user.id} showAll={true} />
        </BentoCard>

        {/* Recent Activity */}
        <BentoCard padding="lg">
          <h2 className="font-black text-slate-800 text-lg mb-4">Recent Activity</h2>
          {hasData && (stats?.recentAssessments?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {stats?.recentAssessments?.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${getScoreColor(assessment.score)}`}>
                      {assessment.score}%
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">Assessment Completed</p>
                      <p className="text-xs font-bold text-slate-500">
                        {assessment.totalQuestions} questions • {Math.round(assessment.timeSpent / 60)}m
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-500">{formatRelativeTime(assessment.completedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="mx-auto mb-4 w-16 h-16 rounded-3xl bg-(--bento-tint-orange) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-orange-d)">
                <BookOpen className="w-8 h-8" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <p className="font-black text-slate-900 text-lg mb-1">No activity yet</p>
              <p className="text-sm font-bold text-slate-500 mb-6">Take your first assessment to track progress</p>
              <Link
                href="/app/assessment/start"
                className="btn-bento gap-2 justify-center px-6 py-3 rounded-2xl text-sm inline-flex"
              >
                <ClipboardCheck size={18} strokeWidth={2.5} aria-hidden="true" />
                Start First Assessment
              </Link>
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
}
