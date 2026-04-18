import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { isTeacherOrHigher } from "@/lib/auth/role-utils";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role = user.app_metadata?.role;
  if (!isTeacherOrHigher(role)) {
    redirect("/app/student/dashboard");
  }

  return <DashboardClient />;
}
