"use client";
export const dynamic = "force-dynamic";

import { useAdminManagement } from "@/hooks/useAdminManagement";
import { AdminLoadingState } from "@/components/admin/manage/AdminLoadingState";
import { AdminUnauthorizedState } from "@/components/admin/manage/AdminUnauthorizedState";
import { StepIndicator } from "@/components/admin/manage/StepIndicator";
import { DeleteUserForm } from "@/components/admin/manage/DeleteUserForm";
import { CreateAdminForm } from "@/components/admin/manage/CreateAdminForm";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";

export default function AdminManagePage() {
  const {
    authStatus,
    step,
    showPassword,
    isLoading,
    completed,
    email,
    password,
    confirmPassword,
    message,
    setStep,
    setEmail,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    handleDeleteUser,
    handleCreateAdmin,
  } = useAdminManagement();

  // Show loading while checking auth status
  if (authStatus === "checking") {
    return <AdminLoadingState />;
  }

  // Show access denied if not super admin
  if (authStatus === "unauthorized") {
    return <AdminUnauthorizedState />;
  }

  const redirectToLogin = () => {
    globalThis.location.href = "/admin/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-background to-surface flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Button
          onClick={redirectToLogin}
          variant="outline"
          size="sm"
          className="text-sm border-primary text-primary hover:bg-primary/10"
        >
          ← Back
        </Button>
      </div>

      <AuthCard
        title="Admin Account Management"
        description="Delete existing admin and create a fresh account"
      >
        <div className="space-y-6">
          {/* Step Indicator */}
          <StepIndicator
            currentStep={step}
            completed={completed}
            onStepChange={setStep}
          />

          {/* STEP 1: DELETE USER */}
          {step === "delete" && (
            <DeleteUserForm
              email={email}
              isLoading={isLoading}
              message={message}
              onEmailChange={setEmail}
              onDelete={handleDeleteUser}
            />
          )}

          {/* STEP 2: CREATE USER */}
          {step === "create" && (
            <CreateAdminForm
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              showPassword={showPassword}
              isLoading={isLoading}
              completed={completed}
              message={message}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onShowPasswordChange={setShowPassword}
              onCreate={handleCreateAdmin}
              onNavigateToLogin={redirectToLogin}
            />
          )}

          {/* Instructions Box */}
          <div className="bg-cyan-lightest border border-cyan/30 rounded-lg p-4">
            <p className="text-sm text-cyan-darkest font-semibold mb-2">
              📋 How It Works:
            </p>
            <ol className="text-xs text-cyan-dark space-y-1 list-decimal list-inside">
              <li>Delete the old admin user account</li>
              <li>Create a new admin account with email and password</li>
              <li>Go to /admin/login and login with your new credentials</li>
              <li>Access the admin panel</li>
            </ol>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}
