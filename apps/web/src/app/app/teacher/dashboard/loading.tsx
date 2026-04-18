export default function TeacherDashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner skeleton */}
        <div className="animate-pulse rounded-[32px] bg-slate-200 h-36" />

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl h-24 border border-slate-100" />
          ))}
        </div>

        {/* Student grid skeleton */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="animate-pulse h-5 bg-slate-100 rounded w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-24" />
            ))}
          </div>
        </div>

        {/* AI log skeleton */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="animate-pulse h-5 bg-slate-100 rounded w-56 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-12" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
