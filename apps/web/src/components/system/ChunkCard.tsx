"use client";

/**
 * ChunkCard
 *
 * The signature Playful-Bento card: thick white border, double
 * chunky shadow (one tight at the bottom, one soft for depth), and
 * a big rounded radius. Background is white by default, but you can
 * pass `tint` to use one of the pastel bento backgrounds.
 *
 * Per SP13 PR-1 (Playful-Bento foundation). Used by the redesigned
 * landing, dashboard, lesson, and teacher screens.
 *
 * @example
 *   <ChunkCard tint="orange" size="lg">
 *     <h2>Today's quest</h2>
 *   </ChunkCard>
 */

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ChunkTint =
  | "white"
  | "orange"
  | "yellow"
  | "purple"
  | "sky"
  | "pink"
  | "mint"
  | "green"
  | "red";

type ChunkSize = "sm" | "md" | "lg";

interface ChunkCardProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly tint?: ChunkTint;
  readonly size?: ChunkSize;
  readonly as?: "div" | "article" | "section" | "aside";
}

const TINT_STYLE: Record<ChunkTint, string> = {
  // Empty for white — falls back to the base `.chunk-card` background.
  white: "",
  orange: "[background:var(--bento-tint-orange)]",
  yellow: "[background:var(--bento-tint-yellow)]",
  purple: "[background:var(--bento-tint-purple)]",
  sky: "[background:var(--bento-tint-sky)]",
  pink: "[background:var(--bento-tint-pink)]",
  mint: "[background:var(--bento-tint-mint)]",
  green: "[background:var(--bento-tint-green)]",
  red: "[background:var(--bento-tint-red)]",
};

const SIZE_CLASS: Record<ChunkSize, string> = {
  sm: "chunk-card-sm p-4",
  md: "chunk-card p-5 sm:p-6",
  lg: "chunk-card-lg p-6 sm:p-8",
};

export const ChunkCard = forwardRef<HTMLDivElement, ChunkCardProps>(
  function ChunkCard(
    { tint = "white", size = "md", as: Tag = "div", className, children, ...props },
    ref,
  ) {
    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(SIZE_CLASS[size], TINT_STYLE[tint], className)}
        {...props}
      >
        {children}
      </Tag>
    );
  },
);
