/**
 * PINManagementHeader Component
 *
 * Canonical SP13 admin theme: pink-purple gradient banner with title,
 * back-to-dashboard, and sign-out actions inside a translucent action
 * bar (matches /admin/dashboard and /app/admin/* surfaces).
 */

import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PINManagementHeaderProps {
  readonly isSuperAdmin: boolean;
  readonly onSignOut: () => Promise<void>;
  readonly onDashboardClick: () => void;
}

export function PINManagementHeader({
  isSuperAdmin,
  onSignOut,
  onDashboardClick,
}: PINManagementHeaderProps) {
  return (
    <div
      className="rounded-[32px] p-6 text-white"
      style={{ background: "var(--gradient-admin)" }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black mb-1 inline-flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            School PIN Management
          </h1>
          <p className="text-white/85 text-xs font-black uppercase tracking-widest">
            Manage and rotate verification PINs
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSuperAdmin && (
            <Button
              onClick={onDashboardClick}
              variant="ghost"
              className="gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md rounded-2xl"
            >
              <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          )}

          <Button
            onClick={onSignOut}
            variant="ghost"
            className="gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md rounded-2xl"
            aria-label="Sign out"
          >
            <LogOut size={18} strokeWidth={2.25} aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
