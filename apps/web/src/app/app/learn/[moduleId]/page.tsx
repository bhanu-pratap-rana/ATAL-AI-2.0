/**
 * Module Topics Page
 *
 * Shows all 10 topics within a module with progress tracking.
 * Each topic links to its lesson page.
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { Card, CardContent } from '@/components/ui/card';
import { LessonPreCacher, DownloadModuleButton } from '@/components/offline/LessonPreCacher';

/**
 * Module definitions matching the ATAL Curriculum document structure.
 *
 * Topic ID format: T{unit}.{topic} where units span across the curriculum:
 * - Module 1 (Computer Basics): Units 1-3 → T1.1-T3.5
 * - Module 2 (Operating Systems): Units 4-8 → T4.1-T8.2
 * - Module 3 (Internet Basics): Units 9-11 → T9.1-T11.2
 * - Module 4 (Digital Communication): Units 12-15 → T12.1-T15.2
 * - Module 5 (Local Technology): Units 16-19 → T16.1-T19.2
 */
const MODULES: Record<string, {
  id: string;
  name_en: string;
  name_as: string;
  icon: string;
  color: string;
  topics: Array<{
    id: string;
    name_en: string;
    name_as: string;
    description: string;
    duration_minutes: number;
  }>;
}> = {
  M1: {
    id: 'M1',
    name_en: 'Computer Basics',
    name_as: 'কম্পিউটাৰ মূল কথা',
    icon: '💻',
    color: 'from-info to-info-dark',
    topics: [
      { id: 'T1.1', name_en: 'The Four Jobs of a Computer', name_as: 'কম্পিউটাৰৰ চাৰিটা কাম', description: 'Input → Processing → Output → Storage', duration_minutes: 15 },
      { id: 'T1.2', name_en: 'Main Parts You See and Use', name_as: 'আপুনি দেখা আৰু ব্যৱহাৰ কৰা মূল অংশ', description: 'Monitor, keyboard, mouse, CPU, storage', duration_minutes: 20 },
      { id: 'T2.1', name_en: 'RAM vs Storage', name_as: 'RAM বনাম ষ্টৰেজ', description: 'Work table vs cupboard analogy', duration_minutes: 15 },
      { id: 'T2.2', name_en: 'Save Habits for Power Cuts', name_as: 'বিদ্যুৎ কাট সংৰক্ষণ অভ্যাস', description: 'Auto-save and Ctrl+S habits', duration_minutes: 15 },
      { id: 'T2.3', name_en: 'Backup Basics (3-2-1 Rule)', name_as: 'বেকআপ মূল কথা', description: '3 copies, 2 media, 1 offsite', duration_minutes: 15 },
      { id: 'T3.1', name_en: 'What is a File?', name_as: 'ফাইল কি?', description: 'Types and extensions', duration_minutes: 15 },
      { id: 'T3.2', name_en: 'Good File Names', name_as: 'ভাল ফাইলৰ নাম', description: 'Naming conventions people understand', duration_minutes: 15 },
      { id: 'T3.3', name_en: 'Folders that Make Sense', name_as: 'বুজিব পৰা ফল্ডাৰ', description: 'Organizing documents logically', duration_minutes: 20 },
      { id: 'T3.4', name_en: 'Safe Saving & Simple Backup', name_as: 'সুৰক্ষিত সংৰক্ষণ আৰু বেকআপ', description: 'Practical backup strategies', duration_minutes: 15 },
      { id: 'T3.5', name_en: 'Private Info & Safe Sharing', name_as: 'ব্যক্তিগত তথ্য আৰু সুৰক্ষিত শ্বেয়াৰ', description: 'What to share and what to protect', duration_minutes: 20 },
    ],
  },
  M2: {
    id: 'M2',
    name_en: 'Operating Systems',
    name_as: 'অপাৰেটিং চিষ্টেম',
    icon: '🖥️',
    color: 'from-success to-success-dark',
    topics: [
      { id: 'T4.1', name_en: 'Understanding the Desktop', name_as: 'ডেস্কটপ বুজা', description: 'Taskbar, Start Menu, icons, system tray', duration_minutes: 15 },
      { id: 'T4.2', name_en: 'Window Management', name_as: 'উইণ্ডো ব্যৱস্থাপনা', description: 'Multitasking with windows', duration_minutes: 20 },
      { id: 'T5.1', name_en: 'Create, Copy, Move, Rename, Delete', name_as: 'সৃষ্টি, কপি, মুভ, নাম সলনি, মচা', description: 'Essential file operations', duration_minutes: 20 },
      { id: 'T5.2', name_en: 'File Recovery & Versions', name_as: 'ফাইল পুনৰুদ্ধাৰ', description: 'Recycle bin and previous versions', duration_minutes: 15 },
      { id: 'T6.1', name_en: 'Safe Installation', name_as: 'সুৰক্ষিত ইনষ্টলেচন', description: 'Installing from trusted sources', duration_minutes: 20 },
      { id: 'T6.2', name_en: 'Updates, Uninstall, App Hygiene', name_as: 'আপডেট আৰু এপ পৰিষ্কাৰ', description: 'Keeping your system clean', duration_minutes: 15 },
      { id: 'T7.1', name_en: 'Core Protection', name_as: 'মূল সুৰক্ষা', description: 'Antivirus, updates, passwords', duration_minutes: 20 },
      { id: 'T7.2', name_en: 'Spotting Scams', name_as: 'স্ক্যাম চিনাক্ত কৰা', description: 'Phishing, pop-ups, fake offers', duration_minutes: 20 },
      { id: 'T8.1', name_en: 'Weekly Care', name_as: 'সাপ্তাহিক যত্ন', description: 'Keeping your computer smooth', duration_minutes: 15 },
      { id: 'T8.2', name_en: 'Step-by-Step Troubleshooting', name_as: 'সমস্যা সমাধান', description: 'Fixing common problems', duration_minutes: 20 },
    ],
  },
  M3: {
    id: 'M3',
    name_en: 'Internet Basics',
    name_as: 'ইণ্টাৰনেট মূল কথা',
    icon: '🌐',
    color: 'from-cyan to-cyan-dark',
    topics: [
      { id: 'T9.1', name_en: 'What is the Internet?', name_as: 'ইণ্টাৰনেট কি?', description: 'Networks and packets', duration_minutes: 15 },
      { id: 'T9.2', name_en: 'Ways to Connect', name_as: 'সংযোগৰ উপায়', description: 'Wi-Fi, mobile data, hotspot', duration_minutes: 15 },
      { id: 'T9.3', name_en: 'Web Addresses & Browsers', name_as: 'ৱেব ঠিকনা আৰু ব্ৰাউজাৰ', description: 'URLs, tabs, browsing', duration_minutes: 15 },
      { id: 'T9.4', name_en: 'Accounts, OTPs & 2-Step', name_as: 'একাউণ্ট আৰু OTP', description: 'Secure login with verification', duration_minutes: 20 },
      { id: 'T10.1', name_en: 'HTTPS & the Padlock', name_as: 'HTTPS আৰু পেডলক', description: 'What it means, what it does not', duration_minutes: 15 },
      { id: 'T10.2', name_en: 'Spotting Online Scams', name_as: 'অনলাইন স্ক্যাম চিনাক্ত', description: 'Fake pages and offers', duration_minutes: 20 },
      { id: 'T10.3', name_en: 'Browser Privacy Basics', name_as: 'ব্ৰাউজাৰ গোপনীয়তা', description: 'History, cookies, permissions', duration_minutes: 15 },
      { id: 'T10.4', name_en: 'Safe Downloads', name_as: 'সুৰক্ষিত ডাউনলোড', description: 'Files from the web safely', duration_minutes: 15 },
      { id: 'T11.1', name_en: 'Smart Keywords & Operators', name_as: 'স্মাৰ্ট কীৱৰ্ড', description: 'Effective searching', duration_minutes: 15 },
      { id: 'T11.2', name_en: 'Check If Info Is Trustworthy', name_as: 'তথ্য বিশ্বাসযোগ্য নে চাওক', description: 'Verifying sources', duration_minutes: 20 },
    ],
  },
  M4: {
    id: 'M4',
    name_en: 'Digital Communication',
    name_as: 'ডিজিটেল যোগাযোগ',
    icon: '📧',
    color: 'from-primary to-primary-dark',
    topics: [
      { id: 'T12.1', name_en: 'Create & Secure Email', name_as: 'ইমেইল সৃষ্টি আৰু সুৰক্ষা', description: 'Setting up a secure account', duration_minutes: 20 },
      { id: 'T12.2', name_en: 'Compose, Attach & Send', name_as: 'লিখক, সংলগ্ন আৰু পঠাওক', description: 'Professional email writing', duration_minutes: 15 },
      { id: 'T12.3', name_en: 'Inbox Hygiene & Filters', name_as: 'ইনবক্স পৰিষ্কাৰ আৰু ফিল্টাৰ', description: 'Organizing your inbox', duration_minutes: 15 },
      { id: 'T13.1', name_en: 'Account Safety & Privacy', name_as: 'একাউণ্ট সুৰক্ষা আৰু গোপনীয়তা', description: 'WhatsApp/messaging safety', duration_minutes: 20 },
      { id: 'T13.2', name_en: 'Groups & Rumor Control', name_as: 'গ্ৰুপ আৰু গুজব নিয়ন্ত্ৰণ', description: 'Forwarding responsibly', duration_minutes: 15 },
      { id: 'T13.3', name_en: 'Backups & Device Linking', name_as: 'বেকআপ আৰু ডিভাইচ লিংকিং', description: 'Avoiding scams', duration_minutes: 20 },
      { id: 'T14.1', name_en: 'Join/Host Video Calls', name_as: 'ভিডিঅ কল যোগদান/হোষ্ট', description: 'Basic controls', duration_minutes: 20 },
      { id: 'T14.2', name_en: 'Low-Data Calling Etiquette', name_as: 'কম ডাটা কলিং শিষ্টাচাৰ', description: 'Saving data on calls', duration_minutes: 15 },
      { id: 'T15.1', name_en: 'Respectful Messages & Tone', name_as: 'সন্মানজনক বাৰ্তা আৰু সুৰ', description: 'Digital etiquette', duration_minutes: 15 },
      { id: 'T15.2', name_en: 'Consent & Digital Footprints', name_as: 'সন্মতি আৰু ডিজিটেল ফুটপ্ৰিণ্ট', description: 'Photos and privacy', duration_minutes: 20 },
    ],
  },
  M5: {
    id: 'M5',
    name_en: 'Local Technology',
    name_as: 'স্থানীয় প্ৰযুক্তি',
    icon: '🏔️',
    color: 'from-warning to-warning-dark',
    topics: [
      { id: 'T16.1', name_en: 'Finding Official Gov Services', name_as: 'চৰকাৰী সেৱা বিচাৰক', description: 'Authentic government portals', duration_minutes: 20 },
      { id: 'T16.2', name_en: 'Safe Digital Documents', name_as: 'সুৰক্ষিত ডিজিটেল নথিপত্ৰ', description: 'Scanning, naming, storage', duration_minutes: 20 },
      { id: 'T16.3', name_en: 'Forms on Shared Computers', name_as: 'শ্বেয়াৰড কম্পিউটাৰত ফৰ্ম', description: 'Safely filling forms', duration_minutes: 15 },
      { id: 'T17.1', name_en: 'UPI Basics', name_as: 'UPI মূল কথা', description: 'ID, PIN, QR, Requests', duration_minutes: 20 },
      { id: 'T17.2', name_en: 'Payment Scams & Safety', name_as: 'পেমেণ্ট স্ক্যাম আৰু সুৰক্ষা', description: 'Avoiding payment fraud', duration_minutes: 20 },
      { id: 'T17.3', name_en: 'Family/Shop Records', name_as: 'পৰিয়াল/দোকান ৰেকৰ্ড', description: 'Budgeting basics', duration_minutes: 15 },
      { id: 'T18.1', name_en: 'Low-Data Product Photos', name_as: 'কম ডাটা প্ৰডাক্ট ফটো', description: 'Photography for selling', duration_minutes: 20 },
      { id: 'T18.2', name_en: 'Safe Selling Channels', name_as: 'সুৰক্ষিত বিক্ৰী চেনেল', description: 'Online selling safely', duration_minutes: 20 },
      { id: 'T19.1', name_en: 'Weather & Advisory', name_as: 'বতৰ আৰু পৰামৰ্শ', description: 'Low-data weather apps', duration_minutes: 15 },
      { id: 'T19.2', name_en: 'Farm Records & Costing', name_as: 'খেতিৰ ৰেকৰ্ড আৰু খৰচ', description: 'Profit basics', duration_minutes: 20 },
    ],
  },
};

