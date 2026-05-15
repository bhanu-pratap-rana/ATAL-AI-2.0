"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, MessageSquare, UserCircle,
  PieChart, Users, School, ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useLanguageOptional } from "@/lib/i18n";

// Translation keys are looked up per-render via useLanguage().t() so
// switching the language selector immediately re-labels the nav. The
// label keys map 1:1 to the `nav.*` namespace in src/lib/i18n/locales/*.json.
const STUDENT_NAV = [
  { href: "/app/student/dashboard", icon: LayoutDashboard, key: "nav.home", fallback: "Home" },
  { href: "/app/learn", icon: BookOpen, key: "nav.learn", fallback: "Learn" },
  { href: "/app/ai-tools", icon: MessageSquare, key: "nav.aiTools", fallback: "AI Tools" },
  { href: "/app/settings", icon: UserCircle, key: "nav.profile", fallback: "Profile" },
] as const;

const TEACHER_NAV = [
  { href: "/app/teacher/dashboard", icon: LayoutDashboard, key: "nav.dashboard", fallback: "Dashboard" },
  { href: "/app/teacher/analytics/questions", icon: PieChart, key: "nav.analytics", fallback: "Analytics" },
  { href: "/app/teacher/classes", icon: Users, key: "nav.students", fallback: "Students" },
  { href: "/app/teacher/assessments", icon: ClipboardList, key: "nav.assessments", fallback: "Assessments" },
] as const;

const ADMIN_NAV = [
  { href: "/app/admin/dashboard", icon: LayoutDashboard, key: "nav.dashboard", fallback: "Dashboard" },
  { href: "/app/admin/performance", icon: PieChart, key: "nav.analytics", fallback: "Analytics" },
  { href: "/app/admin/schools", icon: School, key: "nav.schools", fallback: "Schools" },
] as const;

// Hide on full-screen experiences only
const HIDDEN_PREFIXES = [
  "/app/assessment/start",
  "/app/learning-style",
];

function getRoleFromPath(pathname: string): "student" | "teacher" | "admin" | null {
  if (pathname.startsWith("/app/teacher")) return "teacher";
  if (pathname.startsWith("/app/admin")) return "admin";
  if (pathname.startsWith("/app/student")) return "student";
  return null;
}

function getRoleFromAppMeta(role: string | undefined): "student" | "teacher" | "admin" | null {
  if (role === "teacher") return "teacher";
  if (role === "admin" || role === "super_admin") return "admin";
  if (role === "student") return "student";
  return null;
}

function getActiveColor(role: "student" | "teacher" | "admin") {
  if (role === "teacher") return { bg: "bg-role-teacher", text: "text-role-teacher", shadow: "0 4px 14px rgba(37,99,235,0.35)" };
  if (role === "admin") return { bg: "bg-role-admin", text: "text-role-admin", shadow: "0 4px 14px rgba(220,38,38,0.35)" };
  return { bg: "bg-primary", text: "text-primary", shadow: "0 4px 14px rgba(249,136,25,0.35)" };
}

interface BottomNavProps {
  readonly initialRole?: string;
}

export function BottomNav({ initialRole }: BottomNavProps = {}) {
  const pathname = usePathname();
  const supabase = createClient();
  // Optional context — returns null when the nav is rendered outside a
  // LanguageProvider (e.g. some legacy routes). We pass the result's
  // `t` down to the label renderer below; missing context falls back
  // to the hardcoded English fallbacks per nav item.
  const langCtx = useLanguageOptional();
  const t = langCtx?.t;

  // Role is resolved server-side in the app layout and passed in. This is
  // what makes the nav role-correct on first paint for non-role-scoped
  // paths like /app/settings. The client-side getUser() below is only a
  // safety net for legacy callers that don't supply the prop.
  const [authRole, setAuthRole] = useState<string | undefined>(initialRole);
  useEffect(() => {
    if (initialRole) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const value = data.user?.app_metadata?.role;
      if (typeof value === "string") setAuthRole(value);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, initialRole]);

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const role: "student" | "teacher" | "admin" =
    getRoleFromAppMeta(authRole) ?? getRoleFromPath(pathname) ?? "student";
  let NAV_ITEMS: typeof STUDENT_NAV | typeof TEACHER_NAV | typeof ADMIN_NAV;
  if (role === "teacher") {
    NAV_ITEMS = TEACHER_NAV;
  } else if (role === "admin") {
    NAV_ITEMS = ADMIN_NAV;
  } else {
    NAV_ITEMS = STUDENT_NAV;
  }
  const colors = getActiveColor(role);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 pt-3 px-4 sm:px-6 z-300"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-xl mx-auto flex justify-around items-end">
        {NAV_ITEMS.map(({ href, icon: Icon, key, fallback }) => {
          const isExact = ["/app/student/dashboard", "/app/teacher/dashboard", "/app/admin/dashboard", "/app/settings"].includes(href);
          const active = pathname === href || (!isExact && pathname.startsWith(href));
          // useLanguage returns null outside a LanguageProvider, so we
          // fall back to the English label rather than crashing.
          // t() returns the key string itself when the key is missing
          // in every locale, so we treat that as a miss too.
          let label = fallback as string;
          if (t) {
            const translated = t(key);
            if (translated && translated !== key) label = translated;
          }
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] py-1 transition-all ${
                active ? `${colors.text} scale-110` : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div
                className={`p-2.5 rounded-2xl transition-all duration-300 ${
                  active ? `${colors.bg} text-white` : "bg-transparent hover:bg-slate-50"
                }`}
                style={active ? { boxShadow: colors.shadow } : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest transition-opacity max-w-[72px] sm:max-w-none truncate ${
                  active ? "opacity-100" : "opacity-40"
                }`}
                title={label}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
