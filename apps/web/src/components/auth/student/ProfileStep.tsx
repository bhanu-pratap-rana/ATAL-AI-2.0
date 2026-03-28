/**
 * ProfileStep Component
 * Extracted from StudentStartPage to reduce cognitive complexity
 * Handles student profile setup after account creation
 */

"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { saveStudentProfile } from "@/app/actions/student";
import {
  validateOptionalPhone,
  sanitizeProfilePhone,
} from "@/lib/validation-utils";
import { authLogger } from "@/lib/auth-logger";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseAuthStateReturn } from "@/hooks/useAuthState";

interface ProfileStepProps {
  readonly state: UseAuthStateReturn["state"];
  readonly actions: UseAuthStateReturn["actions"];
  readonly isLoading: boolean;
}

export function ProfileStep({
  state,
  actions,
  isLoading,
}: ProfileStepProps) {
  const [showOptional, setShowOptional] = useState(false);

  // ========================================
  // SAVE PROFILE
  // ========================================
  const handleSaveProfile = useCallback(
    async (e: React.SyntheticEvent) => {
      e.preventDefault();
      actions.setIsLoading(true);
      actions.setProfileError(null);

      // Validate phone if provided
      if (state.profilePhone) {
        const phoneValidation = validateOptionalPhone(state.profilePhone);
        if (!phoneValidation.valid) {
          actions.setProfileError(phoneValidation.error || "Invalid phone");
          actions.setIsLoading(false);
          return;
        }
      }

      try {
        authLogger.debug("[Profile] Saving student profile");
        const sanitizedPhone = state.profilePhone
          ? sanitizeProfilePhone(state.profilePhone)
          : undefined;

        const result = await saveStudentProfile({
          name: state.profileName,
          gender: state.profileGender as "male" | "female",
          phone: sanitizedPhone,
          rollNumber: state.profileRollNumber || undefined,
          schoolName: state.profileSchoolName || undefined,
          className: state.profileClassName || undefined,
          village: state.profileVillage || undefined,
        });

        if (!result.success) {
          authLogger.error("[Profile] Failed to save profile", result);
          actions.setProfileError(result.error || "Failed to save profile");
          toast.error(result.error || "Failed to save profile");
          return;
        }

        authLogger.success("[Profile] Profile saved successfully");
        toast.success("Profile saved! Proceeding to next step...");
        actions.resetProfile();

        // Go to join class or dashboard based on preference
        setTimeout(() => {
          actions.setMainStep("join-class");
        }, 500);
      } catch (error) {
        authLogger.error("[Profile] Unexpected error", error);
        actions.setProfileError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      } finally {
        actions.setIsLoading(false);
      }
    },
    [
      state.profileName,
      state.profileGender,
      state.profilePhone,
      state.profileRollNumber,
      state.profileSchoolName,
      state.profileClassName,
      state.profileVillage,
      actions,
    ],
  );

  return (
    <AuthCard
      title="Set Up Your Profile"
      description="Tell us a bit about yourself"
    >
      <form onSubmit={handleSaveProfile} className="space-y-4">

        {/* ── Required fields ─────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="profile-name">
            Full Name{" "}
            <span aria-hidden="true" className="text-error">*</span>
          </Label>
          <Input
            id="profile-name"
            type="text"
            placeholder="John Doe"
            value={state.profileName}
            onChange={(e) => actions.setProfileName(e.target.value)}
            required
            aria-required="true"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-gender">
            Gender{" "}
            <span aria-hidden="true" className="text-error">*</span>
          </Label>
          <select
            id="profile-gender"
            value={state.profileGender}
            onChange={(e) => actions.setProfileGender(e.target.value as "male" | "female" | "")}
            required
            aria-required="true"
            disabled={isLoading}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-background text-text hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        {/* ── Optional fields toggle ───────────────────────── */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            aria-expanded={showOptional}
            aria-controls="profile-optional-fields"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <span
              aria-hidden="true"
              className={`inline-block transition-transform duration-200 ${showOptional ? "rotate-90" : "rotate-0"}`}
            >
              ▶
            </span>
            {showOptional ? "Hide optional details" : "Add optional details"}
          </button>
        </div>

        {/* ── Optional fields ──────────────────────────────── */}
        {showOptional && (
          <div id="profile-optional-fields" className="space-y-4">

            {/* School Info group */}
            <fieldset className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                School Info
              </legend>

              <div className="space-y-2">
                <Label htmlFor="profile-roll-number">Roll Number</Label>
                <Input
                  id="profile-roll-number"
                  type="text"
                  placeholder="e.g., 12345"
                  value={state.profileRollNumber}
                  onChange={(e) => actions.setProfileRollNumber(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-school-name">School Name</Label>
                <Input
                  id="profile-school-name"
                  type="text"
                  placeholder="e.g., Government High School"
                  value={state.profileSchoolName}
                  onChange={(e) => actions.setProfileSchoolName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-class-name">Class</Label>
                <Input
                  id="profile-class-name"
                  type="text"
                  placeholder="e.g., Class 5"
                  value={state.profileClassName}
                  onChange={(e) => actions.setProfileClassName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </fieldset>

            {/* Contact & Location group */}
            <fieldset className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Contact &amp; Location
              </legend>

              <div className="space-y-2">
                <Label htmlFor="profile-phone">Phone Number</Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={state.profilePhone}
                  onChange={(e) => actions.setProfilePhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-village">Village / Location</Label>
                <Input
                  id="profile-village"
                  type="text"
                  placeholder="e.g., Rangapara"
                  value={state.profileVillage}
                  onChange={(e) => actions.setProfileVillage(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </fieldset>

          </div>
        )}

        {state.profileError && (
          <p
            id="profile-error"
            role="alert"
            className="text-sm text-error"
          >
            {state.profileError}
          </p>
        )}

        <Button
          type="submit"
          className="w-full text-[17px] shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] hover:-translate-y-0.5"
          disabled={isLoading || !state.profileName || !state.profileGender}
          aria-describedby={state.profileError ? "profile-error" : undefined}
        >
          <span>Save Profile &amp; Continue</span>
          <span className="ml-2" aria-hidden="true">→</span>
        </Button>
      </form>
    </AuthCard>
  );
}
