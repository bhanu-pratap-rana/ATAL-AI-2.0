import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, BookOpenCheck, Bot, FolderClosed, Megaphone } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import {
  StudentAnnouncementsCard,
  StudentMaterialsCard,
} from "@/components/student/communication";
import {
  getStudentClassAnnouncements,
  getStudentClassMaterials,
  type Announcement,
  type Material,
} from "@/app/actions/teacher";

interface ClassInfo {
  id: string;
  name: string;
  class_code: string;
  subject: string | null;
  teacher_id: string;
}

interface TeacherInfo {
  user_id: string;
  name: string | null;
}

interface ClassWithTeacher {
  class: ClassInfo;
  teacher: TeacherInfo | null;
  enrolledAt: string;
}

async function getStudentClassDetails(
  classId: string,
  userId: string
): Promise<ClassWithTeacher | null> {
  try {
    const supabase = await createClient();

    // Fetch enrollment with class details
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select(
        `
        id,
        created_at,
        class:classes(
          id,
          name,
          class_code,
          subject,
          teacher_id
        )
      `
      )
      .eq("class_id", classId)
      .eq("student_id", userId)
      .maybeSingle();

    if (enrollmentError) {
      authLogger.error(
        "[getStudentClassDetails] Error fetching enrollment",
        enrollmentError
      );
      return null;
    }

    const rawClass = enrollment?.class;
    if (!rawClass) return null;

    const classData = Array.isArray(rawClass) ? rawClass[0] : rawClass;

    // Fetch teacher info
    let teacher: TeacherInfo | null = null;
    if (classData?.teacher_id) {
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("user_id, name")
        .eq("user_id", classData.teacher_id)
        .maybeSingle();

      if (teacherProfile) {
        teacher = teacherProfile;
      }
    }

    return {
      class: classData as ClassInfo,
      teacher,
      enrolledAt: enrollment.created_at,
    };
  } catch (error) {
    authLogger.error("[getStudentClassDetails] Unexpected error", error);
    return null;
  }
}

export default async function StudentClassDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/student/start");
  }

  const classDetails = await getStudentClassDetails(id, user.id);

  if (!classDetails) {
    redirect("/app/student/classes");
  }

  // Fetch announcements and materials
  const [announcementsResult, materialsResult] = await Promise.all([
    getStudentClassAnnouncements(id),
    getStudentClassMaterials(id),
  ]);

  // Transform announcements to include is_read for UI
  const announcements = announcementsResult.success
    ? (announcementsResult.data as (Announcement & { is_read?: boolean })[])
    : [];

  const materials = materialsResult.success
    ? (materialsResult.data as Material[])
    : [];

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div
          className="rounded-[32px] border-4 border-white p-6 text-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Link
            href="/app/student/classes"
            className="inline-flex items-center gap-1.5 text-white/85 text-xs font-black uppercase tracking-widest mb-4 hover:text-white"
          >
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
            My Classes
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0 text-white">
              <BookOpen className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black mb-0.5 leading-tight truncate">{classDetails.class.name}</h1>
              <p className="text-white/85 text-sm font-bold">
                Teacher: {classDetails.teacher?.name ?? "Not available"}
                {classDetails.class.subject && ` • ${classDetails.class.subject}`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5 text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-(--bento-tint-orange) border-2 border-white shadow-sm flex items-center justify-center text-(--bento-orange-d)">
              <Megaphone className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{announcements.length}</p>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Announcements</p>
          </div>
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5 text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-2xl bg-(--bento-tint-purple) border-2 border-white shadow-sm flex items-center justify-center text-(--bento-purple-d)">
              <FolderClosed className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{materials.length}</p>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Materials</p>
          </div>
        </div>

        {/* Announcements */}
        <StudentAnnouncementsCard announcements={announcements} />

        {/* Materials */}
        <StudentMaterialsCard materials={materials} />

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/app/learn"
              className="btn-bento btn-bento-grey gap-2 justify-center py-3 rounded-2xl text-sm"
            >
              <BookOpenCheck size={16} strokeWidth={2.5} aria-hidden="true" />
              Continue Learning
            </Link>
            <Link
              href="/app/ai-tools/tutor"
              className="btn-bento gap-2 justify-center py-3 rounded-2xl text-sm"
            >
              <Bot size={16} strokeWidth={2.5} aria-hidden="true" />
              AI Tutor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
