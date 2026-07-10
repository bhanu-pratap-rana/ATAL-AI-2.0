/**
 * TeacherChoiceStep Component
 * Extracted from teacher/start/page.tsx to reduce cognitive complexity
 * Allows user to choose between creating a new account or logging in
 *
 * SP13 PR-5: Refactored to Playful-Bento.
 */

"use client";

import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { BentoButton, ChunkCard } from "@/components/system";
import type { TeacherOnboardingActions } from "@/hooks/useTeacherOnboarding";

interface TeacherChoiceStepProps {
  readonly actions: TeacherOnboardingActions;
}

export function TeacherChoiceStep({ actions }: TeacherChoiceStepProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden [background:var(--bento-bg)]">
      <div
        className="bento-blob -top-20 -left-20 w-96 h-96"
        style={{ background: "var(--bento-sky)" }}
        aria-hidden="true"
      />
      <div
        className="bento-blob bottom-0 -right-20 w-80 h-80"
        style={{ background: "var(--bento-yellow)" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <ChunkCard size="lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border-4 border-white shadow-sm"
              style={{ background: "var(--gradient-teacher)" }}
            >
              <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">Teacher Portal</h1>
            <p className="text-slate-500 font-bold text-sm">Are you a new or existing teacher?</p>
          </div>

          <div className="space-y-3">
            {/* Create Account Button */}
            <BentoButton
              color="sky"
              size="lg"
              fullWidth
              onClick={() => actions.setStep("auth")}
              className="justify-start! gap-4 whitespace-normal h-auto py-4"
            >
              <GraduationCap className="w-6 h-6 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              <span className="text-left">
                <span className="block text-base leading-none">Create New Account</span>
                <span className="block text-xs font-bold opacity-90 mt-1">New teacher registration</span>
              </span>
            </BentoButton>

            {/* Login Button */}
            <BentoButton
              color="grey"
              size="lg"
              fullWidth
              onClick={() => actions.setStep("login")}
              className="justify-start! gap-4 whitespace-normal h-auto py-4"
            >
              <GraduationCap className="w-6 h-6 shrink-0 text-slate-400" />
              <span className="text-left">
                <span className="block text-base leading-none">Login to Account</span>
                <span className="block text-xs font-bold text-slate-500 mt-1">Existing teacher login</span>
              </span>
            </BentoButton>

            {/* Info Box */}
            <div className="[background:var(--bento-tint-sky)] border-l-4 border-(--bento-sky) p-4 rounded-2xl">
              <p className="text-sm text-(--bento-sky-d) font-bold">
                <strong>New or returning?</strong>
                <br />
                <span className="text-xs font-bold opacity-90">
                  New teachers need school verification. Existing teachers can login with email &amp; password.
                </span>
              </p>
            </div>

            {/* Back Button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-sm font-bold text-slate-500 hover:text-(--bento-sky-d) underline-offset-4 hover:underline"
              >
                ← Back to home
              </button>
            </div>
          </div>
        </ChunkCard>
      </div>
    </div>
  );
}
