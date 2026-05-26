import { Skeleton } from "./Skeleton";
import { CardSkeleton } from "./CardSkeleton";

/**
 * Generic dashboard skeleton: banner + 4 stat cards + 2-col card grid.
 * Matches the visual shape of student / teacher / admin dashboards.
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div className="rounded-[32px] p-6 bg-orange-100">
          <Skeleton className="h-6 w-1/2 mb-3 bg-orange-200/60" />
          <Skeleton className="h-4 w-1/3 bg-orange-200/40" />
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} rows={1} />
          ))}
        </div>

        {/* Main content cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
