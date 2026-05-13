/**
 * ContinueLearningSection
 *
 * Async server component that streams in *after* the main dashboard
 * banner has painted. Was inlined in page.tsx and held up LCP for ~50ms
 * because module data and per-module progress fetched in the same
 * Promise.all as profile/streak.
 *
 * Per SP9 T9.1: the banner is the LCP element on the student dashboard;
 * everything below it can wait one network round-trip without changing
 * what the user perceives.
 */

import { ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { ChunkCard } from "@/components/system";

interface ModuleData {
  id: string;
  name_en: string;
  icon: string;
  color_gradient: string;
  display_order: number;
  topic_count: number;
}

async function fetchModulesFromDB(): Promise<ModuleData[]> {
  const supabase = await createAdminClient();
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_modules_with_counts",
  );
  if (!rpcError && rpcData && rpcData.length > 0) {
    return (rpcData as ModuleData[]).slice(0, 3);
  }
  const { data, error } = await supabase
    .from("modules")
    .select("id, name_en, icon, color_gradient, display_order")
    .eq("is_active", true)
    .order("display_order")
    .limit(3);
  if (error || !data) return [];
  return data.map((m) => ({ ...m, topic_count: 0 })) as ModuleData[];
}

// Modules are seeded curriculum data; they change rarely. 24h cache is
// safe and cuts the dashboard's per-request DB hits by one.
const getModulesFromDB = unstable_cache(
  fetchModulesFromDB,
  ["modules-list-dashboard"],
  { revalidate: 86_400, tags: ["modules"] },
);

async function getModuleProgress(userId: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_knowledge_state")
    .select("module, mastery_score")
    .eq("student_id", userId);

  const moduleScoreMap = new Map<string, number[]>();
  for (const row of data ?? []) {
    if (!row.module) continue;
    const arr = moduleScoreMap.get(row.module) ?? [];
    arr.push(row.mastery_score ?? 0);
    moduleScoreMap.set(row.module, arr);
  }
  const moduleProgress = new Map<string, number>();
  for (const [moduleId, scores] of moduleScoreMap.entries()) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    moduleProgress.set(moduleId, Math.round(avg * 100));
  }
  return moduleProgress;
}

const bannerStyle = { background: "var(--gradient-primary)" };

export async function ContinueLearningSection({ userId }: { readonly userId: string }) {
  const [modules, moduleProgress] = await Promise.all([
    getModulesFromDB(),
    getModuleProgress(userId),
  ]);

  return (
    <ChunkCard size="md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
          <BookOpen size={18} className="text-(--bento-orange)" /> Continue Learning
        </h2>
        <Link
          href="/app/learn"
          prefetch={false}
          className="text-xs font-black text-slate-500 hover:text-(--bento-orange) transition-colors"
        >
          See All →
        </Link>
      </div>
      {modules.length > 0 ? (
        <div className="space-y-2.5">
          {modules.map((mod) => {
            const progress = moduleProgress.get(mod.id) ?? 0;
            const topicCount = Number(mod.topic_count) || 10;
            return (
              <Link key={mod.id} href={`/app/learn/${mod.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-2xl hover:[background:var(--bento-tint-orange)] transition-colors -mx-1 px-2 active:translate-y-0.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border-2 border-white shadow-sm"
                    style={{ background: mod.color_gradient || "var(--gradient-primary)" }}
                  >
                    {mod.icon || "📚"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">{mod.name_en}</p>
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                      {topicCount} topics
                    </p>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          background: "var(--gradient-primary-vertical)",
                        }}
                      />
                    </div>
                    <p className="text-[11px] font-black text-(--bento-orange) mt-0.5">{progress}% complete</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Link href="/app/learn" className="flex items-center gap-4 p-3 rounded-2xl hover:[background:var(--bento-tint-orange)] transition-colors">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white shadow-sm" style={bannerStyle}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-sm">Start Learning</p>
            <p className="text-xs font-bold text-slate-500 mt-0.5">Explore all modules</p>
          </div>
          <ChevronRight size={18} className="text-slate-400 shrink-0" />
        </Link>
      )}
    </ChunkCard>
  );
}

export function ContinueLearningSkeleton() {
  return (
    <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-40 rounded bg-slate-100 animate-pulse" />
        <div className="h-4 w-12 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 -mx-1 px-2">
            <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-slate-100 animate-pulse" />
              <div className="h-1.5 w-full rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
