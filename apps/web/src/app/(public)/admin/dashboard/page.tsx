"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { LogOut, Users, Lock, Crown } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-surface via-background to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-background to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-12 h-12 flex-shrink-0">
              <Image
                src="/assets/logo.png"
                alt="ATAL AI Logo"
                width={48}
                height={48}
                className="w-full h-full object-contain rounded-full ring-2 ring-white ring-offset-2 ring-offset-primary shadow-primary-md"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-text">
                  Admin Dashboard
                </h1>
                {/* Super Admin Crown - Gold Accent */}
                <div className="bg-accent-light p-1.5 rounded-lg flex-shrink-0">
                  <Crown className="w-4 h-4 text-accent-dark" />
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1 truncate">
                Welcome back, {userEmail}
              </p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="destructive"
            className="gap-2 flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Metrics Section */}
        <section className="mb-8">
          <h2 className="text-xl font-black text-text mb-4">System Overview</h2>
          <DashboardMetrics />
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Management Card */}
          <div className="bg-white rounded-3xl shadow p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              {/* Icon Box - Primary Light */}
              <div className="w-12 h-12 bg-primary-lighter rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-black text-text">Admin Management</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Create new admin accounts, reset passwords, and manage admin
              access to the system.
            </p>
            <Button
              onClick={() => router.push("/admin/admins")}
              className="w-full"
            >
              Manage Admins
            </Button>
          </div>

          {/* PIN Management Card */}
          <div className="bg-white rounded-3xl shadow p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              {/* Icon Box - Primary Light */}
              <div className="w-12 h-12 bg-primary-lighter rounded-2xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-black text-text">
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
        <section className="mt-8">
          <div className="bg-cyan-lightest border border-cyan/30 rounded-2xl p-6">
            <h3 className="font-black text-cyan-darkest mb-2">
              ℹ️ Admin Dashboard Information
            </h3>
            <ul className="text-sm text-cyan-dark space-y-2 list-disc list-inside">
              <li>
                Monitor system-wide metrics for schools, teachers, and students
              </li>
              <li>
                Create and manage admin accounts with different role levels
              </li>
              <li>Reset admin passwords when needed</li>
              <li>Delete admin accounts that are no longer needed</li>
              <li>View admin activity and last login times</li>
              <li>Access PIN management and security controls</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
