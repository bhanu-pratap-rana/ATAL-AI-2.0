"use client";

/**
 * MugaCard
 *
 * Achievement / completion variant of the Card primitive. Wraps content
 * in a surface that animates a slow horizontal gradient sweep, evoking
 * the gold sheen of Assam's traditional Muga silk.
 *
 * Use cases:
 * - Completed module tiles on /app/learn (tier="completed")
 * - Lesson-completion modal banner (tier="mastered")
 * - Top of /app/progress (overall mastery summary)
 *
 * The shimmer pauses for users with prefers-reduced-motion (forwarded by
 * MotionConfigProvider at the app root).
 *
 * Per SP7 Phase A T-A4.
 */

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { muga, fadeInUp } from "@/lib/motion";

type MugaTier = "completed" | "mastered";

interface MugaCardProps {
  readonly children: ReactNode;
  readonly tier?: MugaTier;
  readonly entrance?: boolean;
  readonly className?: string;
}

// Two gradient bases — `completed` is subtler than `mastered`.
// Both use the muga-gold token; the difference is contrast & saturation.
const GRADIENT_BY_TIER: Record<MugaTier, string> = {
  completed:
    "linear-gradient(110deg, var(--brand-muga) 0%, #F5D898 20%, var(--brand-muga) 40%, #F5D898 60%, var(--brand-muga) 80%, #F5D898 100%)",
  mastered:
    "linear-gradient(110deg, var(--brand-muga) 0%, #FBE8B8 25%, #E8B14C 50%, #FBE8B8 75%, var(--brand-muga) 100%)",
};

export function MugaCard({
  children,
  tier = "completed",
  entrance = true,
  className = "",
}: MugaCardProps) {
  return (
    <motion.div
      variants={entrance ? fadeInUp : undefined}
      initial={entrance ? "hidden" : false}
      animate={entrance ? "visible" : undefined}
      className={`rounded-3xl border border-amber-200/60 p-5 ${className}`}
      style={{
        backgroundImage: GRADIENT_BY_TIER[tier],
        backgroundSize: "200% 100%",
      }}
    >
      <motion.div
        variants={muga}
        initial="rest"
        animate="shimmer"
        className="contents"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
