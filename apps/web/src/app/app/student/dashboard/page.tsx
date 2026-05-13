/**
 * Student Dashboard - Dedicated Page
 *
 * Server-rendered student home matching the teacher dashboard's richness.
 * Shows: orange banner with profile info + streak, stat cards,
 * quick actions, module cards with progress, and enrolled classes.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  PlusCircle,
  Trophy,
  ClipboardList,
  ClipboardCheck,
  Flame,
  Star,
  Award,
} from "lucide-react";
import { getCurrentUser, createClient } from "@/lib/supabase-server";
import { BadgesLeaderboardPanel } from "@/components/gamification/BadgesLeaderboardPanel";
import { AverageScore, AverageScoreSkeleton } from "@/components/student/AverageScore";
import {
  ChunkCard,
  Mascot,
  RainbowRing,
  StreakFlame,
} from "@/components/system";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { authLogger } from "@/lib/auth-logger";
import {
  ContinueLearningSection,
  ContinueLearningSkeleton,
} from "./ContinueLearningSection";

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

interface StudentDashboardData {
  profile: StudentProfile;
  classes: EnrolledClass[];
  assessmentCount: number;
  streakDays: number;
}

// ─── Data fetching ────────────────────────────────────────────────────────────
//
// SP9 T9.1: above-fold data only. Module list + per-module progress used
// to fetch in the same Promise.all and held up the banner LCP for ~50ms.
// They are now in <ContinueLearningSection /> behind a Suspense boundary.

async function getStudentDashboardData(userId: string): Promise<StudentDashboardData> {
  const supabase = await createClient();

  const [
    profileResult,
    enrollmentsResult,
    completedAssessmentsResult,
    streakResult,
    tutorInteractionsResult,
    assessmentActivityResult,
  ] = await Promise.all([
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
        .select("last_attempt_at")
        .eq("student_id", userId)
        .order("last_attempt_at", { ascending: false })
        .limit(60),

      // Streak: include AI Tutor activity (aligned with /learn page streak logic)
      supabase
        .from("ai_tutor_interactions")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),

      // Streak: include Assessment session activity (aligned with /learn page streak logic)
      supabase
        .from("assessment_sessions")
        .select("started_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(60),
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

  // Calculate streak from all activity sources (lessons + AI tutor + assessments)
  // Aligned with /learn page streak logic to avoid under-counting
  const knowledgeRows = streakResult.data ?? [];
  const activityDates = [
    ...knowledgeRows.map((r) => r.last_attempt_at),
    ...(tutorInteractionsResult.data ?? []).map((r) => r.created_at),
    ...(assessmentActivityResult.data ?? []).map((r) => r.started_at),
  ]
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

  return {
    profile: {
      name: profileResult.data?.name ?? null,
      class_name: profileResult.data?.class_name ?? null,
      roll_number: profileResult.data?.roll_number ?? null,
    },
    classes,
    assessmentCount: completedAssessmentsResult.count ?? 0,
    streakDays,
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
  const { profile, classes, assessmentCount, streakDays } = data;

  const displayName = profile.name ?? user.email?.split("@")[0] ?? "Student";
  const bannerStyle = { background: "var(--gradient-primary)" };

  // Lucide icons replace emoji glyphs for a production-grade look.
  // Per-card color hints map to the rotating bento tint of the tile
  // background so the icon and tile sing the same note.
  const statCards = [
    {
      icon: <Users className="w-6 h-6 text-(--bento-orange-d)" strokeWidth={2.25} aria-hidden="true" />,
      value: classes.length,
      label: "Classes",
      href: "/app/student/classes",
    },
    {
      icon: <ClipboardCheck className="w-6 h-6 text-(--bento-purple-d)" strokeWidth={2.25} aria-hidden="true" />,
      value: assessmentCount,
      label: "Assessments",
      href: "/app/student/assessments",
    },
    {
      icon: <Flame className="w-6 h-6 text-orange-600" strokeWidth={2.25} aria-hidden="true" />,
      value: streakDays,
      label: "Day Streak",
      href: "/app/learn",
    },
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
    <div className="min-h-screen p-4 md:p-6 pb-28 relative overflow-hidden [background:var(--bento-bg)]">
      {/* Decorative pastel blobs — pure decoration, behind content */}
      <div
        className="bento-blob -top-20 -left-20 w-96 h-96"
        style={{ background: "var(--bento-yellow)" }}
        aria-hidden="true"
      />
      <div
        className="bento-blob top-1/2 -right-20 w-80 h-80"
        style={{ background: "var(--bento-purple)" }}
        aria-hidden="true"
      />

      <div className="relative max-w-4xl mx-auto space-y-4">

        {/* ── Welcome Banner (chunky orange) ── */}
        <ChunkCard size="lg" className="text-white border-white! relative overflow-hidden" style={bannerStyle}>
          <div className="flex items-start gap-4">
            {/* Mascot framed by rainbow ring — ties to logo headphones.
                Bobs gently on idle; respects prefers-reduced-motion via
                MotionConfigProvider. */}
            <RainbowRing>
              <Mascot size="sm" animate="bob" priority />
            </RainbowRing>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black mb-1 truncate leading-tight">
                Hi, {displayName}! <span className="inline-block animate-bento-wiggle">👋</span>
              </h1>
              {(profile.class_name ?? profile.roll_number) && (
                <p className="text-white/85 text-xs font-black uppercase tracking-widest">
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
            <StreakFlame days={streakDays} onDark />
            {assessmentCount > 0 && (
              <div className="bg-white/25 px-4 py-2 rounded-2xl flex items-center gap-2 backdrop-blur-md w-fit border-2 border-white/30">
                <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" strokeWidth={2.25} aria-hidden="true" />
                <span className="text-xs font-black">{assessmentCount} Assessments Done</span>
              </div>
            )}
          </div>
        </ChunkCard>

        {/* ── Stat Cards (clickable, chunky bento tiles) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((stat, i) => {
            // Rotate through bento tints so the grid has visual variety.
            const tints = ["orange", "purple", "yellow"] as const;
            const tint = tints[i % tints.length];
            return (
              <Link
                key={stat.label}
                href={stat.href}
                prefetch={false}
                className="chunk-card-sm border-4 border-white p-4 flex flex-col items-center text-center gap-1 active:translate-y-1 transition-transform"
                style={{ background: `var(--bento-tint-${tint})` }}
              >
                <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                  {stat.icon}
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</p>
                <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider leading-tight">
                  {stat.label}
                </p>
              </Link>
            );
          })}
          {/* Avg Score streams independently — doesn't block the rest of the stat grid */}
          <Suspense fallback={<AverageScoreSkeleton />}>
            <AverageScore userId={user.id} />
          </Suspense>
        </div>

        {/* ── Quick Actions (bento grid) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              prefetch={false}
              className="chunk-card-sm border-4 border-white flex flex-col items-center gap-2 p-3 active:translate-y-1 transition-transform"
            >
              <div className={`w-12 h-12 ${action.bg} rounded-2xl flex items-center justify-center border-2 border-white shadow-sm`}>
                {action.icon}
              </div>
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider text-center leading-tight">
                {action.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Badges & Leaderboard ── */}
        <ChunkCard size="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-[#C9A227]" strokeWidth={2.25} aria-hidden="true" />
              <span>Badges & Rankings</span>
            </h2>
            <Link
              href="/app/progress"
              prefetch={false}
              className="text-xs font-black text-slate-500 hover:text-(--bento-orange) transition-colors"
            >
              See All →
            </Link>
          </div>
          <BadgesLeaderboardPanel
            currentUserId={user.id}
            classId={classes[0]?.id ?? null}
          />
        </ChunkCard>

        {/* ── Continue Learning (streams independently) ── */}
        <Suspense fallback={<ContinueLearningSkeleton />}>
          <ContinueLearningSection userId={user.id} />
        </Suspense>

      </div>
    </div>
  );
}
