import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/auth/role-utils";
import { SchoolsClient } from "./SchoolsClient";

export default async function AdminSchoolsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  const role = user.app_metadata?.role;
  if (!isAdmin(role)) {
    redirect("/admin/login");
  }

  return <SchoolsClient />;
}