async function getTopicProgress(userId: string, moduleId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('student_knowledge_state')
    .select('topic_id, mastery_score, status, attempts, last_attempt_at')
    .eq('student_id', userId)
    .eq('module_id', moduleId);

  const progressMap = new Map<string, {
    mastery_score: number;
    status: string;
    attempts: number;
    last_attempt_at: string | null;
  }>();

  for (const state of data || []) {
    progressMap.set(state.topic_id, {
      mastery_score: state.mastery_score || 0,
      status: state.status || 'not_started',
      attempts: state.attempts || 0,
      last_attempt_at: state.last_attempt_at,
    });
  }

  return progressMap;
}

export default async function ModuleTopicsPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/student/start');
  }

  const { moduleId } = await params;
  const currentModule = MODULES[moduleId];

  if (!currentModule) {
    notFound();
  }

  const topicProgress = await getTopicProgress(user.id, moduleId);

  // Calculate module stats
  const completedTopics = currentModule.topics.filter(
    (t) => (topicProgress.get(t.id)?.mastery_score || 0) >= 70
  ).length;
  const totalMinutes = currentModule.topics.reduce((sum, t) => sum + t.duration_minutes, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Lesson Pre-Cacher (runs silently in background) */}
        <LessonPreCacher
          moduleId={moduleId}
          language="en"
          topicIds={currentModule.topics.map((t) => t.id)}
        />

        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link href="/app/learn" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            ← Back to Learning Path
          </Link>
          <DownloadModuleButton
            moduleId={moduleId}
            moduleName={currentModule.name_en}
            language="en"
          />
        </div>

        {/* Module Header */}
        <Card className={`bg-gradient-to-r ${currentModule.color} text-white`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{currentModule.icon}</div>
              <div>
                <h1 className="text-2xl font-bold">{currentModule.name_en}</h1>
                <p className="text-white/80">{currentModule.name_as}</p>
                <div className="flex gap-4 mt-2 text-sm text-white/70">
                  <span>{currentModule.topics.length} topics</span>
                  <span>{totalMinutes} minutes</span>
                  <span>{completedTopics}/{currentModule.topics.length} complete</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{ width: `${(completedTopics / currentModule.topics.length) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics List */}
        <div className="space-y-3">
          {currentModule.topics.map((topic, index) => {
            const progress = topicProgress.get(topic.id);
            const mastery = progress?.mastery_score || 0;
            const status = progress?.status || 'not_started';
            const isComplete = mastery >= 70;
            const isInProgress = status === 'in_progress' || (mastery > 0 && mastery < 70);

            return (
              <Link key={topic.id} href={`/app/learn/${moduleId}/${topic.id}`}>
                <Card className={`transition-all hover:shadow-md hover:border-primary/50 ${
                  isComplete ? 'border-success border-2' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Topic Number */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        isComplete
                          ? 'bg-success text-white'
                          : isInProgress
                          ? 'bg-warning text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {isComplete ? '✓' : index + 1}
                      </div>

                      {/* Topic Info */}
                      <div className="flex-1">
                        <h3 className="font-medium">{topic.name_en}</h3>
                        <p className="text-xs text-muted-foreground">{topic.name_as}</p>
                        <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                      </div>

                      {/* Stats */}
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">{topic.duration_minutes} min</div>
                        {mastery > 0 && (
                          <div className={`font-medium ${
                            mastery >= 70 ? 'text-success' : mastery >= 40 ? 'text-warning' : 'text-error'
                          }`}>
                            {mastery}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mini Progress Bar */}
                    {mastery > 0 && (
                      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            mastery >= 70 ? 'bg-success' : mastery >= 40 ? 'bg-warning' : 'bg-error'
                          }`}
                          style={{ width: `${mastery}%` }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
