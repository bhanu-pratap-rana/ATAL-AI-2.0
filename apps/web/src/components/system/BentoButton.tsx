"use client";

/**
 * BentoButton
 *
 * The chunky pressable button used across the Playful-Bento screens.
 * Press DOWN on :active gives tactile feedback (the bottom shadow
 * collapses from 5px to 2px). Colors map to the bento accent palette
 * in globals.css.
 *
 * Per SP13 PR-1. Sits alongside the existing <Button> component —
 * use this on the redesigned screens, keep <Button> elsewhere.
 *
 * @example
 *   <BentoButton color="orange" size="lg" onClick={...}>
 *     Continue lesson →
 *   </BentoButton>
 */

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type BentoColor =
  | "orange"
  | "purple"
  | "sky"
  | "pink"
  | "mint"
  | "green"
  | "yellow"
  | "grey";

type BentoSize = "sm" | "md" | "lg";

interface BentoButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  readonly color?: BentoColor;
  readonly size?: BentoSize;
  readonly fullWidth?: boolean;
}

const COLOR_CLASS: Record<BentoColor, string> = {
  orange: "", // default `.btn-bento` styling — no extra class needed
  purple: "btn-bento-purple",
  sky: "btn-bento-sky",
  pink: "btn-bento-pink",
  mint: "btn-bento-mint",
  green: "btn-bento-green",
  yellow: "btn-bento-yellow",
  grey: "btn-bento-grey",
};

const SIZE_CLASS: Record<BentoSize, string> = {
  sm: "text-xs px-3.5 py-2.5 rounded-xl",
  md: "text-sm sm:text-base px-5 py-3 rounded-2xl",
  lg: "text-lg px-7 py-4 rounded-2xl",
};

export const BentoButton = forwardRef<HTMLButtonElement, BentoButtonProps>(
  function BentoButton(
    { color = "orange", size = "md", fullWidth = false, className, type = "button", children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "btn-bento",
          COLOR_CLASS[color],
          SIZE_CLASS[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
