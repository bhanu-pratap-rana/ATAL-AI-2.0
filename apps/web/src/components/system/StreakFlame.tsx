"use client";

/**
 * StreakFlame
 *
 * Compact pill that surfaces a student's consecutive-day streak with a
 * lit-up flame icon. Used on:
 * - Student dashboard banner (current placement)
 * - /app/learn header (future B3 refresh)
 * - /app/progress section header
 *
 * The flame visually escalates with streak length:
 *   0–6 days  → subtle white-on-glass (no glow)
 *   7+        → muga-gold glow (week-long discipline rewarded)
 *   30+       → brahmaputra-blue glow (month — "in flow")
 *   100+      → bihu-red glow (celebration tier)
 *
 * Per SP7 Phase A T-A4.
 */

import { Flame } from "lucide-react";

interface StreakFlameProps {
  readonly days: number;
  /** When rendered on top of a dark/gradient banner (e.g. orange banner) */
  readonly onDark?: boolean;
  readonly className?: string;
}

function getStreakTier(days: number): "subtle" | "muga" | "brahmaputra" | "bihu" {
  if (days >= 100) return "bihu";
  if (days >= 30) return "brahmaputra";
  if (days >= 7) return "muga";
  return "subtle";
}

function getTierClasses(tier: ReturnType<typeof getStreakTier>, onDark: boolean) {
  if (tier === "bihu") {
    return {
      bg: onDark ? "bg-white/20 ring-2 ring-bihu-red/60" : "bg-red-50 ring-2 ring-bihu-red/60",
      iconColor: "text-bihu-red fill-bihu-red",
    };
  }
  if (tier === "brahmaputra") {
    return {
      bg: onDark
        ? "bg-white/20 ring-2 ring-brahmaputra-2/60"
        : "bg-brahmaputra-1/10 ring-2 ring-brahmaputra-2/60",
      iconColor: "text-brahmaputra-2 fill-brahmaputra-2",
    };
  }
  if (tier === "muga") {
    return {
      bg: onDark ? "bg-white/20 ring-2 ring-muga/60" : "bg-amber-50 ring-2 ring-muga/60",
      iconColor: "text-muga fill-muga",
    };
  }
  return {
    bg: onDark ? "bg-white/20" : "bg-slate-50",
    iconColor: onDark ? "text-yellow-200 fill-yellow-200" : "text-amber-500 fill-amber-500",
  };
}

export function StreakFlame({ days, onDark = false, className = "" }: StreakFlameProps) {
  const tier = getStreakTier(days);
  const { bg, iconColor } = getTierClasses(tier, onDark);
  const textColor = onDark ? "text-white" : "text-slate-800";

  return (
    <div
      role="status"
      aria-label={`${days} day streak`}
      className={`px-4 py-2 rounded-2xl flex items-center gap-2 backdrop-blur-md w-fit ${bg} ${className}`}
    >
      <Flame size={14} className={iconColor} />
      <span className={`text-xs font-black ${textColor}`}>
        {days} Day Streak
      </span>
    </div>
  );
}
