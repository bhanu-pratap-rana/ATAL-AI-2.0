/**
 * Lesson Cache - Pre-caching service for offline lesson access
 *
 * Provides utilities for:
 * - Pre-caching lesson content when viewing a module
 * - Checking if lessons are cached
 * - Retrieving cached lessons
 * - Managing cache storage
 *
 * Best practices from:
 * - https://developer.mozilla.org/en-US/docs/Web/API/Cache
 * - https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/
 */

import { offlineDB, type CachedLesson } from './database';
import { clientLogger } from '@/lib/client-logger';

/**
 * Cache name for lessons (versioned for updates)
 */
const LESSON_CACHE = 'atal-lessons-v1';

/**
 * Cache expiry time (7 days in milliseconds)
 */
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

/**
 * Supported languages
 */
export type Language = 'en' | 'hi' | 'as';

/**
 * Topic info for pre-caching
 */
interface TopicInfo {
  id: string;
  title: string;
}

/**
 * Module topics mapping
 *
 * Topic ID format matches the ATAL curriculum document:
 * - Module 1: Units 1-3 → Topics T1.1-T3.5
 * - Module 2: Units 4-8 → Topics T4.1-T8.2
 * - Module 3: Units 9-11 → Topics T9.1-T11.2
 * - Module 4: Units 12-15 → Topics T12.1-T15.2
 * - Module 5: Units 16-19 → Topics T16.1-T19.2
 *
 * Each module has 10 topics, matching the curriculum structure.
 */
const MODULE_TOPICS: Record<string, TopicInfo[]> = {
  M1: [
    { id: 'T1.1', title: 'The Four Jobs of a Computer (I→P→O→S)' },
    { id: 'T1.2', title: 'Main Parts You See and Use' },
    { id: 'T2.1', title: 'RAM vs Storage — Work Table vs Cupboard' },
    { id: 'T2.2', title: 'Save Habits that Survive Power Cuts' },
    { id: 'T2.3', title: 'Backup Basics — The Simple 3-2-1 Rule' },
    { id: 'T3.1', title: 'What is a File? (Types & Extensions)' },
    { id: 'T3.2', title: 'Good File Names People Understand' },
    { id: 'T3.3', title: 'Folders that Make Sense' },
    { id: 'T3.4', title: 'Safe Saving & Simple Backup' },
    { id: 'T3.5', title: 'Private Info & Safe Sharing' },
  ],
  M2: [
    { id: 'T4.1', title: 'Understanding the Desktop Interface' },
    { id: 'T4.2', title: 'Window Management for Multitasking' },
    { id: 'T5.1', title: 'Create, Copy, Move, Rename, Delete' },
    { id: 'T5.2', title: 'File Recovery & Versions' },
    { id: 'T6.1', title: 'Safe Installation from Trusted Sources' },
    { id: 'T6.2', title: 'Updates, Uninstall, and App Hygiene' },
    { id: 'T7.1', title: 'Core Protection (AV, Updates, Passwords)' },
    { id: 'T7.2', title: 'Spotting Scams (Phishing, Pop-ups)' },
    { id: 'T8.1', title: 'Weekly Care for a Smooth Computer' },
    { id: 'T8.2', title: 'Step-by-Step Troubleshooting' },
  ],
  M3: [
    { id: 'T9.1', title: 'What is the Internet? (Networks & Packets)' },
    { id: 'T9.2', title: 'Ways to Connect (Wi-Fi, Mobile Data)' },
    { id: 'T9.3', title: 'Web Addresses (URLs), Tabs & Browsers' },
    { id: 'T9.4', title: 'Accounts, OTPs & 2-Step Verification' },
    { id: 'T10.1', title: 'HTTPS & the Padlock' },
    { id: 'T10.2', title: 'Spotting Online Scams & Fake Pages' },
    { id: 'T10.3', title: 'Browser Privacy Basics' },
    { id: 'T10.4', title: 'Safe Downloads & Files from the Web' },
    { id: 'T11.1', title: 'Smart Keywords & Operators' },
    { id: 'T11.2', title: 'Check If Information Is Trustworthy' },
  ],
  M4: [
    { id: 'T12.1', title: 'Create & Secure an Email Account' },
    { id: 'T12.2', title: 'Compose, Attach & Send Professionally' },
    { id: 'T12.3', title: 'Inbox Hygiene & Simple Filters' },
    { id: 'T13.1', title: 'Account Safety & Privacy Settings' },
    { id: 'T13.2', title: 'Groups, Forwarding & Rumor Control' },
    { id: 'T13.3', title: 'Backups, Device Linking & Scams' },
    { id: 'T14.1', title: 'Join/Host Calls & Basic Controls' },
    { id: 'T14.2', title: 'Low-Data, Low-Noise Calling Etiquette' },
    { id: 'T15.1', title: 'Respectful Messages & Tone' },
    { id: 'T15.2', title: 'Consent, Photos & Digital Footprints' },
  ],
  M5: [
    { id: 'T16.1', title: 'Finding Official Government Services' },
    { id: 'T16.2', title: 'Safe Digital Documents' },
    { id: 'T16.3', title: 'Filling Forms on Shared Computers' },
    { id: 'T17.1', title: 'UPI Basics (ID, PIN, QR, Requests)' },
    { id: 'T17.2', title: 'Payment Scams & Safety Rules' },
    { id: 'T17.3', title: 'Family/Shop Records & Budgeting' },
    { id: 'T18.1', title: 'Low-Data Product Photos & Descriptions' },
    { id: 'T18.2', title: 'Safe Selling Channels & Orders' },
    { id: 'T19.1', title: 'Weather & Advisory with Low Data' },
    { id: 'T19.2', title: 'Farm Records & Costing (Profit Basics)' },
  ],
};

