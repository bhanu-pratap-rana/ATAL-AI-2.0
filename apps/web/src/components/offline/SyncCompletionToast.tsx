"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSyncStatus } from "@/components/offline/SyncStatusIndicator";

/**
 * SyncCompletionToast
 *
 * UX-A6: After offline work, students/teachers need a clear confirmation
 * that their pending changes have synced to the server. The existing
 * SyncStatusIndicator in the header is too subtle for users on slow
 * networks to notice.
 *
 * Shows a brief success toast when the pending sync count drops from
 * >0 to 0 (i.e., a real sync completion, not just the initial empty state).
 *
 * Mount once in the app layout — it observes the global sync queue.
 */
export function SyncCompletionToast() {
  const { pendingCount, isSyncing, failedCount } = useSyncStatus();
  const prevPendingRef = useRef<number>(0);
  const prevFailedRef = useRef<number>(0);

  useEffect(() => {
    // Sync just finished and queue is now empty (and not from initial mount)
    if (
      prevPendingRef.current > 0 &&
      pendingCount === 0 &&
      !isSyncing &&
      failedCount === 0
    ) {
      const count = prevPendingRef.current;
      toast.success(
        count === 1
          ? "Your change has been saved online."
          : `${count} changes have been saved online.`,
        { duration: 3000 },
      );
    }

    // Sync just produced new failures
    if (failedCount > prevFailedRef.current) {
      toast.error(
        "Some changes couldn't be saved. We'll try again automatically.",
        { duration: 4000 },
      );
    }

    prevPendingRef.current = pendingCount;
    prevFailedRef.current = failedCount;
  }, [pendingCount, isSyncing, failedCount]);

  return null;
}
