"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { GraduationCap, ShieldCheck, User, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { authLogger } from "@/lib/auth-logger";
import { LanguageSelector } from "@/components/learn/LanguageSelector";
import { SyncStatusIndicator } from "@/components/offline/SyncStatusIndicator";
import { Button } from "@/components/ui/button";

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

interface AppTopHeaderProps {
  readonly initialRole?: string;
}

export function AppTopHeader({ initialRole }: AppTopHeaderProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // The role is resolved server-side in the app layout and passed in as a
  // prop, so the first paint already has the correct portal identity —
  // no "student-flash" on /app/settings or other non-role-scoped paths.
  // The client-side getUser() below is a safety net in case the prop is
  // missing (e.g. legacy callers).
  const [role, setRole] = useState<string | undefined>(initialRole);
  useEffect(() => {
    if (initialRole) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const value = data.user?.app_metadata?.role;
      if (typeof value === "string") setRole(value);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, initialRole]);

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
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-3 sm:px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Identity block. min-w-0 + flex-1 lets it shrink before the
            action cluster, so the title truncates instead of pushing
            controls off-screen on small viewports (<400px). */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
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
            {/* The subtitle is decorative; hide below 420px to give the
                title and action cluster real breathing room on phones. */}
            <p className="hidden min-[420px]:block text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
              ATAL AI SYSTEM
            </p>
          </div>
        </div>
        {/* Action cluster. gap tightens on mobile, language selector
            gets a max-width so the long native script options don't
            blow it out wider than the title. */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <LanguageSelector variant="compact" className="max-w-[110px] sm:max-w-none" />
          <SyncStatusIndicator compact />
          {pathname !== "/app/settings" && (
            <Link
              href="/app/settings"
              aria-label="Settings"
              title="Settings"
              className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            >
              <Settings size={18} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100"
          >
            <LogOut size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
