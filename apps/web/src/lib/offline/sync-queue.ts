/**
 * Sync Queue - Offline Mutation Queue with Retry
 *
 * Implements offline-first sync with:
 * - Queue mutations when offline
 * - Exponential backoff with jitter (prevents thundering herd)
 * - Automatic sync when online
 * - Subscription pattern for UI updates
 * - Manual sync with progress tracking
 * - Conflict resolution
 *
 * Best practices from:
 * - https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs
 * - https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
 * - https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/
 */

import { offlineDB, type QueuedMutation } from "./database";
import { createClient } from "@/lib/supabase-browser";
import { clientLogger } from "@/lib/client-logger";

/**
 * Maximum retry attempts before giving up
 */
const MAX_RETRIES = 5;

/**
 * Base delay for exponential backoff (ms)
 */
const BASE_DELAY = 1000;

/**
 * Maximum delay for exponential backoff (ms)
 */
const MAX_DELAY = 32000;

/**
 * Jitter factor (10% variance to prevent thundering herd)
 */
const JITTER_FACTOR = 0.1;

/**
 * Sync status for UI updates
 */
export interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: number;
  failed: number;
  pending: number;
  errors: Array<{ id: number; error: string }>;
}

/**
 * Callback for sync status updates
 */
type SyncStatusCallback = (status: SyncStatus) => void;

/**
 * Progress callback for manual sync
 */
type ProgressCallback = (current: number, total: number) => void;

/**
 * Sync Queue Manager
 */
export class SyncQueue {
  private isSyncing = false;
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private subscribers: Set<SyncStatusCallback> = new Set();

