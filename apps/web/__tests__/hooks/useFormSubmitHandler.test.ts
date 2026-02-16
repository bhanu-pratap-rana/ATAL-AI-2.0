/**
 * Tests for useFormSubmitHandler hook
 */

import { renderHook, act } from "@testing-library/react";
import { useFormSubmitHandler } from "@/hooks/useFormSubmitHandler";

// Mock dependencies
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { clientLogger } from "@/lib/client-logger";
import { toast } from "sonner";

describe("useFormSubmitHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useFormSubmitHandler());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("handleSubmit", () => {
    it("should execute callback and show success toast", async () => {
      const { result } = renderHook(() =>
        useFormSubmitHandler({ successMessage: "Done!" })
      );
      const mockCallback = jest.fn().mockResolvedValue(undefined);

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Done!");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle successful submission without toast when showSuccessToast is false", async () => {
      const { result } = renderHook(() =>
        useFormSubmitHandler({ showSuccessToast: false })
      );
      const mockCallback = jest.fn().mockResolvedValue(undefined);

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(mockCallback).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should call onSuccess callback after successful submission", async () => {
      const onSuccess = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useFormSubmitHandler({ onSuccess })
      );
      const mockCallback = jest.fn().mockResolvedValue(undefined);

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it("should handle error during submission", async () => {
      const { result } = renderHook(() =>
        useFormSubmitHandler({ logPrefix: "TestForm" })
      );
      const mockCallback = jest.fn().mockRejectedValue(new Error("Submission failed"));

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(result.current.error).toBe("Submission failed");
      expect(toast.error).toHaveBeenCalledWith("Submission failed");
      expect(clientLogger.error).toHaveBeenCalledWith(
        "[TestForm] Form submission error",
        expect.any(Error)
      );
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle non-Error objects thrown during submission", async () => {
      const { result } = renderHook(() => useFormSubmitHandler());
      const mockCallback = jest.fn().mockRejectedValue("String error");

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(result.current.error).toBe("An error occurred");
      expect(toast.error).toHaveBeenCalledWith("An error occurred");
    });

    it("should call custom onError handler instead of default", async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useFormSubmitHandler({ onError })
      );
      const mockCallback = jest.fn().mockRejectedValue(new Error("Custom error"));

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(onError).toHaveBeenCalledWith("Custom error");
      expect(result.current.error).toBeNull(); // Not set when custom handler is used
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should reset loading state after submission completes", async () => {
      const { result } = renderHook(() => useFormSubmitHandler());
      const mockCallback = jest.fn().mockResolvedValue(undefined);

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should reset loading state after submission fails", async () => {
      const { result } = renderHook(() => useFormSubmitHandler());
      const mockCallback = jest.fn().mockRejectedValue(new Error("Failed"));

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should clear previous error on successful submission", async () => {
      const { result } = renderHook(() => useFormSubmitHandler());

      // First submission with error
      const failingCallback = jest.fn().mockRejectedValue(new Error("First error"));
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(failingCallback)(mockEvent);
      });

      expect(result.current.error).toBe("First error");

      // Second successful submission - error should be cleared
      const successCallback = jest.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.handleSubmit(successCallback)(mockEvent);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      const { result } = renderHook(() => useFormSubmitHandler());

      act(() => {
        result.current.setError("Manual error");
      });

      expect(result.current.error).toBe("Manual error");
    });

    it("should clear error message", () => {
      const { result } = renderHook(() => useFormSubmitHandler());

      act(() => {
        result.current.setError("Error");
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("setIsLoading", () => {
    it("should set loading state", () => {
      const { result } = renderHook(() => useFormSubmitHandler());

      act(() => {
        result.current.setIsLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setIsLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset all state", async () => {
      const { result } = renderHook(() => useFormSubmitHandler());

      // Set some state
      act(() => {
        result.current.setIsLoading(true);
        result.current.setError("Error");
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("default values", () => {
    it("should use default success message", async () => {
      const { result } = renderHook(() => useFormSubmitHandler());
      const mockCallback = jest.fn().mockResolvedValue(undefined);

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(toast.success).toHaveBeenCalledWith("Success");
    });

    it("should use default log prefix", async () => {
      const { result } = renderHook(() => useFormSubmitHandler());
      const mockCallback = jest.fn().mockRejectedValue(new Error("Error"));

      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handleSubmit(mockCallback)(mockEvent);
      });

      expect(clientLogger.error).toHaveBeenCalledWith(
        "[Form] Form submission error",
        expect.any(Error)
      );
    });
  });
});
