/**
 * Tests for useTeacherOnboarding hook
 * Target: ~40 tests covering state, setters, handlers, and utilities
 */

import { renderHook, act, waitFor } from "@testing-library/react";

// Mock all dependencies before imports
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Mock Supabase client
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
    from: mockFrom,
  }),
}));

// Mock server actions
jest.mock("@/app/actions/teacher-onboard", () => ({
  sendEmailOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
  setPassword: jest.fn(),
  saveTeacherProfile: jest.fn(),
}));

jest.mock("@/app/actions/auth", () => ({
  sendForgotPasswordOtp: jest.fn(),
  resetPasswordWithOtp: jest.fn(),
}));

jest.mock("@/app/actions/school", () => ({
  verifyTeacher: jest.fn(),
}));

// Mock validation utils
jest.mock("@/lib/validation-utils", () => ({
  validateEmail: jest.fn(() => ({ valid: true })),
  validatePassword: jest.fn(() => ({ valid: true, errors: [] })),
  validatePasswordMatch: jest.fn(() => ({ valid: true })),
  validateOptionalPhone: jest.fn(() => ({ valid: true })),
}));

// Mock zxcvbn
jest.mock("zxcvbn", () => jest.fn(() => ({ score: 3 })));

// Mock auth logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import {
  useTeacherOnboarding,
  INITIAL_TEACHER_ONBOARDING_STATE,
} from "@/hooks/useTeacherOnboarding";
import {
  sendEmailOtp,
  verifyEmailOtp,
  setPassword as setUserPassword,
  saveTeacherProfile,
} from "@/app/actions/teacher-onboard";
import {
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
} from "@/app/actions/auth";
import { verifyTeacher } from "@/app/actions/school";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateOptionalPhone,
} from "@/lib/validation-utils";
import zxcvbn from "zxcvbn";

