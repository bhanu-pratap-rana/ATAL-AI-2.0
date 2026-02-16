/**
 * Tests for useOfflineSync hook
 * Target: ~20 tests covering offline sync queue functionality
 */

import { renderHook, act } from "@testing-library/react";

// Mock dependencies
jest.mock("@/lib/offline", () => ({
  enqueueAssessmentResponse: jest.fn(),
  enqueueChatMessage: jest.fn(),
  enqueuePointsAward: jest.fn(),
  enqueueProgressUpdate: jest.fn(),
  subscribeMutationQueue: jest.fn(),
}));

jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { useOfflineSync } from "@/hooks/useOfflineSync";
import {
  enqueueAssessmentResponse,
  enqueueChatMessage,
  enqueuePointsAward,
  enqueueProgressUpdate,
  subscribeMutationQueue,
} from "@/lib/offline";
import { clientLogger } from "@/lib/client-logger";

describe("useOfflineSync", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: offline
    Object.defineProperty(global, "navigator", {
      value: { onLine: false },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  describe("Initial State", () => {
    it("should initialize with isOfflineQueued as false", () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOfflineQueued).toBe(false);
    });

    it("should initialize queueStatus with zeros", () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.queueStatus).toEqual({
        pendingCount: 0,
        failedCount: 0,
        isSyncing: false,
      });
    });
  });

  describe("submitAssessmentWithSync", () => {
    it("should return error when online", async () => {
      Object.defineProperty(global, "navigator", {
        value: { onLine: true },
        writable: true,
      });

      const { result } = renderHook(() => useOfflineSync());

      const response = await act(async () => {
        return result.current.submitAssessmentWithSync("session-1", [
          { itemId: "q1", module: "math", isCorrect: true },
        ]);
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain("online");
      expect(enqueueAssessmentResponse).not.toHaveBeenCalled();
    });

    it("should enqueue assessment responses when offline", async () => {
      (enqueueAssessmentResponse as jest.Mock).mockResolvedValue("queue-id-1");

      const { result } = renderHook(() => useOfflineSync());

      const responses = [
        { itemId: "q1", module: "math", isCorrect: true, rtMs: 1500 },
        { itemId: "q2", module: "math", isCorrect: false, rtMs: 2000 },
      ];

      const response = await act(async () => {
        return result.current.submitAssessmentWithSync("session-123", responses);
      });

      expect(response.success).toBe(true);
      expect(response.queued).toBe(true);
      expect(response.count).toBe(2);
      expect(enqueueAssessmentResponse).toHaveBeenCalledTimes(2);
    });

    it("should set isOfflineQueued to true after enqueueing", async () => {
      (enqueueAssessmentResponse as jest.Mock).mockResolvedValue("queue-id");

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.submitAssessmentWithSync("session-1", [
          { itemId: "q1", module: "test", isCorrect: true },
        ]);
      });

      expect(result.current.isOfflineQueued).toBe(true);
    });

    it("should handle enqueue errors", async () => {
      (enqueueAssessmentResponse as jest.Mock).mockRejectedValue(
        new Error("Storage full")
      );

      const { result } = renderHook(() => useOfflineSync());

      await expect(
        act(async () => {
          await result.current.submitAssessmentWithSync("session-1", [
            { itemId: "q1", module: "test", isCorrect: true },
          ]);
        })
      ).rejects.toThrow("Storage full");

      expect(clientLogger.error).toHaveBeenCalled();
      expect(result.current.isOfflineQueued).toBe(false);
    });

    it("should map response fields correctly", async () => {
      (enqueueAssessmentResponse as jest.Mock).mockResolvedValue("queue-id");

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.submitAssessmentWithSync("session-1", [
          {
            itemId: "item-1",
            module: "module-1",
            isCorrect: true,
            rtMs: 1234,
            focusBlurCount: 2,
            chosenOption: "A",
          },
        ]);
      });

      expect(enqueueAssessmentResponse).toHaveBeenCalledWith({
        session_id: "session-1",
        item_id: "item-1",
        module: "module-1",
        is_correct: true,
        rt_ms: 1234,
        focus_blur_count: 2,
        chosen_option: "A",
      });
    });
  });

  describe("logChatMessageWithSync", () => {
    it("should return error when online", async () => {
      Object.defineProperty(global, "navigator", {
        value: { onLine: true },
        writable: true,
      });

      const { result } = renderHook(() => useOfflineSync());

      const response = await act(async () => {
        return result.current.logChatMessageWithSync({
          session_id: "session-1",
          role: "user",
          content: "Hello",
        });
      });

      expect(response.success).toBe(false);
      expect(enqueueChatMessage).not.toHaveBeenCalled();
    });

    it("should enqueue chat message when offline", async () => {
      (enqueueChatMessage as jest.Mock).mockResolvedValue("chat-queue-id");

      const { result } = renderHook(() => useOfflineSync());

      const payload = {
        session_id: "session-1",
        role: "user" as const,
        content: "Test message",
      };

      const response = await act(async () => {
        return result.current.logChatMessageWithSync(payload);
      });

      expect(response.success).toBe(true);
      expect(response.queued).toBe(true);
      expect(response.queueId).toBe("chat-queue-id");
      expect(enqueueChatMessage).toHaveBeenCalledWith(payload);
    });

    it("should handle chat enqueue errors", async () => {
      (enqueueChatMessage as jest.Mock).mockRejectedValue(new Error("Queue error"));

      const { result } = renderHook(() => useOfflineSync());

      await expect(
        act(async () => {
          await result.current.logChatMessageWithSync({
            session_id: "s1",
            role: "user",
            content: "msg",
          });
        })
      ).rejects.toThrow("Queue error");

      expect(clientLogger.error).toHaveBeenCalled();
    });
  });

  describe("awardPointsWithSync", () => {
    it("should return error when online", async () => {
      Object.defineProperty(global, "navigator", {
        value: { onLine: true },
        writable: true,
      });

      const { result } = renderHook(() => useOfflineSync());

      const response = await act(async () => {
        return result.current.awardPointsWithSync({
          student_id: "student-1",
          points: 100,
          reason: "quiz_completion",
        });
      });

      expect(response.success).toBe(false);
      expect(enqueuePointsAward).not.toHaveBeenCalled();
    });

    it("should enqueue points award when offline", async () => {
      (enqueuePointsAward as jest.Mock).mockResolvedValue("points-queue-id");

      const { result } = renderHook(() => useOfflineSync());

      const payload = {
        student_id: "student-1",
        points: 50,
        reason: "achievement" as const,
      };

      const response = await act(async () => {
        return result.current.awardPointsWithSync(payload);
      });

      expect(response.success).toBe(true);
      expect(response.queued).toBe(true);
      expect(enqueuePointsAward).toHaveBeenCalledWith(payload);
    });

    it("should handle points enqueue errors", async () => {
      (enqueuePointsAward as jest.Mock).mockRejectedValue(new Error("Points error"));

      const { result } = renderHook(() => useOfflineSync());

      await expect(
        act(async () => {
          await result.current.awardPointsWithSync({
            student_id: "s1",
            points: 10,
            reason: "test",
          });
        })
      ).rejects.toThrow("Points error");
    });
  });

  describe("updateProgressWithSync", () => {
    it("should return error when online", async () => {
      Object.defineProperty(global, "navigator", {
        value: { onLine: true },
        writable: true,
      });

      const { result } = renderHook(() => useOfflineSync());

      const response = await act(async () => {
        return result.current.updateProgressWithSync({
          student_id: "student-1",
          module: "math",
          progress: 0.75,
        });
      });

      expect(response.success).toBe(false);
      expect(enqueueProgressUpdate).not.toHaveBeenCalled();
    });

    it("should enqueue progress update when offline", async () => {
      (enqueueProgressUpdate as jest.Mock).mockResolvedValue("progress-queue-id");

      const { result } = renderHook(() => useOfflineSync());

      const payload = {
        student_id: "student-1",
        module: "reading",
        progress: 0.5,
      };

      const response = await act(async () => {
        return result.current.updateProgressWithSync(payload);
      });

      expect(response.success).toBe(true);
      expect(response.queued).toBe(true);
      expect(enqueueProgressUpdate).toHaveBeenCalledWith(payload);
    });

    it("should handle progress enqueue errors", async () => {
      (enqueueProgressUpdate as jest.Mock).mockRejectedValue(
        new Error("Progress error")
      );

      const { result } = renderHook(() => useOfflineSync());

      await expect(
        act(async () => {
          await result.current.updateProgressWithSync({
            student_id: "s1",
            module: "m1",
            progress: 0.5,
          });
        })
      ).rejects.toThrow("Progress error");
    });
  });

  describe("subscribeToQueue", () => {
    it("should return unsubscribe function", () => {
      const mockUnsubscribe = jest.fn();
      (subscribeMutationQueue as jest.Mock).mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => useOfflineSync());

      const unsubscribe = result.current.subscribeToQueue();

      expect(subscribeMutationQueue).toHaveBeenCalledWith(expect.any(Function));
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it("should update queueStatus when callback is invoked", () => {
      let capturedCallback: (status: {
        pendingCount: number;
        failedCount: number;
        isSyncing: boolean;
      }) => void;
      (subscribeMutationQueue as jest.Mock).mockImplementation((cb) => {
        capturedCallback = cb;
        return jest.fn();
      });

      const { result } = renderHook(() => useOfflineSync());

      act(() => {
        result.current.subscribeToQueue();
      });

      act(() => {
        capturedCallback!({
          pendingCount: 5,
          failedCount: 2,
          isSyncing: true,
        });
      });

      expect(result.current.queueStatus).toEqual({
        pendingCount: 5,
        failedCount: 2,
        isSyncing: true,
      });
    });
  });
});
