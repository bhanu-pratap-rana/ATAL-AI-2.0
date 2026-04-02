import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

interface Props {
  readonly userId: string;
}

/**
 * AverageScore — async Server Component
 *
 * Fetches correctness % strictly from assessment_responses.
 * Designed to be wrapped in <Suspense> so it streams independently
 * of the rest of the student dashboard.
 */
export async function AverageScore({ userId }: Props) {
  const supabase = await createClient();

  const [{ count: total }, { count: correct }] = await Promise.all([
    supabase
      .from("assessment_responses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("assessment_responses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_correct", true),
  ]);

  const value =
    total && total > 0 && correct !== null
      ? `${Math.round((correct / total) * 100)}%`
      : "--";

  return (
    <Link
      href="/app/progress"
      className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center gap-1 hover:shadow-md transition-shadow active:scale-95"
    >
      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
        🎯
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