/**
 * Get topics for a module
 */
export function getTopicsForModule(moduleId: string): TopicInfo[] {
  return MODULE_TOPICS[moduleId] || [];
}

/**
 * Check if Cache API is available
 */
export function isCacheApiAvailable(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/**
 * Pre-cache all lessons for a module
 *
 * @example
 * ```tsx
 * // Pre-cache when user opens a module
 * useEffect(() => {
 *   preCacheLessons('M1', 'en');
 * }, [moduleId]);
 * ```
 */
export async function preCacheLessons(
  moduleId: string,
  language: Language
): Promise<{ cached: number; failed: number }> {
  const topics = getTopicsForModule(moduleId);
  let cached = 0;
  let failed = 0;

  for (const topic of topics) {
    const success = await preCacheLesson(moduleId, topic.id, language);
    if (success) {
      cached++;
    } else {
      failed++;
    }
  }

  clientLogger.debug('[LessonCache] Pre-cached lessons', { cached, total: topics.length, moduleId });
  return { cached, failed };
}

/**
 * Pre-cache a single lesson
 */
export async function preCacheLesson(
  moduleId: string,
  topicId: string,
  language: Language
): Promise<boolean> {
  if (!isCacheApiAvailable()) {
    // Fall back to IndexedDB
    return preCacheLessonToIndexedDB(moduleId, topicId, language);
  }

  try {
    const cache = await caches.open(LESSON_CACHE);
    const url = `/api/lessons/${moduleId}/${topicId}?lang=${language}`;

    // Check if already cached
    const existing = await cache.match(url);
    if (existing) {
      return true;
    }

    // Fetch and cache
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response.clone());
      return true;
    }

    return false;
  } catch (error) {
    clientLogger.warn('[LessonCache] Failed to cache lesson', { topicId, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Fallback: Pre-cache lesson to IndexedDB
 */
async function preCacheLessonToIndexedDB(
  moduleId: string,
  topicId: string,
  language: Language
): Promise<boolean> {
  try {
    // Check if already cached
    const existing = await offlineDB.lessons.get(topicId);
    if (existing && existing.expires_at > Date.now()) {
      return true;
    }

    // Fetch lesson content
    const response = await fetch(
      `/api/lessons/${moduleId}/${topicId}?lang=${language}`
    );
    if (!response.ok) return false;

    const content = await response.json();

    // Store in IndexedDB
    const cachedLesson: CachedLesson = {
      topic_id: topicId,
      module_id: moduleId,
      language,
      content,
      cached_at: Date.now(),
      expires_at: Date.now() + CACHE_EXPIRY,
    };

    await offlineDB.lessons.put(cachedLesson);
    return true;
  } catch (error) {
    clientLogger.warn('[LessonCache] IndexedDB cache failed', { topicId, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Check if a lesson is cached
 */
export async function isLessonCached(
  moduleId: string,
  topicId: string,
  language?: Language
): Promise<boolean> {
  // Check Cache API first
  if (isCacheApiAvailable()) {
    const cache = await caches.open(LESSON_CACHE);
    const languages = language ? [language] : ['en', 'hi', 'as'];

    for (const lang of languages) {
      const url = `/api/lessons/${moduleId}/${topicId}?lang=${lang}`;
      const response = await cache.match(url);
      if (response) return true;
    }
  }

  // Check IndexedDB
  const cached = await offlineDB.lessons.get(topicId);
  if (cached && cached.expires_at > Date.now()) {
    return true;
  }

  return false;
}

/**
 * Get cached lesson content
 */
export async function getCachedLesson(
  moduleId: string,
  topicId: string,
  language: Language
): Promise<CachedLesson['content'] | null> {
  // Try Cache API first
  if (isCacheApiAvailable()) {
    try {
      const cache = await caches.open(LESSON_CACHE);
      const url = `/api/lessons/${moduleId}/${topicId}?lang=${language}`;
      const response = await cache.match(url);

      if (response) {
        return response.json();
      }
    } catch (error) {
      clientLogger.warn('[LessonCache] Cache API read failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Try IndexedDB
  try {
    const cached = await offlineDB.lessons.get(topicId);
    if (cached && cached.expires_at > Date.now() && cached.language === language) {
      return cached.content;
    }
  } catch (error) {
    clientLogger.warn('[LessonCache] IndexedDB read failed', { error: error instanceof Error ? error.message : String(error) });
  }

  return null;
}

/**
 * Get all cached lessons for a module
 */
export async function getCachedLessonsForModule(
  moduleId: string
): Promise<CachedLesson[]> {
  try {
    const lessons = await offlineDB.lessons
      .where('module_id')
      .equals(moduleId)
      .filter((lesson) => lesson.expires_at > Date.now())
      .toArray();

    return lessons;
  } catch (error) {
    clientLogger.warn('[LessonCache] Failed to get cached lessons', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  cachedCount: number;
  totalSize: number;
  byModule: Record<string, number>;
}> {
  const lessons = await offlineDB.lessons.toArray();
  const validLessons = lessons.filter((l) => l.expires_at > Date.now());

  const byModule: Record<string, number> = {};
  for (const lesson of validLessons) {
    byModule[lesson.module_id] = (byModule[lesson.module_id] || 0) + 1;
  }

  // Estimate size (rough calculation)
  const totalSize = validLessons.reduce((acc, lesson) => {
    return acc + JSON.stringify(lesson.content).length;
  }, 0);

  return {
    cachedCount: validLessons.length,
    totalSize,
    byModule,
  };
}

/**
 * Clear lesson cache for a specific module
 */
export async function clearModuleCache(moduleId: string): Promise<number> {
  // Clear from Cache API
  if (isCacheApiAvailable()) {
    try {
      const cache = await caches.open(LESSON_CACHE);
      const requests = await cache.keys();

      for (const request of requests) {
        if (request.url.includes(`/api/lessons/${moduleId}/`)) {
          await cache.delete(request);
        }
      }
    } catch (error) {
      clientLogger.warn('[LessonCache] Cache API clear failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Clear from IndexedDB
  return offlineDB.lessons.where('module_id').equals(moduleId).delete();
}

/**
 * Clear all lesson cache
 */
export async function clearAllLessonCache(): Promise<void> {
  // Clear Cache API
  if (isCacheApiAvailable()) {
    await caches.delete(LESSON_CACHE);
  }

  // Clear IndexedDB
  await offlineDB.lessons.clear();

  clientLogger.debug('[LessonCache] All caches cleared');
}

/**
 * Clear expired lessons
 */
export async function clearExpiredLessons(): Promise<number> {
  const now = Date.now();
  return offlineDB.lessons.where('expires_at').below(now).delete();
}
