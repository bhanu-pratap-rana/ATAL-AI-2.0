import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BentoCard — canonical card shell for the Atal AI bento-grid design system.
 *
 * Replaces the inline-Tailwind pattern that was repeated 80+ times across
 * the codebase:
 *
 *   <div className="bg-white rounded-3xl border-4 border-white
 *     shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)]
 *     p-4">…</div>
 *
 * Three subtle "off-brand" shell variants (`border-slate-100 shadow-sm`,
 * `border-red-100 shadow-sm`, `components/ui/card.tsx`'s shadow recipe)
 * also bled into the codebase; this primitive standardizes them as named
 * `tone` variants so new screens can pick the right semantic instead of
 * inventing their own.
 *
 * Use the `as` prop to render a different tag (`section`, `article`, etc.)
 * without giving up the shell.
 *
 * Migration: replace existing `<div className="bg-white rounded-3xl
 * border-4 border-white shadow-[0_6px_0_…]…">` blocks with
 * `<BentoCard padding="md">`. The `padding` map below matches the most
 * common p-4 / p-6 / p-8 spots so the visual change is zero.
 */

const SHELL_BASE =
  "bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)]";

const TONE_CLASS: Record<BentoCardTone, string> = {
  // Default: the canonical bento shell most cards use.
  default: SHELL_BASE,
  // Subtle: a flatter card for secondary surfaces (admin lists, etc.).
  subtle: "bg-white rounded-3xl border border-slate-100 shadow-sm",
  // Error: red-bordered for inline error states.
  error: "bg-white rounded-3xl border border-red-100 shadow-sm",
};

const PADDING_CLASS: Record<BentoCardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
};

export type BentoCardTone = "default" | "subtle" | "error";
export type BentoCardPadding = "none" | "sm" | "md" | "lg" | "xl";

export interface BentoCardProps extends React.HTMLAttributes<HTMLElement> {
  readonly as?: "div" | "section" | "article" | "aside" | "form";
  readonly tone?: BentoCardTone;
  readonly padding?: BentoCardPadding;
}

export const BentoCard = React.forwardRef<HTMLElement, BentoCardProps>(
  function BentoCard(
    {
      as = "div",
      tone = "default",
      padding = "md",
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const Tag = as as React.ElementType;
    return (
      <Tag
        ref={ref}
        className={cn(TONE_CLASS[tone], PADDING_CLASS[padding], className)}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);
