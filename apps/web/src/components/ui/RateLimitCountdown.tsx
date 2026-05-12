"use client";

import { useEffect, useState } from "react";

interface RateLimitCountdownProps {
  readonly seconds: number;
  readonly message?: string;
  readonly onComplete?: () => void;
}

/**
 * RateLimitCountdown
 *
 * Shows a friendly countdown when a user hits a rate limit (HTTP 429).
 * Replaces opaque "Rate limit exceeded" toasts with a concrete wait time.
 *
 * UX-A12: per rural-Assam UX audit, users need to know *when* they can retry,
 * not just *that* they were blocked.
 */
export function RateLimitCountdown({
  seconds,
  message,
  onComplete,
}: RateLimitCountdownProps) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil(seconds)));

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onComplete]);

  const display =
    remaining >= 60
      ? `${Math.floor(remaining / 60)}m ${remaining % 60}s`
      : `${remaining}s`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3"
    >
      <span aria-hidden="true" className="text-2xl">⏳</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-orange-900">
          {message ?? "Please wait before trying again."}
        </p>
        {remaining > 0 && (
          <p className="text-xs text-orange-700 mt-0.5">
            Try again in <span className="font-mono font-bold">{display}</span>
          </p>
        )}
      </div>
    </div>
  );
}
