"use client";

/**
 * RainbowRing
 *
 * Wraps a round child (typically the Jyoti mascot logo) with a 3px
 * conic-gradient rainbow ring. The ring uses the same brand colors
 * found in the logo headphones, tying the mascot frame to the logo
 * itself.
 *
 * Per SP13 PR-1. Apply around <Mascot /> on hero placements.
 *
 * @example
 *   <RainbowRing>
 *     <Mascot size="lg" animate="bob" />
 *   </RainbowRing>
 */

import { cn } from "@/lib/utils";

interface RainbowRingProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function RainbowRing({ children, className }: RainbowRingProps) {
  return (
    <span className={cn("ring-rainbow-frame", className)}>
      {children}
    </span>
  );
}
