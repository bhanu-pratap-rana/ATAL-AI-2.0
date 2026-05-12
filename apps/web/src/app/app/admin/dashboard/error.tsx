"use client";

import { ErrorFallback } from "@/components/errors/ErrorFallback";

export default function AdminDashboardError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return <ErrorFallback error={error} reset={reset} context="admin-dashboard" />;
}
