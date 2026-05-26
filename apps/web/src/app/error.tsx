"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { BentoCard } from "@/components/ui/bento-card";
export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    // Log to error tracking service in production
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center p-4">
          <BentoCard padding="xl" className="max-w-md w-full text-center">
            <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-(--bento-tint-red) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-red-d)">
              <AlertTriangle className="w-10 h-10" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2 leading-tight">Something went wrong</h1>
            <p className="text-sm font-bold text-slate-500 mb-6 max-w-xs mx-auto">
              An unexpected error occurred. Please try again.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={reset}
                className="btn-bento gap-2 justify-center w-full px-6 py-3.5 rounded-2xl text-sm"
              >
                <RefreshCw size={18} strokeWidth={2.5} aria-hidden="true" />
                Try Again
              </button>
              <Link
                href="/"
                className="btn-bento btn-bento-grey gap-2 justify-center w-full px-6 py-3.5 rounded-2xl text-sm"
              >
                <Home size={18} strokeWidth={2.5} aria-hidden="true" />
                Go Home
              </Link>
            </div>
            {error.digest && (
              <p className="text-xs font-bold text-slate-500 mt-4">
                Error ID: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </BentoCard>
        </div>
      </body>
    </html>
  );
}
