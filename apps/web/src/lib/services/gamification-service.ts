/**
 * Gamification Service
 *
 * Manages cultural badges, points, and achievements.
 * Features 10 cultural badges representing Assamese heritage:
 * - Muga Silk Master, Gamosa Graduate, Bihu Dancer
 * - Brahmaputra Scholar, Perfect Score, Voice Learner
 * - First Steps, Curious Mind, Night Owl, Early Bird
 *
 * Research basis: Meta-analysis of 41 studies shows
 * gamification increases engagement by 40% (0.82 effect size)
 *
 * OFFLINE SYNC INTEGRATION:
 *
 * Points and badges are awarded via awardPoints() and synced offline
 * using the 'points_award' mutation type. Client integration pattern:
 *
 * ```tsx
 * // In components calling GamificationService:
 * import { useOfflineSync } from '@/hooks';
 *
 * const { awardPointsWithSync } = useOfflineSync();
 *
 * const handlePointsAward = async (studentId, points, source) => {
 *   if (!navigator.onLine) {
 *     // Queue points for later sync
 *     await awardPointsWithSync({
 *       student_id: studentId,
 *       points,
 *       source,
 *       description: `Points from ${source}`,
 *     });
 *     return;
 *   }
 *
 *   // Online - call GamificationService.awardPoints() normally
 *   await gamificationService.awardPoints(studentId, points, source);
 * };
 * ```
 *
 * See: /src/lib/offline/mutation-queue.ts for sync implementation.
 */

import { createClient } from '@/lib/supabase-server';
import { authLogger } from '@/lib/auth-logger';

/**
 * Badge definition
 */
export interface Badge {
  id: string;
  name_en: string;
  name_hi: string;
  name_as: string;
  description: string;
  icon: string;
  unlock_criteria: BadgeCriteria;
  cultural_note: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  points_value: number;
}

/**
 * Badge unlock criteria
 */
export interface BadgeCriteria {
  type:
    | 'lessons_completed'
    | 'high_score'
    | 'weekly_streak'
    | 'modules_mastered'
    | 'perfect_score'
    | 'voice_interactions'
    | 'first_lesson'
    | 'questions_asked'
    | 'night_activity'
    | 'early_activity';
  threshold?: number;
}

/**
 * Student badge (earned)
 */
export interface StudentBadge {
  id: string;
  student_id: string;
  badge_id: string;
  badge?: Badge;
  earned_at: string;
}

/**
 * Points history entry
 */
export interface PointsEntry {
  id: string;
  student_id: string;
  points: number;
  source: string;
  description?: string;
  created_at: string;
}

/**
 * Gamification Service
 */
export class GamificationService {
  /**
   * Check and award any badges the student has earned
   * Returns newly awarded badges
   */
  async checkAndAwardBadges(studentId: string): Promise<Badge[]> {
    try {
      const supabase = await createClient();

      // PERFORMANCE FIX: Use single RPC call instead of N+1 loop
      // Old pattern: 12-102 queries (1 + 10 badges × 1-10 criteria checks each)
      // New pattern: 1 query (batch RPC function)
      const { data: awardedBadges, error } = await supabase.rpc(
        'batch_check_and_award_badges',
        { p_student_id: studentId }
      );

      if (error) {
        authLogger.error('[Gamification] Batch badge check failed:', error);
        return [];
      }

      if (!awardedBadges || awardedBadges.length === 0) {
        return [];
      }

      // Transform RPC response to Badge objects
      // Type: BatchCheckAwardBadgesResponse from apps/db/migrations/123_batch_check_award_badges.sql
      return awardedBadges.map((b: {
        badge_id: string;
        badge_name_en: string;
        badge_name_hi: string;
        badge_name_as: string;
        points_awarded: number;
      }) => ({
        id: b.badge_id,
        name_en: b.badge_name_en,
        name_hi: b.badge_name_hi,
        name_as: b.badge_name_as,
        points_value: b.points_awarded,
        description_en: '',
        description_hi: '',
        description_as: '',
        icon: '',
        unlock_criteria: {},
        created_at: new Date().toISOString(),
      }));
    } catch (error) {
      authLogger.error('[Gamification] Error checking badges:', error instanceof Error ? error : { error: String(error) });
      return [];
    }
  }

