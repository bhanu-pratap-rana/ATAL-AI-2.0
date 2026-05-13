import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient, createClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { ChevronRight } from "lucide-react";

interface TeacherInfo {
  name: string | null;
  user_id: string;
}

interface ClassInfo {
  id: string;
  name: string;
  class_code: string;
  subject: string | null;
  teacher_id: string;
}

interface Enrollment {
  id: string;
  created_at: string;
  class: ClassInfo;
  teacher: TeacherInfo | null;
}

async function getStudentClasses(userId: string): Promise<Enrollment[]> {
  try {
    const supabase = await createClient();

    const { data: enrollments, error: enrollmentError } = await supabase
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
      `,
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (enrollmentError) {
      authLogger.error("[getStudentClasses] Error fetching enrollments", enrollmentError);
      return [];
    }

    if (!enrollments || enrollments.length === 0) return [];

    const getClassFromEnrollment = (e: (typeof enrollments)[0]): ClassInfo | null => {
      if (!e.class) return null;
      const classData = Array.isArray(e.class) ? e.class[0] : e.class;
      return classData as ClassInfo;
    };

    const teacherIds = [
      ...new Set(
        enrollments
          .map((e) => getClassFromEnrollment(e)?.teacher_id)
          .filter(Boolean),
      ),
    ];

    let teacherMap = new Map<string, TeacherInfo>();

    if (teacherIds.length > 0) {
      // teacher_profiles has a teacher_self_read RLS policy — students
      // cannot see their teacher's row through the normal client. Use the
      // admin client (service_role) to fetch only the public-facing name.
      const adminClient = await createAdminClient();
      const { data: teachers, error: teacherError } = await adminClient
        .from("teacher_profiles")
        .select("user_id, name")
        .in("user_id", teacherIds);

      if (teacherError) {
        authLogger.error(
          "[getStudentClasses] Failed to fetch teacher names",
          teacherError,
        );
      } else if (teachers) {
        teacherMap = new Map(teachers.map((t) => [t.user_id, t]));
      }
    }

    return enrollments.map((enrollment) => {
      const classData = getClassFromEnrollment(enrollment);
      return {
        id: enrollment.id,
        created_at: enrollment.created_at,
        class: classData as ClassInfo,
        teacher: classData?.teacher_id ? teacherMap.get(classData.teacher_id) || null : null,
      };
    });
  } catch (error) {
    authLogger.error("[getStudentClasses] Unexpected error", error);
    return [];
  }
}

export default async function StudentClassesPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/student/start");

  const enrollments = await getStudentClasses(user.id);

  const bannerStyle = { background: "var(--gradient-primary)" };

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={bannerStyle}>
          <Link href="/app/student/dashboard" className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
            ← Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">My Classes 👥</h1>
          <p className="text-white/80 text-sm font-bold">Classes you&apos;re enrolled in</p>
        </div>

        {enrollments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-5xl mb-4">📚</div>
            <h3 className="font-black text-slate-800 text-lg mb-2">No classes yet</h3>
            <p className="font-bold text-slate-400 text-sm mb-6 px-4">
              Ask your teacher for a class code to get started
            </p>
            <Link
              href="/join"
              className="px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 inline-block"
              style={bannerStyle}
            >
              Join a Class
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map((enrollment: Enrollment) => (
              <Link
                key={enrollment.id}
                href={`/app/student/classes/${enrollment.class.id}`}
              >
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center text-xl shrink-0">
                        📚
                      </div>
                      <h3 className="font-black text-slate-800 text-base truncate">
                        {enrollment.class.name}
                      </h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-400 transition-colors shrink-0" />
                  </div>
                  <div className="space-y-1 pl-14">
                    <p className="text-xs font-bold text-slate-400 truncate">
                      Teacher: {enrollment.teacher?.name || "Not available"}
                    </p>
                    {enrollment.class.subject && (
                      <p className="text-xs font-bold text-slate-400 truncate">
                        Subject: {enrollment.class.subject}
                      </p>
                    )}
                    <p className="text-xs font-bold text-slate-400">
                      Joined: {new Date(enrollment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
