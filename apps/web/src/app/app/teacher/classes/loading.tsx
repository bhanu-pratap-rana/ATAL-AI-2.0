import { ListSkeleton, Skeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-[32px] p-6 bg-blue-100">
          <Skeleton className="h-6 w-1/3 mb-3 bg-blue-200/60" />
          <Skeleton className="h-4 w-1/2 bg-blue-200/40" />
        </div>
        <ListSkeleton count={8} itemHeight="h-16" />
      </div>
    </div>
  );
}
