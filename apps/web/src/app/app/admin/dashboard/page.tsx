"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { checkAdminAuth } from "@/app/actions/school";
import { createClient } from "@/lib/supabase-browser";
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats>({ schools: 0, teachers: 0, students: 0 });

  useEffect(() => {
    async function init() {
      try {
        const result = await checkAdminAuth();
        if (!result.authorized) {
          router.push("/admin/login");
          return;
        }
        setAuthorized(true);

        // Fetch aggregate stats in parallel
        const supabase = createClient();
        const [schoolsRes, teachersRes, studentsRes] = await Promise.all([
          supabase.from("schools").select("id", { count: "exact", head: true }),
          supabase.from("teacher_profiles").select("user_id", { count: "exact", head: true }),
          supabase.from("student_profiles").select("user_id", { count: "exact", head: true }),
        ]);

        setStats({
          schools: schoolsRes.count ?? 0,
          teachers: teachersRes.count ?? 0,
          students: studentsRes.count ?? 0,
        });
      } catch (error) {
        clientLogger.error("[AdminDashboard] init error", error instanceof Error ? error : new Error(String(error)));
        setAuthorized(false);
      }
    }
    init();
  }, [router]);

  const bannerStyle = { background: "linear-gradient(135deg,#DC2626 0%,#7C3AED 100%)" };

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="font-bold text-slate-400">Verifying authorization…</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="font-bold text-slate-400">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
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
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
                ⚠️
              </div>
              <div>
                <p className="font-black text-slate-800 text-sm">Pending Approvals</p>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Schools requesting access
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { href: "/app/admin/schools", emoji: "🏫", label: "Manage Schools" },
            { href: "/app/admin/performance", emoji: "📊", label: "Analytics" },
            { href: "/app/settings", emoji: "⚙️", label: "System Settings" },
            { href: "/app/admin/schools", emoji: "🔐", label: "PIN Management" },
          ].map((action) => (
            <button
                type="button"
              key={action.label}
              onClick={() => router.push(action.href)}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md transition-shadow active:scale-95"
            >
              <div className="text-2xl mb-2">{action.emoji}</div>
              <p className="font-black text-slate-800 text-sm">{action.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
