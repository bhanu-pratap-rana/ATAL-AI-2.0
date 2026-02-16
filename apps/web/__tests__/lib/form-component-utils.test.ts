/**
 * Tests for form-component-utils
 * Target: ~20 tests covering form utility functions and hooks
 */

import { renderHook, act } from "@testing-library/react";
import {
  useFormSubmission,
  usePasswordVisibility,
  validateAndHandleError,
  FORM_TOAST_MESSAGES,
} from "@/lib/form-component-utils";

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("usePasswordVisibility", () => {
  it("should initialize with both passwords hidden", () => {
    const { result } = renderHook(() => usePasswordVisibility());

    expect(result.current.showPassword).toBe(false);
    expect(result.current.showConfirm).toBe(false);
  });

  it("should toggle password visibility", () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.togglePasswordVisibility();
    });

    expect(result.current.showPassword).toBe(true);
    expect(result.current.showConfirm).toBe(false);
  });

  it("should toggle confirm visibility", () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.toggleConfirmVisibility();
    });

    expect(result.current.showPassword).toBe(false);
    expect(result.current.showConfirm).toBe(true);
  });

  it("should toggle password back to hidden", () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.togglePasswordVisibility();
    });
    expect(result.current.showPassword).toBe(true);

    act(() => {
      result.current.togglePasswordVisibility();
    });
    expect(result.current.showPassword).toBe(false);
  });

  it("should toggle confirm back to hidden", () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.toggleConfirmVisibility();
    });
    expect(result.current.showConfirm).toBe(true);

    act(() => {
      result.current.toggleConfirmVisibility();
    });
    expect(result.current.showConfirm).toBe(false);
  });

  it("should toggle independently", () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.togglePasswordVisibility();
      result.current.toggleConfirmVisibility();
    });

    expect(result.current.showPassword).toBe(true);
    expect(result.current.showConfirm).toBe(true);
  });
});

describe("useFormSubmission", () => {
  const mockOnErrorChange = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call onSubmitFn on form submit", async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useFormSubmission(mockSubmit, mockOnErrorChange, "TestForm")
    );

    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current(mockEvent);
    });

    expect(mockSubmit).toHaveBeenCalled();
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("should clear error before submission", async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useFormSubmission(mockSubmit, mockOnErrorChange, "TestForm")
    );

    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current(mockEvent);
    });

    expect(mockOnErrorChange).toHaveBeenCalledWith(null);
  });

  it("should call onSuccess on successful submission", async () => {
    const submitData = { id: "123" };
    const mockSubmit = jest.fn().mockResolvedValue(submitData);

    const { result } = renderHook(() =>
      useFormSubmission(mockSubmit, mockOnErrorChange, "TestForm", mockOnSuccess)
    );

    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current(mockEvent);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(submitData);
  });

  it("should set error on submission failure", async () => {
    const mockSubmit = jest.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useFormSubmission(mockSubmit, mockOnErrorChange, "TestForm")
    );

    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current(mockEvent);
    });

    expect(mockOnErrorChange).toHaveBeenCalledWith("Network error");
  });

  it("should handle non-Error rejection", async () => {
    const mockSubmit = jest.fn().mockRejectedValue("String error");

    const { result } = renderHook(() =>
      useFormSubmission(mockSubmit, mockOnErrorChange, "TestForm")
    );

    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current(mockEvent);
    });

    expect(mockOnErrorChange).toHaveBeenCalledWith("An error occurred");
  });
});

describe("validateAndHandleError", () => {
  const mockOnErrorChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when valid", () => {
    const result = validateAndHandleError(true, "Error message", mockOnErrorChange);
    expect(result).toBe(true);
  });

  it("should not call onErrorChange when valid", () => {
    validateAndHandleError(true, "Error message", mockOnErrorChange);
    expect(mockOnErrorChange).not.toHaveBeenCalled();
  });

  it("should return false when invalid", () => {
    const result = validateAndHandleError(false, "Error message", mockOnErrorChange);
    expect(result).toBe(false);
  });

  it("should call onErrorChange with error message when invalid", () => {
    validateAndHandleError(false, "Invalid input", mockOnErrorChange);
    expect(mockOnErrorChange).toHaveBeenCalledWith("Invalid input");
  });
});

describe("FORM_TOAST_MESSAGES", () => {
  it("should have EMAIL_OTP_SENT message", () => {
    expect(FORM_TOAST_MESSAGES.EMAIL_OTP_SENT).toBe("OTP sent to your email!");
  });

  it("should have EMAIL_OTP_ERROR message", () => {
    expect(FORM_TOAST_MESSAGES.EMAIL_OTP_ERROR).toBe(
      "Failed to send OTP. Please try again."
    );
  });

  it("should have PHONE_OTP_SENT message", () => {
    expect(FORM_TOAST_MESSAGES.PHONE_OTP_SENT).toBe("OTP sent to your phone!");
  });

  it("should have PHONE_OTP_ERROR message", () => {
    expect(FORM_TOAST_MESSAGES.PHONE_OTP_ERROR).toBe(
      "Failed to send OTP. Please try again."
    );
  });

  it("should have OTP_VERIFIED message", () => {
    expect(FORM_TOAST_MESSAGES.OTP_VERIFIED).toBe("OTP verified successfully!");
  });

  it("should have OTP_VERIFICATION_ERROR message", () => {
    expect(FORM_TOAST_MESSAGES.OTP_VERIFICATION_ERROR).toBe(
      "Invalid OTP. Please try again."
    );
  });

  it("should have PASSWORD_RESET message", () => {
    expect(FORM_TOAST_MESSAGES.PASSWORD_RESET).toBe("Password reset successfully!");
  });

  it("should have PASSWORD_RESET_ERROR message", () => {
    expect(FORM_TOAST_MESSAGES.PASSWORD_RESET_ERROR).toBe(
      "Failed to reset password. Please try again."
    );
  });

  it("should have PASSWORD_UPDATED message", () => {
    expect(FORM_TOAST_MESSAGES.PASSWORD_UPDATED).toBe(
      "Password updated successfully!"
    );
  });

  it("should have PASSWORD_UPDATE_ERROR message", () => {
    expect(FORM_TOAST_MESSAGES.PASSWORD_UPDATE_ERROR).toBe(
      "Failed to update password. Please try again."
    );
  });

  it("should have all expected toast message keys", () => {
    const expectedKeys = [
      "EMAIL_OTP_SENT",
      "EMAIL_OTP_ERROR",
      "PHONE_OTP_SENT",
      "PHONE_OTP_ERROR",
      "OTP_VERIFIED",
      "OTP_VERIFICATION_ERROR",
      "PASSWORD_RESET",
      "PASSWORD_RESET_ERROR",
      "PASSWORD_UPDATED",
      "PASSWORD_UPDATE_ERROR",
    ];

    expectedKeys.forEach((key) => {
      expect(FORM_TOAST_MESSAGES).toHaveProperty(key);
    });
  });
});
