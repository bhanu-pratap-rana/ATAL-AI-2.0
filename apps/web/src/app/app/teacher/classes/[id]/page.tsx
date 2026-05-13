import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, Bot, BookOpen, Users } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { InviteStudentDialog } from "@/components/teacher/InviteStudentDialog";
import { RosterTable } from "@/components/teacher/RosterTable";
import { InvitePanel } from "@/components/teacher/InvitePanel";
import { AnalyticsTiles } from "@/components/teacher/AnalyticsTiles";
import { StudentProgressGrid } from "@/components/teacher/StudentProgressGrid";
import { AIInteractionsLog } from "@/components/teacher/AIInteractionsLog";
import { CommunicationSection } from "@/components/teacher/communication";
import {
  getClassAnalytics,
  getClassAnnouncements,
  getClassMaterials,
  type Announcement,
  type Material,
} from "@/app/actions/teacher";

interface StudentInfo {
  user_id: string;
  name: string | null;
  phone: string | null;
  roll_number: string | null;
  class_name: string | null;
}

interface EnrollmentRow {
  id: string;
  created_at: string;
  student_id: string;
}

interface Enrollment extends EnrollmentRow {
  student: StudentInfo | null;
}

interface RosterRow {
  enrollment_id: string;
  student_id: string;
  student_name: string | null;
  student_phone: string | null;
  roll_number: string | null;
  class_name: string | null;
  enrolled_at: string;
}

interface ClassWithRoster {
  class: {
    id: string;
    name: string;
    class_code: string;
    teacher_id: string;
    created_at: string;
    join_pin?: string;
    [key: string]: unknown;
  };
  enrollments: Enrollment[];
}

async function getClassWithRoster(
  classId: string,
  userId: string,
): Promise<ClassWithRoster | null> {
  try {
    const supabase = await createClient();

    // Fetch class details - use .maybeSingle() since class may not exist
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, name, class_code, teacher_id, created_at, join_pin")
      .eq("id", classId)
      .eq("teacher_id", userId)
      .maybeSingle();

    if (classError) {
      authLogger.error("[getClassWithRoster] Error fetching class", classError);
      return null;
    }

    if (!classData) {
      return null;
    }

    // Use SECURITY DEFINER function to get roster with student profiles
    // This bypasses RLS restrictions that would otherwise block teacher access to student_profiles
    const { data: rosterData, error: rosterError } = await supabase.rpc(
      "get_class_roster",
      { p_class_id: classId },
    );

    if (rosterError) {
      authLogger.error(
        "[getClassWithRoster] Error fetching roster via RPC",
        rosterError,
      );

      // Fallback to direct query if RPC fails (e.g., function not yet deployed)
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("id, created_at, student_id")
        .eq("class_id", classId);

      if (enrollmentsError) {
        authLogger.error(
          "[getClassWithRoster] Fallback error fetching enrollments",
          enrollmentsError,
        );
        return { class: classData, enrollments: [] };
      }

      // Try to get student profiles (may fail due to RLS)
      let enrollmentsWithStudents: Enrollment[] = [];
      if ((enrollmentsData?.length ?? 0) > 0) {
        const studentIds = enrollmentsData.map(
          (e: EnrollmentRow) => e.student_id,
        );
        const { data: students } = await supabase
          .from("student_profiles")
          .select("user_id, name, phone, roll_number, class_name")
          .in("user_id", studentIds);

        const studentMap = new Map(
          (students || []).map((s: StudentInfo) => [s.user_id, s]),
        );
        enrollmentsWithStudents = enrollmentsData.map((enrollment) => ({
          ...enrollment,
          student: studentMap.get(enrollment.student_id) || null,
        }));
      }

      return { class: classData, enrollments: enrollmentsWithStudents };
    }

    // Transform RPC result to Enrollment format
    const enrollmentsWithStudents: Enrollment[] = (rosterData || []).map(
      (row: RosterRow) => ({
        id: row.enrollment_id,
        created_at: row.enrolled_at,
        student_id: row.student_id,
        student: {
          user_id: row.student_id,
          name: row.student_name,
          phone: row.student_phone,
          roll_number: row.roll_number,
          class_name: row.class_name,
        },
      }),
    );

    return {
      class: classData,
      enrollments: enrollmentsWithStudents,
    };
  } catch (error) {
    authLogger.error("[getClassWithRoster] Unexpected error", error);
    return null;
  }
}

