/**
 * Tests for mutation-queue.ts
 * Target: ~25 tests covering offline mutation queueing
 */

import {
  enqueueAssessmentResponse,
  enqueueChatMessage,
  enqueuePointsAward,
  enqueueProgressUpdate,
  getMutationQueueStatus,
  triggerMutationSync,
  subscribeMutationQueue,
} from "@/lib/offline/mutation-queue";

// Mock dependencies
const mockEnqueue = jest.fn();
const mockGetStatus = jest.fn();
const mockManualSync = jest.fn();
const mockSubscribe = jest.fn();

jest.mock("@/lib/offline/sync-queue", () => ({
  syncQueue: {
    enqueue: (...args: unknown[]) => mockEnqueue(...args),
    getStatus: () => mockGetStatus(),
    manualSync: (...args: unknown[]) => mockManualSync(...args),
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
  },
}));

jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/validation/rpc-schemas", () => ({
  validateMutationQueuePayload: jest.fn((payload) => payload),
}));

describe("mutation-queue", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnqueue.mockResolvedValue(1);
    mockGetStatus.mockResolvedValue({
      pendingCount: 0,
      failedCount: 0,
      isSyncing: false,
      lastSyncAt: null,
      lastError: null,
    });
    mockManualSync.mockResolvedValue({
      success: 5,
      failed: 0,
      pending: 0,
    });
    mockSubscribe.mockReturnValue(() => {});
  });

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  const setOnlineStatus = (online: boolean) => {
    Object.defineProperty(global, "navigator", {
      value: { onLine: online },
      writable: true,
    });
  };

  describe("enqueueAssessmentResponse", () => {
    const validPayload = {
      session_id: "session-123",
      item_id: "item-456",
      module: "math",
      is_correct: true,
      rt_ms: 5000,
      focus_blur_count: 0,
      chosen_option: "A",
    };

    it("should return undefined when online", async () => {
      setOnlineStatus(true);

      const result = await enqueueAssessmentResponse(validPayload);

      expect(result).toBeUndefined();
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it("should enqueue when offline", async () => {
      setOnlineStatus(false);
      mockEnqueue.mockResolvedValueOnce(42);

      const result = await enqueueAssessmentResponse(validPayload);

      expect(result).toBe(42);
      expect(mockEnqueue).toHaveBeenCalledWith(
        "assessment_submit",
        validPayload
      );
    });

    it("should throw error on enqueue failure", async () => {
      setOnlineStatus(false);
      mockEnqueue.mockRejectedValueOnce(new Error("Queue full"));

      await expect(enqueueAssessmentResponse(validPayload)).rejects.toThrow(
        "Queue full"
      );
    });
  });

  describe("enqueueChatMessage", () => {
    const validPayload = {
      student_id: "student-123",
      session_id: "session-456",
      message_content: "Hello",
      message_role: "user" as const,
      input_mode: "text" as const,
      language: "en" as const,
    };

    it("should return undefined when online", async () => {
      setOnlineStatus(true);

      const result = await enqueueChatMessage(validPayload);

      expect(result).toBeUndefined();
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it("should enqueue when offline", async () => {
      setOnlineStatus(false);
      mockEnqueue.mockResolvedValueOnce(43);

      const result = await enqueueChatMessage(validPayload);

      expect(result).toBe(43);
      expect(mockEnqueue).toHaveBeenCalledWith("chat_message", validPayload);
    });

    it("should throw error on enqueue failure", async () => {
      setOnlineStatus(false);
      mockEnqueue.mockRejectedValueOnce(new Error("DB error"));

      await expect(enqueueChatMessage(validPayload)).rejects.toThrow(
        "DB error"
      );
    });
  });

  describe("enqueuePointsAward", () => {
    const validPayload = {
      student_id: "student-123",
      points: 100,
      source: "assessment",
      description: "Completed quiz",
    };

    it("should return undefined when online", async () => {
      setOnlineStatus(true);

      const result = await enqueuePointsAward(validPayload);

      expect(result).toBeUndefined();
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it("should enqueue when offline", async () => {
      setOnlineStatus(false);
      mockEnqueue.mockResolvedValueOnce(44);

      const result = await enqueuePointsAward(validPayload);

      expect(result).toBe(44);
      expect(mockEnqueue).toHaveBeenCalledWith("points_award", validPayload);
    });

    it("should throw error on enqueue failure", async () => {
      setOnlineStatus(false);
      mockEnqueue.mockRejectedValueOnce(new Error("Storage full"));

      await expect(enqueuePointsAward(validPayload)).rejects.toThrow(
        "Storage full"
      );
    });
  });

  describe("enqueueProgressUpdate", () => {
    const validPayload = {
      student_id: "student-123",
      topic_id: "topic-456",
      module_id: "module-789",
      mastery_score: 75,
      confidence_level: "medium" as const,
      attempts: 3,
      time_spent_seconds: 600,
      status: "in_progress" as const,
    };

    it("should return undefined when online", async () => {
      setOnlineStatus(true);

      const result = await enqueueProgressUpdate(validPayload);

      expect(result).toBeUndefined();
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it("should enqueue when offline", async () => {
      setOnlineStatus(false);
      mockEnqueue.mockResolvedValueOnce(45);

      const result = await enqueueProgressUpdate(validPayload);

      expect(result).toBe(45);
      expect(mockEnqueue).toHaveBeenCalledWith("progress_update", validPayload);
    });

    it("should throw error on enqueue failure", async () => {
      setOnlineStatus(false);
      mockEnqueue.mockRejectedValueOnce(new Error("Invalid data"));

      await expect(enqueueProgressUpdate(validPayload)).rejects.toThrow(
        "Invalid data"
      );
    });
  });

  describe("getMutationQueueStatus", () => {
    it("should return queue status", async () => {
      mockGetStatus.mockResolvedValueOnce({
        pendingCount: 5,
        failedCount: 2,
        isSyncing: true,
        lastSyncAt: 1234567890,
        lastError: null,
      });

      const status = await getMutationQueueStatus();

      expect(status.pendingCount).toBe(5);
      expect(status.failedCount).toBe(2);
      expect(status.isSyncing).toBe(true);
    });

    it("should return default status on error", async () => {
      mockGetStatus.mockRejectedValueOnce(new Error("DB error"));

      const status = await getMutationQueueStatus();

      expect(status.pendingCount).toBe(0);
      expect(status.failedCount).toBe(0);
      expect(status.isSyncing).toBe(false);
      expect(status.lastSyncAt).toBeNull();
      expect(status.lastError).toBeNull();
    });
  });

  describe("triggerMutationSync", () => {
    it("should trigger manual sync", async () => {
      mockManualSync.mockResolvedValueOnce({
        success: 10,
        failed: 2,
        pending: 0,
      });

      const result = await triggerMutationSync();

      expect(result.success).toBe(10);
      expect(result.failed).toBe(2);
      expect(result.pending).toBe(0);
    });

    it("should pass progress callback", async () => {
      const progressCallback = jest.fn();
      mockManualSync.mockResolvedValueOnce({
        success: 5,
        failed: 0,
        pending: 0,
      });

      await triggerMutationSync(progressCallback);

      expect(mockManualSync).toHaveBeenCalledWith(progressCallback);
    });

    it("should throw error on sync failure", async () => {
      mockManualSync.mockRejectedValueOnce(new Error("Sync failed"));

      await expect(triggerMutationSync()).rejects.toThrow("Sync failed");
    });
  });

  describe("subscribeMutationQueue", () => {
    it("should subscribe to queue updates", () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();
      mockSubscribe.mockReturnValueOnce(unsubscribe);

      const result = subscribeMutationQueue(callback);

      expect(mockSubscribe).toHaveBeenCalledWith(callback);
      expect(result).toBe(unsubscribe);
    });

    it("should return unsubscribe function", () => {
      const callback = jest.fn();
      const unsubscribeFn = jest.fn();
      mockSubscribe.mockReturnValueOnce(unsubscribeFn);

      const unsubscribe = subscribeMutationQueue(callback);
      unsubscribe();

      expect(unsubscribeFn).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle undefined navigator", async () => {
      // @ts-expect-error - Testing undefined navigator
      delete global.navigator;

      const result = await enqueueAssessmentResponse({
        session_id: "s1",
        item_id: "i1",
        module: "m1",
        is_correct: true,
        rt_ms: 1000,
        focus_blur_count: 0,
        chosen_option: "A",
      });

      // Should enqueue when navigator is undefined (server-side scenario)
      expect(result).toBeDefined();
    });
  });
});
