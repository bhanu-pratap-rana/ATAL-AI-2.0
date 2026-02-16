/**
 * Tests for SignInStep Component
 * Tests sign-in functionality for email, phone, and username methods
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/image to avoid Image component issues in tests
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage(props: { src: string; alt: string; width?: number; height?: number; className?: string; priority?: boolean }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={props.src} alt={props.alt} width={props.width} height={props.height} className={props.className} />;
  },
}));

// Mock dependencies before component import
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockFrom = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
    from: mockFrom,
  }),
}));

const mockSignInWithUsername = jest.fn();
jest.mock("@/app/actions/auth", () => ({
  signInWithUsername: mockSignInWithUsername,
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

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock validation utils
jest.mock("@/lib/validation-utils", () => ({
  validateEmail: (email: string) => {
    if (!email || !email.includes("@")) {
      return { valid: false, error: "Invalid email" };
    }
    return { valid: true };
  },
  validatePhone: (phone: string) => {
    if (!phone || phone.length < 10) {
      return { valid: false, error: "Invalid phone" };
    }
    return { valid: true };
  },
}));

// Mock usePhoneInput hook
jest.mock("@/hooks/usePhoneInput", () => ({
  usePhoneInput: (initialValue: string) => ({
    displayValue: initialValue,
    fullValue: initialValue ? `+1${initialValue}` : "",
    onChange: jest.fn(),
  }),
}));

import { SignInStep } from "@/components/auth/student/SignInStep";
import { toast } from "sonner";

describe("SignInStep Component", () => {
  const mockActions = {
    setIsLoading: jest.fn(),
    setSigninTab: jest.fn(),
    setSigninEmailAddress: jest.fn(),
    setSigninEmailPassword: jest.fn(),
    setSigninEmailError: jest.fn(),
    setSigninPhoneNumber: jest.fn(),
    setSigninPhonePassword: jest.fn(),
    setSigninPhoneError: jest.fn(),
    setSigninUsername: jest.fn(),
    setSigninUsernamePassword: jest.fn(),
    setSigninUsernameError: jest.fn(),
    setMainStep: jest.fn(),
  };

  const defaultState = {
    signinTab: "email" as const,
    signinEmailAddress: "",
    signinEmailPassword: "",
    signinEmailError: null,
    signinPhoneNumber: "",
    signinPhonePassword: "",
    signinPhoneError: null,
    signinUsername: "",
    signinUsernamePassword: "",
    signinUsernameError: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render sign in card with heading", () => {
      render(
        <SignInStep state={defaultState} actions={mockActions} isLoading={false} />
      );

      // Use getByRole to find the heading specifically
      expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    });

    it("should render all three tab buttons", () => {
      render(
        <SignInStep state={defaultState} actions={mockActions} isLoading={false} />
      );

      // Match partial text for tab buttons
      const buttons = screen.getAllByRole("button");
      const tabTexts = buttons.map(b => b.textContent);
      expect(tabTexts.some(t => t?.includes("Email"))).toBe(true);
      expect(tabTexts.some(t => t?.includes("Phone"))).toBe(true);
      expect(tabTexts.some(t => t?.includes("Username"))).toBe(true);
    });

    it("should render email form when email tab is active", () => {
      render(
        <SignInStep
          state={{ ...defaultState, signinTab: "email" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("should render phone form when phone tab is active", () => {
      render(
        <SignInStep
          state={{ ...defaultState, signinTab: "phone" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
    });

    it("should render username form when username tab is active", () => {
      render(
        <SignInStep
          state={{ ...defaultState, signinTab: "username" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });

    it("should disable inputs when loading", () => {
      render(
        <SignInStep state={defaultState} actions={mockActions} isLoading={true} />
      );

      expect(screen.getByLabelText("Email Address")).toBeDisabled();
      expect(screen.getByLabelText("Password")).toBeDisabled();
    });

    it("should show loading text on submit button", () => {
      render(
        <SignInStep state={defaultState} actions={mockActions} isLoading={true} />
      );

      expect(screen.getByText("Signing in...")).toBeInTheDocument();
    });
  });

  describe("Tab Switching", () => {
    it("should call setSigninTab when clicking phone tab", async () => {
      render(
        <SignInStep state={defaultState} actions={mockActions} isLoading={false} />
      );

      const phoneTab = screen.getByText(/Phone/);
      await userEvent.click(phoneTab);

      expect(mockActions.setSigninTab).toHaveBeenCalledWith("phone");
    });

    it("should call setSigninTab when clicking username tab", async () => {
      render(
        <SignInStep state={defaultState} actions={mockActions} isLoading={false} />
      );

      const usernameTab = screen.getByText(/Username/);
      await userEvent.click(usernameTab);

      expect(mockActions.setSigninTab).toHaveBeenCalledWith("username");
    });
  });

  describe("Email Sign In", () => {
    it("should show error for invalid email", async () => {
      const { container } = render(
        <SignInStep
          state={{ ...defaultState, signinEmailAddress: "invalid" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockActions.setSigninEmailError).toHaveBeenCalledWith("Invalid email");
      });
    });

    it("should call signInWithPassword for valid email", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: {} } },
        error: null,
      });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const { container } = render(
        <SignInStep
          state={{
            ...defaultState,
            signinEmailAddress: "test@example.com",
            signinEmailPassword: "password123",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("should show error when authentication fails", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid credentials" },
      });

      const { container } = render(
        <SignInStep
          state={{
            ...defaultState,
            signinEmailAddress: "test@example.com",
            signinEmailPassword: "wrongpassword",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockActions.setSigninEmailError).toHaveBeenCalledWith("Invalid credentials");
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("should redirect teacher to teacher login", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: { role: "teacher" } } },
        error: null,
      });

      const { container } = render(
        <SignInStep
          state={{
            ...defaultState,
            signinEmailAddress: "teacher@example.com",
            signinEmailPassword: "password",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockActions.setSigninEmailError).toHaveBeenCalledWith(
          expect.stringContaining("teacher")
        );
      });
    });

    it("should navigate to dashboard on successful login", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123", app_metadata: {} } },
        error: null,
      });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const { container } = render(
        <SignInStep
          state={{
            ...defaultState,
            signinEmailAddress: "student@example.com",
            signinEmailPassword: "password",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
        expect(toast.success).toHaveBeenCalledWith("Login successful!");
      });
    });
  });

  describe("Username Sign In", () => {
    it("should show error for empty username", async () => {
      const { container } = render(
        <SignInStep
          state={{ ...defaultState, signinTab: "username", signinUsername: "" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockActions.setSigninUsernameError).toHaveBeenCalledWith(
          "Username is required"
        );
      });
    });

    it("should show error for empty password", async () => {
      const { container } = render(
        <SignInStep
          state={{
            ...defaultState,
            signinTab: "username",
            signinUsername: "testuser",
            signinUsernamePassword: "",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockActions.setSigninUsernameError).toHaveBeenCalledWith(
          "Password is required"
        );
      });
    });

    it("should call signInWithUsername for valid input", async () => {
      mockSignInWithUsername.mockResolvedValue({ success: true });

      const { container } = render(
        <SignInStep
          state={{
            ...defaultState,
            signinTab: "username",
            signinUsername: "testuser",
            signinUsernamePassword: "password",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockSignInWithUsername).toHaveBeenCalledWith("testuser", "password");
      });
    });

    it("should navigate to dashboard on successful username login", async () => {
      mockSignInWithUsername.mockResolvedValue({ success: true });

      const { container } = render(
        <SignInStep
          state={{
            ...defaultState,
            signinTab: "username",
            signinUsername: "testuser",
            signinUsernamePassword: "password",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      });
    });

    it("should show error when username login fails", async () => {
      mockSignInWithUsername.mockResolvedValue({
        success: false,
        error: "Invalid username or password",
      });

      const { container } = render(
        <SignInStep
          state={{
            ...defaultState,
            signinTab: "username",
            signinUsername: "testuser",
            signinUsernamePassword: "wrong",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      const form = container.querySelector("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockActions.setSigninUsernameError).toHaveBeenCalledWith(
          "Invalid username or password"
        );
      });
    });
  });

  describe("Error Display", () => {
    it("should display email error message", () => {
      render(
        <SignInStep
          state={{ ...defaultState, signinEmailError: "Email not found" }}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByText("Email not found")).toBeInTheDocument();
    });

    it("should display username error message", () => {
      render(
        <SignInStep
          state={{
            ...defaultState,
            signinTab: "username",
            signinUsernameError: "Invalid credentials",
          }}
          actions={mockActions}
          isLoading={false}
        />
      );

      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to signup when clicking create account link", async () => {
      render(
        <SignInStep state={defaultState} actions={mockActions} isLoading={false} />
      );

      const createAccountLink = screen.getByText("Create one");
      await userEvent.click(createAccountLink);

      expect(mockActions.setMainStep).toHaveBeenCalledWith("signup");
    });
  });
});
