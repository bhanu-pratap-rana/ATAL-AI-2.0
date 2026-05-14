"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, MessageSquare, UserCircle,
  PieChart, Users, School, ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

// Student nav tabs (Profile stays here — students self-manage their own
// learning profile, which differs from system-wide Settings).
const STUDENT_NAV = [
  { href: "/app/student/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/app/learn", icon: BookOpen, label: "Learn" },
  { href: "/app/ai-tools", icon: MessageSquare, label: "AI Tools" },
  { href: "/app/settings", icon: UserCircle, label: "Profile" },
] as const;

// Teacher nav tabs — System slot reclaimed for Assessments (a real
// teacher-facing route). Settings is reachable from the top-right header.
const TEACHER_NAV = [
  { href: "/app/teacher/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/teacher/analytics/questions", icon: PieChart, label: "Analytics" },
  { href: "/app/teacher/classes", icon: Users, label: "Students" },
  { href: "/app/teacher/assessments", icon: ClipboardList, label: "Assessments" },
] as const;

// Admin nav tabs — only three real /app/admin sub-routes exist, so the
// bottom-nav reflects that. Settings/sign-out live in the top-right header.
const ADMIN_NAV = [
  { href: "/app/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/admin/performance", icon: PieChart, label: "Analytics" },
  { href: "/app/admin/schools", icon: School, label: "Schools" },
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

export function BottomNav() {
  const pathname = usePathname();
  const supabase = createClient();

  // Prefer the user's actual role from Supabase (matches AppTopHeader).
  // Falls back to the URL when on role-scoped paths so the nav is correct
  // even before the auth call resolves. This is what makes the bottom-nav
  // role-correct on non-role-scoped paths like /app/settings.
  const [authRole, setAuthRole] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const value = data.user?.app_metadata?.role;
      if (typeof value === "string") setAuthRole(value);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

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
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isExact = ["/app/student/dashboard", "/app/teacher/dashboard", "/app/admin/dashboard", "/app/settings"].includes(href);
          const active = pathname === href || (!isExact && pathname.startsWith(href));
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
                className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest transition-opacity ${
                  active ? "opacity-100" : "opacity-40"
                }`}
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
