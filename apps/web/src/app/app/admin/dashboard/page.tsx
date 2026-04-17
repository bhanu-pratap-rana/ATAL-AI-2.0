import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/auth/role-utils";
import { AdminDashboardClient } from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  const role = user.app_metadata?.role;
  if (!isAdmin(role)) {
    redirect("/admin/login");
  }

  return <AdminDashboardClient />;
}
