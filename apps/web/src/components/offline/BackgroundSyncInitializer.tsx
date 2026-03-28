"use client";

import { useEffect } from "react";
import { clientLogger } from "@/lib/client-logger";
import { initializeBackgroundSync, triggerMutationSync } from "@/lib/offline";

/**
 * ServiceWorkerRegistrar + BackgroundSync coordinator.
 *
 * Registers the service worker at app root for PWA installability and offline support.
 * Uses the native Next.js 16 approach (manual public/sw.js, no next-pwa dependency).
 *
 * After registration, initializes background sync tags so the browser knows to fire
 * the SW's `sync` event when the device comes back online. The SW then messages this
 * component (via postMessage) to run triggerMutationSync() in the main thread,
 * which is where Dexie and the Supabase client live.
 */
export function BackgroundSyncInitializer() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        clientLogger.info("[SW] Service Worker registered", {
          scope: registration.scope,
        });
        // Register background sync tags now that the SW is active.
        return initializeBackgroundSync();
      })
      .catch((error) => {
        clientLogger.warn("[SW] Registration failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });

    // Listen for BACKGROUND_SYNC messages from the service worker.
    // The SW can't access Dexie directly, so it asks us to run the sync here.
    function handleSwMessage(event: MessageEvent) {
      if (event.data?.type === "BACKGROUND_SYNC") {
        clientLogger.info("[SW] Background sync triggered", { tag: event.data.tag });
        triggerMutationSync().catch((err: unknown) => {
          clientLogger.warn("[SW] Mutation sync failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }

    navigator.serviceWorker.addEventListener("message", handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleSwMessage);
    };
  }, []);

  return null;
}
