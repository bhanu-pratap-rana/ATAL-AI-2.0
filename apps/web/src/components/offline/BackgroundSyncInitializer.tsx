"use client";

import { useEffect } from "react";
import { clientLogger } from "@/lib/client-logger";

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
    if (!("serviceWorker" in navigator)) {
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

        // Listen for sync messages from service worker
        navigator.serviceWorker.controller?.postMessage({
          type: "SW_READY",
          timestamp: Date.now(),
        });
      })
      .catch((error) => {
        clientLogger.error(
          "[BackgroundSyncInitializer] Service Worker registration failed",
          error instanceof Error ? error : { error: String(error) },
        );
      });

    // Handle messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      const { type, tag, timestamp } = event.data;

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
