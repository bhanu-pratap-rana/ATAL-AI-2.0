"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * MotionConfigProvider
 *
 * Wraps the app with framer-motion's MotionConfig and forwards the
 * user's prefers-reduced-motion OS setting to every nested motion.* /
 * AnimatePresence usage. With reducedMotion="user":
 *  - Users with reduced-motion enabled see static / instant transitions
 *  - All other users see the full animation
 *
 * Per SP10 T10.2 in the master execution plan (WCAG 2.3.3 compliance).
 * Required for the rural-Assam audience, where some users have motion
 * sensitivity and many devices ship with reduced-motion on by default.
 */
export function MotionConfigProvider({ children }: { readonly children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
