/**
 * Student Start Page Step Components
 * Extracted to reduce cognitive complexity of StudentStartPage
 *
 * SP13 PR-2: Refactored to Playful-Bento — ChunkCard wrapper,
 * BentoButton CTAs, RainbowRing around the mascot, pastel blobs.
 */

"use client";

import { BentoButton, ChunkCard, Mascot, RainbowRing } from "@/components/system";
import type { UseAuthStateReturn } from "@/hooks/useAuthState";

interface StepComponentProps {
  readonly loading: boolean;
  readonly actions: UseAuthStateReturn["actions"];
  readonly state: UseAuthStateReturn["state"];
}

export function ChoiceStep({ actions, loading: _loading, state: _state }: StepComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden [background:var(--bento-bg)]">
      {/* Decorative pastel blobs */}
      <div
        className="bento-blob -top-24 -left-24 w-96 h-96"
        style={{ background: "var(--bento-yellow)" }}
        aria-hidden="true"
      />
      <div
        className="bento-blob bottom-0 -right-24 w-80 h-80"
        style={{ background: "var(--bento-pink)" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <ChunkCard size="lg" className="text-center">
          {/* Logo — Jyoti mascot framed by rainbow ring, gentle bob */}
          <div className="mb-5 flex justify-center">
            <RainbowRing>
              <Mascot size="md" animate="bob" priority alt="ATAL AI — Jyoti" />
            </RainbowRing>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2 text-slate-900">
            ATAL <span className="text-(--bento-orange)">AI</span>
          </h1>
          <p className="text-slate-600 font-bold mb-8 text-sm sm:text-base">
            Assam&apos;s Premier Digital Learning Platform
          </p>

          <div className="space-y-3 text-left">
            {/* Sign In — primary orange */}
            <BentoButton
              color="orange"
              size="lg"
              fullWidth
              onClick={() => actions.setMainStep("signin")}
              className="justify-start! gap-4 whitespace-normal h-auto py-4"
            >
              <span className="text-3xl" aria-hidden="true">🎓</span>
              <span className="text-left">
                <span className="block text-base leading-none">Sign In</span>
                <span className="block text-xs font-bold text-white/80 mt-1">
                  Login to your account
                </span>
              </span>
            </BentoButton>

            {/* Create Account */}
            <BentoButton
              color="grey"
              size="lg"
              fullWidth
              onClick={() => actions.setMainStep("signup")}
              className="justify-start! gap-4 whitespace-normal h-auto py-4"
            >
              <span className="text-3xl" aria-hidden="true">✏️</span>
              <span className="text-left">
                <span className="block text-base leading-none">Create Account</span>
                <span className="block text-xs font-bold text-slate-500 mt-1">
                  New student? Sign up here
                </span>
              </span>
            </BentoButton>

            {/* Teacher + Admin row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <a
                href="/teacher/start"
                className="btn-bento btn-bento-sky flex-col gap-2 py-4 px-2 rounded-2xl text-sm"
              >
                <span className="text-2xl" aria-hidden="true">👩‍🏫</span>
                <span>Teacher</span>
              </a>
              <a
                href="/admin/login"
                className="btn-bento btn-bento-purple flex-col gap-2 py-4 px-2 rounded-2xl text-sm"
              >
                <span className="text-2xl" aria-hidden="true">🔒</span>
                <span>Admin</span>
              </a>
            </div>
          </div>
        </ChunkCard>
      </div>
    </div>
  );
}
