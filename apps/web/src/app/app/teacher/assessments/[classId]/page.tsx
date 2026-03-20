import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import Link from "next/link";
import { getClassAssessmentResults } from "@/app/actions/teacher";

// Format date to relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
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

function getScoreColor(score: number | null): string {
  if (score === null) return "bg-slate-100 text-slate-400";
  if (score >= 80) return "bg-emerald-500 text-white";
  if (score >= 60) return "bg-amber-400 text-white";
  return "bg-red-400 text-white";
}

function getSkillLevel(score: number | null): { label: string; color: string } {
  if (score === null) return { label: "No Data", color: "bg-slate-100 text-slate-400" };
  if (score >= 80) return { label: "Advanced", color: "bg-emerald-100 text-emerald-700" };
  if (score >= 60) return { label: "Intermediate", color: "bg-amber-100 text-amber-700" };
  return { label: "Beginner", color: "bg-red-100 text-red-700" };
}

interface PageProps {
  readonly params: Promise<{ classId: string }>;
}

export default async function ClassAssessmentResultsPage({
  params,
}: PageProps) {
  const { classId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/teacher/start");
  }

  // Check app_metadata for role
  const role = user.app_metadata?.role;
  const isTeacherOrAdmin = isTeacherOrHigher(role);
  if (!isTeacherOrAdmin) {
    redirect("/app/dashboard");
  }

  // Fetch class assessment results
  const resultsData = await getClassAssessmentResults(classId);

  if (!resultsData.success || !resultsData.data) {
    notFound();
  }

  const results = resultsData.data;
  const hasStudents = results.results.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)" }}>
          <Link href="/app/teacher/assessments" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Assessments
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">📊 {results.className}</h1>
          <p className="text-white/80 text-sm font-bold">Student Assessment Results</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: results.totalStudents, label: "Total Students", color: "text-blue-600" },
            { value: results.studentsWithAssessments, label: "Completed", color: "text-emerald-600" },
            { value: results.totalStudents - results.studentsWithAssessments, label: "Pending", color: "text-amber-600" },
            { value: results.classAverageScore === null ? "-" : `${results.classAverageScore}%`, label: "Class Average", color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-center">
              <p className={`text-xl sm:text-2xl font-black mb-0.5 ${s.color}`}>{s.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Student Results */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-black text-slate-800 text-lg mb-4">
            Student Results <span className="text-sm font-bold text-slate-400">({results.results.length})</span>
          </h2>
          {hasStudents ? (
            <div className="space-y-3">
              {results.results.map((student) => {
                const skillLevel = getSkillLevel(student.averageScore);
                return (
                  <div key={student.studentId} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-white border border-slate-100 flex items-center justify-center font-black text-slate-500 text-sm flex-shrink-0">
                        {(student.studentName ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 text-sm truncate">{student.studentName}</p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {student.rollNumber ? `Roll: ${student.rollNumber} • ` : ""}
                          {student.sessionsCompleted} sessions • {student.totalQuestions > 0 ? `${student.correctAnswers}/${student.totalQuestions} correct` : "No data"}
                          {student.lastAssessmentDate ? ` • ${formatRelativeTime(student.lastAssessmentDate)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${skillLevel.color}`}>{skillLevel.label}</span>
                      <div className={`w-12 h-9 rounded-xl flex items-center justify-center font-black text-sm ${getScoreColor(student.averageScore)}`}>
                        {student.averageScore === null ? "-" : `${student.averageScore}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-black text-slate-800 mb-1">No students enrolled yet</p>
              <p className="text-sm font-bold text-slate-400 mb-4">Share the class code with your students to get started.</p>
              <Link href={`/app/teacher/classes/${classId}`} className="px-5 py-2.5 rounded-2xl font-black text-sm text-white inline-block" style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)" }}>
                View Class Details
              </Link>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Score Levels</p>
          <div className="flex flex-wrap gap-4">
            {[
              { color: "bg-emerald-500", label: "Advanced (80%+)" },
              { color: "bg-amber-400", label: "Intermediate (60–79%)" },
              { color: "bg-red-400", label: "Beginner (<60%)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-xs font-bold text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
