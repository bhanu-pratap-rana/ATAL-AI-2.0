/**
 * Shared motion variants for the Assam / rural-India design system.
 *
 * Consumed by:
 * - System primitives (Card, MugaCard, StreakFlame, Mascot) that opt in
 *   to a spring entrance via a `motion` prop.
 * - Page-level reveals (dashboard banner, learn list, etc.) that need
 *   a consistent feel across screens.
 *
 * Why a shared module?
 * - One source of truth for spring stiffness/bounce so every animation
 *   feels like part of the same product, not a grab-bag of timings.
 * - The `MotionConfig reducedMotion="user"` provider (added in SP10
 *   T10.2) already collapses these to instant transitions for users
 *   with prefers-reduced-motion enabled — no per-call check needed.
 *
 * NOTE: This module uses the same `Variants` API that the rebranded
 * `motion` package exposes. Imports go through `framer-motion` because
 * the project already ships it. If we ever migrate to the `motion`
 * package directly, only this file changes.
 */

import type { Variants } from "framer-motion";

/** Standard card / row entrance: fade up with a gentle spring. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", bounce: 0.25, duration: 0.32 },
  },
};

/** Stagger reveal — apply to a parent; children inherit fadeInUp timing. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/**
 * Muga silk shimmer — slow horizontal gradient sweep.
 * Use on achievement / completion surfaces to evoke the gold of
 * Assam's Muga silk. Pair with a `background-image: linear-gradient(...)`
 * with `background-size: 200% 100%`.
 */
export const muga: Variants = {
  rest: { backgroundPosition: "0% 50%" },
  shimmer: {
    backgroundPosition: "200% 50%",
    transition: { duration: 1.6, repeat: Infinity, ease: "linear" },
  },
};

/**
 * Brahmaputra flow — back-and-forth gradient that evokes the river.
 * Use on hero banners and large progress visualizations. Slower than
 * `muga` because the river is calmer than silk.
 */
export const brahmaputra: Variants = {
  flow: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

/** Pop-in for confetti / celebration moments. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", bounce: 0.45, duration: 0.5 },
  },
};

/** Gentle bob for the mascot — used on idle / hero placements. */
export const bob: Variants = {
  idle: {
    y: [0, -4, 0],
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
  },
};
