/**
 * Teacher Dashboard - Main Overview
 *
 * Combines StudentProgressGrid and AIInteractionsLog for real-time visibility.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentUser, createClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { StudentProgressGrid } from "@/components/teacher/StudentProgressGrid";
import { AIInteractionsLog } from "@/components/teacher/AIInteractionsLog";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";

async function getTeacherName(teacherId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teacher_profiles")
    .select("name")
    .eq("user_id", teacherId)
    .maybeSingle();
  return data?.name || "Teacher";
}

async function getDashboardMetrics(teacherId: string) {
  const supabase = await createClient();

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", teacherId);

  if (classesError) {
    authLogger.error("[TeacherDashboard] Classes query error:", { error: classesError.message });
  }

  if (!classes || classes.length === 0) {
    return { totalClasses: 0, totalStudents: 0, activeStudents: 0, atRiskStudents: 0, classes: [] };
  }

  const classIds = classes.map((c) => c.id);

  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("student_id")
    .in("class_id", classIds);

  if (enrollError) {
    authLogger.error("[TeacherDashboard] Enrollments query error:", { error: enrollError.message });
  }

  const studentIds = enrollments?.map((e) => e.student_id) || [];

  if (studentIds.length === 0) {
    return {
      totalClasses: classes.length,
      totalStudents: 0,
      activeStudents: 0,
      atRiskStudents: 0,
      classes: classes.map((c) => ({ ...c, studentCount: 0 })),
    };
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    { data: activeKnowledgeState, error: activeError },
    { data: atRiskData, error: riskError },
  ] = await Promise.all([
    supabase
      .from("student_knowledge_state")
      .select("student_id")
      .in("student_id", studentIds)
      .gte("last_attempt_at", sevenDaysAgo.toISOString()),
    supabase
      .from("student_knowledge_state")
      .select("student_id")
      .in("student_id", studentIds)
      .lt("mastery_score", 40)
      .gt("attempts", 3),
  ]);

  if (activeError) authLogger.error("[TeacherDashboard] Active students query error:", { error: activeError.message });
  if (riskError) authLogger.error("[TeacherDashboard] At-risk query error:", { error: riskError.message });

  const activeStudentIds = new Set(activeKnowledgeState?.map((k) => k.student_id) || []);
  const atRiskStudentIds = new Set(atRiskData?.map((k) => k.student_id) || []);

  return {
    totalClasses: classes.length,
    totalStudents: studentIds.length,
    activeStudents: activeStudentIds.size,
    atRiskStudents: atRiskStudentIds.size,
    classes,
  };
}

interface RecentStudent {
  id: string;
  name: string | null;
}

async function getRecentStudents(teacherId: string, limit = 5): Promise<RecentStudent[]> {
  try {
    const supabase = await createClient();
    const { data: classes } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", teacherId);
    if (!classes?.length) return [];

    const classIds = classes.map((c) => c.id);
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .in("class_id", classIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!enrollments?.length) return [];

    const ids = [...new Set(enrollments.map((e) => e.student_id))].slice(0, limit);
    const { data: profiles } = await supabase
      .from("student_profiles")
      .select("user_id, name")
      .in("user_id", ids);

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.name]));
    return ids.map((id) => ({ id, name: profileMap.get(id) ?? null }));
  } catch {
    return [];
  }
}

export default async function TeacherDashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/teacher/start");
  if (!isTeacherOrHigher(user.app_metadata?.role)) redirect("/app/dashboard");

  const [metrics, teacherName, recentStudents] = await Promise.all([
    getDashboardMetrics(user.id),
    getTeacherName(user.id),
    getRecentStudents(user.id),
  ]);

  const bannerStyle = { background: "linear-gradient(135deg,#3B82F6,#6366F1)" };

  if (metrics.totalClasses === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="rounded-[32px] p-6 text-white" style={bannerStyle}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">👩‍🏫</div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-xl sm:text-2xl font-black mb-1 truncate">Welcome, {teacherName}!</h1>
                <p className="text-blue-100 text-sm font-bold">Create your first class to start tracking student progress.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-6xl mb-4">👥</div>
            <h2 className="text-xl sm:text-xl sm:text-2xl font-black text-slate-800 mb-2">Welcome to ATAL AI!</h2>
            <p className="font-bold text-slate-400 text-sm mb-6">Create your first class to start tracking student progress.</p>
            <Link
              href="/app/teacher/classes"
              className="px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 inline-block"
              style={bannerStyle}
            >
              Create Your First Class
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedClass = metrics.classes[0];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={bannerStyle}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">👩‍🏫</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-xl sm:text-2xl font-black mb-1 truncate">{teacherName}</h1>
              <p className="text-blue-100 text-xs font-black uppercase tracking-widest">Class Instructor • ATAL AI</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md text-center">
              <p className="text-xl sm:text-2xl font-black">{metrics.totalStudents}</p>
              <p className="text-[10px] uppercase font-black text-blue-100">Total Students</p>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md text-center">
              <p className="text-xl sm:text-2xl font-black">{metrics.activeStudents}</p>
              <p className="text-[10px] uppercase font-black text-blue-100">Active This Week</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentStudents.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-800 text-base">Recent Activity</h2>
              <Link href="/app/teacher/classes" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors">
                See All
              </Link>
            </div>
            <div className="space-y-2">
              {recentStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm flex-shrink-0">
                      {(s.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <p className="font-bold text-slate-800 text-sm truncate">{s.name ?? "Unknown"}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "📚", value: metrics.totalClasses, label: "Classes" },
            { icon: "👥", value: metrics.totalStudents, label: "Students" },
            { icon: "✅", value: metrics.activeStudents, label: "Active (7d)" },
            { icon: "⚠️", value: metrics.atRiskStudents, label: "At Risk" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center gap-1">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{stat.icon}</div>
              <p className="text-xl font-black text-slate-800 leading-none">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Multiple classes selector */}
        {metrics.classes.length > 1 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Select Class</p>
            <div className="flex flex-wrap gap-2">
              {metrics.classes.map((cls) => (
                <span
                  key={cls.id}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
                    cls.id === selectedClass.id
                      ? "text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                  style={cls.id === selectedClass.id ? bannerStyle : undefined}
                >
                  {cls.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Current Class Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-black text-slate-800 min-w-0 truncate">{selectedClass.name} — Student Progress</h2>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{"Real-time"}
          </div>
        </div>

        {/* Student Progress Grid */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-24" />
                ))}
              </div>
            }
          >
            <StudentProgressGrid classId={selectedClass.id} />
          </Suspense>
        </div>

        {/* AI Interactions Log */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-black text-slate-800 text-lg mb-1 flex items-center gap-2">
            <span>🤖</span> Recent AI Tutor Interactions
          </h2>
          <p className="text-xs font-bold text-slate-400 mb-4">Monitor student questions and AI responses for quality assurance</p>
          <Suspense
            fallback={
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-12" />
                ))}
              </div>
            }
          >
            <AIInteractionsLog classId={selectedClass.id} limit={15} />
          </Suspense>
        </div>

        {/* Teaching Tips */}
        <div className="bg-blue-50 rounded-3xl border border-blue-100 p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-black text-blue-800 mb-1">Teaching Tips</p>
              <div className="text-sm font-bold text-blue-600 space-y-1">
                <p>• Check the &quot;At Risk&quot; students regularly for early intervention</p>
                <p>• Review AI interactions to understand common student questions</p>
                <p>• Students with 🔴 indicator need attention</p>
                <p>• Progress updates happen in real-time as students work</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
