"use client";

import { useRouter, usePathname } from "next/navigation";
import { GraduationCap, ShieldCheck, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { authLogger } from "@/lib/auth-logger";
import { LanguageSelector } from "@/components/learn/LanguageSelector";
import { SyncStatusIndicator } from "@/components/offline/SyncStatusIndicator";

function getPortalConfig(pathname: string) {
  if (pathname.startsWith("/app/teacher")) {
    return {
      label: "Teacher Portal",
      Icon: GraduationCap,
      style: { background: "var(--gradient-teacher)" },
      signOutPath: "/teacher/start",
    };
  }
  if (pathname.startsWith("/app/admin")) {
    return {
      label: "Admin Portal",
      Icon: ShieldCheck,
      style: { background: "var(--gradient-admin)" },
      signOutPath: "/admin/login",
    };
  }
  return {
    label: "Student Portal",
    Icon: User,
    style: { background: "var(--gradient-primary)" },
    signOutPath: "/student/start",
  };
}

export function AppTopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const config = getPortalConfig(pathname);
  const { Icon } = config;

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      router.refresh();
      router.push(config.signOutPath);
    } catch (error) {
      authLogger.error("[AppTopHeader] Sign out failed", error);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={config.style}
          >
            <Icon size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-800 text-sm leading-none truncate">
              {config.label}
            </p>
            <p className="hidden min-[375px]:block text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              ATAL AI SYSTEM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <LanguageSelector variant="compact" />
          <SyncStatusIndicator compact />
          <button
                type="button"
            onClick={handleSignOut}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
