"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  School,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDashboardMetrics } from "@/app/actions/admin-metrics";
import { clientLogger } from "@/lib/client-logger";

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface AdminStats {
  schools: number;
  teachers: number;
  students: number;
}

export function AdminDashboardClient() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({ schools: 0, teachers: 0, students: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        // Use the server action — it runs the count queries via the
        // service-role admin client, which bypasses RLS. The previous
        // implementation used the browser Supabase client which is
        // RLS-bound to the admin's own auth.uid(), and admins have no
        // RLS policy permitting them to SELECT from teacher_profiles
        // or student_profiles. That returned 0 rows for both tables
        // and produced the long-running 0/0 dashboard bug (PR-56).
        const result = await getDashboardMetrics();
        if (result.success && result.data) {
          setStats({
            schools: result.data.totalSchools,
            teachers: result.data.totalTeachers,
            students: result.data.totalStudents,
          });
        } else {
          clientLogger.warn("[AdminDashboard] metrics action returned no data", {
            error: result.error || "unknown",
          });
        }
      } catch (error) {
        clientLogger.error(
          "[AdminDashboard] stats error",
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    loadStats();
  }, []);

  const bannerStyle = { background: "var(--gradient-admin)" };

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 text-white" style={bannerStyle}>
          <h1 className="text-xl sm:text-2xl font-black mb-1">State Admin</h1>
          <p className="text-red-100 text-xs font-black uppercase tracking-widest mb-4">
            Assam Digital Initiative
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: fmt(stats.schools), label: "Schools" },
              { value: fmt(stats.teachers), label: "Teachers" },
              { value: fmt(stats.students), label: "Students" },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 rounded-2xl p-4 text-center backdrop-blur-md">
                <p className="text-xl sm:text-2xl font-black">{s.value}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-red-100 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-amber-100 border-2 border-white shadow-sm text-amber-700">
                <AlertTriangle className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm">Pending Approvals</p>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Schools requesting access
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          {([
            { href: "/app/admin/schools", Icon: School, label: "Manage Schools", tint: "sky" },
            { href: "/app/admin/performance", Icon: BarChart3, label: "Analytics", tint: "purple" },
            { href: "/app/settings", Icon: Settings, label: "System Settings", tint: "yellow" },
            { href: "/app/admin/schools", Icon: ShieldCheck, label: "PIN Management", tint: "red" },
          ] as ReadonlyArray<{ href: string; Icon: LucideIcon; label: string; tint: string }>).map((action) => (
            <Button
              type="button"
              variant="ghost"
              key={action.label}
              onClick={() => router.push(action.href)}
              className="bg-white border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] rounded-3xl h-auto p-5 text-left items-start flex-col hover:shadow-md hover:bg-white whitespace-normal"
            >
              <div
                className="w-12 h-12 rounded-2xl mb-2 flex items-center justify-center border-2 border-white shadow-sm"
                style={{ background: `var(--bento-tint-${action.tint})`, color: `var(--bento-${action.tint}-d)` }}
              >
                <action.Icon className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <p className="font-black text-slate-900 text-sm">{action.label}</p>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
