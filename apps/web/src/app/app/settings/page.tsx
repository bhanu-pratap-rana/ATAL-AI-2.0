import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { StudentProfileEditor } from "@/components/settings/StudentProfileEditor";
import { TeacherProfileEditor } from "@/components/settings/TeacherProfileEditor";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";
import Link from "next/link";

/**
 * Navigation details based on user role
 */
interface BackNavigation {
  readonly href: string;
  readonly label: string;
}

/**
 * Get back navigation based on user role
 */
function getBackNavigation(role: string | undefined): BackNavigation {
  if (role === "admin" || role === "super_admin") {
    return { href: "/app/admin/dashboard", label: "Back to Dashboard" };
  }
  if (role === "teacher") {
    return { href: "/app/teacher/dashboard", label: "Back to Dashboard" };
  }
  return { href: "/app/student/dashboard", label: "Back to Dashboard" };
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/student/start");
  }

  // Check app_metadata.role (set during teacher registration via admin API)
  // This is reliable as it's set server-side and cannot be modified by client
  const appRole = user.app_metadata?.role;
  const isTeacherOrAdmin = isTeacherOrHigher(appRole);

  // Check if user signed up with username (Quick Start)
  const authType = user.user_metadata?.auth_type;
  const isUsernameAuth = authType === "username";
  const username = user.user_metadata?.username as string | undefined;

  // Determine display role - teachers promoted to admin show both roles
  // Super admin is unique (only atal.app.ai@gmail.com)
  const ROLE_DISPLAY_MAP: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Teacher, Admin",
    teacher: "Teacher",
  };
  const userRole = ROLE_DISPLAY_MAP[appRole] || "Student";

  // Fetch student profile if user is a student
  let studentProfile = null;
  if (!isTeacherOrAdmin) {
    // OPTIMIZATION: Select only needed columns instead of *
    const { data: profile } = await supabase
      .from("student_profiles")
      .select(
        "user_id, name, gender, phone, roll_number, school_id, school_name, class_name, village, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    studentProfile = profile;
  }

  // Fetch teacher profile if user is a teacher/admin
  let teacherProfile: {
    user_id: string;
    name: string;
    phone: string | null;
    school_id: string;
    school_code: string;
    gender: "male" | "female" | null;
    subject: string | null;
    village: string | null;
    created_at: string;
    updated_at: string;
  } | null = null;
  if (isTeacherOrAdmin) {
    // OPTIMIZATION: Select only needed columns instead of *
    const { data: profile } = await supabase
      .from("teacher_profiles")
      .select(
        "user_id, name, phone, school_id, school_code, gender, subject, village, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    teacherProfile = profile;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Banner */}
        <div
          className="rounded-[32px] p-6 text-white"
          style={{
            background: isTeacherOrAdmin
              ? "linear-gradient(135deg,#3B82F6,#6366F1)"
              : "linear-gradient(135deg,#F98819 0%,#FFD166 100%)",
          }}
        >
          {(() => {
            const nav = getBackNavigation(appRole);
            return (
              <Link href={nav.href} className="inline-flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-4">
                ← {nav.label}
              </Link>
            );
          })()}
          <h1 className="text-xl sm:text-2xl font-black mb-1">My Profile 👤</h1>
          <p className="text-white/80 text-sm font-bold capitalize">{userRole} Account</p>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-black text-slate-800 text-lg mb-4">Account Information</h2>
          <div className="space-y-4">
            {isUsernameAuth ? (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-slate-50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Username</span>
                <p className="font-black text-slate-800 font-mono text-sm">{username || "Not set"}</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-slate-50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">Email</span>
                <p className="font-bold text-slate-800 break-all text-sm">{user.email || "Not set"}</p>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Role</span>
              <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-black">{userRole}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Member Since</span>
              <p className="font-bold text-slate-800 text-sm">{new Date(user.created_at || "").toLocaleDateString()}</p>
            </div>
            <div className="py-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">User ID</span>
              <p className="font-mono text-xs text-slate-500 break-all mt-1">{user.id}</p>
            </div>
          </div>
        </div>

        {/* Student Profile Section - Only show for students */}
        {!isTeacherOrAdmin && (
          <StudentProfileEditor
            profile={studentProfile}
            userEmail={user.email || ""}
            isUsernameAuth={isUsernameAuth}
            username={username}
          />
        )}

        {/* Teacher Profile Section - Only show for teachers/admins */}
        {isTeacherOrAdmin && teacherProfile && (
          <TeacherProfileEditor
            profile={teacherProfile}
            userEmail={user.email || ""}
          />
        )}

        {/* Preferences - Only show for students */}
        {!isTeacherOrAdmin && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-black text-slate-800 text-lg">Preferences</h2>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-black">Coming Soon</span>
            </div>
            <div className="space-y-4 opacity-60">
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <div>
                  <p className="font-black text-slate-800 text-sm">Language Preference</p>
                  <p className="text-xs font-bold text-slate-400">Choose your preferred language</p>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-black">English</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-black text-slate-800 text-sm">Assessment Reminders</p>
                  <p className="text-xs font-bold text-slate-400">Get reminders for upcoming assessments</p>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-black">Not Set</span>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-6">
          <h2 className="font-black text-red-600 text-lg mb-2">Danger Zone</h2>
          <p className="text-sm font-bold text-slate-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <DeleteAccountButton userEmail={user.email || "your account"} />
        </div>
      </div>
    </div>
  );
}
