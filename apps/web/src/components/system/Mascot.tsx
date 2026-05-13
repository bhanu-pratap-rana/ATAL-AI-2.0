"use client";

/**
 * Mascot
 *
 * The "Jyoti" mascot — an SVG illustration that lives at
 * `/public/assets/logo.png` (the existing ATAL AI logo robot).
 * This component wraps it in a sized circular frame with the
 * design-system logo halo and an optional gentle bob animation.
 *
 * Use cases:
 * - Hero placement on /student/start (with animate="bob" for idle life)
 * - Empty states across "no X yet" screens (size="md")
 * - Lesson completion celebrations (size="xl", animate="pop")
 *
 * Per SP7 Phase A T-A4. Consumes the shared motion variants from
 * `@/lib/motion`, so prefers-reduced-motion users see a static
 * mascot (MotionConfigProvider in app root forwards their OS setting).
 */

import Image from "next/image";
import { motion } from "framer-motion";
import { bob, pop } from "@/lib/motion";

type MascotSize = "sm" | "md" | "lg" | "xl";

interface MascotProps {
  readonly size?: MascotSize;
  readonly animate?: "bob" | "pop" | "none";
  readonly className?: string;
  readonly alt?: string;
  readonly priority?: boolean;
}

const SIZE_PX: Record<MascotSize, number> = {
  sm: 64,
  md: 96,
  lg: 128,
  xl: 192,
};

export function Mascot({
  size = "md",
  animate = "none",
  className = "",
  alt = "Jyoti — ATAL AI mascot",
  priority = false,
}: MascotProps) {
  const px = SIZE_PX[size];

  const inner = (
    <div
      className={`rounded-full overflow-hidden ${className}`}
      style={{
        width: px,
        height: px,
        boxShadow: "var(--shadow-logo-halo)",
      }}
    >
      <Image
        src="/assets/logo.png"
        alt={alt}
        width={px}
        height={px}
        className="w-full h-full object-cover"
        priority={priority}
      />
    </div>
  );

  if (animate === "bob") {
    return (
      <motion.div
        variants={bob}
        animate="idle"
        // Avoid hydration mismatch: the bob variant animates `y`,
        // and motion's CSS at SSR time differs from the first
        // client frame. `initial={false}` skips the SSR-vs-client
        // diff and starts from the current DOM state.
        initial={false}
        style={{ display: "inline-block" }}
        suppressHydrationWarning
      >
        {inner}
      </motion.div>
    );
  }
  if (animate === "pop") {
    return (
      <motion.div
        variants={pop}
        initial="hidden"
        animate="visible"
        style={{ display: "inline-block" }}
        suppressHydrationWarning
      >
        {inner}
      </motion.div>
    );
  }
  return inner;
}
