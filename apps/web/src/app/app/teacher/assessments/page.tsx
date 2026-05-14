import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Library,
  Lightbulb,
} from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { ClassAssessmentCard } from "@/components/teacher/ClassAssessmentCard";
import { getTeacherAssessmentOverview } from "@/app/actions/teacher";


export default async function TeacherAssessmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/teacher/start");
  }

  // Check app_metadata for role - teachers, admins, and super_admins can access
  const role = user.app_metadata?.role;
  const isTeacherOrAdmin = isTeacherOrHigher(role);
  if (!isTeacherOrAdmin) {
    redirect("/app/student/dashboard");
  }

  // Fetch real assessment data
  const overviewResult = await getTeacherAssessmentOverview();
  const overview = overviewResult.success ? overviewResult.data : null;

  const hasClasses = (overview?.classes.length ?? 0) > 0;

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Banner */}
        <div
          className="rounded-[32px] border-4 border-white p-6 text-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)]"
          style={{ background: "var(--gradient-teacher)" }}
        >
          <Link
            href="/app/teacher/dashboard"
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
              <p className="text-white/85 text-sm font-bold">View student assessment results by class</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {hasClasses && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { value: overview?.classes.length ?? 0, label: "Classes", color: "text-[#2563EB]" },
              { value: overview?.totalAssessments ?? 0, label: "Total Assessments", color: "text-[#2563EB]" },
              { value: overview?.overallAverageScore == null ? "-" : `${overview.overallAverageScore}%`, label: "Average Score", color: "text-emerald-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4 text-center">
                <p className={`text-xl sm:text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Classes with Assessment Results */}
        <div className="space-y-4">
          {hasClasses ? (
            overview?.classes.map((cls) => (
              <ClassAssessmentCard
                key={cls.classId}
                classData={{
                  classId: cls.classId,
                  className: cls.className,
                  subject: cls.subject,
                  studentCount: cls.studentCount,
                  assessmentsTaken: cls.assessmentsTaken,
                  averageScore: cls.averageScore,
                }}
              />
            ))
          ) : (
            <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-8 sm:p-12 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-3xl bg-(--bento-tint-sky) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-sky-d)">
                <Library className="w-10 h-10" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <p className="font-black text-slate-900 text-lg mb-2">No classes yet</p>
              <p className="font-bold text-slate-500 text-sm mb-6">Create a class first, then your students can take assessments.</p>
              <Link
                href="/app/teacher/classes"
                className="btn-bento btn-bento-sky gap-2 justify-center px-6 py-3 rounded-2xl text-sm inline-flex"
              >
                Go to Classes
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5 bg-(--bento-tint-sky)">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-white shadow-sm flex items-center justify-center shrink-0 text-(--bento-sky-d)">
              <Lightbulb className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <p className="font-black text-(--bento-sky-d) mb-1">About Assessments</p>
              <p className="text-sm font-bold text-slate-700">
                Students take the Digital Literacy Pre-Assessment when they join a class or through the student dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
