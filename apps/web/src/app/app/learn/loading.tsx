import { CardSkeleton, Skeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-[32px] p-6 bg-orange-100">
          <Skeleton className="h-6 w-1/3 mb-3 bg-orange-200/60" />
          <Skeleton className="h-4 w-1/2 bg-orange-200/40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} rows={3} />
          ))}
        </div>
      </div>
    </div>
  );
}
