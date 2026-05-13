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
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-14" />
          ))}
        </div>
      </div>
    </div>
  );
}
