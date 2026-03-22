import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { StudentsListClient } from "@/components/teacher/StudentsListClient";

export interface StudentRow {
  studentId: string;
  name: string | null;
  lastActiveAt: string | null;
  avgMastery: number | null;
}

async function getTeacherStudents(teacherId: string): Promise<StudentRow[]> {
  try {
    const supabase = await createClient();

    const { data: classes, error: classErr } = await supabase
      .from("classes")
      .select("id")
      .eq("teacher_id", teacherId);

    if (classErr || !classes?.length) return [];

    const classIds = classes.map((c) => c.id);

    const { data: enrollments, error: enrollErr } = await supabase
      .from("enrollments")
      .select("student_id")
      .in("class_id", classIds);

    if (enrollErr || !enrollments?.length) return [];

    const studentIds = [...new Set(enrollments.map((e) => e.student_id))];

    const [profilesRes, knowledgeRes] = await Promise.all([
      supabase
        .from("student_profiles")
        .select("user_id, name")
        .in("user_id", studentIds),
      supabase
        .from("student_knowledge_state")
        .select("student_id, mastery_score, last_attempt_at")
        .in("student_id", studentIds),
    ]);

    if (profilesRes.error) {
      authLogger.error("[getTeacherStudents] profiles error", profilesRes.error);
    }

    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p.name]));

    const masteryMap = new Map<string, { total: number; count: number; lastActive: string | null }>();
    for (const row of knowledgeRes.data ?? []) {
      const existing = masteryMap.get(row.student_id);
      const prevLast = existing?.lastActive ?? "";
      const rowLast = row.last_attempt_at ?? "";
      masteryMap.set(row.student_id, {
        total: (existing?.total ?? 0) + (row.mastery_score ?? 0),
        count: (existing?.count ?? 0) + 1,
        lastActive: rowLast > prevLast ? rowLast : (existing?.lastActive ?? null),
      });
    }

    return studentIds
      .map((id) => {
        const mastery = masteryMap.get(id);
        return {
          studentId: id,
          name: profileMap.get(id) ?? null,
          lastActiveAt: mastery?.lastActive ?? null,
          avgMastery: mastery ? Math.round(mastery.total / mastery.count) : null,
        };
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  } catch (error) {
    authLogger.error("[getTeacherStudents] unexpected error", error);
    return [];
  }
}

export default async function TeacherClassesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/teacher/start");
  if (!isTeacherOrHigher(user.app_metadata?.role)) redirect("/app/student/dashboard");

  const students = await getTeacherStudents(user.id);

  return <StudentsListClient students={students} />;
}
