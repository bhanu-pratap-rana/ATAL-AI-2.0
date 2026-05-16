"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listAdminAccounts,
  deleteAdminAccount,
  resetAdminPassword,
} from "@/app/actions/admin-management";
import type { AdminUser } from "@/app/actions/admin-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, RotateCcw, AlertCircle, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { clientLogger } from "@/lib/client-logger";

interface AdminListTableProps {
  readonly refreshTrigger?: number;
  readonly onAdminDeleted?: () => void;
}

/**
 * Get role badge styling based on admin role
 */
function getRoleBadgeClass(role: string): string {
  // Navy palette for the admin role. Super-admin gets the deeper navy
  // chip (Brahmaputra blue family); regular admin gets a softer indigo
  // chip. Both pair cleanly with the navy gradient banner introduced in
  // SP13 PR-32.
  if (role === "super_admin") {
    return "bg-[#1E3A5F]/10 text-[#1E3A5F]";
  }
  return "bg-indigo-50 text-indigo-700";
}

/**
 * Get role display text
 */
function getRoleText(role: string): string {
  return role === "super_admin" ? "Super Admin" : "Admin";
}

/**
 * Modal button text states - S2301 compliance (no boolean params)
 */
const MODAL_BUTTON_TEXT = {
  active: "Resetting...",
  idle: "Reset Password",
} as const;

/**
 * AdminListTable - Display list of all admin accounts
 */
export function AdminListTable({
  refreshTrigger = 0,
  onAdminDeleted,
}: AdminListTableProps) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetingId, setResetingId] = useState<string | null>(null);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetAdmin, setResetAdmin] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listAdminAccounts();
      if (result.success && Array.isArray(result.data)) {
        setAdmins(result.data as AdminUser[]);
      } else {
        setError(result.error || "Failed to load admin accounts");
      }
    } catch (error) {
      clientLogger.error(
        "[AdminListTable] Error loading admins",
        error instanceof Error ? error : { error: String(error) },
      );
      setError("An error occurred while loading admins");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins, refreshTrigger]);

  const handleDeleteAdmin = useCallback(
    async (adminId: string, email: string) => {
      if (
        !globalThis.confirm(
          `Are you sure you want to delete ${email}? This cannot be undone.`,
        )
      ) {
        return;
      }

      setDeletingId(adminId);
      try {
        const result = await deleteAdminAccount(adminId);
        if (result.success) {
          toast.success("Admin account deleted successfully");
          setAdmins((prevAdmins) =>
            prevAdmins.filter((a) => a.id !== adminId),
          );
          if (onAdminDeleted) {
            onAdminDeleted();
          }
        } else {
          toast.error(result.error || "Failed to delete admin account");
        }
      } catch (error) {
        clientLogger.error(
          "[AdminListTable] Error deleting admin",
          error instanceof Error ? error : { error: String(error) },
        );
        toast.error("An error occurred while deleting admin");
      } finally {
        setDeletingId(null);
      }
    },
    [onAdminDeleted],
  );

  const openResetModal = useCallback((adminId: string, email: string) => {
    setResetAdmin({ id: adminId, email });
    setNewPassword("");
    setShowPassword(false);
    setResetError(null);
    setShowResetModal(true);
  }, []);

  const closeResetModal = useCallback(() => {
    setShowResetModal(false);
    setResetAdmin(null);
    setNewPassword("");
    setResetError(null);
  }, []);

  const handleResetPassword = useCallback(async () => {
    if (!resetAdmin) return;

    if (!newPassword) {
      setResetError("Please enter a new password");
      return;
    }

    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters");
      return;
    }

    setResetingId(resetAdmin.id);
    setResetError(null);

    try {
      const result = await resetAdminPassword(resetAdmin.id, newPassword);
      if (result.success) {
        toast.success("Password reset successfully");
        closeResetModal();
      } else {
        setResetError(result.error || "Failed to reset password");
      }
    } catch (error) {
      clientLogger.error(
        "[AdminListTable] Error resetting password",
        error instanceof Error ? error : { error: String(error) },
      );
      setResetError("An error occurred while resetting password");
    } finally {
      setResetingId(null);
    }
  }, [resetAdmin, newPassword, closeResetModal]);

  if (isLoading) {
    return <div className="text-center py-8">Loading admin accounts...</div>;
  }

  if (error) {
    return (
      <div className="bg-error-light border border-error/30 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  if (admins.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">No admin accounts found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-text">
                Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text">
                Role
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text">
                Created
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text">
                Last Login
              </th>
              <th className="px-4 py-3 text-left font-semibold text-text">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr
                key={admin.id}
                className="border-b border-slate-200 hover:bg-slate-50"
              >
                <td className="px-4 py-3 text-text">{admin.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(admin.role)}`}
                  >
                    {getRoleText(admin.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(admin.created_at as string).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {admin.last_sign_in_at
                    ? new Date(
                        admin.last_sign_in_at as string,
                      ).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openResetModal(admin.id, admin.email)}
                      disabled={resetingId === admin.id}
                      size="sm"
                      variant="ghost"
                      className="text-xs border-2 border-[#1E3A5F]/30 bg-white text-[#1E3A5F] hover:bg-[#1E3A5F]/5"
                      title="Reset Password"
                    >
                      {resetingId === admin.id ? (
                        <>
                          <RotateCcw className="w-3 h-3 mr-1 animate-spin" strokeWidth={2.5} aria-hidden="true" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3 h-3 mr-1" strokeWidth={2.5} aria-hidden="true" />
                          Reset
                        </>
                      )}
                    </Button>

                    {admin.role !== "super_admin" && (
                      <Button
                        onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                        disabled={deletingId === admin.id}
                        size="sm"
                        variant="outline"
                        className="text-xs text-error border-error/30 hover:bg-error-light"
                        title="Delete Admin"
                      >
                        {deletingId === admin.id ? (
                          <>
                            <Trash2 className="w-3 h-3 mr-1 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && resetAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-black text-text">Reset Password</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeResetModal}
                aria-label="Close password reset dialog"
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Enter a new password for <strong>{resetAdmin.email}</strong>
              </p>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {resetError && <p className="text-sm text-error">{resetError}</p>}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
              <Button
                onClick={closeResetModal}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={resetingId === resetAdmin.id}
                variant="ghost"
                className="flex-1 bg-[#1E3A5F] hover:bg-[#152a44] text-white"
              >
                {resetingId === resetAdmin.id ? MODAL_BUTTON_TEXT.active : MODAL_BUTTON_TEXT.idle}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
