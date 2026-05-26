"use client";

/**
 * Button primitive — CSS-only animations.
 *
 * Earlier this was a `motion.button` from framer-motion, which pulled
 * the entire framer-motion runtime into the critical-path bundle for
 * every page (Button is imported by 87 files). On low-end Android the
 * cost was real; switching to Tailwind transforms removes ~50KB gzipped
 * from the shared chunk with no perceptible difference for a press.
 *
 * Hover/active scale is handled by `hover:scale-[1.02] active:scale-[0.98]`.
 * The spring feel is approximated with `transition-transform duration-150`.
 * The loading spinner uses Tailwind `animate-spin` instead of motion props.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // PR-64: added `active:bg-slate-100` to secondary/ghost via the
  // variant-level recipes below so reduced-motion users still get
  // visible press feedback (the motion-safe scale transform was the
  // only press signal previously, which left those two variants flat).
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] will-change-transform",
  {
    variants: {
      variant: {
        default:
          // Gradient endpoints stay inside the brand orange family so
          // white text keeps ≥4.5:1 contrast even at the lightest pixel.
          "bg-linear-to-br from-primary to-primary-dark text-white border-2 border-white/20 shadow-[0_4px_14px_0_rgba(249,136,25,0.39)] hover:brightness-[1.08] hover:shadow-[0_6px_20px_rgba(249,136,25,0.5)] active:brightness-[0.92] active:shadow-[0_2px_6px_rgba(249,136,25,0.2)] active:translate-y-px",
        destructive:
          "bg-error text-white hover:bg-error/90 active:bg-error/80 shadow-md border-2 border-white/20",
        outline:
          // text-primary-darkest (#8B4A0B) is ~8:1 vs white, comfortably
          // clearing WCAG AA. --primary alone failed Lighthouse here.
          "border-2 border-primary bg-white text-primary-darkest hover:bg-slate-50 active:bg-slate-100",
        secondary:
          "bg-slate-50 text-slate-800 hover:bg-border active:bg-slate-200 border-2 border-slate-200",
        ghost:
          "hover:bg-slate-50 hover:text-primary active:bg-slate-100 border-2 border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-linear-to-br from-primary to-primary-light text-white border-2 border-white/20 shadow-[0_4px_14px_0_rgba(249,136,25,0.39)] hover:brightness-[1.08] hover:shadow-[0_6px_20px_rgba(249,136,25,0.5)] active:brightness-[0.92] active:shadow-[0_2px_6px_rgba(249,136,25,0.2)] active:translate-y-px",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-11 rounded-md px-4",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
  readonly loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          // PR-66: spinner overlay is decorative — `aria-hidden`. The
          // button's accessible name comes from its children (kept
          // visible to AT via the same DOM) plus `aria-busy`, so SRs
          // announce "Send, busy" instead of the previous PR-64 design
          // which hid children with className="invisible" + aria-hidden
          // and collapsed the accessible name to "Loading" — losing
          // the action label and any aria-label on the trigger.
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-primary/90 to-primary-light/90"
          >
            <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin motion-reduce:animate-none" />
          </span>
        )}
        <span className={loading ? "opacity-0" : undefined}>{children}</span>
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
