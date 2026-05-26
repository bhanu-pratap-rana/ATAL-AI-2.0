"use client";

import { GraduationCap, Lock, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BentoButton, ChunkCard, Mascot, RainbowRing } from "@/components/system";

/**
 * Root landing — role picker.
 *
 * SP13 PR-2: Refactored to Playful-Bento. Mascot now sits inside a
 * rainbow conic-gradient ring (ties the frame to the logo's
 * headphones), the card uses ChunkCard (thick white border + double
 * shadow), and every CTA is a BentoButton with bottom-shadow
 * press-down feedback.
 */
export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden [background:var(--bento-bg)]">
      {/* Decorative pastel blobs — pure decoration, behind content */}
      <div
        className="bento-blob -top-24 -left-24 w-96 h-96"
        style={{ background: "var(--bento-yellow)" }}
        aria-hidden="true"
      />
      <div
        className="bento-blob top-1/2 -right-24 w-80 h-80"
        style={{ background: "var(--bento-purple)" }}
        aria-hidden="true"
      />
      <div
        className="bento-blob bottom-0 left-1/3 w-80 h-80"
        style={{ background: "var(--bento-sky)" }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative w-full max-w-md"
      >
        <ChunkCard size="lg" className="text-center">
          {/* Mascot framed by the rainbow ring */}
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

          <div className="space-y-4 text-left">
            {/* Student — primary orange */}
            <BentoButton
              color="orange"
              size="lg"
              fullWidth
              onClick={() => router.push("/student/start")}
              className="justify-start! gap-4 whitespace-normal h-auto py-4"
            >
              <GraduationCap className="w-7 h-7 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              <span className="text-left">
                <span className="block text-base leading-none">Student Login</span>
                <span className="block text-xs font-bold text-white/80 mt-1">
                  Sign in or create account
                </span>
              </span>
            </BentoButton>

            {/* Teacher + Admin row */}
            <div className="grid grid-cols-2 gap-3">
              <BentoButton
                color="sky"
                size="md"
                fullWidth
                onClick={() => router.push("/teacher/start")}
                className="flex-col gap-2 h-auto py-4 px-2"
              >
                <UserRound className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
                <span className="text-sm">Teacher</span>
              </BentoButton>

              <BentoButton
                color="purple"
                size="md"
                fullWidth
                onClick={() => router.push("/admin/login")}
                className="flex-col gap-2 h-auto py-4 px-2"
              >
                <Lock className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
                <span className="text-sm">Admin</span>
              </BentoButton>
            </div>
          </div>
        </ChunkCard>
      </motion.div>
    </div>
  );
}
