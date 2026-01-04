'use client';

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

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { clientLogger } from '@/lib/client-logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeaderEntry {
  studentId: string;
  name: string;
  points: number;
  rank: number;
}

interface LeaderboardProps {
  classId: string;
  currentUserId: string;
  limit?: number;
}

const RANK_ICONS = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
} as const;

export function Leaderboard({ classId, currentUserId, limit = 10 }: LeaderboardProps) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [classId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      // PERFORMANCE FIX: Use single RPC instead of 3 separate queries
      // Old pattern: enrollments + points + profiles (3 queries)
      // New pattern: Single RPC with JOINs (1 query)
      const { data: leaderboardData, error: leaderboardError } = await supabase.rpc(
        'get_class_leaderboard',
        { p_class_id: classId, p_limit: limit }
      );

      if (leaderboardError) {
        clientLogger.error('[Leaderboard] Error fetching leaderboard:', leaderboardError);
        throw leaderboardError;
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        setLeaders([]);
        setLoading(false);
        return;
      }

      // Transform RPC response to LeaderEntry format
      const entries: LeaderEntry[] = leaderboardData.map((entry: any) => ({
        studentId: entry.student_id,
        name: entry.student_name,
        points: Number(entry.total_points),
        rank: entry.rank,
      }));

      setLeaders(entries);
      setLoading(false);
    } catch (err) {
      clientLogger.error('[Leaderboard] Error fetching leaderboard:', err instanceof Error ? err : undefined);
      setError('Failed to load leaderboard');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted">
            <div className="w-8 h-8 bg-muted-foreground/20 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted-foreground/20 rounded w-1/3" />
              <div className="h-3 bg-muted-foreground/20 rounded w-1/4" />
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
        <button
          onClick={fetchLeaderboard}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No students have earned points yet.</p>
        <p className="text-sm mt-2">Be the first to complete an assessment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaders.map((leader, index) => {
        const isCurrentUser = leader.studentId === currentUserId;
        const rankIcon = RANK_ICONS[leader.rank as keyof typeof RANK_ICONS];

        return (
          <div
            key={leader.studentId}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              isCurrentUser
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-muted/50 hover:bg-muted'
            }`}
          >
            {/* Rank */}
            <div className="w-8 text-center">
              {rankIcon ? (
                <span className="text-2xl">{rankIcon}</span>
              ) : (
                <span className="text-sm font-bold text-muted-foreground">#{leader.rank}</span>
              )}
            </div>

            {/* Name */}
            <div className="flex-1">
              <p className={`font-medium ${isCurrentUser ? 'text-primary' : 'text-text-primary'}`}>
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
              <p className="font-bold text-warning">{leader.points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">points</p>
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
export function LeaderboardCompact({ classId, currentUserId, limit = 5 }: LeaderboardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🏆 Top Students
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Leaderboard classId={classId} currentUserId={currentUserId} limit={limit} />
      </CardContent>
    </Card>
  );
}
