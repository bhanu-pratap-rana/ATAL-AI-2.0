"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FeatureFlagToggle } from "@/components/admin/FeatureFlagToggle";
import {
  LogOut,
  ArrowLeft,
  Flag,
  RefreshCw,
  Search,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@supabase/ssr";
import { clientLogger } from "@/lib/client-logger";

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  whitelist_user_ids: string[];
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Feature Flags Admin Page
 *
 * Allows admins to toggle feature flags, adjust rollout percentages,
 * and manage user whitelists for gradual feature rollouts.
 *
 * Security: Only accessible by admin/super_admin users (RLS enforced)
 */
export default function FeatureFlagsAdminPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchFlags = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("feature_flags")
        .select("*")
        .order("name");

      if (fetchError) {
        throw fetchError;
      }

      setFlags(data || []);
      setError(null);
    } catch (err) {
      clientLogger.error("[FeatureFlagsAdmin] Error fetching flags", err instanceof Error ? err : { err });
      setError("Failed to load feature flags. Please try again.");
    }
  }, [supabase]);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
          router.push("/admin/login");
          return;
        }

        // Check admin role
        const role = user.app_metadata?.role;
        if (
          typeof role !== "string" ||
          !["admin", "super_admin"].includes(role)
        ) {
          clientLogger.warn("[FeatureFlagsAdmin] Non-admin access attempt", {
            role,
          });
          router.push("/admin/login");
          return;
        }

        setUserEmail(user.email);
        await fetchFlags();
      } catch (err) {
        clientLogger.error("[FeatureFlagsAdmin] Auth check failed", err instanceof Error ? err : { err });
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [router, supabase, fetchFlags]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFlags();
    setIsRefreshing(false);
  };

  const handleUpdateFlag = async (
    flagId: string,
    updates: Partial<
      Pick<FeatureFlag, "enabled" | "rollout_percentage" | "whitelist_user_ids">
    >
  ) => {
    try {
      const { error: updateError } = await supabase
        .from("feature_flags")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", flagId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setFlags((prev) =>
        prev.map((flag) =>
          flag.id === flagId
            ? { ...flag, ...updates, updated_at: new Date().toISOString() }
            : flag
        )
      );

      clientLogger.info("[FeatureFlagsAdmin] Flag updated", {
        flagId,
        updates,
      });
    } catch (err) {
      clientLogger.error("[FeatureFlagsAdmin] Error updating flag", err instanceof Error ? err : { err });
      throw err;
    }
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  // Filter flags by search query
  const filteredFlags = flags.filter(
    (flag) =>
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const enabledCount = flags.filter((f) => f.enabled).length;
  const fullRolloutCount = flags.filter(
    (f) => f.enabled && f.rollout_percentage === 100
  ).length;
  const partialRolloutCount = flags.filter(
    (f) => f.enabled && f.rollout_percentage > 0 && f.rollout_percentage < 100
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--bento-orange)"></div>
          <p className="mt-4 text-slate-500">Loading feature flags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-12">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Gradient banner — canonical SP13 admin theme */}
        <div
          className="rounded-[32px] p-6 text-white"
          style={{ background: "var(--gradient-admin)" }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black mb-1 inline-flex items-center gap-2">
                <Flag className="w-6 h-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                Feature Flags
              </h1>
              <p className="text-white/85 text-xs font-black uppercase tracking-widest truncate">
                {userEmail ? `${userEmail} · ` : ""}Manage gradual rollouts and A/B testing
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
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md rounded-2xl"
                aria-label="Sign out"
              >
                <LogOut size={18} strokeWidth={2.25} aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-4">
            <div className="text-xl sm:text-2xl font-black text-text">{flags.length}</div>
            <div className="text-sm text-slate-500">Total Flags</div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 p-4">
            <div className="text-xl sm:text-2xl font-black text-success">
              {enabledCount}
            </div>
            <div className="text-sm text-slate-500">
              Enabled ({fullRolloutCount} full, {partialRolloutCount} partial)
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 p-4">
            <div className="text-xl sm:text-2xl font-black text-slate-400">
              {flags.length - enabledCount}
            </div>
            <div className="text-sm text-slate-500">Disabled</div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-error-light border border-error/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <p className="text-error-dark">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Search & Refresh */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search flags by name, ID, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Flags List */}
        <div className="space-y-3">
          {filteredFlags.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center">
              <Flag className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-black text-text mb-1">
                {searchQuery ? "No flags found" : "No feature flags"}
              </h3>
              <p className="text-slate-500">
                {searchQuery
                  ? `No flags match "${searchQuery}"`
                  : "Feature flags will appear here once created in the database."}
              </p>
            </div>
          ) : (
            filteredFlags.map((flag) => (
              <FeatureFlagToggle
                key={flag.id}
                flag={flag}
                onUpdate={handleUpdateFlag}
              />
            ))
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-cyan-lightest border border-cyan/30 rounded-2xl p-6">
          <h3 className="font-black text-cyan-darkest mb-2">
            How Feature Flags Work
          </h3>
          <ul className="text-sm text-cyan-dark space-y-2 list-disc list-inside">
            <li>
              <strong>Enabled/Disabled:</strong> Master switch for the feature
            </li>
            <li>
              <strong>Rollout Percentage:</strong> Controls what % of users see
              the feature (based on user ID hash for consistency)
            </li>
            <li>
              <strong>Whitelist:</strong> Users in the whitelist always have
              access, regardless of rollout %
            </li>
            <li>
              Changes take effect immediately - no deployment needed
            </li>
          </ul>
        </div>
      </main>
      </div>
    </div>
  );
}
