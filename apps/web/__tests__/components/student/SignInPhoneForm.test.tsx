/**
 * Tests for SignInPhoneForm component
 * Target: ~18 tests covering rendering, validation, sign-in, and navigation
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignInPhoneForm } from "@/components/student/SignInPhoneForm";

// Mock toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

// Mock router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock supabase
const mockSignInWithPassword = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

// Mock validation utils
jest.mock("@/lib/validation-utils", () => ({
  validatePhone: jest.fn((phone: string) => {
    if (!phone || phone.length !== 13) {
      // +91 + 10 digits
      return { valid: false, error: "Invalid phone number" };
    }
    return { valid: true, error: null };
  }),
}));

// Mock auth constants
jest.mock("@/lib/auth-constants", () => ({
  PHONE_DIGIT_LENGTH: 10,
}));

// Mock auth logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("SignInPhoneForm", () => {
  const mockState = {
    signinPhonePassword: "",
    signinPhoneError: null,
    mainStep: "signin" as const,
  };

  const mockActions = {
    setIsLoading: jest.fn(),
    setSigninPhoneError: jest.fn(),
    setSigninPhonePassword: jest.fn(),
    setMainStep: jest.fn(),
  };

  const mockPhoneInput = {
    displayValue: "",
    fullValue: "",
    onChange: jest.fn(),
  };

  const defaultProps = {
    state: mockState,
    actions: mockActions,
    phoneInput: mockPhoneInput,
    isLoading: false,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: null });
  });

  describe("rendering", () => {
    it("should render phone input with label", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    });

    it("should render +91 prefix", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      expect(screen.getByText("+91")).toBeInTheDocument();
    });

    it("should render password input", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });

    it("should render sign in button", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    });

    it("should render forgot password link", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();
    });

    it("should render sign up link", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      expect(screen.getByText(/Don't have an account\? Sign up/i)).toBeInTheDocument();
    });

    it("should show phone format hint", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      expect(screen.getByText(/Enter your 10-digit phone number/i)).toBeInTheDocument();
    });
  });

  describe("input handling", () => {
    it("should call phoneInput.onChange when phone input changes", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: "9876543210" } });

      expect(mockPhoneInput.onChange).toHaveBeenCalledWith("9876543210");
    });

    it("should call setSigninPhonePassword when password changes", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/Password/i);
      fireEvent.change(passwordInput, { target: { value: "mypassword" } });

      expect(mockActions.setSigninPhonePassword).toHaveBeenCalledWith("mypassword");
    });

    it("should display phone value from phoneInput.displayValue", () => {
      const props = {
        ...defaultProps,
        phoneInput: { ...mockPhoneInput, displayValue: "9876543210" },
      };
      render(<SignInPhoneForm {...props} />);

      const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
      expect(phoneInput.value).toBe("9876543210");
    });

    it("should display password value from state", () => {
      const props = {
        ...defaultProps,
        state: { ...mockState, signinPhonePassword: "password123" },
      };
      render(<SignInPhoneForm {...props} />);

      const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
      expect(passwordInput.value).toBe("password123");
    });
  });

  describe("button state", () => {
    it("should disable button when phone is too short", () => {
      const props = {
        ...defaultProps,
        phoneInput: { ...mockPhoneInput, displayValue: "12345" },
        state: { ...mockState, signinPhonePassword: "password" },
      };
      render(<SignInPhoneForm {...props} />);

      const button = screen.getByRole("button", { name: /Sign In/i });
      expect(button).toBeDisabled();
    });

    it("should disable button when password is empty", () => {
      const props = {
        ...defaultProps,
        phoneInput: { ...mockPhoneInput, displayValue: "9876543210" },
        state: { ...mockState, signinPhonePassword: "" },
      };
      render(<SignInPhoneForm {...props} />);

      const button = screen.getByRole("button", { name: /Sign In/i });
      expect(button).toBeDisabled();
    });

    it("should enable button when phone and password are valid", () => {
      const props = {
        ...defaultProps,
        phoneInput: { ...mockPhoneInput, displayValue: "9876543210" },
        state: { ...mockState, signinPhonePassword: "password123" },
      };
      render(<SignInPhoneForm {...props} />);

      const button = screen.getByRole("button", { name: /Sign In/i });
      expect(button).not.toBeDisabled();
    });

    it("should disable button when loading", () => {
      const props = {
        ...defaultProps,
        phoneInput: { ...mockPhoneInput, displayValue: "9876543210" },
        state: { ...mockState, signinPhonePassword: "password123" },
        isLoading: true,
      };
      render(<SignInPhoneForm {...props} />);

      const button = screen.getByRole("button", { name: /Sign In/i });
      expect(button).toBeDisabled();
    });
  });

  describe("loading state", () => {
    it("should disable inputs when loading", () => {
      render(<SignInPhoneForm {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/Phone Number/i)).toBeDisabled();
      expect(screen.getByLabelText(/Password/i)).toBeDisabled();
    });

    it("should disable navigation buttons when loading", () => {
      render(<SignInPhoneForm {...defaultProps} isLoading={true} />);

      const forgotBtn = screen.getByText(/Forgot password\?/i);
      const signupBtn = screen.getByText(/Don't have an account\? Sign up/i);

      expect(forgotBtn).toBeDisabled();
      expect(signupBtn).toBeDisabled();
    });
  });

  describe("error handling", () => {
    it("should display error message when signinPhoneError is set", () => {
      const props = {
        ...defaultProps,
        state: { ...mockState, signinPhoneError: "Invalid credentials" },
      };
      render(<SignInPhoneForm {...props} />);

      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    it("should not display error when signinPhoneError is null", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("should navigate to forgot password when clicked", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText(/Forgot password\?/i));

      expect(mockActions.setMainStep).toHaveBeenCalledWith("forgot-password");
    });

    it("should navigate to signup when clicked", () => {
      render(<SignInPhoneForm {...defaultProps} />);

      fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));

      expect(mockActions.setMainStep).toHaveBeenCalledWith("signup");
    });
  });

  describe("form submission", () => {
    it("should call setIsLoading on submit", async () => {
      const props = {
        ...defaultProps,
        phoneInput: { ...mockPhoneInput, displayValue: "9876543210", fullValue: "+919876543210" },
        state: { ...mockState, signinPhonePassword: "password123" },
      };
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
        error: null,
      });

      render(<SignInPhoneForm {...props} />);

      const form = screen.getByRole("button", { name: /Sign In/i }).closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockActions.setIsLoading).toHaveBeenCalledWith(true);
      });
    });

    it("should show success toast and redirect on successful login", async () => {
      const mockOnSuccess = jest.fn();
      const props = {
        ...defaultProps,
        phoneInput: { ...mockPhoneInput, displayValue: "9876543210", fullValue: "+919876543210" },
        state: { ...mockState, signinPhonePassword: "password123" },
        onSuccess: mockOnSuccess,
      };
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
        error: null,
      });

      render(<SignInPhoneForm {...props} />);

      const form = screen.getByRole("button", { name: /Sign In/i }).closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Login successful!");
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      });
    });

    it("should show error toast on authentication failure", async () => {
      const props = {
        ...defaultProps,
        phoneInput: { ...mockPhoneInput, displayValue: "9876543210", fullValue: "+919876543210" },
        state: { ...mockState, signinPhonePassword: "wrongpassword" },
      };
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      });

      render(<SignInPhoneForm {...props} />);

      const form = screen.getByRole("button", { name: /Sign In/i }).closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Login failed: Invalid login credentials"
        );
      });
    });
  });
});
