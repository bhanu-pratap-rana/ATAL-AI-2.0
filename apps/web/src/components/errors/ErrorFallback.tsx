"use client";

/**
 * Shared Error Fallback Component
 *
 * Used by Next.js route-level error.tsx boundaries.
 * Provides a consistent error UI with retry and navigation options.
 */

import Link from "next/link";
import { clientLogger } from "@/lib/client-logger";

interface ErrorFallbackProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
  readonly context?: string;
}

export function ErrorFallback({ error, reset, context }: ErrorFallbackProps) {
  clientLogger.error(`[ErrorBoundary:${context || "unknown"}] Caught error`, {
    message: error.message,
    digest: error.digest,
  });

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl" role="img" aria-label="Error">!</span>
        </div>

        <h2 className="text-xl font-black text-slate-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          An error occurred while loading this page. Your data is safe.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors text-sm font-black active:scale-95"
          >
            Try Again
          </button>
          <Link
            href="/app/student/dashboard"
            className="flex-1 px-4 py-2 bg-white text-slate-500 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-sm font-black inline-flex items-center justify-center active:scale-95"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
