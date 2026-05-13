export default function AssessmentSummaryLoading() {
  return (
    <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-4">
        <div className="animate-pulse bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-8">
          <div className="h-8 bg-slate-100 rounded w-3/4 mx-auto mb-6" />
          <div className="h-24 bg-slate-100 rounded-2xl mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
