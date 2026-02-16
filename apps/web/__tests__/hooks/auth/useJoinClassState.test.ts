/**
 * Tests for useJoinClassState hook
 * Target: ~15 tests covering class code and PIN entry for joining classes
 */

import { renderHook, act } from "@testing-library/react";
import { useJoinClassState } from "@/hooks/auth/useJoinClassState";

describe("useJoinClassState", () => {
  describe("Initial State", () => {
    it("should initialize with empty class code", () => {
      const { result } = renderHook(() => useJoinClassState());

      expect(result.current.state.classCode).toBe("");
    });

    it("should initialize with empty PIN", () => {
      const { result } = renderHook(() => useJoinClassState());

      expect(result.current.state.pin).toBe("");
    });

    it("should initialize with no error", () => {
      const { result } = renderHook(() => useJoinClassState());

      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Class Code", () => {
    it("should update class code", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setClassCode("CLASS-A1B2");
      });

      expect(result.current.state.classCode).toBe("CLASS-A1B2");
    });

    it("should allow clearing class code", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setClassCode("CLASS-A1B2");
        result.current.actions.setClassCode("");
      });

      expect(result.current.state.classCode).toBe("");
    });

    it("should handle uppercase class codes", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setClassCode("ABC-123-XYZ");
      });

      expect(result.current.state.classCode).toBe("ABC-123-XYZ");
    });
  });

  describe("PIN", () => {
    it("should update PIN", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setPin("1234");
      });

      expect(result.current.state.pin).toBe("1234");
    });

    it("should allow clearing PIN", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setPin("1234");
        result.current.actions.setPin("");
      });

      expect(result.current.state.pin).toBe("");
    });

    it("should handle longer PINs", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setPin("12345678");
      });

      expect(result.current.state.pin).toBe("12345678");
    });
  });

  describe("Error Handling", () => {
    it("should set error message", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setError("Invalid class code");
      });

      expect(result.current.state.error).toBe("Invalid class code");
    });

    it("should clear error when set to null", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setError("Error");
        result.current.actions.setError(null);
      });

      expect(result.current.state.error).toBeNull();
    });

    it("should update error message", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setError("Invalid PIN");
        result.current.actions.setError("Class not found");
      });

      expect(result.current.state.error).toBe("Class not found");
    });
  });

  describe("Reset All", () => {
    it("should reset all fields to initial state", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setClassCode("CLASS-123");
        result.current.actions.setPin("4567");
        result.current.actions.setError("Some error");
        result.current.actions.resetAll();
      });

      expect(result.current.state.classCode).toBe("");
      expect(result.current.state.pin).toBe("");
      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Join Class Flow", () => {
    it("should handle complete join flow", () => {
      const { result } = renderHook(() => useJoinClassState());

      // Step 1: Enter class code
      act(() => {
        result.current.actions.setClassCode("CLASS-A1B2C3");
      });

      expect(result.current.state.classCode).toBe("CLASS-A1B2C3");

      // Step 2: Enter PIN
      act(() => {
        result.current.actions.setPin("1234");
      });

      expect(result.current.state.pin).toBe("1234");
      expect(result.current.state.error).toBeNull();
    });

    it("should handle error during join and allow retry", () => {
      const { result } = renderHook(() => useJoinClassState());

      act(() => {
        result.current.actions.setClassCode("INVALID");
        result.current.actions.setPin("0000");
        result.current.actions.setError("Class not found");
      });

      expect(result.current.state.error).toBe("Class not found");

      // Retry with correct values
      act(() => {
        result.current.actions.setClassCode("VALID-123");
        result.current.actions.setError(null);
      });

      expect(result.current.state.classCode).toBe("VALID-123");
      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Action Stability", () => {
    it("should provide stable action references across re-renders", () => {
      const { result, rerender } = renderHook(() => useJoinClassState());

      const initialActions = result.current.actions;

      rerender();

      expect(result.current.actions.setClassCode).toBe(
        initialActions.setClassCode
      );
      expect(result.current.actions.setPin).toBe(initialActions.setPin);
      expect(result.current.actions.resetAll).toBe(initialActions.resetAll);
    });
  });
});
