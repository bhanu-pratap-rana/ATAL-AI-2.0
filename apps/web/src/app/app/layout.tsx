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
      <div className="pb-28">{children}</div>
      <BottomNav />
    </>
  );
}
