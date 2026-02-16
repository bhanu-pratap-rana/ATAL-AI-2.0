/**
 * Tests for useStudentAuth hook
 * Target: ~20 tests covering student authentication handlers
 */

import { renderHook, act, waitFor } from "@testing-library/react";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/lib/supabase-browser", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/app/actions/auth", () => ({
  signInWithUsername: jest.fn(),
}));

jest.mock("@/hooks/useAuthState", () => ({
  useAuthState: jest.fn(),
}));

jest.mock("@/hooks/useOTPInput", () => ({
  useOTPInput: jest.fn(() => ({
    value: "",
    setValue: jest.fn(),
    isComplete: false,
  })),
}));

jest.mock("@/hooks/usePhoneInput", () => ({
  usePhoneInput: jest.fn(() => ({
    value: "",
    setValue: jest.fn(),
    fullValue: "+919876543210",
    isValid: true,
  })),
}));

jest.mock("@/lib/validation-utils", () => ({
  validateEmail: jest.fn(),
  validatePhone: jest.fn(),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import { useStudentAuth } from "@/hooks/useStudentAuth";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { signInWithUsername } from "@/app/actions/auth";
import { useAuthState } from "@/hooks/useAuthState";
import { validateEmail, validatePhone } from "@/lib/validation-utils";
import { toast } from "sonner";
import { authLogger } from "@/lib/auth-logger";

describe("useStudentAuth", () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush, replace: jest.fn() };

  const mockAuthState = {
    signinEmailAddress: "test@example.com",
    signinEmailPassword: "password123",
    signinPhoneNumber: "9876543210",
    signinPhonePassword: "phonepass",
    signinUsername: "student123",
    signinUsernamePassword: "userpass",
    signupEmailOtp: "",
    signupPhoneOtp: "",
    forgotPasswordOtp: "",
    signupPhoneNumber: "",
  };

  const mockActions = {
    setIsLoading: jest.fn(),
    setSigninEmailError: jest.fn(),
    setSigninPhoneError: jest.fn(),
    setSigninUsernameError: jest.fn(),
  };

  const mockSupabase = {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (useAuthState as jest.Mock).mockReturnValue({
      state: mockAuthState,
      actions: mockActions,
    });
    (validateEmail as jest.Mock).mockReturnValue({ valid: true });
    (validatePhone as jest.Mock).mockReturnValue({ valid: true });
  });

  describe("Hook Initialization", () => {
    it("should return state and actions from useAuthState", () => {
      const { result } = renderHook(() => useStudentAuth());

      expect(result.current.state).toBeDefined();
      expect(result.current.actions).toBeDefined();
    });

    it("should return phone input hooks", () => {
      const { result } = renderHook(() => useStudentAuth());

      expect(result.current.signinPhoneInput).toBeDefined();
      expect(result.current.signupPhoneInput).toBeDefined();
    });

    it("should return OTP input hooks", () => {
      const { result } = renderHook(() => useStudentAuth());

      expect(result.current.signupEmailOtpInput).toBeDefined();
      expect(result.current.signupPhoneOtpInput).toBeDefined();
      expect(result.current.forgotPasswordOtpInput).toBeDefined();
    });

    it("should return handlers object", () => {
      const { result } = renderHook(() => useStudentAuth());

      expect(result.current.handlers).toBeDefined();
      expect(result.current.handlers.handleSignInEmail).toBeDefined();
      expect(result.current.handlers.handleSignInPhone).toBeDefined();
      expect(result.current.handlers.handleSignInUsername).toBeDefined();
    });
  });

  describe("handleSignInEmail", () => {
    it("should validate email before sign in", async () => {
      (validateEmail as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid email format",
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInEmail(mockEvent);
      });

      expect(mockActions.setSigninEmailError).toHaveBeenCalledWith("Invalid email format");
      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should call signInWithPassword with email", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: {} } },
        error: null,
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInEmail(mockEvent);
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should redirect to dashboard on success", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: {} } },
        error: null,
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInEmail(mockEvent);
      });

      expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      expect(toast.success).toHaveBeenCalled();
    });

    it("should show error on authentication failure", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid credentials" },
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInEmail(mockEvent);
      });

      expect(mockActions.setSigninEmailError).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it("should redirect teacher to teacher login page", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: { role: "teacher" } } },
        error: null,
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInEmail(mockEvent);
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(mockActions.setSigninEmailError).toHaveBeenCalledWith(
        expect.stringContaining("teacher")
      );
    });

    it("should handle unexpected errors", async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInEmail(mockEvent);
      });

      expect(mockActions.setSigninEmailError).toHaveBeenCalledWith("An unexpected error occurred");
      expect(authLogger.error).toHaveBeenCalled();
    });
  });

  describe("handleSignInPhone", () => {
    it("should validate phone before sign in", async () => {
      (validatePhone as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid phone number",
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInPhone(mockEvent);
      });

      expect(mockActions.setSigninPhoneError).toHaveBeenCalledWith("Invalid phone number");
    });

    it("should call signInWithPassword with phone", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: {} } },
        error: null,
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInPhone(mockEvent);
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        phone: "+919876543210",
        password: "phonepass",
      });
    });

    it("should redirect to dashboard on phone login success", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: {} } },
        error: null,
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInPhone(mockEvent);
      });

      expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
    });
  });

  describe("handleSignInUsername", () => {
    it("should validate username is not empty", async () => {
      (useAuthState as jest.Mock).mockReturnValue({
        state: { ...mockAuthState, signinUsername: "" },
        actions: mockActions,
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInUsername(mockEvent);
      });

      expect(mockActions.setSigninUsernameError).toHaveBeenCalledWith("Username is required");
    });

    it("should validate password is not empty", async () => {
      (useAuthState as jest.Mock).mockReturnValue({
        state: { ...mockAuthState, signinUsernamePassword: "" },
        actions: mockActions,
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInUsername(mockEvent);
      });

      expect(mockActions.setSigninUsernameError).toHaveBeenCalledWith("Password is required");
    });

    it("should call signInWithUsername server action", async () => {
      (signInWithUsername as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInUsername(mockEvent);
      });

      expect(signInWithUsername).toHaveBeenCalledWith("student123", "userpass");
    });

    it("should redirect to dashboard on username login success", async () => {
      (signInWithUsername as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInUsername(mockEvent);
      });

      expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      expect(toast.success).toHaveBeenCalled();
    });

    it("should show error on username login failure", async () => {
      (signInWithUsername as jest.Mock).mockResolvedValue({
        success: false,
        error: "Invalid username or password",
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInUsername(mockEvent);
      });

      expect(mockActions.setSigninUsernameError).toHaveBeenCalledWith("Invalid username or password");
      expect(toast.error).toHaveBeenCalled();
    });

    it("should handle unexpected errors in username login", async () => {
      (signInWithUsername as jest.Mock).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInUsername(mockEvent);
      });

      expect(mockActions.setSigninUsernameError).toHaveBeenCalledWith("An unexpected error occurred");
      expect(authLogger.error).toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("should set loading true at start and false at end of email login", async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: {} } },
        error: null,
      });

      const { result } = renderHook(() => useStudentAuth());
      const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

      await act(async () => {
        await result.current.handlers.handleSignInEmail(mockEvent);
      });

      expect(mockActions.setIsLoading).toHaveBeenCalledWith(true);
      expect(mockActions.setIsLoading).toHaveBeenLastCalledWith(false);
    });
  });
});
