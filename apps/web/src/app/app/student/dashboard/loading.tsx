export default function StudentDashboardLoading() {
  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Banner skeleton */}
        <div className="animate-pulse rounded-[32px] bg-slate-200 h-36" />

        {/* Cards skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl h-24 border border-slate-100" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-14" />
          ))}
        </div>
      </div>
    </div>
  );
}
