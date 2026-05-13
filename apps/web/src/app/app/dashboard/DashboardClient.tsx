"use client";

import { useEffect, useState, memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import type { User } from "@supabase/supabase-js";
import { Flame, ChevronRight, BookOpen } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  getDashboardStats,
  type DashboardStats,
} from "@/app/actions/dashboard-stats";
import { getAssessmentStatus } from "@/app/actions/assessment";
import { PreAssessmentPrompt } from "@/components/assessment/PreAssessmentPrompt";
import { PostAssessmentPrompt } from "@/components/assessment/PostAssessmentPrompt";
import { useLanguage } from "@/lib/i18n";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function getUserDisplayName(
  profileName: string | null,
  user: User | null,
): string {
  return (
    profileName ||
    user?.user_metadata?.full_name ||
    user?.app_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User"
  );
}

interface WelcomeMessages {
  readonly greeting: string;
  readonly description: string;
}

function getWelcomeMessages(
  isTeacherOrAdmin: boolean,
  userName: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): WelcomeMessages {
  if (isTeacherOrAdmin) {
    return {
      greeting: t("dashboard.welcome", { name: userName }),
      description: t("dashboard.welcomeTeacher"),
    };
  }

  return {
    greeting: t("dashboard.welcome", { name: userName }),
    description: t("dashboard.welcomeStudent"),
  };
}

const getFeatureCards = (
  isTeacher: boolean,
  t: (key: string) => string
) => isTeacher ? [
  {
    title: t("nav.learn"),
    description: t("dashboard.featureLearnDesc"),
    emoji: "📖",
    href: "/app/learn",
  },
  {
    title: t("nav.classes"),
    description: t("dashboard.featureClassesDesc"),
    emoji: "👥",
    href: "/app/teacher/classes",
  },
  {
    title: t("dashboard.featureProgress"),
    description: t("dashboard.featureProgressDesc"),
    emoji: "📊",
    href: "/app/progress",
  },
  {
    title: t("dashboard.featureAiTools"),
    description: t("dashboard.featureAiToolsDesc"),
    emoji: "🤖",
    href: "/app/ai-tools",
  },
  {
    title: t("nav.assessments"),
    description: t("dashboard.featureAssessmentsDesc"),
    emoji: "📝",
    href: "/app/teacher/assessments",
  },
  {
    title: t("nav.profile"),
    description: t("dashboard.featureProfileDesc"),
    emoji: "👤",
    href: "/app/settings",
  },
] : [
  {
    title: t("nav.classes"),
    description: t("dashboard.featureClassesDesc"),
    emoji: "👥",
    href: "/app/student/classes",
  },
  {
    title: t("dashboard.featureProgress"),
    description: t("dashboard.featureProgressDesc"),
    emoji: "📊",
    href: "/app/progress",
  },
  {
    title: t("nav.profile"),
    description: t("dashboard.featureProfileDesc"),
    emoji: "👤",
    href: "/app/settings",
  },
];

const StatCard = memo(function StatCard({
  icon,
  value,
  label,
}: Readonly<{
  icon: string;
  value: string | number;
  label: string;
}>) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center gap-1"
    >
      <div className="w-10 h-10 bg-primary-lightest rounded-xl flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>
      <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</p>
    </motion.div>
  );
});

const FeatureCard = memo(function FeatureCard({
  title,
  description,
  emoji,
  href,
}: Readonly<{
  title: string;
  description: string;
  emoji: string;
  href: string;
}>) {
  return (
    <Link href={href} prefetch={true}>
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
        className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5 h-full cursor-pointer"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center text-xl shrink-0">
            {emoji}
          </div>
          <h3 className="text-base font-black text-slate-800">{title}</h3>
        </div>
        <p className="text-xs font-bold text-slate-400 leading-relaxed">
          {description}
        </p>
      </motion.div>
    </Link>
  );
});

