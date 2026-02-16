/**
 * Tests for useSignUpState hook
 * Target: ~25 tests covering sign-up state management for email, phone, guest, and username flows
 */

import { renderHook, act } from "@testing-library/react";
import { useSignUpState } from "@/hooks/auth/useSignUpState";

describe("useSignUpState", () => {
  describe("Initial State", () => {
    it("should initialize with email tab selected", () => {
      const { result } = renderHook(() => useSignUpState());

      expect(result.current.state.currentTab).toBe("email");
    });

    it("should initialize with empty email fields", () => {
      const { result } = renderHook(() => useSignUpState());

      expect(result.current.state.email).toBe("");
      expect(result.current.state.emailPassword).toBe("");
      expect(result.current.state.emailPasswordConfirm).toBe("");
      expect(result.current.state.emailError).toBeNull();
      expect(result.current.state.emailOtpSent).toBe(false);
    });

    it("should initialize with empty phone fields", () => {
      const { result } = renderHook(() => useSignUpState());

      expect(result.current.state.phoneNumber).toBe("");
      expect(result.current.state.phoneOtpStep).toBe("phone");
      expect(result.current.state.phoneOtp).toBe("");
      expect(result.current.state.phonePassword).toBe("");
    });

    it("should initialize with empty guest fields", () => {
      const { result } = renderHook(() => useSignUpState());

      expect(result.current.state.guestClassCode).toBe("");
      expect(result.current.state.guestRollNumber).toBe("");
      expect(result.current.state.guestPin).toBe("");
      expect(result.current.state.guestError).toBeNull();
    });

    it("should initialize with empty username fields", () => {
      const { result } = renderHook(() => useSignUpState());

      expect(result.current.state.username).toBe("");
      expect(result.current.state.usernamePassword).toBe("");
      expect(result.current.state.usernamePasswordConfirm).toBe("");
      expect(result.current.state.usernameStep).toBe("username");
    });
  });

  describe("Tab Navigation", () => {
    it("should switch to phone tab", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setCurrentTab("phone");
      });

      expect(result.current.state.currentTab).toBe("phone");
    });

    it("should switch to guest tab", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setCurrentTab("guest");
      });

      expect(result.current.state.currentTab).toBe("guest");
    });

    it("should switch to username tab", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setCurrentTab("username");
      });

      expect(result.current.state.currentTab).toBe("username");
    });
  });

  describe("Email Flow", () => {
    it("should update email", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setEmail("test@example.com");
      });

      expect(result.current.state.email).toBe("test@example.com");
    });

    it("should update email password", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setEmailPassword("password123");
      });

      expect(result.current.state.emailPassword).toBe("password123");
    });

    it("should update email password confirm", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setEmailPasswordConfirm("password123");
      });

      expect(result.current.state.emailPasswordConfirm).toBe("password123");
    });

    it("should set email error", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setEmailError("Invalid email format");
      });

      expect(result.current.state.emailError).toBe("Invalid email format");
    });

    it("should toggle email OTP sent", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setEmailOtpSent(true);
      });

      expect(result.current.state.emailOtpSent).toBe(true);
    });

    it("should update email OTP", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setEmailOtp("123456");
      });

      expect(result.current.state.emailOtp).toBe("123456");
    });

    it("should reset email fields", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setEmail("test@example.com");
        result.current.actions.setEmailPassword("password");
        result.current.actions.setEmailError("Some error");
        result.current.actions.resetEmail();
      });

      expect(result.current.state.email).toBe("");
      expect(result.current.state.emailPassword).toBe("");
      expect(result.current.state.emailError).toBeNull();
    });
  });

  describe("Phone Flow", () => {
    it("should update phone number", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setPhoneNumber("9876543210");
      });

      expect(result.current.state.phoneNumber).toBe("9876543210");
    });

    it("should update phone OTP step", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setPhoneOtpStep("verify");
      });

      expect(result.current.state.phoneOtpStep).toBe("verify");
    });

    it("should update phone OTP", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setPhoneOtp("654321");
      });

      expect(result.current.state.phoneOtp).toBe("654321");
    });

    it("should reset phone fields", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setPhoneNumber("9876543210");
        result.current.actions.setPhoneOtpStep("verify");
        result.current.actions.setPhoneError("Error");
        result.current.actions.resetPhone();
      });

      expect(result.current.state.phoneNumber).toBe("");
      expect(result.current.state.phoneOtpStep).toBe("phone");
      expect(result.current.state.phoneError).toBeNull();
    });
  });

  describe("Guest Flow", () => {
    it("should update guest class code", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setGuestClassCode("CLASS123");
      });

      expect(result.current.state.guestClassCode).toBe("CLASS123");
    });

    it("should update guest roll number", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setGuestRollNumber("25");
      });

      expect(result.current.state.guestRollNumber).toBe("25");
    });

    it("should update guest PIN", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setGuestPin("1234");
      });

      expect(result.current.state.guestPin).toBe("1234");
    });

    it("should reset guest fields", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setGuestClassCode("CLASS123");
        result.current.actions.setGuestRollNumber("25");
        result.current.actions.setGuestError("Error");
        result.current.actions.resetGuest();
      });

      expect(result.current.state.guestClassCode).toBe("");
      expect(result.current.state.guestRollNumber).toBe("");
      expect(result.current.state.guestError).toBeNull();
    });
  });

  describe("Username Flow", () => {
    it("should update username", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setUsername("student123");
      });

      expect(result.current.state.username).toBe("student123");
    });

    it("should update username password", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setUsernamePassword("securepass");
      });

      expect(result.current.state.usernamePassword).toBe("securepass");
    });

    it("should update username step", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setUsernameStep("profile");
      });

      expect(result.current.state.usernameStep).toBe("profile");
    });

    it("should reset username fields", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        result.current.actions.setUsername("student123");
        result.current.actions.setUsernamePassword("pass");
        result.current.actions.setUsernameStep("profile");
        result.current.actions.resetUsername();
      });

      expect(result.current.state.username).toBe("");
      expect(result.current.state.usernamePassword).toBe("");
      expect(result.current.state.usernameStep).toBe("username");
    });
  });

  describe("Reset All", () => {
    it("should reset all fields to initial state", () => {
      const { result } = renderHook(() => useSignUpState());

      act(() => {
        // Set various fields
        result.current.actions.setCurrentTab("phone");
        result.current.actions.setEmail("test@test.com");
        result.current.actions.setPhoneNumber("9876543210");
        result.current.actions.setGuestClassCode("CLASS");
        result.current.actions.setUsername("user");
        // Reset all
        result.current.actions.resetAll();
      });

      expect(result.current.state.currentTab).toBe("email");
      expect(result.current.state.email).toBe("");
      expect(result.current.state.phoneNumber).toBe("");
      expect(result.current.state.guestClassCode).toBe("");
      expect(result.current.state.username).toBe("");
    });
  });
});
