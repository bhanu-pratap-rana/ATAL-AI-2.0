/**
 * Student Start Page Step Components
 * Extracted to reduce cognitive complexity of StudentStartPage
 */

"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { UseAuthStateReturn } from "@/hooks/useAuthState";

interface StepComponentProps {
  readonly loading: boolean;
  readonly actions: UseAuthStateReturn["actions"];
  readonly state: UseAuthStateReturn["state"];
}

export function ChoiceStep({ actions, loading: _loading, state: _state }: StepComponentProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-6 sm:p-10 rounded-[48px] shadow-2xl shadow-slate-200">
        {/* Logo */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden" style={{ boxShadow: "var(--shadow-logo-halo)" }}>
          <Image
            src="/assets/logo.png"
            alt="ATAL AI"
            width={96}
            height={96}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3 text-center">ATAL AI</h1>
        <p className="text-slate-500 font-bold mb-10 text-center">Assam&apos;s Premier Digital Learning Platform</p>

        <div className="space-y-4">
          {/* Sign In — primary orange */}
          <Button
            type="button"
            onClick={() => actions.setMainStep("signin")}
            className="w-full h-auto p-5 justify-start gap-4 font-black whitespace-normal"
            style={{ boxShadow: "var(--shadow-primary)" }}
          >
            <span className="text-3xl">🎓</span>
            <div className="text-left">
              <p className="text-base font-black leading-none">Sign In</p>
              <p className="text-xs font-bold text-white/80 mt-1">Login to your account</p>
            </div>
          </Button>

          {/* Create Account */}
          <Button
            type="button"
            variant="outline"
            onClick={() => actions.setMainStep("signup")}
            className="w-full h-auto p-5 justify-start gap-4 border-2 font-black whitespace-normal"
          >
            <span className="text-3xl">✏️</span>
            <div className="text-left">
              <p className="text-base font-black leading-none">Create Account</p>
              <p className="text-xs font-bold text-slate-400 mt-1">New student? Sign up here</p>
            </div>
          </Button>

          {/* Teacher + Admin row */}
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/teacher/start"
              className="flex flex-col items-center gap-2 p-5 rounded-2xl text-white font-black transition-all active:scale-95 hover:opacity-90"
              style={{ background: "var(--gradient-teacher)" }}
            >
              <span className="text-2xl">👩‍🏫</span>
              <span className="text-sm font-black">Teacher</span>
            </a>

            <a
              href="/admin/login"
              className="flex flex-col items-center gap-2 p-5 rounded-2xl text-white font-black transition-all active:scale-95 hover:opacity-90 bg-slate-900"
            >
              <span className="text-2xl">🔒</span>
              <span className="text-sm font-black">Admin</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
