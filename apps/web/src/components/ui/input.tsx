"use client";

/**
 * Input primitive — CSS-only focus/error states.
 *
 * Previously wrapped in `motion.div` from framer-motion just for a
 * focus glow + error fade-in. The runtime cost wasn't worth it for
 * the entire form layer; both are now plain Tailwind transitions.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className="relative w-full">
        <div
          suppressHydrationWarning
          className={cn(
            "relative rounded-lg transition-all duration-200",
            isFocused
              ? "p-[2px] bg-linear-to-br from-primary to-primary-light shadow-primary-sm"
              : "p-0 shadow-none",
          )}
        >
          <input
            type={type}
            className={cn(
              "flex h-11 w-full rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-800 transition-all",
              "placeholder:text-slate-400",
              "focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isFocused ? "bg-white" : "border border-slate-200",
              error && "border-error focus-visible:ring-error",
              className,
            )}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            aria-invalid={error ? true : undefined}
            {...props}
          />
        </div>
        {error && (
          <p
            role="alert"
            className="mt-1.5 text-xs text-error motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
