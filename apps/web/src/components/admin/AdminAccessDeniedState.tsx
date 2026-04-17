"use client";

import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { ShieldAlert } from "lucide-react";

interface AdminAccessDeniedStateProps {
  readonly onNavigateToLogin: () => void;
}

export function AdminAccessDeniedState({
  onNavigateToLogin,
}: AdminAccessDeniedStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-background to-white flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Button
          onClick={onNavigateToLogin}
          variant="outline"
          size="sm"
          className="text-sm border-primary text-primary hover:bg-primary/10"
        >
          ← Back to Login
        </Button>
      </div>

      <AuthCard
        title="Access Denied"
        description="This page is for first-time setup only"
      >
        <div className="space-y-6">
          <div className="bg-error-light border border-error/30 rounded-2xl p-4">
            <div className="flex gap-3">
              <ShieldAlert className="w-6 h-6 text-error shrink-0" />
              <div>
                <p className="text-sm font-semibold text-error">
                  Admin Account Already Exists
                </p>
                <p className="text-xs text-error/80 mt-1">
                  The system already has an admin account configured. For
                  security reasons, new admin accounts can only be created by
                  existing super admins through the admin panel.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p className="text-sm text-slate-800 font-semibold mb-2">
              What to do:
            </p>
            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
              <li>
                Go to <strong>/admin/login</strong> to sign in
              </li>
              <li>
                Contact your system administrator if you need an account
              </li>
              <li>
                Super admins can create new admin accounts in the admin panel
              </li>
            </ul>
          </div>

          <Button
            onClick={onNavigateToLogin}
            className="w-full bg-linear-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
          >
            Go to Admin Login
          </Button>
        </div>
      </AuthCard>
    </div>
  );
}
