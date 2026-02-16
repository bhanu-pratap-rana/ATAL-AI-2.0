/**
 * Tests for ForgotPasswordFlow component
 * Target: ~25 tests covering password reset flow
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForgotPasswordFlow } from "@/components/student/ForgotPasswordFlow";

// Mock dependencies
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

const mockSendForgotPasswordOtp = jest.fn();
const mockResetPasswordWithOtp = jest.fn();
jest.mock("@/app/actions/auth", () => ({
  sendForgotPasswordOtp: (...args: unknown[]) => mockSendForgotPasswordOtp(...args),
  resetPasswordWithOtp: (...args: unknown[]) => mockResetPasswordWithOtp(...args),
}));

jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("ForgotPasswordFlow", () => {
  const mockActions = {
    setIsLoading: jest.fn(),
    setForgotPasswordEmail: jest.fn(),
    setForgotPasswordError: jest.fn(),
    setForgotPasswordStep: jest.fn(),
    setForgotPasswordNewPassword: jest.fn(),
    setForgotPasswordNewPasswordConfirm: jest.fn(),
    resetForgotPassword: jest.fn(),
    setMainStep: jest.fn(),
  };

  const mockOtpInput = {
    value: "",
    onChange: jest.fn(),
    reset: jest.fn(),
  };

  const defaultEmailStepState = {
    forgotPasswordStep: "email" as const,
    forgotPasswordEmail: "",
    forgotPasswordNewPassword: "",
    forgotPasswordNewPasswordConfirm: "",
    forgotPasswordError: null as string | null,
  };

  const defaultResetStepState = {
    ...defaultEmailStepState,
    forgotPasswordStep: "reset" as const,
    forgotPasswordEmail: "test@example.com",
  };

  const defaultProps = {
    state: defaultEmailStepState,
    actions: mockActions,
    otpInput: mockOtpInput,
    isLoading: false,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendForgotPasswordOtp.mockResolvedValue({ success: true });
    mockResetPasswordWithOtp.mockResolvedValue({ success: true });
  });

  describe("email step rendering", () => {
    it("should render Email Address label", () => {
      render(<ForgotPasswordFlow {...defaultProps} />);
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    });

    it("should render email placeholder", () => {
      render(<ForgotPasswordFlow {...defaultProps} />);
      expect(screen.getByPlaceholderText("your.email@example.com")).toBeInTheDocument();
    });

    it("should render Send Recovery Code button", () => {
      render(<ForgotPasswordFlow {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Send Recovery Code/i })).toBeInTheDocument();
    });

    it("should render Back to sign in button", () => {
      render(<ForgotPasswordFlow {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Back to sign in/i })).toBeInTheDocument();
    });
  });

  describe("email step behavior", () => {
    it("should disable Send Recovery Code when email is empty", () => {
      render(<ForgotPasswordFlow {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Send Recovery Code/i })).toBeDisabled();
    });

    it("should enable Send Recovery Code when email is provided", () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, forgotPasswordEmail: "test@example.com" }}
        />
      );
      expect(screen.getByRole("button", { name: /Send Recovery Code/i })).not.toBeDisabled();
    });

    it("should disable input when loading", () => {
      render(<ForgotPasswordFlow {...defaultProps} isLoading={true} />);
      expect(screen.getByPlaceholderText("your.email@example.com")).toBeDisabled();
    });

    it("should call setForgotPasswordEmail when typing", () => {
      render(<ForgotPasswordFlow {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
        target: { value: "user@test.com" },
      });
      expect(mockActions.setForgotPasswordEmail).toHaveBeenCalledWith("user@test.com");
    });

    it("should navigate to signin when Back to sign in is clicked", () => {
      render(<ForgotPasswordFlow {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /Back to sign in/i }));
      expect(mockActions.setMainStep).toHaveBeenCalledWith("signin");
    });
  });

  describe("email step submission", () => {
    it("should validate email on submit", async () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, forgotPasswordEmail: "invalid-email" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send Recovery Code/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalled();
      });
    });

    it("should call sendForgotPasswordOtp on valid email", async () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, forgotPasswordEmail: "test@example.com" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send Recovery Code/i }).closest("form")!);

      await waitFor(() => {
        expect(mockSendForgotPasswordOtp).toHaveBeenCalledWith("test@example.com");
      });
    });

    it("should show success toast on OTP sent", async () => {
      mockSendForgotPasswordOtp.mockResolvedValue({ success: true });
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, forgotPasswordEmail: "test@example.com" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send Recovery Code/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Recovery code sent to your email!");
      });
    });

    it("should move to reset step on success", async () => {
      mockSendForgotPasswordOtp.mockResolvedValue({ success: true });
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, forgotPasswordEmail: "test@example.com" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send Recovery Code/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordStep).toHaveBeenCalledWith("reset");
      });
    });

    it("should show error toast on failure", async () => {
      mockSendForgotPasswordOtp.mockResolvedValue({ success: false, error: "Email not found" });
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultEmailStepState, forgotPasswordEmail: "test@example.com" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Send Recovery Code/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });

  describe("reset step rendering", () => {
    it("should render Recovery Code label", () => {
      render(<ForgotPasswordFlow {...defaultProps} state={defaultResetStepState} />);
      expect(screen.getByLabelText("Recovery Code")).toBeInTheDocument();
    });

    it("should render New Password label", () => {
      render(<ForgotPasswordFlow {...defaultProps} state={defaultResetStepState} />);
      expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    });

    it("should render Confirm Password label", () => {
      render(<ForgotPasswordFlow {...defaultProps} state={defaultResetStepState} />);
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    });

    it("should render Reset Password button", () => {
      render(<ForgotPasswordFlow {...defaultProps} state={defaultResetStepState} />);
      expect(screen.getByRole("button", { name: /Reset Password/i })).toBeInTheDocument();
    });

    it("should render Change email button", () => {
      render(<ForgotPasswordFlow {...defaultProps} state={defaultResetStepState} />);
      expect(screen.getByRole("button", { name: /Change email/i })).toBeInTheDocument();
    });

    it("should render 6-digit code instruction", () => {
      render(<ForgotPasswordFlow {...defaultProps} state={defaultResetStepState} />);
      expect(screen.getByText(/Enter the 6-digit code sent to your email/i)).toBeInTheDocument();
    });
  });

  describe("reset step behavior", () => {
    it("should disable Reset Password when OTP is incomplete", () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultResetStepState, forgotPasswordNewPassword: "password123", forgotPasswordNewPasswordConfirm: "password123" }}
          otpInput={{ ...mockOtpInput, value: "123" }}
        />
      );
      expect(screen.getByRole("button", { name: /Reset Password/i })).toBeDisabled();
    });

    it("should disable Reset Password when password is empty", () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={defaultResetStepState}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );
      expect(screen.getByRole("button", { name: /Reset Password/i })).toBeDisabled();
    });

    it("should enable Reset Password when all fields are valid", () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultResetStepState, forgotPasswordNewPassword: "password123", forgotPasswordNewPasswordConfirm: "password123" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );
      expect(screen.getByRole("button", { name: /Reset Password/i })).not.toBeDisabled();
    });

    it("should go back to email step when Change email is clicked", () => {
      render(<ForgotPasswordFlow {...defaultProps} state={defaultResetStepState} />);
      fireEvent.click(screen.getByRole("button", { name: /Change email/i }));
      expect(mockActions.setForgotPasswordStep).toHaveBeenCalledWith("email");
    });

    it("should show error message when forgotPasswordError is set", () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultResetStepState, forgotPasswordError: "Invalid code" }}
        />
      );
      expect(screen.getByText("Invalid code")).toBeInTheDocument();
    });
  });

  describe("reset step submission", () => {
    it("should validate password on submit", async () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultResetStepState, forgotPasswordNewPassword: "short", forgotPasswordNewPasswordConfirm: "short" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Reset Password/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalled();
      });
    });

    it("should validate password match on submit", async () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultResetStepState, forgotPasswordNewPassword: "password123!", forgotPasswordNewPasswordConfirm: "different123!" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Reset Password/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setForgotPasswordError).toHaveBeenCalled();
      });
    });

    it("should call resetPasswordWithOtp on valid submission", async () => {
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultResetStepState, forgotPasswordNewPassword: "password123!", forgotPasswordNewPasswordConfirm: "password123!" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Reset Password/i }).closest("form")!);

      await waitFor(() => {
        expect(mockResetPasswordWithOtp).toHaveBeenCalledWith(
          "test@example.com",
          "123456",
          "password123!"
        );
      });
    });

    it("should show success toast on successful reset", async () => {
      mockResetPasswordWithOtp.mockResolvedValue({ success: true });
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultResetStepState, forgotPasswordNewPassword: "password123!", forgotPasswordNewPasswordConfirm: "password123!" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Reset Password/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Password reset successfully!");
      });
    });

    it("should navigate to signin on successful reset", async () => {
      mockResetPasswordWithOtp.mockResolvedValue({ success: true });
      render(
        <ForgotPasswordFlow
          {...defaultProps}
          state={{ ...defaultResetStepState, forgotPasswordNewPassword: "password123!", forgotPasswordNewPasswordConfirm: "password123!" }}
          otpInput={{ ...mockOtpInput, value: "123456" }}
        />
      );

      fireEvent.submit(screen.getByRole("button", { name: /Reset Password/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setMainStep).toHaveBeenCalledWith("signin");
      });
    });
  });
});
