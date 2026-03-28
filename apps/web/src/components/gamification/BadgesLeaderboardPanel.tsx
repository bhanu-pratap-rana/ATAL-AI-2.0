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
      <div className="flex md:hidden gap-2 mb-4">
        {(["badges", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
              tab === t
                ? "bg-orange-500 text-white shadow"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {t === "badges" ? "🏅 Badges" : "🏆 Leaderboard"}
          </button>
        ))}
      </div>

      {/* ── Split Layout ── */}
      <div className="flex flex-col md:flex-row gap-4">

        {/* LEFT — Badges */}
        <div className={`flex-1 ${tab === "leaderboard" ? "hidden md:block" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-black text-slate-600">{viewingName} Badges</p>
            {viewingId !== currentUserId && (
              <button
                type="button"
                onClick={resetToSelf}
                className="text-[11px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest"
              >
                ← Mine
              </button>
            )}
          </div>
          <BadgesDisplay studentId={viewingId} showAll={false} />
        </div>

        {/* RIGHT — Leaderboard */}
        <div className={`md:w-52 flex-shrink-0 ${tab === "badges" ? "hidden md:block" : ""}`}>
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
                  <button
                    key={entry.studentId}
                    type="button"
                    onClick={() => selectStudent(entry.studentId, entry.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all active:scale-95 ${
                      isViewing
                        ? "bg-orange-500 text-white shadow"
                        : isMe
                        ? "bg-orange-50 border border-orange-200"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-base w-6 text-center flex-shrink-0">
                      {RANK_ICONS[entry.rank] ?? `#${entry.rank}`}
                    </span>
                    <span className={`flex-1 text-xs font-black truncate ${getLeaderNameColor(isViewing, isMe)}`}>
                      {entry.name}{isMe ? " (You)" : ""}
                    </span>
                    <span className={`text-[11px] font-bold flex-shrink-0 ${isViewing ? "text-white/80" : "text-amber-500"}`}>
                      {entry.points.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
