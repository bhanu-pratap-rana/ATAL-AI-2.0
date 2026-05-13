/**
 * Teacher Dashboard - Main Overview
 *
 * Combines StudentProgressGrid and AIInteractionsLog for real-time visibility.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  GraduationCap,
  Users,
  Library,
  UserCheck,
  AlertTriangle,
  ClipboardList,
  Bot,
  Lightbulb,
} from "lucide-react";
import { getCurrentUser, createClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { StudentProgressGrid } from "@/components/teacher/StudentProgressGrid";
import { AIInteractionsLog } from "@/components/teacher/AIInteractionsLog";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { ChunkCard } from "@/components/system";

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

export default async function TeacherDashboardPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ classId?: string }>;
}>) {
  const user = await getCurrentUser();

  if (!user) redirect("/teacher/start");
  if (!isTeacherOrHigher(user.app_metadata?.role)) redirect("/app/student/dashboard");

  const [metrics, teacherName, recentStudents, { classId: selectedClassId }] = await Promise.all([
    getDashboardMetrics(user.id),
    getTeacherName(user.id),
    getRecentStudents(user.id),
    searchParams,
  ]);

  const bannerStyle = { background: "var(--gradient-teacher)" };

  // Shared page chrome: warm bento bg + decorative pastel blobs (skyblue + purple)
  const pageChrome = (children: React.ReactNode) => (
    <div className="min-h-screen p-4 md:p-6 pb-28 relative overflow-hidden [background:var(--bento-bg)]">
      <div
        className="bento-blob -top-20 -left-20 w-96 h-96"
        style={{ background: "var(--bento-sky)" }}
        aria-hidden="true"
      />
      <div
        className="bento-blob bottom-0 -right-20 w-96 h-96"
        style={{ background: "var(--bento-purple)" }}
        aria-hidden="true"
      />
      <div className="relative max-w-4xl mx-auto space-y-4">{children}</div>
    </div>
  );

  if (metrics.totalClasses === 0) {
    return pageChrome(
      <>
        <ChunkCard size="lg" className="text-white border-white! relative overflow-hidden" style={bannerStyle}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0 text-white">
            <GraduationCap className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
          </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black mb-1 truncate leading-tight">Welcome, {teacherName}!</h1>
              <p className="text-blue-50 text-sm font-bold">Create your first class to start tracking student progress.</p>
            </div>
          </div>
        </ChunkCard>

        <ChunkCard size="lg" className="text-center">
          <div className="mb-4 w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-(--bento-tint-sky) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-sky-d)">
            <Users className="w-10 h-10 sm:w-12 sm:h-12" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Welcome to ATAL AI!</h2>
          <p className="font-bold text-slate-500 text-sm mb-6">Create your first class to start tracking student progress.</p>
          <Link
            href="/app/teacher/classes"
            className="btn-bento btn-bento-sky px-6 py-3 rounded-2xl text-base inline-flex"
          >
            Create Your First Class →
          </Link>
        </ChunkCard>
      </>,
    );
  }

  const selectedClass =
    metrics.classes.find((c) => c.id === selectedClassId) ?? metrics.classes[0];

  return pageChrome(
    <>
      {/* Banner */}
      <ChunkCard size="lg" className="text-white border-white! relative overflow-hidden" style={bannerStyle}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0 text-white">
            <GraduationCap className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black mb-1 truncate leading-tight">{teacherName}</h1>
            <p className="text-blue-50 text-xs font-black uppercase tracking-widest">Class Instructor • ATAL AI</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md text-center border-2 border-white/25">
            <p className="text-2xl sm:text-3xl font-black">{metrics.totalStudents}</p>
            <p className="text-[11px] uppercase font-black text-blue-50">Total Students</p>
          </div>
          <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md text-center border-2 border-white/25">
            <p className="text-2xl sm:text-3xl font-black">{metrics.activeStudents}</p>
            <p className="text-[11px] uppercase font-black text-blue-50">Active This Week</p>
          </div>
        </div>
      </ChunkCard>

      {/* Recent Activity */}
      {recentStudents.length > 0 && (
        <ChunkCard size="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-(--bento-sky-d)" strokeWidth={2.25} aria-hidden="true" />
              <span>Recent Activity</span>
            </h2>
            <Link href="/app/teacher/classes" className="text-xs font-black text-slate-500 hover:text-(--bento-sky-d) transition-colors">
              See All →
            </Link>
          </div>
          <div className="space-y-1">
            {recentStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 rounded-xl px-2 hover:[background:var(--bento-tint-sky)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full [background:var(--bento-tint-sky)] flex items-center justify-center font-black text-[color:var(--bento-sky-d)] text-sm shrink-0 border-2 border-white shadow-sm">
                    {(s.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <p className="font-black text-slate-800 text-sm truncate">{s.name ?? "Unknown"}</p>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </div>
            ))}
          </div>
        </ChunkCard>
      )}

      {/* Stat Cards — chunky bento tiles with rotating tints */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: <Library className="w-6 h-6 text-(--bento-sky-d)" strokeWidth={2.25} aria-hidden="true" />,
            value: metrics.totalClasses,
            label: "Classes",
            tint: "sky",
          },
          {
            icon: <Users className="w-6 h-6 text-(--bento-purple-d)" strokeWidth={2.25} aria-hidden="true" />,
            value: metrics.totalStudents,
            label: "Students",
            tint: "purple",
          },
          {
            icon: <UserCheck className="w-6 h-6 text-(--bento-mint-d)" strokeWidth={2.25} aria-hidden="true" />,
            value: metrics.activeStudents,
            label: "Active (7d)",
            tint: "mint",
          },
          {
            icon: <AlertTriangle className="w-6 h-6 text-(--bento-red-d)" strokeWidth={2.25} aria-hidden="true" />,
            value: metrics.atRiskStudents,
            label: "At Risk",
            tint: "red",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="chunk-card-sm border-4 border-white p-4 flex flex-col items-center text-center gap-1"
            style={{ background: `var(--bento-tint-${stat.tint})` }}
          >
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm">{stat.icon}</div>
            <p className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</p>
            <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Multiple classes selector */}
      {metrics.classes.length > 1 && (
        <ChunkCard size="md">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Select Class</p>
          <div className="flex flex-wrap gap-2">
            {metrics.classes.map((cls) => {
              const isActive = cls.id === selectedClass.id;
              return (
                <Link
                  key={cls.id}
                  href={`?classId=${cls.id}`}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-colors border-2 ${
                    isActive
                      ? "text-white border-white"
                      : "bg-slate-100 text-slate-700 border-slate-100 hover:bg-slate-200"
                  }`}
                  style={isActive ? bannerStyle : undefined}
                >
                  {cls.name}
                </Link>
              );
            })}
          </div>
        </ChunkCard>
      )}

      {/* Current Class Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-lg sm:text-xl font-black text-slate-900 min-w-0 truncate">{selectedClass.name} — Student Progress</h2>
        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{"Real-time"}
        </div>
      </div>

      {/* Student Progress Grid */}
      <ChunkCard size="md">
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
      </ChunkCard>

      {/* AI Interactions Log */}
      <ChunkCard size="md">
        <h2 className="font-black text-slate-900 text-xl mb-1 flex items-center gap-2">
          <Bot className="w-6 h-6 text-(--bento-purple-d)" strokeWidth={2.25} aria-hidden="true" />
          <span>Recent AI Tutor Interactions</span>
        </h2>
        <p className="text-xs font-bold text-slate-500 mb-4">Monitor student questions and AI responses for quality assurance</p>
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
      </ChunkCard>

      {/* Teaching Tips */}
      <ChunkCard size="md" tint="sky">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-white shadow-sm flex items-center justify-center shrink-0 text-(--bento-sky-d)">
            <Lightbulb className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <div>
            <p className="font-black text-(--bento-sky-d) text-lg mb-1">Teaching Tips</p>
            <div className="text-sm font-bold text-slate-700 space-y-1">
              <p>• Check the &quot;At Risk&quot; students regularly for early intervention</p>
              <p>• Review AI interactions to understand common student questions</p>
              <p>• Students flagged as &quot;at risk&quot; (red tile) need attention</p>
              <p>• Progress updates happen in real-time as students work</p>
            </div>
          </div>
        </div>
      </ChunkCard>
    </>,
  );
}
