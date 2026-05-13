/**
 * TeacherChoiceStep Component
 * Extracted from teacher/start/page.tsx to reduce cognitive complexity
 * Allows user to choose between creating a new account or logging in
 */

"use client";

import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TeacherOnboardingActions } from "@/hooks/useTeacherOnboarding";

interface TeacherChoiceStepProps {
  readonly actions: TeacherOnboardingActions;
}

export function TeacherChoiceStep({ actions }: TeacherChoiceStepProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-6 sm:p-10 rounded-[48px] shadow-2xl shadow-slate-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-primary-sm)" }}>
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1">Teacher Portal</h1>
          <p className="text-slate-500 font-bold text-sm">Are you a new or existing teacher?</p>
        </div>

        <div className="space-y-3">
          {/* Create Account Button */}
          <Button
            type="button"
            onClick={() => actions.setStep("auth")}
            className="w-full h-auto p-5 justify-start gap-4 font-black whitespace-normal"
            style={{ boxShadow: "var(--shadow-primary)" }}
          >
            <GraduationCap className="w-6 h-6 shrink-0" />
            <div className="text-left">
              <p className="text-base font-black leading-none">Create New Account</p>
              <p className="text-xs font-bold text-white/80 mt-1">New teacher registration</p>
            </div>
          </Button>

          {/* Login Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => actions.setStep("login")}
            className="w-full h-auto p-5 justify-start gap-4 border-2 border-slate-200 hover:border-primary/40 hover:text-primary text-slate-700 font-black whitespace-normal"
          >
            <GraduationCap className="w-6 h-6 shrink-0 text-slate-400" />
            <div className="text-left">
              <p className="text-base font-black leading-none">Login to Account</p>
              <p className="text-xs font-bold text-slate-500 mt-1">Existing teacher login</p>
            </div>
          </Button>

          {/* Info Box */}
          <div className="bg-info-light border-l-4 border-info p-4 rounded-xl">
            <p className="text-sm text-info-dark">
              <strong>New or returning?</strong>
              <br />
              <span className="text-xs text-info-dark/80">
                New teachers need school verification. Existing teachers can login with email &amp; password.
              </span>
            </p>
          </div>

          {/* Back Button */}
          <div className="text-center pt-2">
            <Button
              type="button"
              variant="link"
              onClick={() => router.push("/")}
              className="text-sm font-bold text-slate-500 hover:text-primary"
            >
              ← Back to home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
