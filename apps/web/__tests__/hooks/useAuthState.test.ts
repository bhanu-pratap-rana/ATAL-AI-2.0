/**
 * Tests for useAuthState hook
 * Target: ~40 tests covering initial state, setters, and reset functions
 */

import { renderHook, act } from "@testing-library/react";
import { useAuthState } from "@/hooks/useAuthState";

describe("useAuthState", () => {
  describe("Initial State", () => {
    it("should start with choice as main step", () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.state.mainStep).toBe("choice");
    });

    it("should have email as default signin tab", () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.state.signinTab).toBe("email");
    });

    it("should have email as default signup tab", () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.state.signupTab).toBe("email");
    });

    it("should have empty signin email fields", () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.state.signinEmailAddress).toBe("");
      expect(result.current.state.signinEmailPassword).toBe("");
      expect(result.current.state.signinEmailError).toBeNull();
    });

    it("should have empty signup phone fields", () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.state.signupPhoneNumber).toBe("");
      expect(result.current.state.signupPhoneOtp).toBe("");
      expect(result.current.state.signupPhoneOtpStep).toBe("phone");
    });

    it("should have empty guest fields", () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.state.guestClassCode).toBe("");
      expect(result.current.state.guestRollNumber).toBe("");
      expect(result.current.state.guestPin).toBe("");
      expect(result.current.state.guestError).toBeNull();
    });

    it("should have isLoading as false initially", () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.state.isLoading).toBe(false);
    });

    it("should have forgot password at email step", () => {
      const { result } = renderHook(() => useAuthState());

      expect(result.current.state.forgotPasswordStep).toBe("email");
    });
  });

  describe("Main Navigation Setters", () => {
    it("should update main step", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setMainStep("signin");
      });

      expect(result.current.state.mainStep).toBe("signin");
    });

    it("should update signin tab", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninTab("phone");
      });

      expect(result.current.state.signinTab).toBe("phone");
    });

    it("should update signup tab", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupTab("guest");
      });

      expect(result.current.state.signupTab).toBe("guest");
    });
  });

  describe("Sign In - Email Setters", () => {
    it("should update signin email address", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninEmailAddress("test@example.com");
      });

      expect(result.current.state.signinEmailAddress).toBe("test@example.com");
    });

    it("should update signin email password", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninEmailPassword("password123");
      });

      expect(result.current.state.signinEmailPassword).toBe("password123");
    });

    it("should update signin email error", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninEmailError("Invalid credentials");
      });

      expect(result.current.state.signinEmailError).toBe("Invalid credentials");
    });

    it("should reset signin email fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninEmailAddress("test@example.com");
        result.current.actions.setSigninEmailPassword("password123");
        result.current.actions.setSigninEmailError("Error");
      });

      act(() => {
        result.current.actions.resetSigninEmail();
      });

      expect(result.current.state.signinEmailAddress).toBe("");
      expect(result.current.state.signinEmailPassword).toBe("");
      expect(result.current.state.signinEmailError).toBeNull();
    });
  });

  describe("Sign In - Phone Setters", () => {
    it("should update signin phone number", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninPhoneNumber("1234567890");
      });

      expect(result.current.state.signinPhoneNumber).toBe("1234567890");
    });

    it("should reset signin phone fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninPhoneNumber("1234567890");
        result.current.actions.setSigninPhonePassword("password");
        result.current.actions.setSigninPhoneError("Error");
      });

      act(() => {
        result.current.actions.resetSigninPhone();
      });

      expect(result.current.state.signinPhoneNumber).toBe("");
      expect(result.current.state.signinPhonePassword).toBe("");
      expect(result.current.state.signinPhoneError).toBeNull();
    });
  });

  describe("Sign Up - Email Setters", () => {
    it("should update signup email address", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupEmailAddress("new@example.com");
      });

      expect(result.current.state.signupEmailAddress).toBe("new@example.com");
    });

    it("should update signup email OTP sent status", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupEmailOtpSent(true);
      });

      expect(result.current.state.signupEmailOtpSent).toBe(true);
    });

    it("should update signup email OTP", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupEmailOtp("123456");
      });

      expect(result.current.state.signupEmailOtp).toBe("123456");
    });

    it("should reset signup email fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupEmailAddress("test@example.com");
        result.current.actions.setSignupEmailOtpSent(true);
      });

      act(() => {
        result.current.actions.resetSignupEmail();
      });

      expect(result.current.state.signupEmailAddress).toBe("");
      expect(result.current.state.signupEmailOtpSent).toBe(false);
    });
  });

  describe("Sign Up - Phone Setters", () => {
    it("should update signup phone number", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupPhoneNumber("+919876543210");
      });

      expect(result.current.state.signupPhoneNumber).toBe("+919876543210");
    });

    it("should update signup phone OTP step", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupPhoneOtpStep("verify");
      });

      expect(result.current.state.signupPhoneOtpStep).toBe("verify");
    });

    it("should reset signup phone fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupPhoneNumber("1234567890");
        result.current.actions.setSignupPhoneOtpStep("verify");
        result.current.actions.setSignupPhoneOtp("123456");
      });

      act(() => {
        result.current.actions.resetSignupPhone();
      });

      expect(result.current.state.signupPhoneNumber).toBe("");
      expect(result.current.state.signupPhoneOtpStep).toBe("phone");
      expect(result.current.state.signupPhoneOtp).toBe("");
    });
  });

  describe("Guest Setters", () => {
    it("should update guest class code", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setGuestClassCode("ABC123");
      });

      expect(result.current.state.guestClassCode).toBe("ABC123");
    });

    it("should update guest roll number", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setGuestRollNumber("R001");
      });

      expect(result.current.state.guestRollNumber).toBe("R001");
    });

    it("should reset guest fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setGuestClassCode("ABC123");
        result.current.actions.setGuestRollNumber("R001");
        result.current.actions.setGuestPin("1234");
        result.current.actions.setGuestError("Error");
      });

      act(() => {
        result.current.actions.resetGuest();
      });

      expect(result.current.state.guestClassCode).toBe("");
      expect(result.current.state.guestRollNumber).toBe("");
      expect(result.current.state.guestPin).toBe("");
      expect(result.current.state.guestError).toBeNull();
    });
  });

  describe("Sign Up - Username Setters", () => {
    it("should update signup username", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupUsername("johndoe");
      });

      expect(result.current.state.signupUsername).toBe("johndoe");
    });

    it("should update signup username step", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupUsernameStep("profile");
      });

      expect(result.current.state.signupUsernameStep).toBe("profile");
    });

    it("should reset signup username fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSignupUsername("johndoe");
        result.current.actions.setSignupUsernamePassword("pass123");
        result.current.actions.setSignupUsernameStep("profile");
      });

      act(() => {
        result.current.actions.resetSignupUsername();
      });

      expect(result.current.state.signupUsername).toBe("");
      expect(result.current.state.signupUsernamePassword).toBe("");
      expect(result.current.state.signupUsernameStep).toBe("username");
    });
  });

  describe("Sign In - Username Setters", () => {
    it("should update signin username", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninUsername("johndoe");
      });

      expect(result.current.state.signinUsername).toBe("johndoe");
    });

    it("should reset signin username fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setSigninUsername("johndoe");
        result.current.actions.setSigninUsernamePassword("pass123");
        result.current.actions.setSigninUsernameError("Invalid");
      });

      act(() => {
        result.current.actions.resetSigninUsername();
      });

      expect(result.current.state.signinUsername).toBe("");
      expect(result.current.state.signinUsernamePassword).toBe("");
      expect(result.current.state.signinUsernameError).toBeNull();
    });
  });

  describe("Forgot Password Setters", () => {
    it("should update forgot password email", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setForgotPasswordEmail("forgot@example.com");
      });

      expect(result.current.state.forgotPasswordEmail).toBe("forgot@example.com");
    });

    it("should update forgot password step", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setForgotPasswordStep("otp");
      });

      expect(result.current.state.forgotPasswordStep).toBe("otp");
    });

    it("should reset forgot password fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setForgotPasswordEmail("test@example.com");
        result.current.actions.setForgotPasswordOtp("123456");
        result.current.actions.setForgotPasswordStep("reset");
      });

      act(() => {
        result.current.actions.resetForgotPassword();
      });

      expect(result.current.state.forgotPasswordEmail).toBe("");
      expect(result.current.state.forgotPasswordOtp).toBe("");
      expect(result.current.state.forgotPasswordStep).toBe("email");
    });
  });

  describe("Profile Setters", () => {
    it("should update profile name", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setProfileName("John Doe");
      });

      expect(result.current.state.profileName).toBe("John Doe");
    });

    it("should update profile gender", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setProfileGender("male");
      });

      expect(result.current.state.profileGender).toBe("male");
    });

    it("should reset profile fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setProfileName("John Doe");
        result.current.actions.setProfileGender("male");
        result.current.actions.setProfilePhone("1234567890");
      });

      act(() => {
        result.current.actions.resetProfile();
      });

      expect(result.current.state.profileName).toBe("");
      expect(result.current.state.profileGender).toBe("");
      expect(result.current.state.profilePhone).toBe("");
    });
  });

  describe("Join Class Setters", () => {
    it("should update join class code", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setJoinClassCode("CLASS123");
      });

      expect(result.current.state.joinClassCode).toBe("CLASS123");
    });

    it("should update join class pin", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setJoinClassPin("1234");
      });

      expect(result.current.state.joinClassPin).toBe("1234");
    });

    it("should reset join class fields", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setJoinClassCode("CLASS123");
        result.current.actions.setJoinClassPin("1234");
        result.current.actions.setJoinClassError("Invalid code");
      });

      act(() => {
        result.current.actions.resetJoinClass();
      });

      expect(result.current.state.joinClassCode).toBe("");
      expect(result.current.state.joinClassPin).toBe("");
      expect(result.current.state.joinClassError).toBeNull();
    });
  });

  describe("Global Actions", () => {
    it("should update loading state", () => {
      const { result } = renderHook(() => useAuthState());

      act(() => {
        result.current.actions.setIsLoading(true);
      });

      expect(result.current.state.isLoading).toBe(true);

      act(() => {
        result.current.actions.setIsLoading(false);
      });

      expect(result.current.state.isLoading).toBe(false);
    });

    it("should reset all state", () => {
      const { result } = renderHook(() => useAuthState());

      // Set multiple fields
      act(() => {
        result.current.actions.setMainStep("signin");
        result.current.actions.setSigninEmailAddress("test@example.com");
        result.current.actions.setGuestClassCode("ABC123");
        result.current.actions.setProfileName("John");
        result.current.actions.setIsLoading(true);
      });

      // Reset all
      act(() => {
        result.current.actions.resetAll();
      });

      // Verify all reset to initial values
      expect(result.current.state.mainStep).toBe("choice");
      expect(result.current.state.signinEmailAddress).toBe("");
      expect(result.current.state.guestClassCode).toBe("");
      expect(result.current.state.profileName).toBe("");
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe("State Immutability", () => {
    it("should create new state objects on updates", () => {
      const { result } = renderHook(() => useAuthState());

      const initialState = result.current.state;

      act(() => {
        result.current.actions.setMainStep("signin");
      });

      const newState = result.current.state;

      expect(newState).not.toBe(initialState);
      expect(newState.mainStep).toBe("signin");
      expect(initialState.mainStep).toBe("choice"); // Original unchanged
    });
  });
});
