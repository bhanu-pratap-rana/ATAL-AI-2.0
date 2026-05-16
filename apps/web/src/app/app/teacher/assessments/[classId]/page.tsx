import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { getClassAssessmentResults } from "@/app/actions/teacher";
import { formatRelativeDay as formatRelativeTime } from "@/lib/utils/format-date";
import { MASTERY_THRESHOLDS } from "@/lib/constants/thresholds";

import { BentoCard } from "@/components/ui/bento-card";
// PR-68: thresholds aligned with MASTERY_THRESHOLDS.PASSING (70). Was a
// local 80/60 ladder which contradicted the score-helpers used elsewhere
// in the app (a 72%-averaging class showed amber "Intermediate" to the
// teacher but emerald "Mastered" to the student).
function getScoreColor(score: number | null): string {
  if (score === null) return "bg-slate-100 text-slate-500";
  if (score >= MASTERY_THRESHOLDS.PASSING) return "bg-emerald-500 text-white";
  if (score >= MASTERY_THRESHOLDS.STRUGGLING) return "bg-amber-400 text-white";
  return "bg-red-400 text-white";
}

function getSkillLevel(score: number | null): { label: string; color: string } {
  if (score === null) return { label: "No Data", color: "bg-slate-100 text-slate-500" };
  if (score >= MASTERY_THRESHOLDS.HIGH_SCORE_BONUS) return { label: "Advanced", color: "bg-emerald-100 text-emerald-700" };
  if (score >= MASTERY_THRESHOLDS.PASSING) return { label: "Intermediate", color: "bg-amber-100 text-amber-700" };
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
    redirect("/app/student/dashboard");
  }

  // Fetch class assessment results
  const resultsData = await getClassAssessmentResults(classId);

  if (!resultsData.success || !resultsData.data) {
    notFound();
  }

  const results = resultsData.data;
  const hasStudents = results.results.length > 0;

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div
          className="rounded-[32px] border-4 border-white p-6 text-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)]"
          style={{ background: "var(--gradient-teacher)" }}
        >
          <Link
            href="/app/teacher/assessments"
            className="inline-flex items-center gap-1.5 text-white/85 text-xs font-black uppercase tracking-widest mb-4 hover:text-white"
          >
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
            Assessments
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0 text-white">
              <BarChart3 className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black mb-0.5 leading-tight truncate">{results.className}</h1>
              <p className="text-white/85 text-sm font-bold">Student Assessment Results</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: results.totalStudents, label: "Total Students", color: "text-blue-600" },
            { value: results.studentsWithAssessments, label: "Completed", color: "text-emerald-600" },
            { value: results.totalStudents - results.studentsWithAssessments, label: "Pending", color: "text-amber-600" },
            { value: results.classAverageScore === null ? "-" : `${results.classAverageScore}%`, label: "Class Average", color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4 text-center">
              <p className={`text-xl sm:text-2xl font-black mb-0.5 ${s.color}`}>{s.value}</p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Student Results */}
        <BentoCard padding="lg">
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
                      <div className="w-9 h-9 rounded-full bg-white border border-slate-100 flex items-center justify-center font-black text-slate-500 text-sm shrink-0">
                        {(student.studentName ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 text-sm truncate">{student.studentName}</p>
                        <p className="text-[11px] font-bold text-slate-400">
                          {student.rollNumber ? `Roll: ${student.rollNumber} • ` : ""}
                          {student.sessionsCompleted} sessions • {student.totalQuestions > 0 ? `${student.correctAnswers}/${student.totalQuestions} correct` : "No data"}
                          {student.lastAssessmentDate ? ` • ${formatRelativeTime(student.lastAssessmentDate)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${skillLevel.color}`}>{skillLevel.label}</span>
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
              <Link href={`/app/teacher/classes/${classId}`} className="px-5 py-2.5 rounded-2xl font-black text-sm text-white inline-block" style={{ background: "var(--gradient-teacher)" }}>
                View Class Details
              </Link>
            </div>
          )}
        </BentoCard>

        {/* Legend */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Score Levels</p>
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
