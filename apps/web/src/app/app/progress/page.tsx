import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { getProgressStats } from "@/app/actions/dashboard-stats";
import { BadgesDisplay } from "@/components/gamification/BadgesDisplay";

// Format time in minutes to readable string
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Format date to relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

// Get score progress bar color based on performance level
function getScoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-error";
}

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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" }}>
          <Link href="/app/student/dashboard" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">Progress 📊</h1>
          <p className="text-white/80 text-sm font-bold">Track your learning journey and performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: stats?.coursesCompleted ?? 0, label: "Courses Completed", color: "text-orange-600" },
            { value: stats?.assessmentsTaken ?? 0, label: "Assessments Taken", color: "text-blue-600" },
            { value: stats?.averageScore == null ? "--" : `${stats.averageScore}%`, label: "Average Score", color: "text-emerald-600" },
            { value: stats?.totalTimeSpent ? formatTime(stats.totalTimeSpent) : "--", label: "Time Spent", color: "text-purple-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
              <p className={`text-xl sm:text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Module Breakdown */}
        {hasData && (stats?.moduleBreakdown?.length ?? 0) > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-black text-slate-800 text-lg mb-4">Module Performance</h2>
            <div className="space-y-4">
              {stats?.moduleBreakdown?.map((module) => (
                <div key={module.module}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-black text-slate-700">{module.module}</span>
                    <span className="text-xs font-bold text-slate-400">
                      {module.correctAnswers}/{module.questionsAttempted} correct ({module.averageScore}%)
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
          </div>
        )}

        {/* Badges */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-black text-slate-800 text-lg mb-4">🏅 My Badges</h2>
          <BadgesDisplay studentId={user.id} showAll={true} />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-black text-slate-800 text-lg mb-4">Recent Activity</h2>
          {hasData && (stats?.recentAssessments?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {stats?.recentAssessments?.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getScoreColor(assessment.score)}`}>
                      {assessment.score}%
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">Assessment Completed</p>
                      <p className="text-xs font-bold text-slate-400">
                        {assessment.totalQuestions} questions • {Math.round(assessment.timeSpent / 60)}m
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-400">{formatRelativeTime(assessment.completedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-4xl mb-4">📚</div>
              <p className="font-black text-slate-800 text-lg mb-1">No activity yet</p>
              <p className="text-sm font-bold text-slate-400 mb-6">Take your first assessment to track progress</p>
              <Link
                href="/app/assessment/start"
                className="px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 inline-block"
                style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)", boxShadow: "0 4px 14px rgba(249,136,25,0.39)" }}
              >
                Start First Assessment
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