export function DashboardClient() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [rollNumber, setRollNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showPrePrompt, setShowPrePrompt] = useState(false);
  const [showPostPrompt, setShowPostPrompt] = useState(false);
  const supabase = createClient();

  const appRole = user?.app_metadata?.role;
  const isTeacherOrAdmin = isTeacherOrHigher(appRole);

  const userName = getUserDisplayName(profileName, user);

  useEffect(() => {
    async function getUserAndProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await loadUserData(user);
      }

      setLoading(false);
    }

    async function loadUserData(user: User) {
      const role = user.app_metadata?.role;
      const isTeacher = isTeacherOrHigher(role);

      const profilePromise = isTeacher
        ? supabase.from("teacher_profiles").select("name").eq("user_id", user.id).maybeSingle()
        : supabase.from("student_profiles").select("name, class_name, roll_number").eq("user_id", user.id).maybeSingle();

      const assessmentStatusPromise = isTeacher
        ? Promise.resolve({ success: false } as const)
        : getAssessmentStatus();

      const [profileResult, statsResult, assessmentStatusResult] = await Promise.all([
        profilePromise,
        getDashboardStats(),
        assessmentStatusPromise,
      ]);

      applyProfileData(profileResult.data, isTeacher);
      if (statsResult.success && statsResult.data) setStats(statsResult.data);
      if (!isTeacher) applyAssessmentPrompts(assessmentStatusResult);
    }

    function applyProfileData(data: Record<string, unknown> | null, isTeacher: boolean) {
      if (!data) return;
      if (data.name) setProfileName(data.name as string);
      if (!isTeacher) {
        if (data.class_name) setStudentClass(data.class_name as string);
        if (data.roll_number) setRollNumber(data.roll_number as string);
      }
    }

    function applyAssessmentPrompts(result: { success: boolean; data?: { hasPreAssessment: boolean; curriculumCompleted: boolean; hasPostAssessment: boolean } }) {
      if (!result.success || !result.data) return;
      const status = result.data;
      if (!status.hasPreAssessment && !localStorage.getItem("dismissed_pre_assessment")) setShowPrePrompt(true);
      if (status.curriculumCompleted && !status.hasPostAssessment && !localStorage.getItem("dismissed_post_assessment")) setShowPostPrompt(true);
    }

    getUserAndProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const featureCards = useMemo(
    () => getFeatureCards(isTeacherOrAdmin, t),
    [isTeacherOrAdmin, t]
  );

  if (loading) {
    return (
      <LoadingSpinner message={t("common.loading")} size="lg" fullPage />
    );
  }

  const welcomeMessages = getWelcomeMessages(isTeacherOrAdmin, userName, t);
  const bannerStyle = isTeacherOrAdmin
    ? { background: "var(--gradient-teacher)" }
    : { background: "var(--gradient-primary)" };

  return (
    <div className="min-h-screen [background:var(--bento-bg)]">
      <div className="p-4 md:p-6 pb-28">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-4"
      >
        {/* Welcome Banner */}
        <motion.div
          variants={itemVariants}
          className="rounded-[32px] p-6 text-white"
          style={bannerStyle}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
              {isTeacherOrAdmin ? "👩‍🏫" : "🧑‍🎓"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black mb-1 truncate">{welcomeMessages.greeting}</h2>
              {!isTeacherOrAdmin && (studentClass ?? rollNumber) && (
                <p className="text-white/80 text-sm font-bold">
                  {[studentClass, rollNumber ? `Roll No. ${rollNumber}` : null].filter(Boolean).join(" • ")}
                </p>
              )}
              {isTeacherOrAdmin && (
                <p className="text-white/80 text-sm font-bold">{welcomeMessages.description}</p>
              )}
              {!isTeacherOrAdmin && stats?.streakDays != null && stats.streakDays > 0 && (
                <div className="flex items-center gap-1.5 mt-3 bg-white/20 rounded-full px-3 py-1 w-fit">
                  <Flame size={14} className="text-yellow-300 fill-yellow-300" />
                  <span className="text-xs font-black">{stats.streakDays} {t("dashboard.dayStreak")}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Grid — 2-col for students, 4-col for teachers */}
        {isTeacherOrAdmin ? (
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📚" value={stats?.classesCount ?? 0} label={t("dashboard.classesCreated")} />
            <StatCard icon="📝" value={stats?.assessmentsCount ?? 0} label={t("dashboard.assessments")} />
            <StatCard icon="🎯" value={stats?.averageScore == null ? "--" : `${stats.averageScore}%`} label={t("dashboard.avgScore")} />
            <StatCard icon="🔥" value={stats?.streakDays ?? 0} label={t("dashboard.dayStreak")} />
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
            <StatCard icon="🎯" value={stats?.averageScore == null ? "--" : `${stats.averageScore}%`} label={t("dashboard.avgScore")} />
            <StatCard icon="🔥" value={stats?.streakDays ?? 0} label={t("dashboard.dayStreak")} />
          </motion.div>
        )}

        {/* Empty State for New Users */}
        {stats?.classesCount === 0 && stats?.assessmentsCount === 0 && (
          <motion.div
            variants={itemVariants}
            className="bg-orange-50 border border-orange-100 rounded-3xl p-6 text-center"
          >
            <p className="font-black text-slate-800 text-lg mb-1">
              {isTeacherOrAdmin ? t("dashboard.welcomeEmoji") : t("dashboard.welcomeStudentEmoji")}
            </p>
            <p className="font-bold text-slate-400 text-sm mb-4">
              {isTeacherOrAdmin ? t("dashboard.getStartedTeacher") : t("dashboard.getStartedStudent")}
            </p>
            <Button
              type="button"
              onClick={() => router.push(isTeacherOrAdmin ? "/app/teacher/classes" : "/app/assessment/start?type=pre")}
              className="font-black"
              style={bannerStyle}
            >
              {isTeacherOrAdmin ? t("dashboard.createFirstClass") : t("dashboard.startAssessment")}
            </Button>
          </motion.div>
        )}

        {/* Continue Learning Section - students only */}
        {!isTeacherOrAdmin && (
          <motion.div variants={itemVariants}>
            <Link href="/app/learn" prefetch={true}>
              <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-base">Continue Learning</h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">Pick up where you left off</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
              </div>
            </Link>
          </motion.div>
        )}

        {/* Quick Actions - teachers only (students navigate via bottom nav) */}
        {isTeacherOrAdmin && (
          <motion.div variants={itemVariants}>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              {t("dashboard.quickActions")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featureCards.map((card) => (
                <FeatureCard
                  key={card.title}
                  title={card.title}
                  description={card.description}
                  emoji={card.emoji}
                  href={card.href}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
      </div>

      {/* Pre/Post Assessment Prompt Modals (students only) */}
      {!isTeacherOrAdmin && (
        <>
          <PreAssessmentPrompt
            open={showPrePrompt}
            onDismiss={() => {
              setShowPrePrompt(false);
              localStorage.setItem("dismissed_pre_assessment", "true");
            }}
          />
          <PostAssessmentPrompt
            open={showPostPrompt}
            onDismiss={() => {
              setShowPostPrompt(false);
              localStorage.setItem("dismissed_post_assessment", "true");
            }}
          />
        </>
      )}
    </div>
  );
}
