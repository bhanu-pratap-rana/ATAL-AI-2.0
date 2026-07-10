/**
 * Offline Mutation Queue Helpers
 *
 * Client-side trigger for replaying queued offline mutations once the
 * connection returns. Queue writes happen in useOfflineLesson via
 * offlineDB.syncQueue; this module exposes the manual sync entry point
 * used by BackgroundSyncInitializer.
 */

import { syncQueue } from "./sync-queue";
import { clientLogger } from "@/lib/client-logger";

/**
 * Manually trigger sync of queued mutations
 *
 * @param onProgress Optional callback for progress updates
 * @returns Sync result with counts of successful/failed items
 */
export async function triggerMutationSync(
  onProgress?: (current: number, total: number) => void,
) {
  try {
    clientLogger.info("[MutationQueue] Triggering manual sync");
    const result = await syncQueue.manualSync(onProgress);
    clientLogger.info("[MutationQueue] Manual sync complete", {
      success: result.success,
      failed: result.failed,
      pending: result.pending,
    });
    return result;
  } catch (error) {
    clientLogger.error("[MutationQueue] Manual sync failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
