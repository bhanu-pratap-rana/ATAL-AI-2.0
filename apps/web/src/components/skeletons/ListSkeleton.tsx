import { Skeleton } from "./Skeleton";

/**
 * Vertical list skeleton — rows of rounded cards, like the student
 * roster or module list.
 */
export function ListSkeleton({
  count = 6,
  itemHeight = "h-20",
}: {
  readonly count?: number;
  readonly itemHeight?: string;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${itemHeight} w-full rounded-2xl`} />
      ))}
    </div>
  );
}
