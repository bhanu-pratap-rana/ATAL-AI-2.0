"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { authLogger } from "@/lib/auth-logger";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import {
  getDashboardStats,
  type DashboardStats,
} from "@/app/actions/dashboard-stats";
import { SyncStatusIndicator } from "@/components/offline/SyncStatusIndicator";
import { BadgesDisplay } from "@/components/gamification/BadgesDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Animation variants
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

// Feature card data
const getFeatureCards = (isTeacher: boolean) => [
  {
    title: "Curriculum",
    description:
      "Access digital literacy curriculum and educational resources.",
    emoji: "📚",
    href: "/app/curriculum",
  },
  {
    title: "Classes",
    description: "Manage your classes and student enrollments.",
    emoji: "👥",
    href: isTeacher ? "/app/teacher/classes" : "/app/student/classes",
  },
  {
    title: "Progress",
    description: "Track student progress and performance metrics.",
    emoji: "📊",
    href: "/app/progress",
  },
  {
    title: "AI Tools",
    description: "Leverage AI-powered tools for personalized learning.",
    emoji: "🤖",
    href: "/app/ai-tools",
  },
  {
    title: "Assessments",
    description: "Create and manage assessments and quizzes.",
    emoji: "📝",
    href: isTeacher ? "/app/teacher/assessments" : "/app/student/assessments",
  },
  {
    title: "Profile",
    description: "View and manage your profile information.",
    emoji: "👤",
    href: "/app/settings",
  },
];

// Stat Card Component
function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl p-5 shadow-[var(--shadow-md)] border border-border-light flex items-center gap-4"
    >
      <div className="w-12 h-12 bg-primary-lightest rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-sm text-text-secondary">{label}</p>
      </div>
    </motion.div>
  );
}

// Feature Card Component
function FeatureCard({
  title,
  description,
  emoji,
  onClick,
}: {
  title: string;
  description: string;
  emoji: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: "var(--shadow-primary)" }}
      className="p-[3px] rounded-2xl bg-gradient-primary shadow-[var(--shadow-primary-sm)] cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-white rounded-xl p-5 h-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary-lightest rounded-lg flex items-center justify-center text-xl">
            {emoji}
          </div>
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const supabase = createClient();

  // Check app_metadata.role (set during teacher registration via admin API)
  // This is reliable as it's set server-side and cannot be modified by client
  const appRole = user?.app_metadata?.role;
  const isTeacherOrAdmin = isTeacherOrHigher(appRole);

  // Use profile name if available, otherwise fall back to user metadata or email
  const userName =
    profileName ||
    user?.user_metadata?.full_name ||
    user?.app_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  useEffect(() => {
    async function getUserAndProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const role = user.app_metadata?.role;
        // Check for teacher, admin, AND super_admin roles
        const isTeacher = isTeacherOrHigher(role);

        if (isTeacher) {
          // Fetch teacher profile name
          const { data: teacherProfile } = await supabase
            .from("teacher_profiles")
            .select("name")
            .eq("user_id", user.id)
            .maybeSingle();

          if (teacherProfile?.name) {
            setProfileName(teacherProfile.name);
          }
        } else {
          // Fetch student profile name
          const { data: studentProfile } = await supabase
            .from("student_profiles")
            .select("name")
            .eq("user_id", user.id)
            .maybeSingle();

          if (studentProfile?.name) {
            setProfileName(studentProfile.name);
          }
        }

        // Fetch real dashboard stats
        const statsResult = await getDashboardStats();
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
      }

      setLoading(false);
    }
    getUserAndProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      router.refresh();
      router.push("/student/start");
    } catch (error) {
      authLogger.error("[Dashboard] Sign out failed", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  const featureCards = getFeatureCards(isTeacherOrAdmin);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-border-light sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0">
                <Image
                  src="/assets/logo.png"
                  alt="ATAL AI Logo"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain rounded-full"
                  style={{
                    boxShadow: `
                      0 0 0 2px white,
                      0 0 0 3px var(--color-primary),
                      0 2px 8px var(--shadow-primary-sm)
                    `,
                  }}
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-text-primary">
                  ATAL AI Tutorial
                </h1>
                <p className="text-xs md:text-sm text-text-secondary">
                  Smart Learning Platform
                </p>
              </div>
            </div>

            {/* Sync Status & Sign Out */}
            <div className="flex items-center gap-2">
              <SyncStatusIndicator compact />
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Welcome Banner */}
          <motion.div
            variants={itemVariants}
            className="gradient-primary rounded-2xl p-6 md:p-8 mb-8 shadow-[var(--shadow-primary)]"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-1 text-white drop-shadow-sm">
                  {isTeacherOrAdmin
                    ? `Welcome, ${userName}!`
                    : `Hello, ${userName}!`}
                </h2>
                <p className="text-sm md:text-base text-white/90">
                  {isTeacherOrAdmin
                    ? "Manage your classes and track student progress from your dashboard."
                    : "Explore your classes and start your learning journey."}
                </p>
              </div>
              {isTeacherOrAdmin && (
                <Button
                  onClick={() => router.push("/app/teacher/classes")}
                  variant="secondary"
                  className="bg-white text-primary hover:bg-surface shrink-0"
                >
                  Create Class
                </Button>
              )}
            </div>
          </motion.div>

          {/* Stats Grid - Real Data with Empty States */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon="📚"
              value={stats?.classesCount ?? 0}
              label={isTeacherOrAdmin ? "Classes Created" : "Classes Joined"}
            />
            <StatCard
              icon="📝"
              value={stats?.assessmentsCount ?? 0}
              label="Assessments"
            />
            <StatCard
              icon="🎯"
              value={
                stats?.averageScore != null ? `${stats.averageScore}%` : "--"
              }
              label="Avg Score"
            />
            <StatCard
              icon="🔥"
              value={stats?.streakDays ?? 0}
              label="Day Streak"
            />
          </div>

          {/* Empty State Message for New Users */}
          {stats &&
            stats.classesCount === 0 &&
            stats.assessmentsCount === 0 && (
              <motion.div
                variants={itemVariants}
                className="bg-info-light border border-info/30 rounded-xl p-6 mb-8 text-center"
              >
                <p className="text-lg font-medium text-info-dark mb-2">
                  {isTeacherOrAdmin
                    ? "🎉 Welcome! Let's get started"
                    : "👋 Welcome to ATAL AI!"}
                </p>
                <p className="text-sm text-text-secondary mb-4">
                  {isTeacherOrAdmin
                    ? "Create your first class to start inviting students and tracking their progress."
                    : "Join a class or take an assessment to begin your learning journey."}
                </p>
                <Button
                  onClick={() =>
                    router.push(
                      isTeacherOrAdmin
                        ? "/app/teacher/classes"
                        : "/app/assessment/start",
                    )
                  }
                  variant="default"
                >
                  {isTeacherOrAdmin
                    ? "Create Your First Class"
                    : "Start an Assessment"}
                </Button>
              </motion.div>
            )}

          {/* Gamification Section - Badges */}
          {!isTeacherOrAdmin && user && (
            <motion.div variants={itemVariants} className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🏆 Your Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BadgesDisplay
                    studentId={user.id}
                    language="en"
                    showAll={true}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Feature Cards Grid */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {featureCards.map((card) => (
                <FeatureCard
                  key={card.title}
                  title={card.title}
                  description={card.description}
                  emoji={card.emoji}
                  onClick={() => router.push(card.href)}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
