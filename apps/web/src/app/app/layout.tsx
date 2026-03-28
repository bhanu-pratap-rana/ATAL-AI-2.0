import { AppTopHeader } from "@/components/ui/app-top-header";
import { BottomNav } from "@/components/ui/bottom-nav";

export default function AppLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <>
      <AppTopHeader />
      {/* pb-32: base clearance for the fixed bottom nav.
          The extra 4 rem (vs pb-28) absorbs the iOS home-indicator safe area
          (up to ~34 px) so content is never obscured on notched iPhones. */}
      <div className="pb-32">{children}</div>
      <BottomNav />
    </>
  );
}