export default async function ClassDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/teacher/start");
  }

  // All four fetches are independent of each other — run in parallel
  const [data, analyticsResult, announcementsResult, materialsResult] =
    await Promise.all([
      getClassWithRoster(id, user.id),
      getClassAnalytics(id),
      getClassAnnouncements(id),
      getClassMaterials(id),
    ]);

  if (!data) {
    redirect("/app/teacher/classes");
  }

  const { class: classData, enrollments } = data;

  const analytics: {
    activeThisWeek: number;
    avgMinutesPerDay: number;
    atRiskCount: number;
  } = analyticsResult.success
    ? (analyticsResult.data as {
        activeThisWeek: number;
        avgMinutesPerDay: number;
        atRiskCount: number;
      })
    : {
        activeThisWeek: 0,
        avgMinutesPerDay: 0,
        atRiskCount: 0,
      };
  const announcements: Announcement[] = announcementsResult.success
    ? (announcementsResult.data as Announcement[])
    : [];
  const materials: Material[] = materialsResult.success
    ? (materialsResult.data as Material[])
    : [];

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "var(--gradient-teacher)" }}>
          <Link href="/app/teacher/classes" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Classes
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black mb-1 flex items-center gap-2">
                <BookOpen className="w-6 h-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                <span className="truncate">{classData.name}</span>
              </h1>
              <p className="text-white/80 text-sm font-bold">
                {enrollments.length} {enrollments.length === 1 ? "student" : "students"} enrolled
              </p>
            </div>
            <InviteStudentDialog classId={id} />
          </div>
        </div>

        {/* Analytics Tiles */}
        {enrollments.length > 0 && (
          <AnalyticsTiles
            activeThisWeek={analytics?.activeThisWeek || 0}
            avgMinutesPerDay={analytics?.avgMinutesPerDay || 0}
            atRiskCount={analytics?.atRiskCount || 0}
          />
        )}

        {/* Invite Panel with QR Code */}
        <InvitePanel
          classCode={classData.class_code}
          joinPin={classData.join_pin || ""}
          className={classData.name}
        />

        {/* Real-time Student Progress Grid */}
        {enrollments.length > 0 && (
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6">
            <h2 className="font-black text-slate-800 text-lg mb-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-(--bento-sky-d)" strokeWidth={2.25} aria-hidden="true" /> Real-time Student Progress
            </h2>
            <p className="text-xs font-bold text-slate-400 mb-4">Live view of student learning progress and at-risk indicators</p>
            <StudentProgressGrid classId={id} />
          </div>
        )}

        {/* AI Tutor Interactions Log */}
        {enrollments.length > 0 && (
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6">
            <h2 className="font-black text-slate-800 text-lg mb-1 flex items-center gap-2">
              <Bot className="w-5 h-5 text-(--bento-purple-d)" strokeWidth={2.25} aria-hidden="true" /> AI Tutor Activity
            </h2>
            <p className="text-xs font-bold text-slate-400 mb-4">Recent AI tutor conversations from your students</p>
            <AIInteractionsLog classId={id} limit={15} />
          </div>
        )}

        {/* Teacher Communication: Announcements & Materials */}
        <CommunicationSection
          classId={id}
          announcements={announcements}
          materials={materials}
        />

        {/* Roster */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6">
          <h2 className="font-black text-slate-800 text-lg mb-1">Class Roster</h2>
          <p className="text-xs font-bold text-slate-400 mb-4">View and manage students enrolled in this class</p>
          {enrollments.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto mb-4 w-16 h-16 rounded-3xl bg-(--bento-tint-sky) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-sky-d)">
                <Users className="w-8 h-8" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <h3 className="font-black text-slate-800 text-lg mb-2">No students enrolled yet</h3>
              <p className="font-bold text-slate-400 text-sm">Use the Invite Student button above or share the class details</p>
            </div>
          ) : (
            <RosterTable enrollments={enrollments} classId={id} />
          )}
        </div>
      </div>
    </div>
  );
}
