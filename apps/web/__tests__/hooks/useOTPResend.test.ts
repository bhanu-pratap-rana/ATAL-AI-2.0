/**
 * Tests for useOTPResend Hook
 *
 * Tests OTP resend functionality including:
 * - Cooldown timer management
 * - Resend request handling
 * - Success and error callbacks
 * - Loading state
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useOTPResend } from "@/hooks/useOTPResend";

// Mock auth logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("useOTPResend", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with 0 cooldown", () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      expect(result.current.resendCooldown).toBe(0);
      expect(result.current.isResending).toBe(false);
    });
  });

  describe("startCooldown", () => {
    it("should set cooldown to default 60 seconds", () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.resendCooldown).toBe(60);
    });

    it("should set cooldown to custom value", () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useOTPResend(onSuccess, onError, 30));

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.resendCooldown).toBe(30);
    });

    it("should decrement cooldown every second", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useOTPResend(onSuccess, onError, 3));

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.resendCooldown).toBe(3);

      // Advance timer and flush all pending effects
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // After first second, should decrement
      expect(result.current.resendCooldown).toBeLessThan(3);
    });

    it("should eventually reach 0 cooldown", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() => useOTPResend(onSuccess, onError, 2));

      act(() => {
        result.current.startCooldown();
      });

      expect(result.current.resendCooldown).toBe(2);

      // Run timers multiple times to handle the recursive setTimeout pattern
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }

      // Should eventually reach 0
      expect(result.current.resendCooldown).toBeLessThanOrEqual(0);
    });
  });

  describe("handleResend", () => {
    it("should call requestFn and onSuccess on successful resend", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const requestFn = jest.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      let resendResult: boolean = false;
      await act(async () => {
        resendResult = await result.current.handleResend(
          "test@example.com",
          requestFn
        );
      });

      expect(requestFn).toHaveBeenCalledWith("test@example.com");
      expect(onSuccess).toHaveBeenCalledWith("OTP resent successfully!");
      expect(resendResult).toBe(true);
    });

    it("should start cooldown after successful resend", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const requestFn = jest.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useOTPResend(onSuccess, onError, 30));

      await act(async () => {
        await result.current.handleResend("test@example.com", requestFn);
      });

      expect(result.current.resendCooldown).toBe(30);
    });

    it("should call onError on failed resend", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const requestFn = jest
        .fn()
        .mockResolvedValue({ success: false, error: "Rate limit exceeded" });

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      let resendResult: boolean = true;
      await act(async () => {
        resendResult = await result.current.handleResend(
          "test@example.com",
          requestFn
        );
      });

      expect(onError).toHaveBeenCalledWith("Rate limit exceeded");
      expect(onSuccess).not.toHaveBeenCalled();
      expect(resendResult).toBe(false);
    });

    it("should use default error message when no error provided", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const requestFn = jest.fn().mockResolvedValue({ success: false });

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      await act(async () => {
        await result.current.handleResend("test@example.com", requestFn);
      });

      expect(onError).toHaveBeenCalledWith("Failed to resend OTP");
    });

    it("should block resend during cooldown", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const requestFn = jest.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useOTPResend(onSuccess, onError, 10));

      // Start cooldown
      act(() => {
        result.current.startCooldown();
      });

      // Try to resend during cooldown
      let resendResult: boolean = true;
      await act(async () => {
        resendResult = await result.current.handleResend(
          "test@example.com",
          requestFn
        );
      });

      expect(requestFn).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining("Please wait")
      );
      expect(resendResult).toBe(false);
    });

    it("should trim input value before sending", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const requestFn = jest.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      await act(async () => {
        await result.current.handleResend("  test@example.com  ", requestFn);
      });

      expect(requestFn).toHaveBeenCalledWith("test@example.com");
    });

    it("should handle exception in requestFn", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const requestFn = jest.fn().mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      let resendResult: boolean = true;
      await act(async () => {
        resendResult = await result.current.handleResend(
          "test@example.com",
          requestFn
        );
      });

      expect(onError).toHaveBeenCalledWith("Network error");
      expect(resendResult).toBe(false);
    });

    it("should handle non-Error exceptions", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const requestFn = jest.fn().mockRejectedValue("String error");

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      await act(async () => {
        await result.current.handleResend("test@example.com", requestFn);
      });

      expect(onError).toHaveBeenCalledWith("Error resending OTP");
    });

    it("should set isResending during request", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Create a promise we can control
      let resolveRequest: (value: { success: boolean }) => void;
      const requestFn = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
      );

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      // Start the request but don't await
      let resendPromise: Promise<boolean>;
      act(() => {
        resendPromise = result.current.handleResend(
          "test@example.com",
          requestFn
        );
      });

      // Check loading state (may still be setting up)
      await waitFor(() => {
        expect(result.current.isResending).toBe(true);
      });

      // Resolve the request
      await act(async () => {
        resolveRequest!({ success: true });
        await resendPromise;
      });

      expect(result.current.isResending).toBe(false);
    });

    it("should block duplicate requests while resending", async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();

      let resolveRequest: (value: { success: boolean }) => void;
      const requestFn = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
      );

      const { result } = renderHook(() => useOTPResend(onSuccess, onError));

      // Start first request
      act(() => {
        result.current.handleResend("test@example.com", requestFn);
      });

      // Wait for isResending to be true
      await waitFor(() => {
        expect(result.current.isResending).toBe(true);
      });

      // Try second request while first is pending
      const secondRequestFn = jest.fn();
      let secondResult: boolean = true;
      await act(async () => {
        secondResult = await result.current.handleResend(
          "test@example.com",
          secondRequestFn
        );
      });

      // Second request should be blocked
      expect(secondRequestFn).not.toHaveBeenCalled();
      expect(secondResult).toBe(false);

      // Clean up first request
      await act(async () => {
        resolveRequest!({ success: true });
      });
    });
  });
});