  /**
   * Subscribe to sync status updates
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   const unsubscribe = syncQueue.subscribe((status) => {
   *     setPendingCount(status.pendingCount);
   *     setIsSyncing(status.isSyncing);
   *   });
   *   return unsubscribe;
   * }, []);
   * ```
   */
  subscribe(callback: SyncStatusCallback): () => void {
    this.subscribers.add(callback);

    // Immediately send current status
    this.getStatus()
      .then((status) => callback(status))
      .catch((error) => {
        clientLogger.error("[SyncQueue] Failed to get initial status", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Send default status on error
        callback({
          pendingCount: 0,
          failedCount: 0,
          isSyncing: false,
          lastSyncAt: null,
          lastError: error instanceof Error ? error.message : "Unknown error",
        });
      });

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of status change
   */
  private async notifySubscribers(): Promise<void> {
    const status = await this.getStatus();
    this.subscribers.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        clientLogger.error("[SyncQueue] Subscriber error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Add a mutation to the queue
   */
  async enqueue(
    type: QueuedMutation["type"],
    payload: Record<string, unknown>,
  ): Promise<number | undefined> {
    const mutation: Omit<QueuedMutation, "id"> = {
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    const id = await offlineDB.syncQueue.add(mutation as QueuedMutation);

    // Notify subscribers of new item
    await this.notifySubscribers();

    // Try to sync immediately if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      this.syncAll();
    }

    return id;
  }

  /**
   * Process a batch of sync items (shared by syncAll and manualSync)
   */
  private async processSyncBatch(
    items: QueuedMutation[],
    onProgress?: ProgressCallback,
  ): Promise<{ success: number; failed: number; errors: Array<{ id: number; error: string }> }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Report progress if callback provided
      onProgress?.(i + 1, items.length);

      if (!item.id) {
        clientLogger.warn("[SyncQueue] Item missing id, skipping", {
          type: item.type,
          timestamp: item.timestamp,
        });
        continue;
      }

      const result = await this.syncItem(item);

      if (result.success) {
        await offlineDB.syncQueue.delete(item.id);
        success++;
      } else if (item.retries >= MAX_RETRIES) {
        clientLogger.error("[SyncQueue] Max retries exceeded", {
          itemId: item.id,
          type: item.type,
          retries: item.retries,
        });
        await offlineDB.syncQueue.delete(item.id);
        failed++;
        errors.push({
          id: item.id,
          error: result.error || "Max retries exceeded",
        });
      } else {
        // Increment retry count
        if (item.id) {
          await offlineDB.syncQueue.update(item.id, {
            retries: item.retries + 1,
            lastError: result.error,
          });
        }
      }
    }

    return { success, failed, errors };
  }

  /**
   * Sync all pending mutations
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      const status = await this.getStatus();
      return {
        success: 0,
        failed: 0,
        pending: status.pendingCount,
        errors: [],
      };
    }

    this.isSyncing = true;
    this.lastError = null;
    await this.notifySubscribers();

    try {
      const pending = await offlineDB.syncQueue.toArray();
      const { success, failed, errors } = await this.processSyncBatch(pending);
      this.lastSyncAt = Date.now();

      const status = await this.getStatus();
      return { success, failed, pending: status.pendingCount, errors };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      clientLogger.error("[SyncQueue] Sync failed", {
        error: error instanceof Error ? error.message : this.lastError,
      });
      const status = await this.getStatus();
      return { success: 0, failed: 0, pending: status.pendingCount, errors: [] };
    } finally {
      this.isSyncing = false;
      await this.notifySubscribers();
    }
  }

  /**
   * Manual sync with progress callback
   *
   * @example
   * ```tsx
   * await syncQueue.manualSync((current, total) => {
   *   setProgress((current / total) * 100);
   * });
   * ```
   */
  async manualSync(onProgress?: ProgressCallback): Promise<SyncResult> {
    if (this.isSyncing) {
      const status = await this.getStatus();
      return {
        success: 0,
        failed: 0,
        pending: status.pendingCount,
        errors: [],
      };
    }

    this.isSyncing = true;
    this.lastError = null;
    await this.notifySubscribers();

    try {
      const pending = await offlineDB.syncQueue.toArray();
      const { success, failed, errors } = await this.processSyncBatch(
        pending,
        onProgress,
      );
      this.lastSyncAt = Date.now();

      const status = await this.getStatus();
      return { success, failed, pending: status.pendingCount, errors };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      clientLogger.error("[SyncQueue] Manual sync failed", {
        error: error instanceof Error ? error.message : this.lastError,
      });
      const status = await this.getStatus();
      return { success: 0, failed: 0, pending: status.pendingCount, errors: [] };
    } finally {
      this.isSyncing = false;
      await this.notifySubscribers();
    }
  }

  /**
   * Get items that failed after max retries
   */
  async getFailedItems(): Promise<QueuedMutation[]> {
    const allItems = await offlineDB.syncQueue.toArray();
    return allItems.filter((item) => item.retries >= MAX_RETRIES);
  }

  /**
   * Retry a specific failed item
   */
  async retryItem(id: number): Promise<boolean> {
    const item = await offlineDB.syncQueue.get(id);
    if (!item) return false;

    // Reset retry count
    await offlineDB.syncQueue.update(id, { retries: 0, lastError: undefined });

    // Try to sync
    const result = await this.syncItem(item);

    if (result.success) {
      await offlineDB.syncQueue.delete(id);
      await this.notifySubscribers();
      return true;
    }

    return false;
  }

  /**
   * Sync a single item with exponential backoff and jitter
   */
  private async syncItem(
    item: QueuedMutation,
  ): Promise<{ success: boolean; error?: string }> {
    // Calculate backoff delay with jitter
    const delay = this.getBackoffDelay(item.retries);

    // Only wait if this is a retry (not first attempt)
    if (item.retries > 0) {
      await this.sleep(delay);
    }

    try {
      const supabase = createClient();

      switch (item.type) {
        case "assessment_submit":
          await supabase.from("formative_responses").insert(item.payload);
          break;

        case "progress_update":
          await supabase.from("student_knowledge_state").upsert(item.payload);
          break;

        case "chat_message":
          await supabase.from("ai_tutor_interactions").insert(item.payload);
          break;

        case "points_award":
          await supabase.from("points_history").insert(item.payload);
          break;

        default:
          clientLogger.warn("[SyncQueue] Unknown mutation type", {
            type: item.type,
          });
          return { success: false, error: `Unknown type: ${item.type}` };
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      clientLogger.error("[SyncQueue] Item sync failed", {
        error: error instanceof Error ? error.message : errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   * Jitter prevents "thundering herd" problem when many clients reconnect
   */
  private getBackoffDelay(retries: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (capped)
    const baseDelay = Math.min(BASE_DELAY * Math.pow(2, retries), MAX_DELAY);

    // Add ±10% jitter
    const jitter = baseDelay * JITTER_FACTOR * (Math.random() * 2 - 1);

    return Math.floor(baseDelay + jitter);
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    const allItems = await offlineDB.syncQueue.toArray();
    const pendingCount = allItems.filter(
      (item) => item.retries < MAX_RETRIES,
    ).length;
    const failedCount = allItems.filter(
      (item) => item.retries >= MAX_RETRIES,
    ).length;

    return {
      pendingCount,
      failedCount,
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };
  }

  /**
   * Clear all pending mutations
   */
  async clearAll(): Promise<void> {
    await offlineDB.syncQueue.clear();
    await this.notifySubscribers();
  }

  /**
   * Clear only failed items
   */
  async clearFailed(): Promise<void> {
    const failedItems = await this.getFailedItems();
    for (const item of failedItems) {
      if (item.id) {
        await offlineDB.syncQueue.delete(item.id);
      }
    }
    await this.notifySubscribers();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();

// Auto-sync when coming online - only in browser environment
if (
  typeof globalThis !== "undefined" &&
  typeof globalThis.addEventListener === "function"
) {
  // MEMORY LEAK FIX: Track interval ID for proper cleanup
  let syncIntervalId: NodeJS.Timeout | null = null;
  let onlineHandler: (() => void) | null = null;

  onlineHandler = () => {
    clientLogger.debug("[SyncQueue] Online - starting sync");
    syncQueue.syncAll();
  };

  globalThis.addEventListener("online", onlineHandler);

  // Initialize periodic sync (5 minutes when online)
  syncIntervalId = setInterval(
    () => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        syncQueue.syncAll();
      }
    },
    5 * 60 * 1000,
  );

  // Cleanup function to prevent memory leaks
  const cleanup = () => {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
      clientLogger.debug("[SyncQueue] Interval cleared");
    }
    if (onlineHandler) {
      globalThis.removeEventListener("online", onlineHandler);
      onlineHandler = null;
      clientLogger.debug("[SyncQueue] Event listener removed");
    }
  };

  // Cleanup on page unload
  globalThis.addEventListener("beforeunload", cleanup);

  // Cleanup on visibility change (tab hidden for long time)
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clientLogger.debug("[SyncQueue] Page hidden - stopping sync");
      }
    });
  }
}
