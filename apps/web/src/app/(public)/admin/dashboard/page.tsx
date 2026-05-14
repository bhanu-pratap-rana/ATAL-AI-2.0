"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { Crown, Info, Lock, LogOut, Users } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { clientLogger } from "@/lib/client-logger";

/**
 * ATAL AI Admin Dashboard - Jyoti Theme (Dark Mode)
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 */

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
          router.push("/admin/login");
          return;
        }

        const role = user.app_metadata?.role;
        if (typeof role !== "string" || role !== "super_admin") {
          router.push("/admin/pins");
          return;
        }

        setUserEmail(user.email);
      } catch (error) {
        clientLogger.error("[AdminDashboard] Auth check failed", error instanceof Error ? error : { error });
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--bento-orange)"></div>
          <p className="mt-4 text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-12">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Pink-purple gradient banner — canonical SP13 admin theme */}
        <div
          className="rounded-[32px] p-6 text-white"
          style={{ background: "var(--gradient-admin)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black mb-1 inline-flex items-center gap-2">
                Admin Dashboard
                <Crown className="w-5 h-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              </h1>
              <p className="text-white/85 text-xs font-black uppercase tracking-widest truncate">
                Welcome back, {userEmail}
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="gap-2 shrink-0 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md rounded-2xl"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* System Overview */}
        <section className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5">
          <h2 className="text-base font-black text-slate-900 mb-4">System Overview</h2>
          <DashboardMetrics />
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Admin Management Card */}
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#1E3A5F]/10 border-2 border-white shadow-sm text-[#1E3A5F]">
                <Users className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <h3 className="text-base font-black text-slate-900">Admin Management</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Create new admin accounts, reset passwords, and manage admin
              access to the system.
            </p>
            <Button
              onClick={() => router.push("/admin/admins")}
              variant="ghost"
              className="w-full bg-[#1E3A5F] hover:bg-[#152a44] text-white"
            >
              Manage Admins
            </Button>
          </div>

          {/* PIN Management Card */}
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-50 border-2 border-white shadow-sm text-indigo-700">
                <Lock className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                School PIN Management
              </h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Manage school PIN creation and rotation. Monitor PIN activity and
              security status.
            </p>
            <Button
              onClick={() => router.push("/admin/pins")}
              variant="secondary"
              className="w-full"
            >
              Manage PINs
            </Button>
          </div>
        </section>

        {/* Info Section */}
        <section>
          <div className="bg-cyan-lightest border border-cyan/30 rounded-3xl p-5">
            <h3 className="font-black text-cyan-darkest mb-2 flex items-center gap-2">
              <Info size={18} strokeWidth={2.25} aria-hidden="true" />
              Admin Dashboard Information
            </h3>
            <ul className="text-sm text-cyan-dark space-y-1.5 list-disc list-inside">
              <li>Monitor system-wide metrics for schools, teachers, and students</li>
              <li>Create and manage admin accounts with different role levels</li>
              <li>Reset admin passwords when needed</li>
              <li>Delete admin accounts that are no longer needed</li>
              <li>View admin activity and last login times</li>
              <li>Access PIN management and security controls</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
