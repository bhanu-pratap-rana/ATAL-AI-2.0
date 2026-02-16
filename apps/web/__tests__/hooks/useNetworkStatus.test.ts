/**
 * Tests for useNetworkStatus Hook
 *
 * Tests network status monitoring including:
 * - Online/offline detection
 * - Connection type detection
 * - Event listener handling
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useNetworkStatus, hasNetworkInformation } from "@/hooks/useNetworkStatus";

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useNetworkStatus", () => {
  const originalNavigator = global.navigator;
  const originalAddEventListener = global.addEventListener;
  const originalRemoveEventListener = global.removeEventListener;

  beforeEach(() => {
    jest.useFakeTimers();

    // Reset mock event handlers
    (global as unknown as { eventHandlers: Record<string, (() => void)[]> }).eventHandlers = {
      online: [],
      offline: [],
    };

    // Mock addEventListener to capture handlers
    global.addEventListener = jest.fn((event: string, handler: () => void) => {
      const eventHandlers = (global as unknown as { eventHandlers: Record<string, (() => void)[]> }).eventHandlers;
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    });

    // Mock removeEventListener
    global.removeEventListener = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    global.addEventListener = originalAddEventListener;
    global.removeEventListener = originalRemoveEventListener;
  });

  describe("initial state", () => {
    it("should initialize with online status from navigator", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: true,
        },
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);
    });

    it("should initialize with offline status when navigator.onLine is false", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: false,
        },
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);
    });

    it("should have default connection type as unknown", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: true,
        },
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.connectionType).toBe("unknown");
    });
  });

  describe("isSlowConnection", () => {
    it("should detect slow connection for 2g", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: true,
          connection: {
            effectiveType: "2g",
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          },
        },
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isSlowConnection).toBe(true);
    });

    it("should detect slow connection for slow-2g", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: true,
          connection: {
            effectiveType: "slow-2g",
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          },
        },
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isSlowConnection).toBe(true);
    });

    it("should not detect slow connection for 4g", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: true,
          connection: {
            effectiveType: "4g",
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          },
        },
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isSlowConnection).toBe(false);
    });
  });

  describe("connection info", () => {
    it("should expose connection details when available", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: true,
          connection: {
            effectiveType: "4g",
            type: "wifi",
            downlink: 10,
            rtt: 50,
            saveData: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          },
        },
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.effectiveType).toBe("4g");
      expect(result.current.connectionType).toBe("wifi");
      expect(result.current.downlink).toBe(10);
      expect(result.current.rtt).toBe(50);
      expect(result.current.saveData).toBe(false);
    });
  });

  describe("event listeners", () => {
    it("should add online/offline event listeners", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: true,
        },
        configurable: true,
      });

      renderHook(() => useNetworkStatus());

      expect(global.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
      expect(global.addEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function)
      );
    });

    it("should remove event listeners on unmount", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: true,
        },
        configurable: true,
      });

      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(global.removeEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
      expect(global.removeEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function)
      );
    });
  });

  describe("offline handling", () => {
    it("should update status when going offline", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          onLine: false,
        },
        configurable: true,
        writable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());

      // Simulate offline event
      const eventHandlers = (global as unknown as { eventHandlers: Record<string, (() => void)[]> }).eventHandlers;
      act(() => {
        eventHandlers.offline?.forEach((handler) => handler());
      });

      expect(result.current.isOnline).toBe(false);
    });
  });
});

describe("hasNetworkInformation", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  it("should return false when navigator is undefined", () => {
    Object.defineProperty(global, "navigator", {
      value: undefined,
      configurable: true,
    });

    expect(hasNetworkInformation()).toBe(false);
  });

  it("should return true when connection is available", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        connection: {
          effectiveType: "4g",
        },
      },
      configurable: true,
    });

    expect(hasNetworkInformation()).toBe(true);
  });

  it("should return false when connection is not available", () => {
    Object.defineProperty(global, "navigator", {
      value: {},
      configurable: true,
    });

    expect(hasNetworkInformation()).toBe(false);
  });
});
