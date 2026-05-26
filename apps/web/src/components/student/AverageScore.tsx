import Link from "next/link";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase-server";

interface Props {
  readonly userId: string;
}

/**
 * AverageScore — async Server Component
 *
 * Fetches correctness % strictly from assessment_responses using a single
 * atomic query. Designed to be wrapped in <Suspense> so it streams
 * independently of the rest of the student dashboard.
 */
export async function AverageScore({ userId }: Props) {
  const supabase = await createClient();

  let value = "--";

  try {
    const { data, error } = await supabase
      .from("assessment_responses")
      .select("is_correct")
      .eq("user_id", userId);

    if (!error && data && data.length > 0) {
      const total = data.length;
      const correct = data.filter((r) => r.is_correct).length;
      value = `${Math.round((correct / total) * 100)}%`;
    }
  } catch {
    // Network or RLS error — fall back to "--" rather than crashing the page segment
  }

  return (
    <Link
      href="/app/progress"
      className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center gap-1 hover:shadow-md transition-shadow active:scale-95"
    >
      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 text-(--bento-orange-d)">
        <Target className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
      </div>
      <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
        Avg Score
      </p>
    </Link>
  );
}

/**
 * Skeleton placeholder for <Suspense fallback> — same card dimensions.
 */
export function AverageScoreSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center gap-1 animate-pulse">
      <div className="w-10 h-10 bg-slate-100 rounded-xl" />
      <div className="h-6 w-10 bg-slate-100 rounded mt-1" />
      <div className="h-3 w-14 bg-slate-100 rounded mt-1" />
    </div>
  );
}
