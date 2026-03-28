/**
 * Student Dashboard - Dedicated Page
 *
 * Server-rendered student home matching the teacher dashboard's richness.
 * Shows: orange banner with profile info + streak, stat cards,
 * quick actions, module cards with progress, and enrolled classes.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ChevronRight, Flame, BookOpen, Users, PlusCircle, Trophy, ClipboardList } from "lucide-react";
import { getCurrentUser, createClient, createAdminClient } from "@/lib/supabase-server";
import { BadgesLeaderboardPanel } from "@/components/gamification/BadgesLeaderboardPanel";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { authLogger } from "@/lib/auth-logger";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentProfile {
  name: string | null;
  class_name: string | null;
  roll_number: string | null;
}

interface EnrolledClass {
  id: string;
  name: string;
  subject: string | null;
  teacher_name: string | null;
  class_code: string;
}

interface ModuleData {
  id: string;
  name_en: string;
  icon: string;
  color_gradient: string;
  display_order: number;
  topic_count: number;
}

interface StudentDashboardData {
  profile: StudentProfile;
  classes: EnrolledClass[];
  assessmentCount: number;
  averageScore: number | null;
  streakDays: number;
  modules: ModuleData[];
  moduleProgress: Map<string, number>; // moduleId → % complete (0-100)
}

// ─── Module fetching (cached, uses admin client) ──────────────────────────────

async function fetchModulesFromDB(): Promise<ModuleData[]> {
  const supabase = await createAdminClient();
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_modules_with_counts");
  if (!rpcError && rpcData && rpcData.length > 0) {
    return (rpcData as ModuleData[]).slice(0, 3);
  }
  const { data, error } = await supabase
    .from("modules")
    .select("id, name_en, icon, color_gradient, display_order")
    .eq("is_active", true)
    .order("display_order")
    .limit(3);
  if (error || !data) return [];
  return data.map((m) => ({ ...m, topic_count: 0 })) as ModuleData[];
}

const getModulesFromDB = unstable_cache(fetchModulesFromDB, ["modules-list-dashboard"], {
  revalidate: 3600,
  tags: ["modules"],
});

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getStudentDashboardData(userId: string): Promise<StudentDashboardData> {
  const supabase = await createClient();

  const [profileResult, enrollmentsResult, completedAssessmentsResult, streakResult, modules] =
    await Promise.all([
      supabase
        .from("student_profiles")
        .select("name, class_name, roll_number")
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("enrollments")
        .select("class_id, classes(id, name, subject, class_code, teacher_id)")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),

      supabase
        .from("assessment_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("submitted_at", "is", null),

      supabase
        .from("student_knowledge_state")
        .select("module, mastery_score, last_attempt_at")
        .eq("student_id", userId)
        .order("last_attempt_at", { ascending: false })
        .limit(60),

      getModulesFromDB(),
    ]);

  // Build enrolled classes with teacher names
  const rawEnrollments = enrollmentsResult.data ?? [];
  const teacherIds = rawEnrollments
    .map((e) => {
      const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes;
      return cls?.teacher_id;
    })
    .filter(Boolean) as string[];

  let teacherMap = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from("teacher_profiles")
      .select("user_id, name")
      .in("user_id", teacherIds);
    if (teachers) {
      teacherMap = new Map(teachers.map((t) => [t.user_id, t.name ?? "Teacher"]));
    }
  }

  const classes: EnrolledClass[] = rawEnrollments.map((e) => {
    const cls = (Array.isArray(e.classes) ? e.classes[0] : e.classes) as {
      id: string;
      name: string;
      subject: string | null;
      class_code: string;
      teacher_id: string;
    } | null;
    return {
      id: cls?.id ?? e.class_id,
      name: cls?.name ?? "Class",
      subject: cls?.subject ?? null,
      class_code: cls?.class_code ?? "",
      teacher_name: cls?.teacher_id ? teacherMap.get(cls.teacher_id) ?? null : null,
    };
  });

  // Calculate streak and mastery scores from student_knowledge_state
  const knowledgeRows = streakResult.data ?? [];
  const activityDates = knowledgeRows
    .map((r) => r.last_attempt_at)
    .filter(Boolean)
    .map((d) => new Date(d as string).toDateString());
  const uniqueDates = [...new Set(activityDates)];
  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < uniqueDates.length; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (uniqueDates.includes(check.toDateString())) {
      streakDays++;
    } else {
      break;
    }
  }

  // Build per-module progress (average mastery score → %)
  const moduleScoreMap = new Map<string, number[]>();
  for (const row of knowledgeRows) {
    if (!row.module) continue;
    const arr = moduleScoreMap.get(row.module) ?? [];
    arr.push(row.mastery_score ?? 0);
    moduleScoreMap.set(row.module, arr);
  }
  const moduleProgress = new Map<string, number>();
  for (const [moduleId, scores] of moduleScoreMap.entries()) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    moduleProgress.set(moduleId, Math.round(avg * 100));
  }

  // Average mastery score across all topics (mastery_score is 0–1; convert to 0–100)
  // assessment_sessions has no score column; student_knowledge_state is the canonical source
  const allMasteryScores = knowledgeRows
    .map((r) => r.mastery_score)
    .filter((s): s is number => s != null);
  const averageScore =
    allMasteryScores.length > 0
      ? Math.round((allMasteryScores.reduce((a, b) => a + b, 0) / allMasteryScores.length) * 100)
      : null;

  return {
    profile: {
      name: profileResult.data?.name ?? null,
      class_name: profileResult.data?.class_name ?? null,
      roll_number: profileResult.data?.roll_number ?? null,
    },
    classes,
    assessmentCount: completedAssessmentsResult.count ?? 0,
    averageScore,
    streakDays,
    modules,
    moduleProgress,
  };
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function StudentDashboardPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (err) {
    authLogger.error("[StudentDashboard] Auth error", err);
    redirect("/student/start");
  }

  if (!user) redirect("/student/start");
  if (isTeacherOrHigher(user.app_metadata?.role)) redirect("/app/teacher/dashboard");

  const data = await getStudentDashboardData(user.id);
  const { profile, classes, assessmentCount, averageScore, streakDays, modules, moduleProgress } =
    data;

  const displayName = profile.name ?? user.email?.split("@")[0] ?? "Student";
  const bannerStyle = { background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" };

  const stats = [
    { icon: "👥", value: classes.length, label: "Classes", href: "/app/student/classes" },
    { icon: "📝", value: assessmentCount, label: "Assessments", href: "/app/student/assessments" },
    { icon: "🎯", value: averageScore === null ? "--" : `${averageScore}%`, label: "Avg Score", href: "/app/progress" },
    { icon: "🔥", value: streakDays, label: "Day Streak", href: "/app/learn" },
  ];

  // Quick Actions: must NOT duplicate bottom nav (Home / Learn / AI Tutor / Profile)
  const quickActions = [
    {
      href: "/join",
      icon: <PlusCircle className="w-6 h-6 text-orange-500" />,
      bg: "bg-orange-50",
      label: "Join Class",
    },
    {
      href: "/app/student/assessments",
      icon: <Trophy className="w-6 h-6 text-amber-500" />,
      bg: "bg-amber-50",
      label: "Assessments",
    },
    {
      href: "/app/student/classes",
      icon: <Users className="w-6 h-6 text-green-500" />,
      bg: "bg-green-50",
      label: "My Classes",
    },
    {
      href: "/app/assessment/start",
      icon: <ClipboardList className="w-6 h-6 text-purple-500" />,
      bg: "bg-purple-50",
      label: "Take Test",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ── Orange Banner ── */}
        <div className="rounded-[32px] p-6 text-white" style={bannerStyle}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
              🧑‍🎓
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black mb-1 truncate">
                Welcome, {displayName}!
              </h1>
              {(profile.class_name ?? profile.roll_number) && (
                <p className="text-white/80 text-xs font-black uppercase tracking-widest">
                  {[
                    profile.class_name,
                    profile.roll_number ? `Roll No. ${profile.roll_number}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <div className="bg-white/20 px-4 py-2 rounded-2xl flex items-center gap-2 backdrop-blur-md w-fit">
              <Flame size={14} className="text-yellow-200 fill-yellow-200" />
              <span className="text-xs font-black">{streakDays} Day Streak</span>
            </div>
            {assessmentCount > 0 && (
              <div className="bg-white/20 px-4 py-2 rounded-2xl flex items-center gap-2 backdrop-blur-md w-fit">
                <span className="text-xs font-black">⭐ {assessmentCount} Assessments Done</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stat Cards (clickable) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center gap-1 hover:shadow-md transition-shadow active:scale-95"
            >
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {stat.icon}
              </div>
              <p className="text-xl font-black text-slate-800 leading-none">{stat.value}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                {stat.label}
              </p>
            </Link>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow active:scale-95"
            >
              <div className={`w-11 h-11 ${action.bg} rounded-xl flex items-center justify-center`}>
                {action.icon}
              </div>
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider text-center leading-tight">
                {action.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Badges & Leaderboard ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-800 text-base">🏅 Badges & Rankings</h2>
            <Link
              href="/app/progress"
              className="text-xs font-black text-slate-400 hover:text-orange-500 transition-colors"
            >
              See All
            </Link>
          </div>
          <BadgesLeaderboardPanel
            currentUserId={user.id}
            classId={classes[0]?.id ?? null}
          />
        </div>

        {/* ── Continue Learning (Module Cards) ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-800 text-base flex items-center gap-2">
              <BookOpen size={16} className="text-orange-400" /> Continue Learning
            </h2>
            <Link
              href="/app/learn"
              className="text-xs font-black text-slate-400 hover:text-orange-500 transition-colors"
            >
              See All
            </Link>
          </div>
          {modules.length > 0 ? (
            <div className="space-y-3">
              {modules.map((mod) => {
                const progress = moduleProgress.get(mod.id) ?? 0;
                const topicCount = Number(mod.topic_count) || 10;
                return (
                  <Link key={mod.id} href={`/app/learn/${mod.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors -mx-1 px-2">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: mod.color_gradient || "linear-gradient(135deg,#F98819,#FFD166)" }}
                      >
                        {mod.icon || "📚"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-sm truncate">{mod.name_en}</p>
                        <p className="text-[11px] font-bold text-slate-400 mb-1">
                          {topicCount} topics
                        </p>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                              background: "linear-gradient(90deg,#F98819,#FFD166)",
                            }}
                          />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{progress}% complete</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Link href="/app/learn" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={bannerStyle}>
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-sm">Start Learning</p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Explore all modules</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}
