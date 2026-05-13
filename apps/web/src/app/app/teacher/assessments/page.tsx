import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import Link from "next/link";
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
        <div className="rounded-[32px] p-6 text-white" style={{ background: "var(--gradient-teacher)" }}>
          <Link href="/app/teacher/dashboard" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">Assessments 📝</h1>
          <p className="text-white/80 text-sm font-bold">View student assessment results by class</p>
        </div>

        {/* Summary Stats */}
        {hasClasses && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { value: overview?.classes.length ?? 0, label: "Classes", color: "text-blue-600" },
              { value: overview?.totalAssessments ?? 0, label: "Total Assessments", color: "text-purple-600" },
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
              <div className="text-4xl mb-4">📚</div>
              <p className="font-black text-slate-800 text-lg mb-2">No classes yet</p>
              <p className="font-bold text-slate-400 text-sm mb-6">Create a class first, then your students can take assessments.</p>
              <Link
                href="/app/teacher/classes"
                className="px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 inline-block"
                style={{ background: "var(--gradient-teacher)" }}
              >
                Go to Classes
              </Link>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 rounded-3xl border border-blue-100 p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-black text-blue-800 mb-1">About Assessments</p>
              <p className="text-sm font-bold text-blue-600">
                Students take the Digital Literacy Pre-Assessment when they join a class or through the student dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
