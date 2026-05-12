import { cn } from "@/lib/utils";

/**
 * Base shimmer skeleton. Honors `prefers-reduced-motion` automatically
 * because the animation lives in Tailwind's `animate-pulse` which the
 * project's `prefers-reduced-motion` CSS rule already disables.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "animate-pulse rounded-2xl bg-slate-200/70",
        className,
      )}
      {...props}
    />
  );
}
