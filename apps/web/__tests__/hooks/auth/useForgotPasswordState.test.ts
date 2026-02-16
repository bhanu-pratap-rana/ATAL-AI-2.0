/**
 * Tests for useForgotPasswordState hook
 * Target: ~20 tests covering password reset flow with email, OTP, and new password steps
 */

import { renderHook, act } from "@testing-library/react";
import { useForgotPasswordState } from "@/hooks/auth/useForgotPasswordState";

describe("useForgotPasswordState", () => {
  describe("Initial State", () => {
    it("should initialize with email step", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      expect(result.current.state.step).toBe("email");
    });

    it("should initialize with empty email", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      expect(result.current.state.email).toBe("");
    });

    it("should initialize with empty OTP", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      expect(result.current.state.otp).toBe("");
    });

    it("should initialize with empty password fields", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      expect(result.current.state.newPassword).toBe("");
      expect(result.current.state.newPasswordConfirm).toBe("");
    });

    it("should initialize with no error", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Email Step", () => {
    it("should update email", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setEmail("user@example.com");
      });

      expect(result.current.state.email).toBe("user@example.com");
    });

    it("should allow empty email", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setEmail("user@example.com");
        result.current.actions.setEmail("");
      });

      expect(result.current.state.email).toBe("");
    });
  });

  describe("OTP Step", () => {
    it("should transition to OTP step", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setStep("otp");
      });

      expect(result.current.state.step).toBe("otp");
    });

    it("should update OTP", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setOtp("123456");
      });

      expect(result.current.state.otp).toBe("123456");
    });

    it("should allow clearing OTP", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setOtp("123456");
        result.current.actions.setOtp("");
      });

      expect(result.current.state.otp).toBe("");
    });
  });

  describe("Reset Step", () => {
    it("should transition to reset step", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setStep("reset");
      });

      expect(result.current.state.step).toBe("reset");
    });

    it("should update new password", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setNewPassword("NewPassword123!");
      });

      expect(result.current.state.newPassword).toBe("NewPassword123!");
    });

    it("should update new password confirmation", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setNewPasswordConfirm("NewPassword123!");
      });

      expect(result.current.state.newPasswordConfirm).toBe("NewPassword123!");
    });

    it("should allow setting different password and confirmation", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setNewPassword("Password1");
        result.current.actions.setNewPasswordConfirm("Password2");
      });

      expect(result.current.state.newPassword).toBe("Password1");
      expect(result.current.state.newPasswordConfirm).toBe("Password2");
    });
  });

  describe("Error Handling", () => {
    it("should set error message", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setError("Email not found");
      });

      expect(result.current.state.error).toBe("Email not found");
    });

    it("should clear error when set to null", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setError("Some error");
        result.current.actions.setError(null);
      });

      expect(result.current.state.error).toBeNull();
    });

    it("should update error message", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setError("First error");
        result.current.actions.setError("Second error");
      });

      expect(result.current.state.error).toBe("Second error");
    });
  });

  describe("Reset All", () => {
    it("should reset all fields to initial state", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      act(() => {
        result.current.actions.setEmail("user@test.com");
        result.current.actions.setOtp("123456");
        result.current.actions.setNewPassword("newpass");
        result.current.actions.setNewPasswordConfirm("newpass");
        result.current.actions.setStep("reset");
        result.current.actions.setError("Error");
        result.current.actions.resetAll();
      });

      expect(result.current.state.email).toBe("");
      expect(result.current.state.otp).toBe("");
      expect(result.current.state.newPassword).toBe("");
      expect(result.current.state.newPasswordConfirm).toBe("");
      expect(result.current.state.step).toBe("email");
      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Full Flow Simulation", () => {
    it("should complete full forgot password flow", () => {
      const { result } = renderHook(() => useForgotPasswordState());

      // Step 1: Enter email
      act(() => {
        result.current.actions.setEmail("user@example.com");
        result.current.actions.setStep("otp");
      });

      expect(result.current.state.email).toBe("user@example.com");
      expect(result.current.state.step).toBe("otp");

      // Step 2: Enter OTP
      act(() => {
        result.current.actions.setOtp("123456");
        result.current.actions.setStep("reset");
      });

      expect(result.current.state.otp).toBe("123456");
      expect(result.current.state.step).toBe("reset");

      // Step 3: Enter new password
      act(() => {
        result.current.actions.setNewPassword("NewSecurePass123!");
        result.current.actions.setNewPasswordConfirm("NewSecurePass123!");
      });

      expect(result.current.state.newPassword).toBe("NewSecurePass123!");
      expect(result.current.state.newPasswordConfirm).toBe("NewSecurePass123!");
    });
  });

  describe("Action Stability", () => {
    it("should provide stable action references across re-renders", () => {
      const { result, rerender } = renderHook(() => useForgotPasswordState());

      const initialActions = result.current.actions;

      rerender();

      expect(result.current.actions.setEmail).toBe(initialActions.setEmail);
      expect(result.current.actions.setOtp).toBe(initialActions.setOtp);
      expect(result.current.actions.resetAll).toBe(initialActions.resetAll);
    });
  });
});
