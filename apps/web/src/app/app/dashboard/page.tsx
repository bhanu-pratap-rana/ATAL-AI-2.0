/**
 * /app/dashboard — role-routing shim.
 *
 * PR-64 (audit): two teacher dashboards used to live here — this page
 * rendered a separate `DashboardClient` while bottom-nav pointed
 * teachers at /app/teacher/dashboard. Two screens, drifted layouts,
 * confusing 404-like behaviour for users with bookmarks.
 *
 * /app/dashboard is now strictly a redirect: students → student
 * dashboard, teachers/admins → role-appropriate dashboard. The old
 * inline `DashboardClient` is gone; its functionality (stat tiles +
 * quick actions + "continue learning") lives in the dedicated
 * teacher / admin dashboards already.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { isAdmin, isTeacherOrHigher } from "@/lib/auth/role-utils";
import { RoleRedirect } from "./RoleRedirect";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const role = user.app_metadata?.role;
  let dest = "/app/student/dashboard";
  if (isAdmin(role)) {
    dest = "/app/admin/dashboard";
  } else if (isTeacherOrHigher(role)) {
    dest = "/app/teacher/dashboard";
  }
  // Client-side hop instead of a server redirect() — see RoleRedirect.
  return <RoleRedirect to={dest} />;
}
