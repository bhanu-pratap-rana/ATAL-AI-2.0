"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/lib/client-logger";
import { isServiceWorkerSupported } from "@/lib/offline/background-sync";

/**
 * BackgroundSyncInitializer
 *
 * Initializes service worker background sync handlers.
 * Must be rendered at app root to ensure sync events are captured.
 *
 * Listens for sync messages from service worker and coordinates
 * with SyncQueue for offline mutation processing.
 */
export function BackgroundSyncInitializer() {
  useEffect(() => {
    if (!isServiceWorkerSupported()) {
      clientLogger.warn(
        "[BackgroundSyncInitializer] Service Worker not supported",
      );
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        clientLogger.info(
          "[BackgroundSyncInitializer] Service Worker registered",
          {
            scope: registration.scope,
          },
        );

        // REACT-002 FIX: Wait for SW to be ready before posting message
        // Previously: postMessage immediately after registration (SW may not be active)
        // Now: Use navigator.serviceWorker.ready to ensure SW is ready
        // BP-13 FIX: Add .catch() to prevent unhandled rejection
        navigator.serviceWorker.ready.then(() => {
          try {
            navigator.serviceWorker.controller?.postMessage({
              type: "SW_READY",
              timestamp: Date.now(),
            });
          } catch (postError) {
            clientLogger.debug(
              "[BackgroundSyncInitializer] postMessage failed",
              { error: postError instanceof Error ? postError.message : String(postError) },
            );
          }
        }).catch((readyError) => {
          clientLogger.debug(
            "[BackgroundSyncInitializer] SW ready failed",
            { error: readyError instanceof Error ? readyError.message : String(readyError) },
          );
        });
      })
      .catch((error) => {
        clientLogger.error(
          "[BackgroundSyncInitializer] Service Worker registration failed",
          error instanceof Error ? error : { error: String(error) },
        );
        // PWA-003 FIX: Notify user that offline features may be limited
        toast.warning("Offline features may be limited", {
          description: "Some features like background sync won't work in this browser.",
          duration: 5000,
        });
      });

    // Handle messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      const { type, tag, _timestamp } = event.data;

      clientLogger.debug("[BackgroundSyncInitializer] Message from SW", {
        type,
        tag,
      });

      switch (type) {
        case "BACKGROUND_SYNC":
          // Service worker detected connectivity restored
          // Trigger manual sync in all SyncQueue instances
          globalThis.dispatchEvent(
            new CustomEvent("SW_SYNC_TRIGGERED", { detail: { tag } }),
          );
          break;

        case "SYNC_COMPLETE":
          // Service worker completed sync
          globalThis.dispatchEvent(
            new CustomEvent("SW_SYNC_COMPLETE", { detail: { tag } }),
          );
          break;

        case "PERIODIC_SYNC":
          // Periodic sync triggered
          globalThis.dispatchEvent(
            new CustomEvent("SW_PERIODIC_SYNC", { detail: { tag } }),
          );
          break;

        default:
          break;
      }
    };

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Cleanup
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
