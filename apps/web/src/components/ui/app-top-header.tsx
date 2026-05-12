"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { GraduationCap, ShieldCheck, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { authLogger } from "@/lib/auth-logger";
import { LanguageSelector } from "@/components/learn/LanguageSelector";
import { SyncStatusIndicator } from "@/components/offline/SyncStatusIndicator";

type Portal = "teacher" | "admin" | "student";

const PORTAL_CONFIG: Record<Portal, {
  label: string;
  Icon: typeof GraduationCap;
  style: { background: string };
  signOutPath: string;
}> = {
  teacher: {
    label: "Teacher Portal",
    Icon: GraduationCap,
    style: { background: "var(--gradient-teacher)" },
    signOutPath: "/teacher/start",
  },
  admin: {
    label: "Admin Portal",
    Icon: ShieldCheck,
    style: { background: "var(--gradient-admin)" },
    signOutPath: "/admin/login",
  },
  student: {
    label: "Student Portal",
    Icon: User,
    style: { background: "var(--gradient-primary)" },
    signOutPath: "/student/start",
  },
};

function portalFromPath(pathname: string): Portal | null {
  if (pathname.startsWith("/app/teacher")) return "teacher";
  if (pathname.startsWith("/app/admin")) return "admin";
  if (pathname.startsWith("/app/student")) return "student";
  return null;
}

function portalFromRole(role: string | undefined): Portal | null {
  if (role === "teacher") return "teacher";
  if (role === "admin" || role === "super_admin") return "admin";
  if (role === "student") return "student";
  return null;
}

export function AppTopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Prefer the user's actual role; fall back to the path for routes that
  // are not role-scoped (e.g. /app/settings) or during hydration.
  const [role, setRole] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const value = data.user?.app_metadata?.role;
      if (typeof value === "string") setRole(value);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const portal: Portal =
    portalFromRole(role) ?? portalFromPath(pathname) ?? "student";
  const config = PORTAL_CONFIG[portal];
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
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
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
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSelector variant="compact" />
          <SyncStatusIndicator compact />
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
