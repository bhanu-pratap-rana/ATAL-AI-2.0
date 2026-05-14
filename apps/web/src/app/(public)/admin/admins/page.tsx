"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminCreateForm } from "@/components/admin/AdminCreateForm";
import { AdminListTable } from "@/components/admin/AdminListTable";
import { ArrowLeft, Crown, Plus, UserRound, Users } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { clientLogger } from "@/lib/client-logger";

export default function AdminsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

        // SECURITY: Only super_admin can access admin management page
        const role = user.app_metadata?.role;
        if (typeof role !== "string" || role !== "super_admin") {
          // Regular admins and other users redirected to PIN management
          router.push("/admin/pins");
          return;
        }
      } catch (error) {
        clientLogger.error("[AdminsPage] Auth check failed", error instanceof Error ? error : { error });
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--bento-orange)"></div>
          <p className="mt-4 text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-12">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Gradient banner — canonical SP13 admin theme */}
        <div
          className="rounded-[32px] p-6 text-white"
          style={{ background: "var(--gradient-admin)" }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black mb-1 inline-flex items-center gap-2">
                <Users className="w-6 h-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                Admin Management
              </h1>
              <p className="text-white/85 text-xs font-black uppercase tracking-widest">
                Create, reset, and delete admin accounts
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => router.push("/admin/dashboard")}
                variant="ghost"
                className="gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md rounded-2xl"
              >
                <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              {!showCreateForm && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  variant="ghost"
                  className="gap-2 bg-white hover:bg-white/95 text-(--bento-purple-d) border border-white/40 rounded-2xl shadow-sm"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                  <span>Create Admin</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main>
        {/* Create Form Section */}
        {showCreateForm && (
          <section className="mb-8 bg-white rounded-3xl shadow p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-text">
                Create New Admin Account
              </h2>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>

            <AdminCreateForm
              onSuccess={() => {
                setShowCreateForm(false);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </section>
        )}

        {/* Admin List Section */}
        <section className="bg-white rounded-3xl shadow border border-slate-100">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-black text-text">
                All Admin Accounts
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Manage all admin accounts in the system. You can create, delete,
              and reset passwords.
            </p>
          </div>

          <div className="p-6">
            <AdminListTable
              refreshTrigger={refreshTrigger}
              onAdminDeleted={() => setRefreshTrigger((prev) => prev + 1)}
            />
          </div>
        </section>

        {/* Help Section */}
        <section className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Super Admin Info */}
            <div className="bg-accent-light border border-accent/30 rounded-2xl p-6">
              <h3 className="font-black text-accent-dark mb-2 inline-flex items-center gap-1.5">
                <Crown size={16} strokeWidth={2.5} aria-hidden="true" />
                Super Admin Role
              </h3>
              <ul className="text-sm text-slate-500 space-y-2 list-disc list-inside">
                <li>Full system access and management</li>
                <li>Can create and delete admin accounts</li>
                <li>Can reset admin passwords</li>
                <li>Can manage school PINs</li>
                <li>Access to admin dashboard and metrics</li>
              </ul>
            </div>

            {/* Regular Admin Info */}
            <div className="bg-primary-lighter border border-primary/30 rounded-2xl p-6">
              <h3 className="font-black text-primary-dark mb-2 flex items-center gap-2">
                <UserRound size={18} strokeWidth={2.25} aria-hidden="true" />
                Regular Admin Role
              </h3>
              <ul className="text-sm text-slate-500 space-y-2 list-disc list-inside">
                <li>Limited to PIN management only</li>
                <li>Can create and rotate school PINs</li>
                <li>Can reset own password only</li>
                <li>Cannot access admin management</li>
                <li>Cannot view system metrics</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}
