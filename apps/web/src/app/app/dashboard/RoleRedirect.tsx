"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side redirect for the /app/dashboard role-router shim.
 *
 * A server-side redirect() here silently fails to complete when the shim
 * is reached via a client-side navigation (e.g. /student/start pushing an
 * already-authenticated user here): the /app layout mounts with its
 * entrance animation stuck at opacity 0 and the second hop never fires,
 * leaving a blank page. router.replace() in an effect completes the hop
 * deterministically for both hard loads and soft navigations.
 */
export function RoleRedirect({ to }: { readonly to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <output
      className="flex min-h-[50vh] items-center justify-center"
      aria-live="polite"
    >
      <span className="sr-only">Redirecting to your dashboard…</span>
    </output>
  );
}
