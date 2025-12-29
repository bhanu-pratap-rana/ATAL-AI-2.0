/**
 * Offline Database - IndexedDB with Dexie
 *
 * Provides offline storage for:
 * - Cached lesson content
 * - Pending sync queue (assessments, progress)
 * - Student progress cache
 *
 * Research basis: DRC COVID response showed
 * offline-first is critical for rural education.
 */

import Dexie, { Table } from 'dexie';

/**
 * Queued mutation for offline sync
 */
export interface QueuedMutation {
  id?: number;
  type: 'assessment_submit' | 'progress_update' | 'chat_message' | 'points_award';
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
  lastError?: string;
}

/**
 * Cached lesson content
 */
export interface CachedLesson {
  topic_id: string;
  module_id: string;
  language: 'en' | 'hi' | 'as';
  content: {
    title: string;
    description: string;
    sections: Array<{
      type: string;
      content: string;
    }>;
    questions?: Array<{
      id: string;
      question: string;
      options?: string[];
      correctAnswer?: string;
    }>;
  };
  cached_at: number;
  expires_at: number;
}

/**
 * Cached student progress
 */
export interface CachedProgress {
  topic_id: string;
  student_id: string;
  module_id: string;
  mastery_score: number;
  status: 'not_started' | 'in_progress' | 'mastered';
  last_synced: number;
}

/**
 * Cached AI conversation
 */
export interface CachedConversation {
  session_id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  topic_id?: string;
  language: 'en' | 'hi' | 'as';
  last_updated: number;
}

/**
 * ATAL Offline Database
 */
class ATALOfflineDB extends Dexie {
  syncQueue!: Table<QueuedMutation, number>;
  lessons!: Table<CachedLesson, string>;
  progress!: Table<CachedProgress, string>;
  conversations!: Table<CachedConversation, string>;

  constructor() {
    super('ATAL_Offline');

    this.version(1).stores({
      // Auto-incrementing id for sync queue
      syncQueue: '++id, timestamp, type, retries',
      // Composite key for lessons (topic + language)
      lessons: 'topic_id, module_id, language, cached_at, expires_at',
      // Composite key for progress (topic + student)
      progress: '[topic_id+student_id], module_id, last_synced',
      // Session id for conversations
      conversations: 'session_id, topic_id, language, last_updated',
    });
  }
}

// Export singleton database instance
export const offlineDB = new ATALOfflineDB();

/**
 * Check if offline storage is available
 */
export function isOfflineStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  } catch {
    return false;
  }
}

/**
 * Get database storage usage
 */
export async function getStorageUsage(): Promise<{
  used: number;
  quota: number;
  percentUsed: number;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { used: 0, quota: 0, percentUsed: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (used / quota) * 100 : 0;

    return { used, quota, percentUsed };
  } catch {
    return { used: 0, quota: 0, percentUsed: 0 };
  }
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  const now = Date.now();

  // Clear expired lessons
  const expiredLessons = await offlineDB.lessons
    .where('expires_at')
    .below(now)
    .delete();

  // Clear old conversations (older than 7 days)
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oldConversations = await offlineDB.conversations
    .where('last_updated')
    .below(weekAgo)
    .delete();

  return expiredLessons + oldConversations;
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData(): Promise<void> {
  await offlineDB.syncQueue.clear();
  await offlineDB.lessons.clear();
  await offlineDB.progress.clear();
  await offlineDB.conversations.clear();
}
