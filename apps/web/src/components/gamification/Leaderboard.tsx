'use client';

/**
 * Class Leaderboard Component
 *
 * Shows top students by points within a class.
 * Features:
 * - Real-time updates via Supabase subscriptions
 * - Animated rank changes
 * - Current user highlighting
 * - Points breakdown on hover
 *
 * RANKING LOGIC: Class-based (not global)
 * - Students are ranked against other students in their enrolled class
 * - This promotes healthy competition within peer groups
 * - Teachers can view their class leaderboard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase-browser';
import { clientLogger } from '@/lib/client-logger';

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  points: number;
  badgeCount: number;
  streak: number;
  isCurrentUser: boolean;
}

interface LeaderboardProps {
  classId: string;
  currentUserId: string;
  limit?: number;
  showStreak?: boolean;
}

// Medal styles for top 3 - Semantic colors for Gold/Silver/Bronze medals
// These use standard medal colors intentionally (not theme colors) for universal recognition
const MEDAL_STYLES = {
  1: { emoji: '🥇', bg: 'bg-gradient-to-r from-warning-light to-warning', text: 'text-warning-dark' }, // Gold
  2: { emoji: '🥈', bg: 'bg-gradient-to-r from-muted to-muted/80', text: 'text-muted-foreground' }, // Silver
  3: { emoji: '🥉', bg: 'bg-gradient-to-r from-primary-light to-primary/30', text: 'text-primary-dark' }, // Bronze (orange-tinted)
};

export function Leaderboard({
  classId,
  currentUserId,
  limit = 10,
  showStreak = true,
}: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [classId, limit]);

  const fetchLeaderboard = async () => {
    try {
      const supabase = createClient();

      // Fetch class leaderboard from Supabase
      // Rankings are CLASS-BASED: students compete within their enrolled class
      const { data: leaderboardData, error } = await supabase
        .rpc('get_class_leaderboard', {
          p_class_id: classId,
          p_limit: limit + 10 // Fetch extra to find current user if not in top
        });

      if (error) {
        clientLogger.error('[Leaderboard] Error fetching:', { message: error.message });
        setEntries([]);
        setLoading(false);
        return;
      }

      if (leaderboardData && leaderboardData.length > 0) {
        const formattedEntries: LeaderboardEntry[] = leaderboardData.map((entry: {
          student_id: string;
          student_name: string;
          total_points: number;
          badge_count: number;
          streak_days: number;
          rank: number;
        }) => ({
          rank: entry.rank,
          studentId: entry.student_id,
          studentName: entry.student_id === currentUserId ? 'You' : entry.student_name,
          points: entry.total_points || 0,
          badgeCount: entry.badge_count || 0,
          streak: entry.streak_days || 0,
          isCurrentUser: entry.student_id === currentUserId,
        }));

        // Find current user's rank
        const userEntry = formattedEntries.find((e) => e.isCurrentUser);
        setCurrentUserRank(userEntry?.rank || null);

        // Slice to limit for display
        setEntries(formattedEntries.slice(0, limit));
      } else {
        // No data yet
        setEntries([]);
      }

      setLoading(false);
    } catch (error) {
      clientLogger.error('[Leaderboard] Error:', error instanceof Error ? error : undefined);
      setEntries([]);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏆 Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 h-4 bg-muted rounded" />
                <div className="w-16 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏆 Class Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => {
          const medalStyle = MEDAL_STYLES[entry.rank as 1 | 2 | 3];

          return (
            <div
              key={entry.studentId}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                entry.isCurrentUser
                  ? 'bg-primary/10 border-2 border-primary'
                  : medalStyle
                  ? medalStyle.bg
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              {/* Rank */}
              <div className={`w-8 text-center font-bold ${medalStyle ? medalStyle.text : 'text-muted-foreground'}`}>
                {medalStyle ? medalStyle.emoji : `#${entry.rank}`}
              </div>

              {/* Name & Badges */}
              <div className="flex-1">
                <div className={`font-medium ${entry.isCurrentUser ? 'text-primary' : ''}`}>
                  {entry.studentName}
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>🎖️ {entry.badgeCount}</span>
                  {showStreak && entry.streak > 0 && (
                    <span>🔥 {entry.streak} days</span>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className={`font-bold ${entry.rank <= 3 ? 'text-lg' : ''}`}>
                  {entry.points.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>
          );
        })}

        {/* Current User if not in top list */}
        {currentUserRank && currentUserRank > limit && (
          <>
            <div className="text-center text-muted-foreground py-2">• • •</div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border-2 border-primary">
              <div className="w-8 text-center font-bold text-primary">
                #{currentUserRank}
              </div>
              <div className="flex-1">
                <div className="font-medium text-primary">
                  You
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {entries.find((e) => e.isCurrentUser)?.points || 0}
                </div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact Leaderboard for Dashboard Sidebar
 */
export function LeaderboardCompact({
  classId,
  currentUserId,
}: {
  classId: string;
  currentUserId: string;
}) {
  return (
    <Leaderboard
      classId={classId}
      currentUserId={currentUserId}
      limit={5}
      showStreak={false}
    />
  );
}

