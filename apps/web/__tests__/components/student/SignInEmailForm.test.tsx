/**
 * Tests for SignInEmailForm component
 * Target: ~15 tests covering sign in form behavior
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignInEmailForm } from "@/components/student/SignInEmailForm";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase client
const mockSignInWithPassword = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

// Mock toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    get success() {
      return mockToastSuccess;
    },
    get error() {
      return mockToastError;
    },
  },
}));

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock validation-utils
jest.mock("@/lib/validation-utils", () => ({
  validateEmail: (email: string) => ({
    valid: email.includes("@") && email.includes("."),
    error: !email.includes("@") ? "Invalid email address" : null,
  }),
}));

// Mock UI components
jest.mock("@/components/ui/input", () => ({
  Input: ({
    id,
    type,
    placeholder,
    value,
    onChange,
    required,
    disabled,
  }: {
    id?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    required?: boolean;
    disabled?: boolean;
  }) => (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
    />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
  }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    type,
    className,
    disabled,
    loading,
  }: {
    children: React.ReactNode;
    type?: "submit" | "button";
    className?: string;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <button type={type} className={className} disabled={disabled}>
      {loading ? "Loading..." : children}
    </button>
  ),
}));

describe("SignInEmailForm", () => {
  const mockState = {
    signinEmailAddress: "",
    signinEmailPassword: "",
    signinEmailError: null as string | null,
  };

  const mockActions = {
    setSigninEmailAddress: jest.fn(),
    setSigninEmailPassword: jest.fn(),
    setSigninEmailError: jest.fn(),
    setIsLoading: jest.fn(),
    setMainStep: jest.fn(),
  };

  const defaultProps = {
    state: mockState as any,
    actions: mockActions as any,
    isLoading: false,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "user123" } },
      error: null,
    });
  });

  describe("rendering", () => {
    it("should render email label", () => {
      render(<SignInEmailForm {...defaultProps} />);
      expect(screen.getByText("Email Address")).toBeInTheDocument();
    });

    it("should render email input", () => {
      render(<SignInEmailForm {...defaultProps} />);
      expect(screen.getByPlaceholderText("your.email@example.com")).toBeInTheDocument();
    });

    it("should render password label", () => {
      render(<SignInEmailForm {...defaultProps} />);
      expect(screen.getByText("Password")).toBeInTheDocument();
    });

    it("should render password input", () => {
      render(<SignInEmailForm {...defaultProps} />);
      expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    });

    it("should render sign in button", () => {
      render(<SignInEmailForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    });

    it("should render forgot password link", () => {
      render(<SignInEmailForm {...defaultProps} />);
      expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    });

    it("should render sign up link", () => {
      render(<SignInEmailForm {...defaultProps} />);
      expect(screen.getByText(/Don't have an account\? Sign up/i)).toBeInTheDocument();
    });
  });

  describe("input interactions", () => {
    it("should call setSigninEmailAddress on email input", () => {
      render(<SignInEmailForm {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
        target: { value: "test@example.com" },
      });

      expect(mockActions.setSigninEmailAddress).toHaveBeenCalledWith("test@example.com");
    });

    it("should call setSigninEmailPassword on password input", () => {
      render(<SignInEmailForm {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "mypassword" },
      });

      expect(mockActions.setSigninEmailPassword).toHaveBeenCalledWith("mypassword");
    });
  });

  describe("button state", () => {
    it("should disable button when loading", () => {
      render(<SignInEmailForm {...defaultProps} isLoading={true} />);
      // When loading, button shows "Loading..." text
      const submitButton = screen.getByRole("button", { name: /Loading/i });
      expect(submitButton).toBeDisabled();
    });

    it("should disable button when email is empty", () => {
      const state = {
        ...mockState,
        signinEmailAddress: "",
        signinEmailPassword: "password",
      };
      render(<SignInEmailForm {...defaultProps} state={state as any} />);
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeDisabled();
    });

    it("should disable button when password is empty", () => {
      const state = {
        ...mockState,
        signinEmailAddress: "test@example.com",
        signinEmailPassword: "",
      };
      render(<SignInEmailForm {...defaultProps} state={state as any} />);
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeDisabled();
    });

    it("should enable button with valid inputs", () => {
      const state = {
        ...mockState,
        signinEmailAddress: "test@example.com",
        signinEmailPassword: "password123",
      };
      render(<SignInEmailForm {...defaultProps} state={state as any} />);
      expect(screen.getByRole("button", { name: /Sign In/i })).not.toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("should validate email on submit", async () => {
      const state = {
        ...mockState,
        signinEmailAddress: "invalidemail",
        signinEmailPassword: "password",
      };

      render(<SignInEmailForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button", { name: /Sign In/i }).closest("form")!);

      await waitFor(() => {
        expect(mockActions.setSigninEmailError).toHaveBeenCalledWith("Invalid email address");
      });
    });

    it("should call signInWithPassword with correct credentials", async () => {
      const state = {
        ...mockState,
        signinEmailAddress: "test@example.com",
        signinEmailPassword: "password123",
      };

      render(<SignInEmailForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button", { name: /Sign In/i }).closest("form")!);

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("should show success toast on successful login", async () => {
      const state = {
        ...mockState,
        signinEmailAddress: "test@example.com",
        signinEmailPassword: "password123",
      };

      render(<SignInEmailForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button", { name: /Sign In/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Login successful!");
      });
    });

    it("should navigate to dashboard on success", async () => {
      const state = {
        ...mockState,
        signinEmailAddress: "test@example.com",
        signinEmailPassword: "password123",
      };

      render(<SignInEmailForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button", { name: /Sign In/i }).closest("form")!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      });
    });
  });

  describe("navigation links", () => {
    it("should call setMainStep with forgot-password when clicked", () => {
      render(<SignInEmailForm {...defaultProps} />);

      fireEvent.click(screen.getByText("Forgot password?"));

      expect(mockActions.setMainStep).toHaveBeenCalledWith("forgot-password");
    });

    it("should call setMainStep with signup when sign up clicked", () => {
      render(<SignInEmailForm {...defaultProps} />);

      fireEvent.click(screen.getByText(/Don't have an account\? Sign up/i));

      expect(mockActions.setMainStep).toHaveBeenCalledWith("signup");
    });
  });

  describe("error handling", () => {
    it("should display error message when set", () => {
      const state = {
        ...mockState,
        signinEmailError: "Invalid credentials",
      };
      render(<SignInEmailForm {...defaultProps} state={state as any} />);

      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    it("should show error toast on auth failure", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid email or password" },
      });

      const state = {
        ...mockState,
        signinEmailAddress: "test@example.com",
        signinEmailPassword: "wrongpassword",
      };

      render(<SignInEmailForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button", { name: /Sign In/i }).closest("form")!);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Login failed: Invalid email or password");
      });
    });
  });
});
