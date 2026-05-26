"use client";

/**
 * StatChip
 *
 * Small pill used on the dashboard header to show streak, XP, gems,
 * and hearts. Each variant pairs an emoji glyph with the bento tint
 * palette.
 *
 * Per SP13 PR-1.
 *
 * @example
 *   <StatChip variant="streak" value={7} />
 *   <StatChip variant="xp" value={245} />
 *   <StatChip variant="gems" value={12} />
 */

import { cn } from "@/lib/utils";

type StatVariant = "streak" | "xp" | "gems" | "hearts";

interface StatChipProps {
  readonly variant: StatVariant;
  readonly value: number | string;
  readonly className?: string;
  readonly label?: string;
}

const VARIANT_CONFIG: Record<
  StatVariant,
  { glyph: string; bg: string; color: string }
> = {
  streak: {
    glyph: "🔥",
    bg: "[background:var(--bento-tint-yellow)]",
    color: "text-[#5A4400]",
  },
  xp: {
    glyph: "⭐",
    bg: "[background:#FFE2A0]",
    color: "text-[#5A4400]",
  },
  gems: {
    glyph: "💎",
    bg: "[background:var(--bento-tint-purple)]",
    color: "text-[#3F2BAE]",
  },
  hearts: {
    glyph: "❤️",
    bg: "[background:var(--bento-tint-pink)]",
    color: "text-[#A8326C]",
  },
};

export function StatChip({ variant, value, label, className }: StatChipProps) {
  const config = VARIANT_CONFIG[variant];
  return (
    <span
      className={cn(
        "stat-chip",
        config.bg,
        config.color,
        className,
      )}
      aria-label={label ?? `${variant}: ${value}`}
    >
      <span aria-hidden="true">{config.glyph}</span>
      <span>{value}</span>
    </span>
  );
}
