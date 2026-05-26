import { Skeleton } from "./Skeleton";

/**
 * Card-shaped skeleton matching the project's `bg-white rounded-3xl
 * border border-slate-100 shadow-sm p-6` card pattern.
 */
export function CardSkeleton({ rows = 3 }: { readonly rows?: number }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">
      <Skeleton className="h-6 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
