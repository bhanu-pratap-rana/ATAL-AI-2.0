"use client";

/**
 * Factory for Next.js route-segment error boundaries.
 *
 * PR-65: every route's `error.tsx` used to be a 10-line wrapper that
 * differed only in the `context` string passed to <ErrorFallback>.
 * 16 near-clone files compressed down to one-line re-exports:
 *
 *   // app/app/student/dashboard/error.tsx
 *   "use client";
 *   export { default } from "@/components/errors/create-route-error";
 *
 * That works for routes happy with "unknown" context. Routes that
 * want context-rich logging use the factory directly:
 *
 *   // app/app/admin/dashboard/error.tsx
 *   "use client";
 *   import { createRouteError } from "@/components/errors/create-route-error";
 *   export default createRouteError("admin-dashboard");
 */

import { ErrorFallback } from "@/components/errors/ErrorFallback";

type RouteErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export function createRouteError(context: string) {
  function RouteError({ error, reset }: RouteErrorProps) {
    return <ErrorFallback error={error} reset={reset} context={context} />;
  }
  RouteError.displayName = `RouteError(${context})`;
  return RouteError;
}

const DefaultRouteError = createRouteError("unknown");
export default DefaultRouteError;
