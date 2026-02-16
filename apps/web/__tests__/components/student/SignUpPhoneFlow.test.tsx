/**
 * Tests for SignUpPhoneFlow component
 * Target: ~25 tests covering phone signup flow
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignUpPhoneFlow } from "@/components/student/SignUpPhoneFlow";

// Mock dependencies
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockUpdateUser = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      updateUser: mockUpdateUser,
    },
  }),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("SignUpPhoneFlow", () => {
  const mockActions = {
    setIsLoading: jest.fn(),
    setSignupPhoneError: jest.fn(),
    setSignupPhoneOtpStep: jest.fn(),
    setSignupPhonePassword: jest.fn(),
    setSignupPhonePasswordConfirm: jest.fn(),
    resetSignupPhone: jest.fn(),
    setMainStep: jest.fn(),
  };

  const mockPhoneInput = {
    displayValue: "",
    fullValue: "+91",
    onChange: jest.fn(),
    reset: jest.fn(),
  };

  const mockOtpInput = {
    value: "",
    onChange: jest.fn(),
    reset: jest.fn(),
  };

  const defaultPhoneStepState = {
    signupPhoneOtpStep: "phone" as const,
    signupPhonePassword: "",
    signupPhonePasswordConfirm: "",
    signupPhoneError: null as string | null,
  };

  const defaultVerifyStepState = {
    ...defaultPhoneStepState,
    signupPhoneOtpStep: "verify" as const,
    signupPhonePassword: "",
    signupPhonePasswordConfirm: "",
  };

  const defaultProps = {
    state: defaultPhoneStepState,
    actions: mockActions,
    phoneInput: mockPhoneInput,
    otpInput: mockOtpInput,
    isLoading: false,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithOtp.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "123" } }, error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  describe("phone step rendering", () => {
    it("should render phone number label", () => {
      render(<SignUpPhoneFlow {...defaultProps} />);
      expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
    });

    it("should render +91 prefix", () => {
      render(<SignUpPhoneFlow {...defaultProps} />);
      expect(screen.getByText("+91")).toBeInTheDocument();
    });

    it("should render phone input placeholder", () => {
      render(<SignUpPhoneFlow {...defaultProps} />);
      expect(screen.getByPlaceholderText("9876543210")).toBeInTheDocument();
    });

    it("should render Send OTP button", () => {
      render(<SignUpPhoneFlow {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Send OTP/i })).toBeInTheDocument();
    });

    it("should render info box about SMS verification", () => {
      render(<SignUpPhoneFlow {...defaultProps} />);
      expect(screen.getByText(/SMS Verification/i)).toBeInTheDocument();
    });

    it("should render 10-digit phone number instruction", () => {
      render(<SignUpPhoneFlow {...defaultProps} />);
      expect(screen.getByText(/Enter your 10-digit phone number/i)).toBeInTheDocument();
    });
  });

  describe("phone step behavior", () => {
    it("should disable Send OTP when phone is too short", () => {
      render(<SignUpPhoneFlow {...defaultProps} phoneInput={{ ...mockPhoneInput, displayValue: "12345" }} />);
      expect(screen.getByRole("button", { name: /Send OTP/i })).toBeDisabled();
    });

    it("should enable Send OTP when phone is valid length", () => {
      render(<SignUpPhoneFlow {...defaultProps} phoneInput={{ ...mockPhoneInput, displayValue: "9876543210" }} />);
      expect(screen.getByRole("button", { name: /Send OTP/i })).not.toBeDisabled();
    });

    it("should disable input when loading", () => {
      render(<SignUpPhoneFlow {...defaultProps} isLoading={true} />);
      expect(screen.getByPlaceholderText("9876543210")).toBeDisabled();
    });

    it("should call phoneInput.onChange when typing", () => {
      render(<SignUpPhoneFlow {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("9876543210"), {
        target: { value: "9876543210" },
      });
      expect(mockPhoneInput.onChange).toHaveBeenCalledWith("9876543210");
    });
  });

  describe("phone step submission", () => {
    it("should validate phone on submit", async () => {
      const phoneInput = { ...mockPhoneInput, fullValue: "+91invalid" };
      render(<SignUpPhoneFlow {...defaultProps} phoneInput={phoneInput} />);

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupPhoneError).toHaveBeenCalled();
      });
    });

    it("should send OTP on valid phone", async () => {
      const phoneInput = { ...mockPhoneInput, fullValue: "+919876543210", displayValue: "9876543210" };
      render(<SignUpPhoneFlow {...defaultProps} phoneInput={phoneInput} />);

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({ phone: "+919876543210" });
      });
    });

    it("should show success toast on OTP sent", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      const phoneInput = { ...mockPhoneInput, fullValue: "+919876543210", displayValue: "9876543210" };
      render(<SignUpPhoneFlow {...defaultProps} phoneInput={phoneInput} />);

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("OTP sent to your phone!");
      });
    });

    it("should move to verify step on success", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });
      const phoneInput = { ...mockPhoneInput, fullValue: "+919876543210", displayValue: "9876543210" };
      render(<SignUpPhoneFlow {...defaultProps} phoneInput={phoneInput} />);

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupPhoneOtpStep).toHaveBeenCalledWith("verify");
      });
    });

    it("should show error toast on OTP failure", async () => {
      mockSignInWithOtp.mockResolvedValue({ error: { message: "SMS send failed" } });
      const phoneInput = { ...mockPhoneInput, fullValue: "+919876543210", displayValue: "9876543210" };
      render(<SignUpPhoneFlow {...defaultProps} phoneInput={phoneInput} />);

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });

  describe("verify step rendering", () => {
    it("should render Verification Code label", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByLabelText("Verification Code")).toBeInTheDocument();
    });

    it("should render Password label", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("should render Confirm Password label", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    });

    it("should render Create Account button", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
    });

    it("should render Resend OTP button", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByRole("button", { name: /Resend OTP/i })).toBeInTheDocument();
    });

    it("should render Change phone number button", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      expect(screen.getByRole("button", { name: /Change phone number/i })).toBeInTheDocument();
    });
  });

  describe("verify step behavior", () => {
    it("should disable Create Account when OTP is incomplete", () => {
      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupPhonePassword: "password123", signupPhonePasswordConfirm: "password123" }}
          otpInput={{ ...mockOtpInput, value: "123" }}
        />
      );
      expect(screen.getByRole("button", { name: /Create Account/i })).toBeDisabled();
    });

    it("should disable Create Account when password is empty", () => {
      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={defaultVerifyStepState}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );
      expect(screen.getByRole("button", { name: /Create Account/i })).toBeDisabled();
    });

    it("should enable Create Account when all fields are valid", () => {
      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupPhonePassword: "password123", signupPhonePasswordConfirm: "password123" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );
      expect(screen.getByRole("button", { name: /Create Account/i })).not.toBeDisabled();
    });

    it("should navigate back to phone step when Change phone number is clicked", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      fireEvent.click(screen.getByRole("button", { name: /Change phone number/i }));
      expect(mockActions.setSignupPhoneOtpStep).toHaveBeenCalledWith("phone");
    });

    it("should show error message when signupPhoneError is set", () => {
      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupPhoneError: "Invalid password" }}
        />
      );
      expect(screen.getByText("Invalid password")).toBeInTheDocument();
    });

    it("should call otpInput.onChange when typing OTP", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      fireEvent.change(screen.getByPlaceholderText("123456"), {
        target: { value: "654321" },
      });
      expect(mockOtpInput.onChange).toHaveBeenCalledWith("654321");
    });

    it("should call actions.setSignupPhonePassword when typing password", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "newpassword123" },
      });
      expect(mockActions.setSignupPhonePassword).toHaveBeenCalledWith("newpassword123");
    });

    it("should call actions.setSignupPhonePasswordConfirm when typing confirm password", () => {
      render(<SignUpPhoneFlow {...defaultProps} state={defaultVerifyStepState} />);
      fireEvent.change(screen.getByLabelText("Confirm Password"), {
        target: { value: "newpassword123" },
      });
      expect(mockActions.setSignupPhonePasswordConfirm).toHaveBeenCalledWith("newpassword123");
    });
  });

  describe("verify step submission", () => {
    const validVerifyState = {
      ...defaultVerifyStepState,
      signupPhonePassword: "Password123!",
      signupPhonePasswordConfirm: "Password123!",
    };

    const validOtpInput = {
      ...mockOtpInput,
      value: "123456",
    };

    const validPhoneInput = {
      ...mockPhoneInput,
      fullValue: "+919876543210",
      displayValue: "9876543210",
    };

    it("should validate password on submit", async () => {
      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupPhonePassword: "short", signupPhonePasswordConfirm: "short" }}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupPhoneError).toHaveBeenCalled();
      });
    });

    it("should validate password match on submit", async () => {
      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={{ ...defaultVerifyStepState, signupPhonePassword: "Password123!", signupPhonePasswordConfirm: "Different123!" }}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupPhoneError).toHaveBeenCalled();
      });
    });

    it("should verify OTP on valid submission", async () => {
      mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledWith({
          phone: "+919876543210",
          token: "123456",
          type: "sms",
        });
      });
    });

    it("should show error toast on OTP verification failure", async () => {
      mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: { message: "Invalid OTP" } });

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Invalid OTP");
      });
    });

    it("should show error when no user returned from verification", async () => {
      mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: null });

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Verification failed");
      });
    });

    it("should update password after verification", async () => {
      mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ password: "Password123!" });
      });
    });

    it("should show error on password update failure", async () => {
      mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
      mockUpdateUser.mockResolvedValue({ error: { message: "Password update failed" } });

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to set password");
      });
    });

    it("should navigate to dashboard on success", async () => {
      mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      });
    });

    it("should call onSuccess callback on successful account creation", async () => {
      const mockOnSuccess = jest.fn();
      mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
          onSuccess={mockOnSuccess}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should show success toast on account creation", async () => {
      mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Account created! 🎉");
      });
    });

    it("should handle unexpected error during verification", async () => {
      mockVerifyOtp.mockRejectedValue(new Error("Network error"));

      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={validVerifyState}
          phoneInput={validPhoneInput}
          otpInput={validOtpInput}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to verify OTP");
      });
    });
  });

  describe("resend OTP", () => {
    it("should resend OTP when Resend OTP button is clicked", async () => {
      const validPhoneInput = { ...mockPhoneInput, fullValue: "+919876543210", displayValue: "9876543210" };
      render(
        <SignUpPhoneFlow
          {...defaultProps}
          state={defaultVerifyStepState}
          phoneInput={validPhoneInput}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Resend OTP/i }));

      await waitFor(() => {
        expect(mockSignInWithOtp).toHaveBeenCalledWith({ phone: "+919876543210" });
      });
    });
  });

  describe("error handling", () => {
    it("should handle exception during OTP send", async () => {
      mockSignInWithOtp.mockRejectedValue(new Error("Network error"));
      const phoneInput = { ...mockPhoneInput, fullValue: "+919876543210", displayValue: "9876543210" };

      render(<SignUpPhoneFlow {...defaultProps} phoneInput={phoneInput} />);

      fireEvent.submit(screen.getByRole("button", { name: /Send OTP/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSignupPhoneError).toHaveBeenCalledWith("Failed to send OTP");
        expect(mockToast.error).toHaveBeenCalledWith("Failed to send OTP");
      });
    });
  });
});
