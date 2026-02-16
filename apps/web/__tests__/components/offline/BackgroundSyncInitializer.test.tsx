/**
 * Tests for BackgroundSyncInitializer component
 * Target: ~15 tests covering service worker registration and message handling
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { BackgroundSyncInitializer } from "@/components/offline/BackgroundSyncInitializer";

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock isServiceWorkerSupported
const mockIsServiceWorkerSupported = jest.fn();
jest.mock("@/lib/offline/background-sync", () => ({
  isServiceWorkerSupported: () => mockIsServiceWorkerSupported(),
}));

describe("BackgroundSyncInitializer", () => {
  let mockRegister: jest.Mock;
  let mockPostMessage: jest.Mock;
  let mockAddEventListener: jest.Mock;
  let mockRemoveEventListener: jest.Mock;
  let messageHandlers: Array<(event: MessageEvent) => void>;
  let serviceWorkerMock: object;

  beforeEach(() => {
    jest.clearAllMocks();
    messageHandlers = [];

    mockPostMessage = jest.fn();
    mockRegister = jest.fn().mockResolvedValue({
      scope: "/",
    });
    mockAddEventListener = jest.fn((event, handler) => {
      if (event === "message") {
        messageHandlers.push(handler);
      }
    });
    mockRemoveEventListener = jest.fn((event, handler) => {
      if (event === "message") {
        messageHandlers = messageHandlers.filter((h) => h !== handler);
      }
    });

    serviceWorkerMock = {
      register: mockRegister,
      controller: {
        postMessage: mockPostMessage,
      },
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    };

    // Set up navigator.serviceWorker mock
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: serviceWorkerMock,
      writable: true,
      configurable: true,
    });

    mockIsServiceWorkerSupported.mockReturnValue(true);
  });

  afterEach(() => {
    // Note: Don't delete during test run - just clear after
    jest.clearAllMocks();
  });

  describe("service worker not supported", () => {
    it("should log warning when service worker not supported", () => {
      mockIsServiceWorkerSupported.mockReturnValue(false);
      const { clientLogger } = require("@/lib/client-logger");

      render(<BackgroundSyncInitializer />);

      expect(clientLogger.warn).toHaveBeenCalledWith(
        "[BackgroundSyncInitializer] Service Worker not supported"
      );
    });

    it("should not attempt registration when not supported", () => {
      mockIsServiceWorkerSupported.mockReturnValue(false);

      render(<BackgroundSyncInitializer />);

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should render null", () => {
      mockIsServiceWorkerSupported.mockReturnValue(false);

      const { container } = render(<BackgroundSyncInitializer />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("service worker registration", () => {
    it("should register service worker on mount", async () => {
      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith("/sw.js", { scope: "/" });
      });
    });

    it("should log success on successful registration", async () => {
      const { clientLogger } = require("@/lib/client-logger");

      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(clientLogger.info).toHaveBeenCalledWith(
          "[BackgroundSyncInitializer] Service Worker registered",
          expect.objectContaining({ scope: "/" })
        );
      });
    });

    it("should post SW_READY message after registration", async () => {
      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "SW_READY",
            timestamp: expect.any(Number),
          })
        );
      });
    });

    it("should log error on registration failure", async () => {
      const error = new Error("Registration failed");
      mockRegister.mockRejectedValue(error);
      const { clientLogger } = require("@/lib/client-logger");

      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(clientLogger.error).toHaveBeenCalledWith(
          "[BackgroundSyncInitializer] Service Worker registration failed",
          error
        );
      });
    });

    it("should add message event listener", async () => {
      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith(
          "message",
          expect.any(Function)
        );
      });
    });
  });

  describe("message handling", () => {
    it("should dispatch SW_SYNC_TRIGGERED on BACKGROUND_SYNC message", async () => {
      const dispatchEventSpy = jest.spyOn(globalThis, "dispatchEvent");

      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(messageHandlers.length).toBeGreaterThan(0);
      });

      // Simulate message from service worker
      const messageEvent = new MessageEvent("message", {
        data: { type: "BACKGROUND_SYNC", tag: "test-sync" },
      });
      messageHandlers[0](messageEvent);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SW_SYNC_TRIGGERED",
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it("should dispatch SW_SYNC_COMPLETE on SYNC_COMPLETE message", async () => {
      const dispatchEventSpy = jest.spyOn(globalThis, "dispatchEvent");

      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(messageHandlers.length).toBeGreaterThan(0);
      });

      const messageEvent = new MessageEvent("message", {
        data: { type: "SYNC_COMPLETE", tag: "test-sync" },
      });
      messageHandlers[0](messageEvent);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SW_SYNC_COMPLETE",
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it("should dispatch SW_PERIODIC_SYNC on PERIODIC_SYNC message", async () => {
      const dispatchEventSpy = jest.spyOn(globalThis, "dispatchEvent");

      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(messageHandlers.length).toBeGreaterThan(0);
      });

      const messageEvent = new MessageEvent("message", {
        data: { type: "PERIODIC_SYNC", tag: "test-sync" },
      });
      messageHandlers[0](messageEvent);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SW_PERIODIC_SYNC",
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it("should ignore messages with no data", async () => {
      const { clientLogger } = require("@/lib/client-logger");

      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(messageHandlers.length).toBeGreaterThan(0);
      });

      const messageEvent = new MessageEvent("message", { data: null });
      messageHandlers[0](messageEvent);

      // Should not log debug message for empty data
      expect(clientLogger.debug).not.toHaveBeenCalledWith(
        "[BackgroundSyncInitializer] Message from SW",
        expect.anything()
      );
    });

    it("should log debug message for valid messages", async () => {
      const { clientLogger } = require("@/lib/client-logger");

      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(messageHandlers.length).toBeGreaterThan(0);
      });

      const messageEvent = new MessageEvent("message", {
        data: { type: "BACKGROUND_SYNC", tag: "test" },
      });
      messageHandlers[0](messageEvent);

      expect(clientLogger.debug).toHaveBeenCalledWith(
        "[BackgroundSyncInitializer] Message from SW",
        { type: "BACKGROUND_SYNC", tag: "test" }
      );
    });

    it("should handle unknown message types silently", async () => {
      const dispatchEventSpy = jest.spyOn(globalThis, "dispatchEvent");

      render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(messageHandlers.length).toBeGreaterThan(0);
      });

      const messageEvent = new MessageEvent("message", {
        data: { type: "UNKNOWN_TYPE", tag: "test" },
      });
      messageHandlers[0](messageEvent);

      // Should not dispatch any custom events for unknown types
      expect(dispatchEventSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.stringMatching(/^SW_/) })
      );

      dispatchEventSpy.mockRestore();
    });
  });

  describe("cleanup", () => {
    it("should remove event listener on unmount", async () => {
      const { unmount } = render(<BackgroundSyncInitializer />);

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function)
      );
    });
  });
});
