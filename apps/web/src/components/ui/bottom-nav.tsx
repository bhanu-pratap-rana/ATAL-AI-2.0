"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, MessageSquare, UserCircle,
  PieChart, Users, School, Settings
} from "lucide-react";

// Student nav tabs
const STUDENT_NAV = [
  { href: "/app/student/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/app/learn", icon: BookOpen, label: "Learn" },
  { href: "/app/ai-tools", icon: MessageSquare, label: "AI Tools" },
  { href: "/app/settings", icon: UserCircle, label: "Profile" },
] as const;

// Teacher nav tabs
const TEACHER_NAV = [
  { href: "/app/teacher/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/teacher/analytics/questions", icon: PieChart, label: "Analytics" },
  { href: "/app/teacher/classes", icon: Users, label: "Students" },
  { href: "/app/settings", icon: Settings, label: "System" },
] as const;

// Admin nav tabs
const ADMIN_NAV = [
  { href: "/app/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/app/admin/performance", icon: PieChart, label: "Analytics" },
  { href: "/app/admin/schools", icon: School, label: "Schools" },
  { href: "/app/settings", icon: Settings, label: "System" },
] as const;

// Hide on full-screen experiences only
const HIDDEN_PREFIXES = [
  "/app/assessment/start",
  "/app/learning-style",
];

function getRole(pathname: string): "student" | "teacher" | "admin" {
  if (pathname.startsWith("/app/teacher")) return "teacher";
  if (pathname.startsWith("/app/admin")) return "admin";
  return "student";
}

function getActiveColor(role: "student" | "teacher" | "admin") {
  if (role === "teacher") return { bg: "bg-blue-600", text: "text-blue-600", shadow: "0 4px 14px rgba(37,99,235,0.35)" };
  if (role === "admin") return { bg: "bg-red-600", text: "text-red-600", shadow: "0 4px 14px rgba(220,38,38,0.35)" };
  return { bg: "bg-primary", text: "text-primary", shadow: "0 4px 14px rgba(249,136,25,0.35)" };
}

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const role = getRole(pathname);
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-6 pt-3 px-6 z-[300]">
      <div className="max-w-xl mx-auto flex justify-around items-end">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isExact = ["/app/student/dashboard", "/app/teacher/dashboard", "/app/admin/dashboard", "/app/settings"].includes(href);
          const active = pathname === href || (!isExact && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 transition-all ${
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
                className={`text-[11px] font-black uppercase tracking-widest transition-opacity ${
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
