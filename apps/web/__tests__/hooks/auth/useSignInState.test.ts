/**
 * Tests for useSignInState hook
 * Target: ~25 tests covering sign-in state management for email, phone, and username flows
 */

import { renderHook, act } from "@testing-library/react";
import { useSignInState } from "@/hooks/auth/useSignInState";

describe("useSignInState", () => {
  describe("Initial State", () => {
    it("should initialize with email tab selected", () => {
      const { result } = renderHook(() => useSignInState());

      expect(result.current.state.currentTab).toBe("email");
    });

    it("should initialize with empty email fields", () => {
      const { result } = renderHook(() => useSignInState());

      expect(result.current.state.email).toBe("");
      expect(result.current.state.emailPassword).toBe("");
      expect(result.current.state.emailError).toBeNull();
    });

    it("should initialize with empty phone fields", () => {
      const { result } = renderHook(() => useSignInState());

      expect(result.current.state.phoneNumber).toBe("");
      expect(result.current.state.phonePassword).toBe("");
      expect(result.current.state.phoneError).toBeNull();
    });

    it("should initialize with empty username fields", () => {
      const { result } = renderHook(() => useSignInState());

      expect(result.current.state.username).toBe("");
      expect(result.current.state.usernamePassword).toBe("");
      expect(result.current.state.usernameError).toBeNull();
    });
  });

  describe("Tab Navigation", () => {
    it("should switch to phone tab", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setCurrentTab("phone");
      });

      expect(result.current.state.currentTab).toBe("phone");
    });

    it("should switch to username tab", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setCurrentTab("username");
      });

      expect(result.current.state.currentTab).toBe("username");
    });

    it("should switch back to email tab", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setCurrentTab("phone");
        result.current.actions.setCurrentTab("email");
      });

      expect(result.current.state.currentTab).toBe("email");
    });
  });

  describe("Email Flow", () => {
    it("should update email", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setEmail("user@example.com");
      });

      expect(result.current.state.email).toBe("user@example.com");
    });

    it("should update email password", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setEmailPassword("mypassword123");
      });

      expect(result.current.state.emailPassword).toBe("mypassword123");
    });

    it("should set email error", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setEmailError("Invalid credentials");
      });

      expect(result.current.state.emailError).toBe("Invalid credentials");
    });

    it("should clear email error when set to null", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setEmailError("Some error");
        result.current.actions.setEmailError(null);
      });

      expect(result.current.state.emailError).toBeNull();
    });

    it("should reset email fields", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setEmail("user@example.com");
        result.current.actions.setEmailPassword("password");
        result.current.actions.setEmailError("Error");
        result.current.actions.resetEmail();
      });

      expect(result.current.state.email).toBe("");
      expect(result.current.state.emailPassword).toBe("");
      expect(result.current.state.emailError).toBeNull();
    });
  });

  describe("Phone Flow", () => {
    it("should update phone number", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setPhoneNumber("9876543210");
      });

      expect(result.current.state.phoneNumber).toBe("9876543210");
    });

    it("should update phone password", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setPhonePassword("phonepass");
      });

      expect(result.current.state.phonePassword).toBe("phonepass");
    });

    it("should set phone error", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setPhoneError("Phone not registered");
      });

      expect(result.current.state.phoneError).toBe("Phone not registered");
    });

    it("should clear phone error when set to null", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setPhoneError("Error");
        result.current.actions.setPhoneError(null);
      });

      expect(result.current.state.phoneError).toBeNull();
    });

    it("should reset phone fields", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setPhoneNumber("9876543210");
        result.current.actions.setPhonePassword("password");
        result.current.actions.setPhoneError("Error");
        result.current.actions.resetPhone();
      });

      expect(result.current.state.phoneNumber).toBe("");
      expect(result.current.state.phonePassword).toBe("");
      expect(result.current.state.phoneError).toBeNull();
    });
  });

  describe("Username Flow", () => {
    it("should update username", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setUsername("student_user");
      });

      expect(result.current.state.username).toBe("student_user");
    });

    it("should update username password", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setUsernamePassword("userpass123");
      });

      expect(result.current.state.usernamePassword).toBe("userpass123");
    });

    it("should set username error", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setUsernameError("Username not found");
      });

      expect(result.current.state.usernameError).toBe("Username not found");
    });

    it("should clear username error when set to null", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setUsernameError("Error");
        result.current.actions.setUsernameError(null);
      });

      expect(result.current.state.usernameError).toBeNull();
    });

    it("should reset username fields", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setUsername("student");
        result.current.actions.setUsernamePassword("password");
        result.current.actions.setUsernameError("Error");
        result.current.actions.resetUsername();
      });

      expect(result.current.state.username).toBe("");
      expect(result.current.state.usernamePassword).toBe("");
      expect(result.current.state.usernameError).toBeNull();
    });
  });

  describe("Reset All", () => {
    it("should reset all fields to initial state", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        // Set various fields
        result.current.actions.setCurrentTab("phone");
        result.current.actions.setEmail("test@test.com");
        result.current.actions.setEmailPassword("pass");
        result.current.actions.setEmailError("error");
        result.current.actions.setPhoneNumber("9876543210");
        result.current.actions.setUsername("user");
        // Reset all
        result.current.actions.resetAll();
      });

      expect(result.current.state.currentTab).toBe("email");
      expect(result.current.state.email).toBe("");
      expect(result.current.state.emailPassword).toBe("");
      expect(result.current.state.emailError).toBeNull();
      expect(result.current.state.phoneNumber).toBe("");
      expect(result.current.state.phonePassword).toBe("");
      expect(result.current.state.phoneError).toBeNull();
      expect(result.current.state.username).toBe("");
      expect(result.current.state.usernamePassword).toBe("");
      expect(result.current.state.usernameError).toBeNull();
    });

    it("should maintain state independence between tabs", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        // Set data for each tab
        result.current.actions.setEmail("email@test.com");
        result.current.actions.setPhoneNumber("1234567890");
        result.current.actions.setUsername("testuser");
      });

      // All values should be set independently
      expect(result.current.state.email).toBe("email@test.com");
      expect(result.current.state.phoneNumber).toBe("1234567890");
      expect(result.current.state.username).toBe("testuser");
    });

    it("should only reset specific tab when using tab-specific reset", () => {
      const { result } = renderHook(() => useSignInState());

      act(() => {
        result.current.actions.setEmail("email@test.com");
        result.current.actions.setPhoneNumber("1234567890");
        result.current.actions.setUsername("testuser");
        // Reset only email
        result.current.actions.resetEmail();
      });

      expect(result.current.state.email).toBe("");
      expect(result.current.state.phoneNumber).toBe("1234567890");
      expect(result.current.state.username).toBe("testuser");
    });
  });

  describe("Action Stability", () => {
    it("should provide stable action references across re-renders", () => {
      const { result, rerender } = renderHook(() => useSignInState());

      const initialActions = result.current.actions;

      rerender();

      expect(result.current.actions.setEmail).toBe(initialActions.setEmail);
      expect(result.current.actions.setCurrentTab).toBe(
        initialActions.setCurrentTab
      );
      expect(result.current.actions.resetAll).toBe(initialActions.resetAll);
    });
  });
});
