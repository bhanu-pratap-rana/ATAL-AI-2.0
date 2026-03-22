import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" }}>
          <Link href="/app/student/classes" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← My Classes
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">📚 {classDetails.class.name}</h1>
          <p className="text-white/80 text-sm font-bold">
            Teacher: {classDetails.teacher?.name ?? "Not available"}
            {classDetails.class.subject && ` • ${classDetails.class.subject}`}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
            <div className="text-3xl mb-1">📢</div>
            <p className="text-xl sm:text-2xl font-black text-slate-800">{announcements.length}</p>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Announcements</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
            <div className="text-3xl mb-1">📁</div>
            <p className="text-xl sm:text-2xl font-black text-slate-800">{materials.length}</p>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Materials</p>
          </div>
        </div>

        {/* Announcements */}
        <StudentAnnouncementsCard announcements={announcements} />

        {/* Materials */}
        <StudentMaterialsCard materials={materials} />

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/app/learn" className="py-3 rounded-2xl font-black text-sm text-slate-700 text-center bg-slate-50 border border-slate-100 transition-all active:scale-95">
              📖 Continue Learning
            </Link>
            <Link href="/app/ai-tools/tutor" className="py-3 rounded-2xl font-black text-sm text-white text-center transition-all active:scale-95" style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" }}>
              🤖 AI Tutor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
