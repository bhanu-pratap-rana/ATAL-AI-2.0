/**
 * Offline Module Index
 *
 * Exports all offline-first utilities for ATAL AI.
 */

// Database
export {
  offlineDB,
  isOfflineStorageAvailable,
  getStorageUsage,
  type QueuedMutation,
  type CachedLesson,
  type CachedProgress,
  type CachedConversation,
} from "./database";

// Sync Queue
export {
  syncQueue,
  SyncQueue,
  type SyncStatus,
  type SyncResult,
} from "./sync-queue";

// Background Sync
export {
  SYNC_TAGS,
  PERIODIC_SYNC_TAGS,
  isBackgroundSyncSupported,
  isPeriodicSyncSupported,
  registerSync,
  registerPeriodicSync,
  initializeBackgroundSync,
  type SyncTag,
  type PeriodicSyncTag,
} from "./background-sync";

// Mutation Queue Helpers
export { triggerMutationSync } from "./mutation-queue";
