/**
 * Network Status Hook - Reliable Online/Offline Detection
 *
 * Features:
 * - Detects online/offline state
 * - Detects connection quality (2G, 3G, 4G, WiFi)
 * - Debounced reconnection (prevents flapping)
 * - NetworkInformation API support where available
 *
 * Best practices from:
 * - https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
 * - https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { clientLogger } from '@/lib/client-logger';

/**
 * Network connection type
 */
export type ConnectionType =
  | 'wifi'
  | 'cellular'
  | '4g'
  | '3g'
  | '2g'
  | 'slow-2g'
  | 'unknown';

/**
 * Network status interface
 */
export interface NetworkStatus {
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether the connection is slow (2G or slow-2g) */
  isSlowConnection: boolean;
  /** Connection type from NetworkInformation API */
  connectionType: ConnectionType;
  /** Effective connection type (4g, 3g, 2g, slow-2g) */
  effectiveType: string | null;
  /** Downlink speed in Mbps */
  downlink: number | null;
  /** Round-trip time in ms */
  rtt: number | null;
  /** Whether save-data mode is enabled */
  saveData: boolean;
}

/**
 * Default network status (assumes online in SSR)
 */
const DEFAULT_STATUS: NetworkStatus = {
  isOnline: true,
  isSlowConnection: false,
  connectionType: 'unknown',
  effectiveType: null,
  downlink: null,
  rtt: null,
  saveData: false,
};

/**
 * Debounce time for reconnection confirmation (ms)
 * Prevents flapping when connection is unstable
 */
const RECONNECTION_DEBOUNCE = 2000;

/**
 * Hook for monitoring network connectivity status
 *
 * @example
 * ```tsx
 * const { isOnline, isSlowConnection, connectionType } = useNetworkStatus();
 *
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 *
 * if (isSlowConnection) {
 *   // Show reduced-quality content
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    // Initialize with navigator.onLine if available
    if (typeof navigator !== 'undefined') {
      return {
        ...DEFAULT_STATUS,
        isOnline: navigator.onLine,
      };
    }
    return DEFAULT_STATUS;
  });

  const updateStatus = useCallback(() => {
    if (typeof navigator === 'undefined') return;

    // Get NetworkInformation API if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = (navigator as any).connection;

    const effectiveType = connection?.effectiveType || null;
    const isSlowConnection =
      effectiveType === '2g' || effectiveType === 'slow-2g';

    setStatus({
      isOnline: navigator.onLine,
      isSlowConnection,
      connectionType: connection?.type || 'unknown',
      effectiveType,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      saveData: connection?.saveData || false,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let reconnectTimeout: NodeJS.Timeout | undefined;

    /**
     * Handle going online with debounce
     * Wait 2s before confirming to prevent flapping
     */
    const handleOnline = () => {
      // Clear any pending timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      // Debounce reconnection confirmation
      reconnectTimeout = setTimeout(() => {
        clientLogger.debug('[useNetworkStatus] Online confirmed');
        updateStatus();
      }, RECONNECTION_DEBOUNCE);
    };

    /**
     * Handle going offline immediately
     */
    const handleOffline = () => {
      // Clear any pending reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      clientLogger.debug('[useNetworkStatus] Offline detected');
      updateStatus();
    };

    /**
     * Handle connection quality changes
     */
    const handleConnectionChange = () => {
      clientLogger.debug('[useNetworkStatus] Connection changed');
      updateStatus();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Add NetworkInformation API listener if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial status update
    updateStatus();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [updateStatus]);

  return status;
}

/**
 * Type guard to check if NetworkInformation API is available
 */
export function hasNetworkInformation(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'connection' in navigator &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).connection !== undefined
  );
}
