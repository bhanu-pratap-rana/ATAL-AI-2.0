/**
 * TeacherChoiceStep Component
 * Extracted from teacher/start/page.tsx to reduce cognitive complexity
 * Allows user to choose between creating a new account or logging in
 */

"use client";

import { useRouter } from "next/navigation";
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)" }}>
            👩‍🏫
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1">Teacher Portal</h1>
          <p className="text-slate-400 font-bold text-sm">Are you a new or existing teacher?</p>
        </div>

        <div className="space-y-3">
          {/* Create Account Button */}
          <button
                type="button"
            onClick={() => actions.setStep("auth")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl text-white font-black transition-all active:scale-95 hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)", boxShadow: "0 4px 14px 0 rgba(59,130,246,0.39)" }}
          >
            <span className="text-2xl">✨</span>
            <div className="text-left">
              <p className="text-base font-black leading-none">Create New Account</p>
              <p className="text-xs font-bold text-white/80 mt-1">New teacher registration</p>
            </div>
          </button>

          {/* Login Button */}
          <button
                type="button"
            onClick={() => actions.setStep("login")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl font-black transition-all active:scale-95 border-2 border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700"
          >
            <span className="text-2xl">🔓</span>
            <div className="text-left">
              <p className="text-base font-black leading-none">Login to Account</p>
              <p className="text-xs font-bold text-slate-400 mt-1">Existing teacher login</p>
            </div>
          </button>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>💡 Choose your option:</strong>
              <br />
              <span className="text-xs text-blue-700">
                New teachers need school verification. Existing teachers can login with email &amp; password.
              </span>
            </p>
          </div>

          {/* Back Button */}
          <div className="text-center pt-2">
            <button
                type="button"
              onClick={() => router.push("/")}
              className="text-sm font-bold text-slate-400 hover:text-blue-500 transition-colors"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
