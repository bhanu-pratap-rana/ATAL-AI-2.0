/**
 * Learning Path Page
 *
 * Shows all 5 modules with progress tracking and unlock logic.
 * Students must complete modules in order (prerequisites).
 *
 * Modules:
 * M1: Computer Basics
 * M2: Operating Systems
 * M3: Internet Basics
 * M4: Digital Communication
 * M5: Local Technology (Assamese context)
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Module definitions with Assamese cultural context
// Colors use theme tokens: primary (orange), cyan, success (green), warning, info
const MODULES = [
  {
    id: 'M1',
    name_en: 'Computer Basics',
    name_hi: 'कंप्यूटर मूल बातें',
    name_as: 'কম্পিউটাৰ মূল কথা',
    description: 'Learn about computers, hardware, and software fundamentals',
    icon: '💻',
    topics: 10,
    color: 'from-primary to-primary-dark', // Orange theme primary
  },
  {
    id: 'M2',
    name_en: 'Operating Systems',
    name_hi: 'ऑपरेटिंग सिस्टम',
    name_as: 'অপাৰেটিং চিষ্টেম',
    description: 'Understand Windows, files, folders, and system basics',
    icon: '🖥️',
    topics: 10,
    color: 'from-success to-success-dark', // Green success
  },
  {
    id: 'M3',
    name_en: 'Internet Basics',
    name_hi: 'इंटरनेट मूल बातें',
    name_as: 'ইণ্টাৰনেট মূল কথা',
    description: 'Navigate the web, use search engines, stay safe online',
    icon: '🌐',
    topics: 10,
    color: 'from-cyan to-cyan-dark', // Cyan secondary
  },
  {
    id: 'M4',
    name_en: 'Digital Communication',
    name_hi: 'डिजिटल संचार',
    name_as: 'ডিজিটেল যোগাযোগ',
    description: 'Email, messaging, and online collaboration tools',
    icon: '📧',
    topics: 10,
    color: 'from-info to-info-dark', // Info blue
  },
  {
    id: 'M5',
    name_en: 'Local Technology',
    name_hi: 'स्थानीय प्रौद्योगिकी',
    name_as: 'স্থানীয় প্ৰযুক্তি',
    description: 'Digital tools for Assamese culture, Muga silk trade, and local businesses',
    icon: '🏔️',
    topics: 10,
    color: 'from-warning to-warning-dark', // Warning amber
    culturalNote: 'Learn how technology helps preserve and promote Assamese heritage',
  },
];

interface ModuleProgress {
  module_id: string;
  topics_completed: number;
  average_mastery: number;
  is_complete: boolean;
}

async function getModuleProgress(userId: string): Promise<Map<string, ModuleProgress>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('student_knowledge_state')
    .select('module_id, topic_id, mastery_score, status')
    .eq('student_id', userId);

  const progressMap = new Map<string, ModuleProgress>();

  // Initialize all modules
  for (const module of MODULES) {
    progressMap.set(module.id, {
      module_id: module.id,
      topics_completed: 0,
      average_mastery: 0,
      is_complete: false,
    });
  }

  if (!data) return progressMap;

  // Group by module
  const moduleData = new Map<string, { mastery: number[]; completed: number }>();

  for (const state of data) {
    if (!moduleData.has(state.module_id)) {
      moduleData.set(state.module_id, { mastery: [], completed: 0 });
    }
    const mod = moduleData.get(state.module_id)!;
    mod.mastery.push(state.mastery_score || 0);
    if (state.status === 'mastered' || (state.mastery_score || 0) >= 70) {
      mod.completed++;
    }
  }

  // Calculate progress
  for (const [moduleId, stats] of moduleData) {
    const avgMastery = stats.mastery.length > 0
      ? stats.mastery.reduce((a, b) => a + b, 0) / stats.mastery.length
      : 0;

    progressMap.set(moduleId, {
      module_id: moduleId,
      topics_completed: stats.completed,
      average_mastery: Math.round(avgMastery),
      is_complete: stats.completed >= 10, // 10 topics per module
    });
  }

  return progressMap;
}

async function getTotalPoints(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('points_history')
    .select('points')
    .eq('student_id', userId);

  return data?.reduce((sum, entry) => sum + entry.points, 0) || 0;
}

async function getCurrentStreak(userId: string): Promise<number> {
  const supabase = await createClient();

  // Get last 30 days of activity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from('student_knowledge_state')
    .select('last_attempt_at')
    .eq('student_id', userId)
    .gte('last_attempt_at', thirtyDaysAgo.toISOString())
    .order('last_attempt_at', { ascending: false });

  if (!data || data.length === 0) return 0;

  // Calculate streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activityDays = new Set(
    data.map((d) => {
      const date = new Date(d.last_attempt_at);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  let streak = 0;
  const checkDate = new Date(today);

  while (activityDays.has(checkDate.getTime())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

export default async function LearnPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/student/start');
  }

  const [progressMap, totalPoints, currentStreak] = await Promise.all([
    getModuleProgress(user.id),
    getTotalPoints(user.id),
    getCurrentStreak(user.id),
  ]);

  // Calculate overall stats
  const totalTopics = MODULES.reduce((sum, m) => sum + m.topics, 0);
  const completedTopics = Array.from(progressMap.values()).reduce(
    (sum, p) => sum + p.topics_completed,
    0
  );
  const overallProgress = Math.round((completedTopics / totalTopics) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Your Learning Path</h1>
          <p className="text-muted-foreground">
            Master digital literacy, one module at a time
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{overallProgress}%</div>
                <div className="text-sm text-muted-foreground">Overall Progress</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-warning">{totalPoints}</div>
                <div className="text-sm text-muted-foreground">Total Points</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-success">{currentStreak}</div>
                <div className="text-sm text-muted-foreground">Day Streak 🔥</div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-4">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{completedTopics} topics completed</span>
                <span>{totalTopics - completedTopics} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Cards */}
        <div className="space-y-4">
          {MODULES.map((module, index) => {
            const progress = progressMap.get(module.id)!;
            const previousModule = index > 0 ? progressMap.get(MODULES[index - 1].id) : null;
            const isUnlocked = index === 0 || (previousModule?.is_complete ?? false);
            const progressPercent = Math.round((progress.topics_completed / module.topics) * 100);

            return (
              <ModuleCard
                key={module.id}
                module={module}
                progress={progress}
                progressPercent={progressPercent}
                isUnlocked={isUnlocked}
                index={index}
              />
            );
          })}
        </div>

        {/* AI Tutor CTA */}
        <Card className="bg-gradient-to-r from-primary/10 to-cyan/10 border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-2">🤖</div>
            <h3 className="text-lg font-semibold mb-1">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ask our AI Tutor in English, Hindi, or Assamese
            </p>
            <Link href="/app/ai-tools/tutor">
              <Button className="bg-gradient-to-r from-primary to-cyan">
                Chat with AI Tutor
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  progress,
  progressPercent,
  isUnlocked,
  index,
}: {
  module: (typeof MODULES)[0];
  progress: ModuleProgress;
  progressPercent: number;
  isUnlocked: boolean;
  index: number;
}) {
  return (
    <Card
      className={`transition-all ${
        isUnlocked
          ? 'hover:shadow-lg cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      } ${progress.is_complete ? 'border-success border-2' : ''}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center text-2xl shadow-lg`}
            >
              {module.icon}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {module.name_en}
                {progress.is_complete && <span className="text-success">✓</span>}
                {!isUnlocked && <span className="text-sm">🔒</span>}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{module.name_as}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {progress.topics_completed}/{module.topics}
            </div>
            <div className="text-xs text-muted-foreground">topics</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">{module.description}</p>

        {module.culturalNote && (
          <p className="text-xs text-warning-dark mb-3 flex items-center gap-1">
            <span>🏔️</span> {module.culturalNote}
          </p>
        )}

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progress.is_complete
                  ? 'bg-success'
                  : `bg-gradient-to-r ${module.color}`
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercent}% complete</span>
            <span>Avg: {progress.average_mastery}%</span>
          </div>
        </div>

        {/* Action Button */}
        {isUnlocked && (
          <div className="mt-4">
            <Link href={`/app/learn/${module.id}`}>
              <Button
                className={`w-full bg-gradient-to-r ${module.color}`}
                variant={progress.is_complete ? 'outline' : 'default'}
              >
                {progress.is_complete
                  ? 'Review Module'
                  : progress.topics_completed > 0
                  ? 'Continue Learning'
                  : 'Start Module'}
              </Button>
            </Link>
          </div>
        )}

        {!isUnlocked && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Complete Module {index} to unlock
          </div>
        )}
      </CardContent>
    </Card>
  );
}