describe("useTeacherOnboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: not authenticated
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  describe("Initial State", () => {
    it("should start with initial state", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      // Note: authChecked becomes true immediately due to useEffect
      await waitFor(() => {
        expect(result.current.state).toEqual(
          expect.objectContaining({
            step: "choice",
            loading: false,
            signupMethod: "email",
            authChecked: true, // Set to true by the auth check effect
          })
        );
      });
    });

    it("should have empty login fields initially", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      expect(result.current.state.loginEmail).toBe("");
      expect(result.current.state.loginPassword).toBe("");
      expect(result.current.state.loginError).toBe("");
    });

    it("should have empty email OTP fields initially", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      expect(result.current.state.email).toBe("");
      expect(result.current.state.otp).toBe("");
      expect(result.current.state.otpSent).toBe(false);
    });

    it("should have empty school verification fields initially", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      expect(result.current.state.schoolCode).toBe("");
      expect(result.current.state.staffPin).toBe("");
      expect(result.current.state.verifiedSchoolName).toBe("");
      expect(result.current.state.verifiedSchoolId).toBe("");
    });

    it("should export INITIAL_TEACHER_ONBOARDING_STATE constant", () => {
      expect(INITIAL_TEACHER_ONBOARDING_STATE).toBeDefined();
      expect(INITIAL_TEACHER_ONBOARDING_STATE.step).toBe("choice");
    });
  });

  describe("State Setters", () => {
    it("should update step", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setStep("login");
      });

      expect(result.current.state.step).toBe("login");
    });

    it("should update loading state", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setLoading(true);
      });

      expect(result.current.state.loading).toBe(true);
    });

    it("should update signup method", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setSignupMethod("phone");
      });

      expect(result.current.state.signupMethod).toBe("phone");
    });

    it("should update login email", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setLoginEmail("test@example.com");
      });

      expect(result.current.state.loginEmail).toBe("test@example.com");
    });

    it("should update school code", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setSchoolCode("SCH001");
      });

      expect(result.current.state.schoolCode).toBe("SCH001");
    });

    it("should update teacher gender", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setTeacherGender("female");
      });

      expect(result.current.state.teacherGender).toBe("female");
    });
  });

  describe("handlePasswordChange", () => {
    it("should update password and calculate strength", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.handlePasswordChange("MyStr0ng!Pass");
      });

      expect(result.current.state.password).toBe("MyStr0ng!Pass");
      expect(zxcvbn).toHaveBeenCalledWith("MyStr0ng!Pass");
      expect(result.current.state.passwordStrength).toBe(3);
    });

    it("should set strength to 0 for empty password", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.handlePasswordChange("");
      });

      expect(result.current.state.password).toBe("");
      expect(result.current.state.passwordStrength).toBe(0);
    });
  });

  describe("handleTeacherLogin", () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    it("should handle successful login with existing profile", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      // Set login credentials
      act(() => {
        result.current.actions.setLoginEmail("teacher@test.com");
        result.current.actions.setLoginPassword("password123");
      });

      // Mock successful auth
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock existing teacher profile
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { user_id: "user-123", name: "Teacher" },
          error: null,
        }),
      });

      await act(async () => {
        await result.current.actions.handleTeacherLogin(mockEvent);
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "teacher@test.com",
        password: "password123",
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("Login successful!");
      expect(mockPush).toHaveBeenCalledWith("/app/teacher/classes");
    });

    it("should handle login with invalid credentials", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setLoginEmail("teacher@test.com");
        result.current.actions.setLoginPassword("wrongpassword");
      });

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      });

      await act(async () => {
        await result.current.actions.handleTeacherLogin(mockEvent);
      });

      expect(result.current.state.loginError).toContain("Invalid email or password");
      expect(mockToastError).toHaveBeenCalled();
    });

    it("should detect student account trying to login as teacher", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setLoginEmail("student@test.com");
        result.current.actions.setLoginPassword("password123");
      });

      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // First call - teacher profile (not found)
      // Second call - student profile (found)
      let callCount = 0;
      mockFrom.mockImplementation((table) => {
        callCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: table === "student_profiles" ? { user_id: "user-123" } : null,
            error: null,
          }),
        };
      });

      await act(async () => {
        await result.current.actions.handleTeacherLogin(mockEvent);
      });

      expect(result.current.state.loginError).toContain("student account");
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("handleSendOTP", () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    it("should send OTP for valid email", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validateEmail as jest.Mock).mockReturnValue({ valid: true });
      (sendEmailOtp as jest.Mock).mockResolvedValue({ success: true });

      act(() => {
        result.current.actions.setEmail("new@teacher.com");
      });

      await act(async () => {
        await result.current.actions.handleSendOTP(mockEvent);
      });

      expect(sendEmailOtp).toHaveBeenCalledWith("new@teacher.com");
      expect(result.current.state.otpSent).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith("OTP sent to your email!");
    });

    it("should reject invalid email", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validateEmail as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid email format",
      });

      act(() => {
        result.current.actions.setEmail("invalid-email");
      });

      await act(async () => {
        await result.current.actions.handleSendOTP(mockEvent);
      });

      expect(sendEmailOtp).not.toHaveBeenCalled();
      expect(result.current.state.emailError).toBe("Invalid email format");
      expect(mockToastError).toHaveBeenCalled();
    });

    it("should suggest correction for typo in email", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validateEmail as jest.Mock).mockReturnValue({
        valid: false,
        error: "Did you mean gmail.com?",
        suggestion: "test@gmail.com",
      });

      act(() => {
        result.current.actions.setEmail("test@gmial.com");
      });

      await act(async () => {
        await result.current.actions.handleSendOTP(mockEvent);
      });

      expect(result.current.state.emailSuggestion).toBe("test@gmail.com");
    });

    it("should redirect to login if email already exists", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validateEmail as jest.Mock).mockReturnValue({ valid: true });
      (sendEmailOtp as jest.Mock).mockResolvedValue({
        success: false,
        exists: true,
        error: "Email already registered",
      });

      act(() => {
        result.current.actions.setEmail("existing@teacher.com");
      });

      await act(async () => {
        await result.current.actions.handleSendOTP(mockEvent);
      });

      expect(result.current.state.step).toBe("login");
      expect(result.current.state.loginEmail).toBe("existing@teacher.com");
    });
  });

  describe("handleVerifyOTP", () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    it("should verify OTP and proceed to set-password step", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (verifyEmailOtp as jest.Mock).mockResolvedValue({ success: true });

      act(() => {
        result.current.actions.setEmail("new@teacher.com");
        result.current.actions.setOtp("123456");
      });

      await act(async () => {
        await result.current.actions.handleVerifyOTP(mockEvent);
      });

      expect(verifyEmailOtp).toHaveBeenCalledWith({
        email: "new@teacher.com",
        token: "123456",
      });
      expect(result.current.state.step).toBe("set-password");
      expect(mockToastSuccess).toHaveBeenCalledWith("Email verified! ✓");
    });

    it("should show error for invalid OTP", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (verifyEmailOtp as jest.Mock).mockResolvedValue({
        success: false,
        error: "Invalid OTP",
      });

      act(() => {
        result.current.actions.setEmail("new@teacher.com");
        result.current.actions.setOtp("000000");
      });

      await act(async () => {
        await result.current.actions.handleVerifyOTP(mockEvent);
      });

      expect(mockToastError).toHaveBeenCalledWith("Invalid OTP");
      expect(result.current.state.step).not.toBe("set-password");
    });
  });

  describe("handleSetPassword", () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    it("should set password and proceed to school verification", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validatePassword as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      (validatePasswordMatch as jest.Mock).mockReturnValue({ valid: true });
      (setUserPassword as jest.Mock).mockResolvedValue({ success: true });

      act(() => {
        result.current.actions.setPassword("StrongP@ss123");
        result.current.actions.setPasswordConfirm("StrongP@ss123");
      });

      await act(async () => {
        await result.current.actions.handleSetPassword(mockEvent);
      });

      expect(setUserPassword).toHaveBeenCalledWith("StrongP@ss123");
      expect(result.current.state.step).toBe("verify-school");
      expect(mockToastSuccess).toHaveBeenCalledWith("Password set successfully! ✓");
    });

    it("should reject weak password", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validatePassword as jest.Mock).mockReturnValue({
        valid: false,
        errors: ["Password too weak"],
      });

      act(() => {
        result.current.actions.setPassword("weak");
        result.current.actions.setPasswordConfirm("weak");
      });

      await act(async () => {
        await result.current.actions.handleSetPassword(mockEvent);
      });

      expect(setUserPassword).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalled();
    });

    it("should reject mismatched passwords", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validatePassword as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      (validatePasswordMatch as jest.Mock).mockReturnValue({
        valid: false,
        error: "Passwords do not match",
      });

      act(() => {
        result.current.actions.setPassword("StrongP@ss123");
        result.current.actions.setPasswordConfirm("DifferentP@ss123");
      });

      await act(async () => {
        await result.current.actions.handleSetPassword(mockEvent);
      });

      expect(setUserPassword).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith("Passwords do not match");
    });
  });

  describe("handleSchoolVerification", () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    it("should verify school and proceed to profile step", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (verifyTeacher as jest.Mock).mockResolvedValue({
        success: true,
        schoolId: "school-123",
        schoolName: "Test School",
      });

      act(() => {
        result.current.actions.setSchoolCode("SCH001");
        result.current.actions.setStaffPin("1234");
      });

      await act(async () => {
        await result.current.actions.handleSchoolVerification(mockEvent);
      });

      expect(verifyTeacher).toHaveBeenCalledWith({
        schoolCode: "SCH001",
        staffPin: "1234",
        teacherName: "",
        phone: "",
      });
      expect(result.current.state.step).toBe("profile");
      expect(result.current.state.verifiedSchoolName).toBe("Test School");
      expect(result.current.state.verifiedSchoolId).toBe("school-123");
    });

    it("should show error for invalid school code", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (verifyTeacher as jest.Mock).mockResolvedValue({
        success: false,
        error: "Invalid school code",
      });

      act(() => {
        result.current.actions.setSchoolCode("INVALID");
        result.current.actions.setStaffPin("0000");
      });

      await act(async () => {
        await result.current.actions.handleSchoolVerification(mockEvent);
      });

      expect(mockToastError).toHaveBeenCalledWith("Invalid school code");
      expect(result.current.state.step).not.toBe("profile");
    });
  });

  describe("handleProfileSubmit", () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    it("should save profile and complete registration", async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useTeacherOnboarding());
      (validateOptionalPhone as jest.Mock).mockReturnValue({ valid: true });
      (saveTeacherProfile as jest.Mock).mockResolvedValue({ success: true });
      mockRefreshSession.mockResolvedValue({ error: null });

      act(() => {
        result.current.actions.setTeacherName("John Doe");
        result.current.actions.setTeacherGender("male");
        result.current.actions.setPhone("1234567890");
        result.current.actions.setVillage("Test Village");
        result.current.actions.setVerifiedSchoolId("school-123");
        result.current.actions.setSchoolCode("SCH001");
      });

      await act(async () => {
        await result.current.actions.handleProfileSubmit(mockEvent);
      });

      expect(saveTeacherProfile).toHaveBeenCalledWith({
        name: "John Doe",
        gender: "male",
        phone: "1234567890",
        village: "Test Village",
        schoolId: "school-123",
        schoolCode: "SCH001",
      });
      expect(result.current.state.step).toBe("complete");
      expect(mockToastSuccess).toHaveBeenCalledWith("Teacher registration complete! 🎉");

      // Fast-forward timeout
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(mockPush).toHaveBeenCalledWith("/app/teacher/classes");
      jest.useRealTimers();
    });

    it("should reject missing gender", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setTeacherName("John Doe");
        // Gender not set
      });

      await act(async () => {
        await result.current.actions.handleProfileSubmit(mockEvent);
      });

      expect(saveTeacherProfile).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith("Please select your gender");
    });

    it("should reject invalid phone number", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validateOptionalPhone as jest.Mock).mockReturnValue({
        valid: false,
        error: "Invalid phone number",
      });

      act(() => {
        result.current.actions.setTeacherName("John Doe");
        result.current.actions.setTeacherGender("male");
        result.current.actions.setPhone("invalid");
      });

      await act(async () => {
        await result.current.actions.handleProfileSubmit(mockEvent);
      });

      expect(saveTeacherProfile).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith("Invalid phone number");
    });
  });

  describe("handleForgotPasswordOtp", () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    it("should send forgot password OTP", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (sendForgotPasswordOtp as jest.Mock).mockResolvedValue({ success: true });

      act(() => {
        result.current.actions.setForgotEmail("teacher@test.com");
      });

      await act(async () => {
        await result.current.actions.handleForgotPasswordOtp(mockEvent);
      });

      expect(sendForgotPasswordOtp).toHaveBeenCalledWith("teacher@test.com");
      expect(result.current.state.forgotOtpSent).toBe(true);
      expect(mockToastSuccess).toHaveBeenCalledWith("Recovery code sent to your email!");
    });

    it("should show error when sending fails", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (sendForgotPasswordOtp as jest.Mock).mockResolvedValue({
        success: false,
        error: "Email not found",
      });

      act(() => {
        result.current.actions.setForgotEmail("unknown@test.com");
      });

      await act(async () => {
        await result.current.actions.handleForgotPasswordOtp(mockEvent);
      });

      expect(mockToastError).toHaveBeenCalledWith("Email not found");
    });
  });

  describe("handleResetPassword", () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

    it("should reset password with valid OTP", async () => {
      const { result } = renderHook(() => useTeacherOnboarding());
      (validatePassword as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      (validatePasswordMatch as jest.Mock).mockReturnValue({ valid: true });
      (resetPasswordWithOtp as jest.Mock).mockResolvedValue({ success: true });

      act(() => {
        result.current.actions.setForgotEmail("teacher@test.com");
        result.current.actions.setForgotOtp("123456");
        result.current.actions.setForgotNewPassword("NewP@ss123");
        result.current.actions.setForgotConfirmPassword("NewP@ss123");
      });

      await act(async () => {
        await result.current.actions.handleResetPassword(mockEvent);
      });

      expect(resetPasswordWithOtp).toHaveBeenCalledWith(
        "teacher@test.com",
        "123456",
        "NewP@ss123"
      );
      expect(result.current.state.step).toBe("login");
      expect(mockToastSuccess).toHaveBeenCalledWith("Password reset successfully! ✓");
    });
  });

  describe("Utility Functions", () => {
    it("should reset forgot password state", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setForgotEmail("test@test.com");
        result.current.actions.setForgotOtp("123456");
        result.current.actions.setForgotOtpSent(true);
      });

      expect(result.current.state.forgotEmail).toBe("test@test.com");

      act(() => {
        result.current.actions.resetForgotPassword();
      });

      expect(result.current.state.forgotEmail).toBe("");
      expect(result.current.state.forgotOtp).toBe("");
      expect(result.current.state.forgotOtpSent).toBe(false);
    });

    it("should reset signup email state", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setEmail("test@test.com");
        result.current.actions.setOtp("123456");
        result.current.actions.setOtpSent(true);
        result.current.actions.setEmailError("Some error");
      });

      act(() => {
        result.current.actions.resetSignupEmail();
      });

      expect(result.current.state.email).toBe("");
      expect(result.current.state.otp).toBe("");
      expect(result.current.state.otpSent).toBe(false);
      expect(result.current.state.emailError).toBe("");
    });

    it("should reset all state", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setStep("profile");
        result.current.actions.setEmail("test@test.com");
        result.current.actions.setTeacherName("John");
        result.current.actions.setLoading(true);
      });

      act(() => {
        result.current.actions.resetAll();
      });

      expect(result.current.state).toEqual(
        expect.objectContaining({
          step: "choice",
          loading: false,
          email: "",
          teacherName: "",
        })
      );
    });
  });

  describe("Auth Check Effect", () => {
    it("should redirect if already registered", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
      });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { user_id: "user-123", name: "Teacher" },
          error: null,
        }),
      });

      renderHook(() => useTeacherOnboarding());

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("You are already registered!");
        expect(mockPush).toHaveBeenCalledWith("/app/teacher/classes");
      });
    });

    it("should sign out if session exists but no profile", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
      });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      renderHook(() => useTeacherOnboarding());

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it("should not check auth if step is not choice", () => {
      const { result } = renderHook(() => useTeacherOnboarding());

      act(() => {
        result.current.actions.setStep("login");
        result.current.actions.setAuthChecked(false);
      });

      // Auth check should not trigger since step is not 'choice'
      expect(mockGetSession).toHaveBeenCalledTimes(1); // Only from initial mount
    });
  });
});
