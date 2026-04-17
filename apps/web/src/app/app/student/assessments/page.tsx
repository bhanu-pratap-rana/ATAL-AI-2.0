import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

// Format time in seconds to readable string
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
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

// Get skill level from score
function getSkillLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Advanced", color: "bg-emerald-500 text-white" };
  if (score >= 60)
    return { label: "Intermediate", color: "bg-amber-400 text-white" };
  return { label: "Beginner", color: "bg-info text-white" };
}

// Get score circle background color
function getScoreCircleColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-error";
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "var(--gradient-primary)" }}>
          <Link href="/app/student/dashboard" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">Assessments 📝</h1>
          <p className="text-white/80 text-sm font-bold">Test your digital literacy skills</p>
        </div>

        {/* Start New */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-slate-800 mb-1">Start a New Assessment</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Comprehensive Digital Literacy Test</p>
          </div>
          <Link
            href="/app/assessment/start"
            className="px-5 py-3 rounded-2xl font-black text-sm text-white shrink-0 transition-all active:scale-95"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 14px rgba(249,136,25,0.39)" }}
          >
            Start
          </Link>
        </div>

        {/* Assessment History */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-800 text-lg">📊 History</h2>
            {hasHistory && (
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{assessmentHistory.length} completed</span>
            )}
          </div>
            {hasHistory ? (
              <div className="space-y-3">
                {assessmentHistory.map((assessment) => {
                  const skillLevel = getSkillLevel(assessment.score);
                  return (
                    <div
                      key={assessment.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl gap-3"
                    >
                      <div className="flex items-center gap-4">
                        {/* Score Circle */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0 ${getScoreCircleColor(assessment.score)}`}>
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
                        <span className="text-xs font-black text-slate-400">
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
                <div className="text-4xl mb-4">📚</div>
                <p className="font-black text-slate-800 text-lg mb-1">No assessments yet</p>
                <p className="text-sm font-bold text-slate-400 mb-6">Take your first assessment to track progress</p>
                <Link
                  href="/app/assessment/start"
                  className="px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 inline-block"
                  style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 14px rgba(249,136,25,0.39)" }}
                >
                  Take First Assessment
                </Link>
              </div>
            )}
        </div>

        {/* Stats Summary */}
        {hasHistory && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: assessmentHistory.length, label: "Total Attempts", color: "bg-orange-50 text-orange-600" },
              { value: `${Math.round(assessmentHistory.reduce((sum, a) => sum + a.score, 0) / assessmentHistory.length)}%`, label: "Avg Score", color: "bg-emerald-50 text-emerald-600" },
              { value: `${Math.max(...assessmentHistory.map((a) => a.score))}%`, label: "Best Score", color: "bg-primary-lightest text-primary" },
              { value: assessmentHistory.filter((a) => a.score >= 60).length, label: "Passed (60%+)", color: "bg-success/10 text-success" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
                <p className={`text-xl sm:text-2xl font-black mb-1 ${stat.color.split(" ")[1]}`}>{stat.value}</p>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
