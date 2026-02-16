/**
 * Tests for sync-queue.ts
 * Target: ~25 tests covering offline sync queue functionality
 */

// Mock dependencies before imports
const mockSyncQueueAdd = jest.fn();
const mockSyncQueueDelete = jest.fn();
const mockSyncQueueUpdate = jest.fn();
const mockSyncQueueToArray = jest.fn();
const mockSyncQueueGet = jest.fn();
const mockSyncQueueClear = jest.fn();

jest.mock("@/lib/offline/database", () => ({
  offlineDB: {
    syncQueue: {
      add: mockSyncQueueAdd,
      delete: mockSyncQueueDelete,
      update: mockSyncQueueUpdate,
      toArray: mockSyncQueueToArray,
      get: mockSyncQueueGet,
      clear: mockSyncQueueClear,
    },
  },
}));

const mockSupabaseInsert = jest.fn();
const mockSupabaseUpsert = jest.fn();

jest.mock("@/lib/supabase-browser", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: mockSupabaseInsert,
      upsert: mockSupabaseUpsert,
    })),
  })),
}));

jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock crypto.getRandomValues
const mockGetRandomValues = jest.fn((array: Uint32Array) => {
  array[0] = 2147483648; // Middle value for predictable jitter
  return array;
});
Object.defineProperty(globalThis, "crypto", {
  value: { getRandomValues: mockGetRandomValues },
  writable: true,
});

// Mock navigator.onLine
let mockOnLine = true;
Object.defineProperty(navigator, "onLine", {
  get: () => mockOnLine,
  configurable: true,
});

import { SyncQueue, type SyncStatus, type SyncResult } from "@/lib/offline/sync-queue";
import { clientLogger } from "@/lib/client-logger";

