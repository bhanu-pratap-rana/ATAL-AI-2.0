import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/auth/role-utils";
import { PerformanceClient } from "./PerformanceClient";

export default async function PerformanceMonitoringPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  const role = user.app_metadata?.role;
  if (!isAdmin(role)) {
    redirect("/admin/login");
  }

  return <PerformanceClient />;
}
