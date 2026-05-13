"use client";

import { useEffect } from "react";
import Link from "next/link";

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
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-black text-slate-800 mb-2">Something went wrong</h1>
            <p className="text-sm font-bold text-slate-400 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 rounded-2xl font-black text-sm text-white bg-primary hover:bg-primary-dark transition-colors active:scale-95"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="px-6 py-3 rounded-2xl font-black text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95"
              >
                Go Home
              </Link>
            </div>
            {error.digest && (
              <p className="text-xs text-slate-300 mt-4">Error ID: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