describe("SyncQueue", () => {
  let syncQueue: SyncQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockOnLine = true;
    syncQueue = new SyncQueue();

    // Default mock implementations
    mockSyncQueueToArray.mockResolvedValue([]);
    mockSyncQueueAdd.mockResolvedValue(1);
    mockSyncQueueDelete.mockResolvedValue(undefined);
    mockSyncQueueUpdate.mockResolvedValue(1);
    mockSyncQueueGet.mockResolvedValue(null);
    mockSyncQueueClear.mockResolvedValue(undefined);
    mockSupabaseInsert.mockResolvedValue({ data: null, error: null });
    mockSupabaseUpsert.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("subscribe", () => {
    it("should add callback to subscribers and call immediately with status", async () => {
      const callback = jest.fn();
      mockSyncQueueToArray.mockResolvedValue([]);

      syncQueue.subscribe(callback);

      // Wait for async operations
      await jest.runAllTimersAsync();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingCount: 0,
          failedCount: 0,
          isSyncing: false,
        })
      );
    });

    it("should return unsubscribe function that removes callback", async () => {
      const callback = jest.fn();
      mockSyncQueueToArray.mockResolvedValue([]);

      const unsubscribe = syncQueue.subscribe(callback);

      // Initial call
      await jest.runAllTimersAsync();
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Trigger another notification (won't call callback)
      await syncQueue.clearAll();
      await jest.runAllTimersAsync();

      // Should not have been called again after unsubscribe
      // Note: clearAll calls notifySubscribers which would call the callback if still subscribed
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when getting initial status", async () => {
      const callback = jest.fn();
      mockSyncQueueToArray.mockRejectedValue(new Error("Database error"));

      syncQueue.subscribe(callback);
      await jest.runAllTimersAsync();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingCount: 0,
          failedCount: 0,
          isSyncing: false,
          lastError: "Database error",
        })
      );
    });
  });

  describe("enqueue", () => {
    it("should add mutation to queue and return id", async () => {
      mockSyncQueueAdd.mockResolvedValue(42);
      mockOnLine = false; // Prevent auto-sync

      const id = await syncQueue.enqueue("assessment_submit", { data: "test" });

      expect(id).toBe(42);
      expect(mockSyncQueueAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "assessment_submit",
          payload: { data: "test" },
          retries: 0,
        })
      );
    });

    it("should trigger syncAll when online", async () => {
      mockOnLine = true;
      mockSyncQueueAdd.mockResolvedValue(1);

      await syncQueue.enqueue("progress_update", { score: 100 });
      await jest.runAllTimersAsync();

      // syncAll would be called and try to process items
      expect(mockSyncQueueToArray).toHaveBeenCalled();
    });

    it("should not trigger syncAll when offline", async () => {
      mockOnLine = false;
      mockSyncQueueAdd.mockResolvedValue(1);
      mockSyncQueueToArray.mockResolvedValue([]);

      await syncQueue.enqueue("chat_message", { message: "hello" });

      // Only called for notifySubscribers, not for syncAll
      expect(mockSyncQueueToArray).toHaveBeenCalledTimes(1);
    });

    it("should notify subscribers after enqueue", async () => {
      const callback = jest.fn();
      mockOnLine = false;
      mockSyncQueueToArray.mockResolvedValue([
        { id: 1, type: "test", payload: {}, timestamp: Date.now(), retries: 0 },
      ]);

      syncQueue.subscribe(callback);
      await jest.runAllTimersAsync();
      callback.mockClear();

      await syncQueue.enqueue("assessment_submit", { data: "test" });
      await jest.runAllTimersAsync();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("syncAll", () => {
    it("should return early if already syncing", async () => {
      mockSyncQueueToArray.mockResolvedValue([
        { id: 1, type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 0 },
      ]);

      // Start first sync
      const firstSync = syncQueue.syncAll();

      // Try second sync while first is running
      const secondSync = syncQueue.syncAll();

      const secondResult = await secondSync;

      expect(secondResult.success).toBe(0);
      expect(secondResult.failed).toBe(0);

      await firstSync;
    });

    it("should process pending items successfully", async () => {
      const items = [
        { id: 1, type: "assessment_submit", payload: { data: "test1" }, timestamp: Date.now(), retries: 0 },
        { id: 2, type: "progress_update", payload: { data: "test2" }, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockResolvedValue({ data: null, error: null });
      mockSupabaseUpsert.mockResolvedValue({ data: null, error: null });

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockSyncQueueDelete).toHaveBeenCalledTimes(2);
    });

    it("should handle sync errors gracefully", async () => {
      // notifySubscribers() calls toArray() first (outside try), then try block calls it (inside try)
      // We want the second call (inside try) to fail
      let callCount = 0;
      mockSyncQueueToArray.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Database error");
        }
        return [];
      });

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(clientLogger.error).toHaveBeenCalledWith(
        "[SyncQueue] Sync failed",
        expect.any(Object)
      );
    });

    it("should delete items that exceed max retries", async () => {
      const items = [
        { id: 1, type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 5 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockRejectedValue(new Error("API error"));

      // Start sync and advance timers for backoff delay
      const syncPromise = syncQueue.syncAll();
      await jest.advanceTimersByTimeAsync(35000); // Cover max delay
      const result = await syncPromise;

      expect(result.failed).toBe(1);
      expect(mockSyncQueueDelete).toHaveBeenCalledWith(1);
    });

    it("should increment retry count on failure", async () => {
      const items = [
        { id: 1, type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 2 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockRejectedValue(new Error("API error"));

      // Start sync and advance timers for backoff delay
      const syncPromise = syncQueue.syncAll();
      await jest.advanceTimersByTimeAsync(10000); // Cover backoff delay for 2 retries
      await syncPromise;

      expect(mockSyncQueueUpdate).toHaveBeenCalledWith(1, {
        retries: 3,
        lastError: "API error",
      });
    });

    it("should skip items without id", async () => {
      const items = [
        { type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);

      await syncQueue.syncAll();

      expect(clientLogger.warn).toHaveBeenCalledWith(
        "[SyncQueue] Item missing id, skipping",
        expect.any(Object)
      );
    });
  });

  describe("manualSync", () => {
    it("should call progress callback during sync", async () => {
      const items = [
        { id: 1, type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 0 },
        { id: 2, type: "progress_update", payload: {}, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockResolvedValue({ data: null, error: null });
      mockSupabaseUpsert.mockResolvedValue({ data: null, error: null });

      const progressCallback = jest.fn();

      await syncQueue.manualSync(progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(1, 2);
      expect(progressCallback).toHaveBeenCalledWith(2, 2);
    });

    it("should return early if already syncing", async () => {
      mockSyncQueueToArray.mockResolvedValue([
        { id: 1, type: "test", payload: {}, timestamp: Date.now(), retries: 0 },
      ]);

      const firstSync = syncQueue.manualSync();
      const secondSync = syncQueue.manualSync();

      const secondResult = await secondSync;
      expect(secondResult.success).toBe(0);

      await firstSync;
    });

    it("should handle errors during manual sync", async () => {
      // notifySubscribers() calls toArray() first (outside try), then try block calls it (inside try)
      // We want the second call (inside try) to fail
      let callCount = 0;
      mockSyncQueueToArray.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Sync error");
        }
        return [];
      });

      const result = await syncQueue.manualSync();

      expect(result.success).toBe(0);
      expect(clientLogger.error).toHaveBeenCalledWith(
        "[SyncQueue] Manual sync failed",
        expect.any(Object)
      );
    });
  });

  describe("getFailedItems", () => {
    it("should return items with retries >= MAX_RETRIES", async () => {
      const items = [
        { id: 1, type: "test", payload: {}, timestamp: Date.now(), retries: 3 },
        { id: 2, type: "test", payload: {}, timestamp: Date.now(), retries: 5 },
        { id: 3, type: "test", payload: {}, timestamp: Date.now(), retries: 6 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);

      const failed = await syncQueue.getFailedItems();

      expect(failed.length).toBe(2);
      expect(failed.map((i) => i.id)).toEqual([2, 3]);
    });

    it("should return empty array when no failed items", async () => {
      mockSyncQueueToArray.mockResolvedValue([
        { id: 1, type: "test", payload: {}, timestamp: Date.now(), retries: 0 },
      ]);

      const failed = await syncQueue.getFailedItems();

      expect(failed).toEqual([]);
    });
  });

  describe("retryItem", () => {
    it("should reset retry count and attempt sync", async () => {
      // Item has retries: 5 which will cause backoff wait
      const item = { id: 1, type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 5 };
      mockSyncQueueGet.mockResolvedValue(item);
      mockSupabaseInsert.mockResolvedValue({ data: null, error: null });

      // Start retry and advance timers for backoff delay
      const retryPromise = syncQueue.retryItem(1);
      await jest.advanceTimersByTimeAsync(35000); // Cover max delay
      const result = await retryPromise;

      expect(result).toBe(true);
      expect(mockSyncQueueUpdate).toHaveBeenCalledWith(1, { retries: 0, lastError: undefined });
      expect(mockSyncQueueDelete).toHaveBeenCalledWith(1);
    });

    it("should return false if item not found", async () => {
      mockSyncQueueGet.mockResolvedValue(null);

      const result = await syncQueue.retryItem(999);

      expect(result).toBe(false);
    });

    it("should return false if sync fails", async () => {
      const item = { id: 1, type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 5 };
      mockSyncQueueGet.mockResolvedValue(item);
      mockSupabaseInsert.mockRejectedValue(new Error("API error"));

      // Start retry and advance timers for backoff delay
      const retryPromise = syncQueue.retryItem(1);
      await jest.advanceTimersByTimeAsync(35000); // Cover max delay
      const result = await retryPromise;

      expect(result).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("should return correct pending and failed counts", async () => {
      const items = [
        { id: 1, type: "test", payload: {}, timestamp: Date.now(), retries: 0 },
        { id: 2, type: "test", payload: {}, timestamp: Date.now(), retries: 3 },
        { id: 3, type: "test", payload: {}, timestamp: Date.now(), retries: 5 },
        { id: 4, type: "test", payload: {}, timestamp: Date.now(), retries: 6 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);

      const status = await syncQueue.getStatus();

      expect(status.pendingCount).toBe(2); // retries < 5
      expect(status.failedCount).toBe(2); // retries >= 5
    });

    it("should return isSyncing false when not syncing", async () => {
      mockSyncQueueToArray.mockResolvedValue([]);

      const status = await syncQueue.getStatus();

      expect(status.isSyncing).toBe(false);
    });
  });

  describe("clearAll", () => {
    it("should clear all items from queue", async () => {
      await syncQueue.clearAll();

      expect(mockSyncQueueClear).toHaveBeenCalled();
    });

    it("should notify subscribers after clearing", async () => {
      const callback = jest.fn();
      mockSyncQueueToArray.mockResolvedValue([]);

      syncQueue.subscribe(callback);
      await jest.runAllTimersAsync();
      callback.mockClear();

      await syncQueue.clearAll();
      await jest.runAllTimersAsync();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("clearFailed", () => {
    it("should only clear failed items", async () => {
      const items = [
        { id: 1, type: "test", payload: {}, timestamp: Date.now(), retries: 0 },
        { id: 2, type: "test", payload: {}, timestamp: Date.now(), retries: 5 },
        { id: 3, type: "test", payload: {}, timestamp: Date.now(), retries: 6 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);

      await syncQueue.clearFailed();

      expect(mockSyncQueueDelete).toHaveBeenCalledTimes(2);
      expect(mockSyncQueueDelete).toHaveBeenCalledWith(2);
      expect(mockSyncQueueDelete).toHaveBeenCalledWith(3);
    });

    it("should not delete items without id", async () => {
      const items = [
        { type: "test", payload: {}, timestamp: Date.now(), retries: 5 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);

      await syncQueue.clearFailed();

      expect(mockSyncQueueDelete).not.toHaveBeenCalled();
    });
  });

  describe("syncItem (mutation types)", () => {
    it("should handle assessment_submit type", async () => {
      const items = [
        { id: 1, type: "assessment_submit", payload: { response: "A" }, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockResolvedValue({ data: null, error: null });

      await syncQueue.syncAll();

      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    it("should handle progress_update type", async () => {
      const items = [
        { id: 1, type: "progress_update", payload: { score: 100 }, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseUpsert.mockResolvedValue({ data: null, error: null });

      await syncQueue.syncAll();

      expect(mockSupabaseUpsert).toHaveBeenCalled();
    });

    it("should handle chat_message type", async () => {
      const items = [
        { id: 1, type: "chat_message", payload: { message: "hi" }, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockResolvedValue({ data: null, error: null });

      await syncQueue.syncAll();

      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    it("should handle points_award type", async () => {
      const items = [
        { id: 1, type: "points_award", payload: { points: 10 }, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockResolvedValue({ data: null, error: null });

      await syncQueue.syncAll();

      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    it("should fail for unknown mutation type", async () => {
      const items = [
        { id: 1, type: "unknown_type", payload: {}, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);

      const result = await syncQueue.syncAll();

      expect(result.failed).toBe(0); // Won't count as failed since retries < MAX
      expect(clientLogger.warn).toHaveBeenCalledWith(
        "[SyncQueue] Unknown mutation type",
        expect.any(Object)
      );
    });
  });

  describe("exponential backoff", () => {
    it("should wait with backoff on retry attempts", async () => {
      const items = [
        { id: 1, type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 2 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockRejectedValue(new Error("API error"));

      const syncPromise = syncQueue.syncAll();

      // Should wait for backoff delay (approx 4000ms with some jitter)
      await jest.advanceTimersByTimeAsync(5000);
      await syncPromise;

      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    it("should not wait on first attempt", async () => {
      const items = [
        { id: 1, type: "assessment_submit", payload: {}, timestamp: Date.now(), retries: 0 },
      ];
      mockSyncQueueToArray.mockResolvedValue(items);
      mockSupabaseInsert.mockResolvedValue({ data: null, error: null });

      await syncQueue.syncAll();

      // Should complete without waiting
      expect(mockSupabaseInsert).toHaveBeenCalled();
    });
  });
});
