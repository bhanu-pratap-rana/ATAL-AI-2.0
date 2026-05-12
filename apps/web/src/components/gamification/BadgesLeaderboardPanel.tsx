"use client";

/**
 * BadgesLeaderboardPanel
 *
 * Split-view widget for the student dashboard:
 * - Left: badges of the currently selected student (defaults to self)
 * - Right: class leaderboard — tap a student to view their badges
 * - Mobile: two tabs (Badges / Leaderboard)
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { clientLogger } from "@/lib/client-logger";
import { BadgesDisplay } from "./BadgesDisplay";
import { Button } from "@/components/ui/button";

/** Returns the text color class for a leaderboard entry name. Extracted to avoid S3358. */
function getLeaderNameColor(isViewing: boolean, isMe: boolean): string {
  if (isViewing) return "text-white";
  if (isMe) return "text-orange-600";
  return "text-slate-700";
}

interface LeaderEntry {
  studentId: string;
  name: string;
  points: number;
  rank: number;
}

interface BadgesLeaderboardPanelProps {
  readonly currentUserId: string;
  readonly classId: string | null;
}

const RANK_ICONS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function BadgesLeaderboardPanel({
  currentUserId,
  classId,
}: BadgesLeaderboardPanelProps) {
  const [tab, setTab] = useState<"badges" | "leaderboard">("badges");
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [viewingId, setViewingId] = useState(currentUserId);
  const [viewingName, setViewingName] = useState("My");

  const fetchLeaderboard = useCallback(async () => {
    if (!classId) return;
    setLoadingLeaders(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_class_leaderboard", {
        p_class_id: classId,
        p_limit: 8,
      });
      if (error) throw error;
      setLeaders(
        (data ?? []).map((e: { student_id: string; student_name: string; total_points: number; rank: number }) => ({
          studentId: e.student_id,
          name: e.student_name,
          points: Number(e.total_points),
          rank: e.rank,
        }))
      );
    } catch (err) {
      clientLogger.error("[BadgesLeaderboardPanel] leaderboard fetch failed", err instanceof Error ? err : undefined);
    } finally {
      setLoadingLeaders(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const selectStudent = (id: string, name: string) => {
    setViewingId(id);
    setViewingName(id === currentUserId ? "My" : name + "'s");
    setTab("badges");
  };

  const resetToSelf = () => selectStudent(currentUserId, "My");

  return (
    <div>
      {/* ── Mobile Tab Bar ── */}
      <div role="tablist" className="flex md:hidden gap-2 mb-4">
        {(["badges", "leaderboard"] as const).map((t) => (
          <Button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            size="sm"
            variant={tab === t ? "default" : "secondary"}
            onClick={() => setTab(t)}
            className="flex-1 text-xs font-black uppercase tracking-wider"
          >
            {t === "badges" ? "🏅 Badges" : "🏆 Leaderboard"}
          </Button>
        ))}
      </div>

      {/* ── Split Layout ── */}
      <div className="flex flex-col md:flex-row gap-4">

        {/* LEFT — Badges */}
        <div className={`flex-1 ${tab === "leaderboard" ? "hidden md:block" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-black text-slate-600">{viewingName} Badges</p>
            {viewingId !== currentUserId && (
              <Button
                type="button"
                variant="link"
                onClick={resetToSelf}
                className="h-auto p-0 text-xs font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest"
              >
                ← Mine
              </Button>
            )}
          </div>
          <BadgesDisplay studentId={viewingId} showAll={false} />
        </div>

        {/* RIGHT — Leaderboard */}
        <div className={`md:w-52 shrink-0 ${tab === "badges" ? "hidden md:block" : ""}`}>
          <p className="text-sm font-black text-slate-600 mb-2">🏆 Class Rankings</p>
          {!classId ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-xs font-black text-slate-600 mb-1">No Class Yet</p>
              <p className="text-xs font-bold text-slate-400">Join a class to see rankings</p>
            </div>
          ) : loadingLeaders ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🏆</div>
              <p className="text-xs font-black text-slate-600 mb-1">No Rankings Yet</p>
              <p className="text-xs font-bold text-slate-400">Be the first to earn points!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {leaders.map((entry) => {
                const isViewing = entry.studentId === viewingId;
                const isMe = entry.studentId === currentUserId;
                return (
                  <Button
                    key={entry.studentId}
                    type="button"
                    variant="ghost"
                    onClick={() => selectStudent(entry.studentId, entry.name)}
                    className={`w-full h-auto justify-start gap-2 px-3 py-2 rounded-xl ${
                      isViewing
                        ? "bg-orange-500 text-white shadow hover:bg-orange-500"
                        : isMe
                        ? "bg-orange-50 border border-orange-200 hover:bg-orange-100"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-base w-6 text-center shrink-0">
                      {RANK_ICONS[entry.rank] ?? `#${entry.rank}`}
                    </span>
                    <span className={`flex-1 text-xs font-black truncate text-left ${getLeaderNameColor(isViewing, isMe)}`}>
                      {entry.name}{isMe ? " (You)" : ""}
                    </span>
                    <span className={`text-xs font-bold shrink-0 ${isViewing ? "text-white/80" : "text-amber-500"}`}>
                      {entry.points.toLocaleString()}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
