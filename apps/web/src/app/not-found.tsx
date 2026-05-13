import Link from "next/link";
import { FileQuestion, Home, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-(--bento-tint-purple) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-purple-d)">
          <FileQuestion className="w-10 h-10" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 leading-tight">Page Not Found</h1>
        <p className="text-sm font-bold text-slate-500 mb-6 max-w-xs mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/app/dashboard"
            className="btn-bento gap-2 justify-center w-full px-6 py-3.5 rounded-2xl text-sm"
          >
            <LayoutDashboard size={18} strokeWidth={2.5} aria-hidden="true" />
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="btn-bento btn-bento-grey gap-2 justify-center w-full px-6 py-3.5 rounded-2xl text-sm"
          >
            <Home size={18} strokeWidth={2.5} aria-hidden="true" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
