import { redirect } from "next/navigation";

export default function AdminStartRedirect() {
  redirect("/admin/login");
}
