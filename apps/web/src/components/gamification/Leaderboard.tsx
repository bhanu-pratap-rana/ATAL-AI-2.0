"use client";

/**
 * Leaderboard Component
 *
 * Displays top students in a class based on total points earned.
 * Features:
 * - Real-time ranking updates
 * - Highlight current user
 * - Trophy icons for top 3
 * - Responsive layout
 */

import { useState, useEffect, useCallback } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { clientLogger } from "@/lib/client-logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LeaderEntry {
  readonly studentId: string;
  readonly name: string;
  readonly points: number;
  readonly rank: number;
}

interface LeaderboardProps {
  readonly classId: string;
  readonly currentUserId: string;
  readonly limit?: number;
}

/**
 * Get rank display element - medal icon for top 3, rank number otherwise
 */
function getRankDisplay(rank: number) {
  if (rank === 1) return <Crown className="w-6 h-6 text-amber-500" strokeWidth={2.25} aria-label="Rank 1" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" strokeWidth={2.25} aria-label="Rank 2" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" strokeWidth={2.25} aria-label="Rank 3" />;

  return (
    <span className="text-sm font-bold text-slate-500">
      #{rank}
    </span>
  );
}

export function Leaderboard({
  classId,
  currentUserId,
  limit = 10,
}: LeaderboardProps) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      // PERFORMANCE FIX: Use single RPC instead of 3 separate queries
      // Old pattern: enrollments + points + profiles (3 queries)
      // New pattern: Single RPC with JOINs (1 query)
      const { data: leaderboardData, error: leaderboardError } =
        await supabase.rpc("get_class_leaderboard", {
          p_class_id: classId,
          p_limit: limit,
        });

      if (leaderboardError) {
        clientLogger.error(
          "[Leaderboard] Error fetching leaderboard:",
          leaderboardError,
        );
        throw leaderboardError;
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        setLeaders([]);
        setLoading(false);
        return;
      }

      // Transform RPC response to LeaderEntry format
      // Type: GetClassLeaderboardResponse from apps/db/migrations/126_get_class_leaderboard.sql
      const entries: LeaderEntry[] = leaderboardData.map(
        (entry: {
          student_id: string;
          student_name: string;
          total_points: number;
          rank: number;
        }) => ({
          studentId: entry.student_id,
          name: entry.student_name,
          points: Number(entry.total_points),
          rank: entry.rank,
        }),
      );

      setLeaders(entries);
      setLoading(false);
    } catch (error) {
      clientLogger.error(
        "[Leaderboard] Error fetching leaderboard:",
        error instanceof Error ? error : undefined,
      );
      setError("Failed to load leaderboard");
      setLoading(false);
    }
  }, [classId, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [classId, limit, fetchLeaderboard]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((position) => (
          <div
            key={`position-${position}`}
            className="animate-pulse flex items-center gap-3 p-3 rounded-2xl bg-slate-50"
          >
            <div className="w-8 h-8 bg-slate-50-foreground/20 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-50-foreground/20 rounded w-1/3" />
              <div className="h-3 bg-slate-50-foreground/20 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-error">
        <p>{error}</p>
        <Button
          type="button"
          variant="link"
          onClick={fetchLeaderboard}
          className="mt-2 text-sm"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No students have earned points yet.</p>
        <p className="text-sm mt-2">Be the first to complete an assessment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaders.map((leader) => {
        const isCurrentUser = leader.studentId === currentUserId;

        return (
          <div
            key={leader.studentId}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              isCurrentUser
                ? "bg-primary/10 border-2 border-primary"
                : "bg-slate-50/50 hover:bg-slate-100"
            }`}
          >
            {/* Rank */}
            <div className="w-8 text-center">
              {getRankDisplay(leader.rank)}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium truncate ${isCurrentUser ? "text-primary" : "text-slate-800"}`}
              >
                {leader.name}
                {isCurrentUser && (
                  <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </p>
            </div>

            {/* Points */}
            <div className="text-right">
              <p className="font-black text-warning">
                {leader.points.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">points</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact Leaderboard for Dashboard Widget
 */
export function LeaderboardCompact({
  classId,
  currentUserId,
  limit = 5,
}: LeaderboardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy size={18} strokeWidth={2.25} className="text-amber-500" aria-hidden="true" />
          Top Students
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Leaderboard
          classId={classId}
          currentUserId={currentUserId}
          limit={limit}
        />
      </CardContent>
    </Card>
  );
}
