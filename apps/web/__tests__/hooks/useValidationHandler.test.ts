/**
 * Tests for useValidationHandler Hook
 *
 * Tests form validation handling including:
 * - Single and multiple validators
 * - Loading state management
 * - Error handling
 * - Success callbacks
 * - Form event handling
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useValidationHandler,
  useSimpleValidation,
  useMultiFieldValidation,
  ValidationResult,
} from "@/hooks/useValidationHandler";

describe("useValidationHandler", () => {
  describe("initial state", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [],
          onValid: jest.fn(),
        })
      );

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.success).toBe(false);
    });
  });

  describe("handle", () => {
    it("should call onValid when all validators pass", async () => {
      const onValid = jest.fn().mockResolvedValue(undefined);
      const validator = jest.fn().mockReturnValue({ valid: true });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(validator).toHaveBeenCalled();
      expect(onValid).toHaveBeenCalled();
      expect(result.current.state.success).toBe(true);
    });

    it("should not call onValid when validator fails", async () => {
      const onValid = jest.fn();
      const validator = jest
        .fn()
        .mockReturnValue({ valid: false, error: "Invalid input" });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(validator).toHaveBeenCalled();
      expect(onValid).not.toHaveBeenCalled();
      expect(result.current.state.error).toBe("Invalid input");
    });

    it("should stop at first failing validator", async () => {
      const onValid = jest.fn();
      const validator1 = jest.fn().mockReturnValue({ valid: true });
      const validator2 = jest
        .fn()
        .mockReturnValue({ valid: false, error: "Second failed" });
      const validator3 = jest.fn().mockReturnValue({ valid: true });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator1, validator2, validator3],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(validator1).toHaveBeenCalled();
      expect(validator2).toHaveBeenCalled();
      expect(validator3).not.toHaveBeenCalled();
    });

    it("should handle array of error messages", async () => {
      const onValid = jest.fn();
      const validator = jest.fn().mockReturnValue({
        valid: false,
        error: ["Error 1", "Error 2"],
      });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(result.current.state.error).toBe("Error 1, Error 2");
    });

    it("should handle errors array property", async () => {
      const onValid = jest.fn();
      const validator = jest.fn().mockReturnValue({
        valid: false,
        errors: ["First error", "Second error"],
      });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(result.current.state.error).toBe("First error, Second error");
    });

    it("should set loading during async operation", async () => {
      let resolveValid: () => void;
      const onValid = jest.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveValid = resolve;
        })
      );
      const validator = jest.fn().mockReturnValue({ valid: true });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      // Start handling
      let handlePromise: Promise<void>;
      act(() => {
        handlePromise = result.current.handle();
      });

      // Check loading state
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(true);
      });

      // Complete operation
      await act(async () => {
        resolveValid!();
        await handlePromise;
      });

      expect(result.current.state.isLoading).toBe(false);
    });

    it("should handle async validator", async () => {
      const onValid = jest.fn();
      const asyncValidator = jest
        .fn()
        .mockResolvedValue({ valid: false, error: "Async error" });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [asyncValidator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(result.current.state.error).toBe("Async error");
    });

    it("should prevent default form submission", async () => {
      const onValid = jest.fn();
      const validator = jest.fn().mockReturnValue({ valid: true });
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should handle exception in onValid", async () => {
      const onValid = jest.fn().mockRejectedValue(new Error("Operation failed"));
      const validator = jest.fn().mockReturnValue({ valid: true });
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
          onError,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(result.current.state.error).toBe("Operation failed");
      expect(onError).toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      const onValid = jest.fn().mockRejectedValue("String error");
      const validator = jest.fn().mockReturnValue({ valid: true });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(result.current.state.error).toBe("An unexpected error occurred");
    });
  });

  describe("callbacks", () => {
    it("should call onValidationError when validation fails", async () => {
      const onValid = jest.fn();
      const onValidationError = jest.fn();
      const validator = jest
        .fn()
        .mockReturnValue({ valid: false, error: "Bad input" });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
          onValidationError,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(onValidationError).toHaveBeenCalledWith("Bad input");
    });

    it("should call onSuccess when operation succeeds", async () => {
      const onValid = jest.fn().mockResolvedValue(undefined);
      const onSuccess = jest.fn();
      const validator = jest.fn().mockReturnValue({ valid: true });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it("should call onFinally regardless of outcome", async () => {
      const onValid = jest.fn().mockRejectedValue(new Error("Failed"));
      const onFinally = jest.fn();
      const validator = jest.fn().mockReturnValue({ valid: true });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
          onFinally,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(onFinally).toHaveBeenCalled();
    });

    it("should call onFinally on successful operation", async () => {
      const onValid = jest.fn().mockResolvedValue(undefined);
      const onFinally = jest.fn();
      const validator = jest.fn().mockReturnValue({ valid: true });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
          onFinally,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(onFinally).toHaveBeenCalled();
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      const onValid = jest.fn();
      const validator = jest
        .fn()
        .mockReturnValue({ valid: false, error: "Error" });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(result.current.state.error).toBe("Error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });

    it("should reset success state", async () => {
      const onValid = jest.fn().mockResolvedValue(undefined);
      const validator = jest.fn().mockReturnValue({ valid: true });

      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [validator],
          onValid,
        })
      );

      await act(async () => {
        await result.current.handle();
      });

      expect(result.current.state.success).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.success).toBe(false);
    });
  });

  describe("setError", () => {
    it("should allow manual error setting", () => {
      const { result } = renderHook(() =>
        useValidationHandler({
          validators: [],
          onValid: jest.fn(),
        })
      );

      act(() => {
        result.current.setError("Manual error");
      });

      expect(result.current.state.error).toBe("Manual error");
    });
  });
});

describe("useSimpleValidation", () => {
  it("should work with single input validation", async () => {
    const validator = jest.fn().mockReturnValue({ valid: true });
    const onValid = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSimpleValidation("test@example.com", validator, onValid)
    );

    await act(async () => {
      await result.current.handle();
    });

    expect(validator).toHaveBeenCalled();
    expect(onValid).toHaveBeenCalled();
    expect(result.current.state.success).toBe(true);
  });

  it("should handle validation failure", async () => {
    const validator = jest
      .fn()
      .mockReturnValue({ valid: false, error: "Invalid email" });
    const onValid = jest.fn();

    const { result } = renderHook(() =>
      useSimpleValidation("bad-email", validator, onValid)
    );

    await act(async () => {
      await result.current.handle();
    });

    expect(result.current.state.error).toBe("Invalid email");
    expect(onValid).not.toHaveBeenCalled();
  });

  it("should accept optional configuration", async () => {
    const validator = jest.fn().mockReturnValue({ valid: true });
    const onValid = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();

    const { result } = renderHook(() =>
      useSimpleValidation("test", validator, onValid, { onSuccess })
    );

    await act(async () => {
      await result.current.handle();
    });

    expect(onSuccess).toHaveBeenCalled();
  });
});

describe("useMultiFieldValidation", () => {
  it("should work with multiple field inputs", async () => {
    const validator = jest.fn().mockReturnValue({ valid: true });
    const onValid = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMultiFieldValidation(
        ["password123", "password123"],
        validator,
        onValid
      )
    );

    await act(async () => {
      await result.current.handle();
    });

    expect(validator).toHaveBeenCalled();
    expect(onValid).toHaveBeenCalled();
  });

  it("should handle validation error for mismatched fields", async () => {
    const validator = jest
      .fn()
      .mockReturnValue({ valid: false, error: "Passwords do not match" });
    const onValid = jest.fn();

    const { result } = renderHook(() =>
      useMultiFieldValidation(
        ["password123", "different"],
        validator,
        onValid
      )
    );

    await act(async () => {
      await result.current.handle();
    });

    expect(result.current.state.error).toBe("Passwords do not match");
  });
});
