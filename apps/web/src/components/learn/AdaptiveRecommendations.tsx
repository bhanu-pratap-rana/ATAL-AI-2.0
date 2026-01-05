'use client';

/**
 * Adaptive Recommendations Component
 *
 * Provides personalized next-step recommendations based on:
 * - Student knowledge state (mastery scores)
 * - Learning style preferences
 * - Recent activity patterns
 * - Knowledge gaps
 *
 * Uses the adaptive-service.ts logic to determine optimal next topics.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { clientLogger } from '@/lib/client-logger';

interface Recommendation {
  moduleId: string;
  moduleName: string;
  topicId: string;
  topicName: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  color: string;
}

interface AdaptiveRecommendationsProps {
  readonly userId: string;
  readonly currentModuleId?: string;
  readonly limit?: number;
}

export function AdaptiveRecommendations({
  userId,
  currentModuleId,
  limit = 3,
}: AdaptiveRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const supabase = createClient();

        // Get student knowledge state
        const { data: knowledgeState } = await supabase
          .from('student_knowledge_state')
          .select('module_id, topic_id, mastery_score, status, attempts, last_attempt_at')
          .eq('student_id', userId)
          .order('last_attempt_at', { ascending: false });

        if (!knowledgeState) {
          setLoading(false);
          return;
        }

        // Generate recommendations based on knowledge state
        const recs: Recommendation[] = [];

        // 1. HIGH PRIORITY: Topics with low mastery but multiple attempts (struggling)
        const strugglingTopics = knowledgeState.filter(
          (k) => k.mastery_score < 50 && k.attempts >= 2
        );

        for (const topic of strugglingTopics.slice(0, 2)) {
          recs.push({
            moduleId: topic.module_id,
            moduleName: getModuleName(topic.module_id),
            topicId: topic.topic_id,
            topicName: getTopicName(topic.topic_id),
            reason: 'You\'ve been working on this. Let\'s master it together! 💪',
            priority: 'high',
            icon: '🎯',
            color: 'from-error to-error-dark',
          });
        }

        // 2. MEDIUM PRIORITY: Topics with medium mastery (almost there!)
        const almostMasteredTopics = knowledgeState.filter(
          (k) => k.mastery_score >= 50 && k.mastery_score < 70
        );

        for (const topic of almostMasteredTopics.slice(0, 2)) {
          recs.push({
            moduleId: topic.module_id,
            moduleName: getModuleName(topic.module_id),
            topicId: topic.topic_id,
            topicName: getTopicName(topic.topic_id),
            reason: 'You\'re almost there! One more push to mastery! 🚀',
            priority: 'medium',
            icon: '⭐',
            color: 'from-warning to-warning-dark',
          });
        }

        // 3. LOW PRIORITY: Next sequential topic (if current module provided)
        if (currentModuleId) {
          const currentModuleTopics = knowledgeState.filter(
            (k) => k.module_id === currentModuleId
          );

          const completedTopicIds = new Set(
            currentModuleTopics
              .filter((k) => k.mastery_score >= 70)
              .map((k) => k.topic_id)
          );

          // Find next topic in sequence (this is simplified - in production, use actual topic order)
          const allTopicsInModule = getAllTopicsForModule(currentModuleId);
          const nextTopic = allTopicsInModule.find(
            (topicId) => !completedTopicIds.has(topicId)
          );

          if (nextTopic) {
            recs.push({
              moduleId: currentModuleId,
              moduleName: getModuleName(currentModuleId),
              topicId: nextTopic,
              topicName: getTopicName(nextTopic),
              reason: 'Continue your learning journey! 📚',
              priority: 'low',
              icon: '➡️',
              color: 'from-primary to-primary-dark',
            });
          }
        }

        // 4. If no recommendations yet, suggest starting a new module
        if (recs.length === 0) {
          const modulesWithProgress = new Set(knowledgeState.map((k) => k.module_id));
          const allModules = ['M1', 'M2', 'M3', 'M4', 'M5'];
          const nextModule = allModules.find((m) => !modulesWithProgress.has(m));

          if (nextModule) {
            const firstTopic = getAllTopicsForModule(nextModule)[0];
            recs.push({
              moduleId: nextModule,
              moduleName: getModuleName(nextModule),
              topicId: firstTopic,
              topicName: getTopicName(firstTopic),
              reason: 'Start a new module and expand your skills! 🌟',
              priority: 'low',
              icon: '🆕',
              color: 'from-success to-success-dark',
            });
          }
        }

        // Sort by priority and limit
        const sortedRecs = recs
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .slice(0, limit);

        setRecommendations(sortedRecs);
        setLoading(false);
      } catch (error) {
        clientLogger.error('[AdaptiveRecommendations] Error:', error instanceof Error ? error : undefined);
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [userId, currentModuleId, limit]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-cyan/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🤖</span>
          <span>AI Recommendations for You</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on your learning progress and style
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => (
          <Link
            key={`${rec.moduleId}-${rec.topicId}-${index}`}
            href={`/app/learn/${rec.moduleId}/${rec.topicId}`}
          >
            <Card
              className={`transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer bg-gradient-to-r ${rec.color} text-white`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{rec.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold">{rec.topicName}</div>
                    <div className="text-xs opacity-80">{rec.moduleName}</div>
                    <div className="text-sm mt-1 opacity-90">{rec.reason}</div>
                  </div>
                  <div className="text-white/70">→</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* AI Tutor CTA */}
        <div className="pt-2 border-t border-primary/20">
          <p className="text-xs text-muted-foreground mb-2">
            Need help with any topic?
          </p>
          <Link href="/app/ai-tools/tutor">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-primary text-primary hover:bg-primary hover:text-white"
            >
              💬 Ask AI Tutor
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions (in production, these would come from a shared module definitions file)
function getModuleName(moduleId: string): string {
  const names: Record<string, string> = {
    M1: 'Computer Basics',
    M2: 'Operating Systems',
    M3: 'Internet Basics',
    M4: 'Digital Communication',
    M5: 'Local Technology',
  };
  return names[moduleId] || moduleId;
}

function getTopicName(topicId: string): string {
  // Simplified - in production, fetch from database or module definitions
  return `Topic ${topicId}`;
}

function getAllTopicsForModule(moduleId: string): string[] {
  // Simplified - in production, fetch from database or module definitions
  const topicsByModule: Record<string, string[]> = {
    M1: ['T1.1', 'T1.2', 'T2.1', 'T2.2', 'T2.3', 'T3.1', 'T3.2', 'T3.3', 'T3.4', 'T3.5'],
    M2: ['T4.1', 'T4.2', 'T5.1', 'T5.2', 'T6.1', 'T6.2', 'T7.1', 'T7.2', 'T8.1', 'T8.2'],
    M3: ['T9.1', 'T9.2', 'T9.3', 'T9.4', 'T10.1', 'T10.2', 'T10.3', 'T10.4', 'T11.1', 'T11.2'],
    M4: ['T12.1', 'T12.2', 'T12.3', 'T13.1', 'T13.2', 'T13.3', 'T14.1', 'T14.2', 'T15.1', 'T15.2'],
    M5: ['T16.1', 'T16.2', 'T16.3', 'T17.1', 'T17.2', 'T17.3', 'T18.1', 'T18.2', 'T19.1', 'T19.2'],
  };
  return topicsByModule[moduleId] || [];
}

