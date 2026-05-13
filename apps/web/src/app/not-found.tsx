import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Page Not Found</h1>
        <p className="text-sm font-bold text-slate-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/app/dashboard"
            className="px-6 py-3 rounded-2xl font-black text-sm text-white bg-primary hover:bg-primary-dark transition-colors active:scale-95"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl font-black text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