  /**
   * Check if a specific badge criteria is met
   */
  private async checkCriteria(
    studentId: string,
    criteria: BadgeCriteria
  ): Promise<boolean> {
    const supabase = await createClient();

    switch (criteria.type) {
      case 'lessons_completed': {
        const { count } = await supabase
          .from('student_knowledge_state')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .gte('mastery_score', 70);
        return (count || 0) >= (criteria.threshold || 10);
      }

      case 'high_score': {
        const { data, error } = await supabase
          .from('summative_results')
          .select('total_score')
        
        if (error) {
          authLogger.error('[checkBadgeCriteria] Failed to fetch high score', { error: error.message, studentId })
          return false
        }
          .eq('student_id', studentId)
          .gte('total_score', criteria.threshold || 90)
          .limit(1);
        return (data?.length || 0) > 0;
      }

      case 'weekly_streak': {
        // Check lessons completed this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { count } = await supabase
          .from('student_knowledge_state')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .gte('last_attempt_at', weekAgo.toISOString())
          .gte('mastery_score', 70);
        return (count || 0) >= (criteria.threshold || 3);
      }

      case 'modules_mastered': {
        // Count modules where all topics are mastered
        const { data } = await supabase
          .from('student_knowledge_state')
          .select('module_id, mastery_score')
          .eq('student_id', studentId);

        if (!data) return false;

        // Group by module
        const moduleProgress = new Map<string, number[]>();
        for (const state of data) {
          if (!moduleProgress.has(state.module_id)) {
            moduleProgress.set(state.module_id, []);
          }
          moduleProgress.get(state.module_id)!.push(state.mastery_score);
        }

        // Count modules with all topics mastered (avg >= 70)
        let masteredModules = 0;
        for (const scores of moduleProgress.values()) {
          if (scores.length >= 10) {
            // 10 topics per module
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg >= 70) masteredModules++;
          }
        }

        return masteredModules >= (criteria.threshold || 5);
      }

      case 'perfect_score': {
        const { data } = await supabase
          .from('summative_results')
          .select('total_score')
          .eq('student_id', studentId)
          .eq('total_score', 100)
          .limit(1);
        return (data?.length || 0) > 0;
      }

      case 'voice_interactions': {
        const { count } = await supabase
          .from('ai_tutor_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('input_mode', 'voice');
        return (count || 0) >= (criteria.threshold || 10);
      }

      case 'first_lesson': {
        const { count } = await supabase
          .from('student_knowledge_state')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId);
        return (count || 0) >= 1;
      }

      case 'questions_asked': {
        const { count } = await supabase
          .from('ai_tutor_interactions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('message_role', 'user');
        return (count || 0) >= (criteria.threshold || 20);
      }

      case 'night_activity': {
        // Check for activity between 9 PM and 6 AM
        const { data } = await supabase
          .from('ai_tutor_interactions')
          .select('created_at')
          .eq('student_id', studentId)
          .limit(100);

        const nightActivities =
          data?.filter((d) => {
            const hour = new Date(d.created_at).getHours();
            return hour >= 21 || hour < 6;
          }) || [];

        return nightActivities.length >= (criteria.threshold || 5);
      }

      case 'early_activity': {
        // Check for activity between 5 AM and 7 AM
        const { data } = await supabase
          .from('ai_tutor_interactions')
          .select('created_at')
          .eq('student_id', studentId)
          .limit(100);

        const earlyActivities =
          data?.filter((d) => {
            const hour = new Date(d.created_at).getHours();
            return hour >= 5 && hour < 7;
          }) || [];

        return earlyActivities.length >= (criteria.threshold || 3);
      }

      default:
        return false;
    }
  }

  /**
   * Award points to a student
   */
  async awardPoints(
    studentId: string,
    points: number,
    source: string,
    description?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.from('points_history').insert({
        student_id: studentId,
        points,
        source,
        description,
      });
    } catch (error) {
      authLogger.error('[Gamification] Error awarding points:', error instanceof Error ? error : { error: String(error) });
    }
  }

  /**
   * Get student's total points
   */
  async getTotalPoints(studentId: string): Promise<number> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .from('points_history')
        .select('points')
        .eq('student_id', studentId);

      return data?.reduce((sum, entry) => sum + entry.points, 0) || 0;
    } catch (error) {
      authLogger.error('[Gamification] Error getting points:', error instanceof Error ? error : { error: String(error) });
      return 0;
    }
  }

  /**
   * Get student's earned badges
   */
  async getStudentBadges(studentId: string): Promise<StudentBadge[]> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .from('student_badges')
        .select(
          `
          *,
          badge:badges(*)
        `
        )
        .eq('student_id', studentId)
        .order('earned_at', { ascending: false });

      return (data || []) as StudentBadge[];
    } catch (error) {
      authLogger.error('[Gamification] Error getting badges:', error instanceof Error ? error : { error: String(error) });
      return [];
    }
  }

  /**
   * Get points history for a student
   */
  async getPointsHistory(studentId: string, limit = 20): Promise<PointsEntry[]> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .from('points_history')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data || []) as PointsEntry[];
    } catch (error) {
      authLogger.error('[Gamification] Error getting points history:', error instanceof Error ? error : { error: String(error) });
      return [];
    }
  }

  /**
   * Get class leaderboard
   */
  async getClassLeaderboard(
    classId: string,
    limit = 10
  ): Promise<{ studentId: string; name: string; points: number; rank: number }[]> {
    try {
      const supabase = await createClient();

      // Get enrolled students
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classId);

      if (!enrollments) return [];

      const studentIds = enrollments.map((e) => e.student_id);

      // Get points for each student
      const { data: pointsData } = await supabase
        .from('points_history')
        .select('student_id, points')
        .in('student_id', studentIds);

      // Aggregate points
      const pointsMap = new Map<string, number>();
      for (const entry of pointsData || []) {
        pointsMap.set(
          entry.student_id,
          (pointsMap.get(entry.student_id) || 0) + entry.points
        );
      }

      // Sort and rank
      const leaderboard = Array.from(pointsMap.entries())
        .map(([studentId, points]) => ({ studentId, points }))
        .sort((a, b) => b.points - a.points)
        .slice(0, limit)
        .map((entry, index) => ({
          ...entry,
          name: `Student ${index + 1}`, // Would need to join with users table
          rank: index + 1,
        }));

      return leaderboard;
    } catch (error) {
      authLogger.error('[Gamification] Error getting leaderboard:', error instanceof Error ? error : { error: String(error) });
      return [];
    }
  }

  /**
   * Check for activity-based badge triggers
   * Call this after any user activity
   */
  async triggerActivityCheck(
    studentId: string,
    activityType: 'lesson' | 'question' | 'assessment' | 'voice'
  ): Promise<Badge[]> {
    // Award points for activity
    const pointsMap = {
      lesson: 10,
      question: 5,
      assessment: 20,
      voice: 15,
    };

    await this.awardPoints(
      studentId,
      pointsMap[activityType],
      activityType,
      `Completed ${activityType}`
    );

    // Check for new badges
    return this.checkAndAwardBadges(studentId);
  }
}

// Export singleton
export const gamificationService = new GamificationService();
