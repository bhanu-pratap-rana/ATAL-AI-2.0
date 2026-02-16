/**
 * Tests for useFormHandler hook
 */

import { renderHook, act } from "@testing-library/react";
import { useFormHandler } from "@/hooks/useFormHandler";

describe("useFormHandler", () => {
  describe("initialization", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useFormHandler());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.message).toBeNull();
    });

    it("should initialize with custom loading state", () => {
      const { result } = renderHook(() => useFormHandler(true));

      expect(result.current.loading).toBe(true);
    });
  });

  describe("setLoading", () => {
    it("should set loading state to true", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it("should set loading state to false", () => {
      const { result } = renderHook(() => useFormHandler(true));

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setError("Something went wrong");
      });

      expect(result.current.error).toBe("Something went wrong");
    });

    it("should clear error message", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setError("Error");
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("setMessage", () => {
    it("should set success message", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setMessage({ type: "success", text: "Operation successful" });
      });

      expect(result.current.message).toEqual({
        type: "success",
        text: "Operation successful",
      });
    });

    it("should set error message", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setMessage({ type: "error", text: "Operation failed" });
      });

      expect(result.current.message).toEqual({
        type: "error",
        text: "Operation failed",
      });
    });

    it("should set info message", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setMessage({ type: "info", text: "Information" });
      });

      expect(result.current.message).toEqual({
        type: "info",
        text: "Information",
      });
    });

    it("should set warning message", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setMessage({ type: "warning", text: "Warning" });
      });

      expect(result.current.message).toEqual({
        type: "warning",
        text: "Warning",
      });
    });

    it("should clear message", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setMessage({ type: "success", text: "Test" });
      });

      act(() => {
        result.current.setMessage(null);
      });

      expect(result.current.message).toBeNull();
    });
  });

  describe("clearMessages", () => {
    it("should clear both error and message", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setError("Error");
        result.current.setMessage({ type: "info", text: "Info" });
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.message).not.toBeNull();

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.message).toBeNull();
    });

    it("should not affect loading state", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setLoading(true);
        result.current.setError("Error");
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.loading).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset all state to defaults", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.setLoading(true);
        result.current.setError("Error");
        result.current.setMessage({ type: "success", text: "Success" });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.message).toBeNull();
    });
  });

  describe("showSuccess", () => {
    it("should show success message and clear error", () => {
      const { result } = renderHook(() => useFormHandler());

      // Set an error first
      act(() => {
        result.current.setError("Previous error");
      });

      act(() => {
        result.current.showSuccess("Operation completed");
      });

      expect(result.current.message).toEqual({
        type: "success",
        text: "Operation completed",
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe("showError", () => {
    it("should show error message and set error state", () => {
      const { result } = renderHook(() => useFormHandler());

      act(() => {
        result.current.showError("Something went wrong");
      });

      expect(result.current.message).toEqual({
        type: "error",
        text: "Something went wrong",
      });
      expect(result.current.error).toBe("Something went wrong");
    });
  });

  describe("showInfo", () => {
    it("should show info message and clear error", () => {
      const { result } = renderHook(() => useFormHandler());

      // Set an error first
      act(() => {
        result.current.setError("Previous error");
      });

      act(() => {
        result.current.showInfo("Please wait");
      });

      expect(result.current.message).toEqual({
        type: "info",
        text: "Please wait",
      });
      expect(result.current.error).toBeNull();
    });
  });
});
