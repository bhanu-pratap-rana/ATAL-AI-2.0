"use client";

import { ErrorFallback } from "@/components/errors/ErrorFallback";

export default function StudentDashboardError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return <ErrorFallback error={error} reset={reset} context="student-dashboard" />;
}
