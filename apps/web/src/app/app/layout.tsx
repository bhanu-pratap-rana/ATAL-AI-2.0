import { AppTopHeader } from "@/components/ui/app-top-header";
import { BottomNav } from "@/components/ui/bottom-nav";
import { createClient } from "@/lib/supabase-server";

// Resolve the user's role server-side once per request and pass it down
// to AppTopHeader + BottomNav. This eliminates the "student-flash" that
// appeared on non-role-scoped paths like /app/settings, where the
// client-side chrome would render the student fallback for a frame
// before the async supabase.auth.getUser() call resolved.
export default async function AppLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialRole =
    typeof user?.app_metadata?.role === "string"
      ? (user.app_metadata.role as string)
      : undefined;

  return (
    <>
      <AppTopHeader initialRole={initialRole} />
      {/* pb-32: base clearance for the fixed bottom nav.
          The extra 4 rem (vs pb-28) absorbs the iOS home-indicator safe area
          (up to ~34 px) so content is never obscured on notched iPhones. */}
      <div className="pb-32">{children}</div>
      <BottomNav initialRole={initialRole} />
    </>
  );
}
