/**
 * Tests for GuestJoinForm component
 * Target: ~18 tests covering guest join form behavior
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuestJoinForm } from "@/components/student/GuestJoinForm";

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock Supabase client
const mockSignInAnonymously = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      signInAnonymously: mockSignInAnonymously,
    },
  }),
}));

// Mock joinClass action
const mockJoinClass = jest.fn();
jest.mock("@/app/actions/student", () => ({
  joinClass: (...args: unknown[]) => mockJoinClass(...args),
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
  validateClassCode: (code: string) => ({
    valid: code.length === 6,
    error: code.length !== 6 ? "Invalid class code" : null,
  }),
  validatePIN: (pin: string) => ({
    valid: pin.length === 4,
    error: pin.length !== 4 ? "Invalid PIN" : null,
  }),
  sanitizeClassCode: (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
  sanitizePIN: (pin: string) => pin.replace(/[^0-9]/g, ""),
}));

// Mock auth-constants
jest.mock("@/lib/auth-constants", () => ({
  PIN_LENGTH: 4,
  CLASS_CODE_LENGTH: 6,
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
    maxLength,
    className,
  }: {
    id?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    required?: boolean;
    disabled?: boolean;
    maxLength?: number;
    className?: string;
  }) => (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      maxLength={maxLength}
      className={className}
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

describe("GuestJoinForm", () => {
  const mockState = {
    guestClassCode: "",
    guestPin: "",
    guestError: null as string | null,
  };

  const mockActions = {
    setGuestClassCode: jest.fn(),
    setGuestPin: jest.fn(),
    setGuestError: jest.fn(),
    setIsLoading: jest.fn(),
    resetGuest: jest.fn(),
  };

  const defaultProps = {
    state: mockState as any,
    actions: mockActions as any,
    isLoading: false,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInAnonymously.mockResolvedValue({ error: null });
    mockJoinClass.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("should render class code label", () => {
      render(<GuestJoinForm {...defaultProps} />);
      expect(screen.getByText("Class Code")).toBeInTheDocument();
    });

    it("should render class code input", () => {
      render(<GuestJoinForm {...defaultProps} />);
      expect(screen.getByPlaceholderText("A3F7E2")).toBeInTheDocument();
    });

    it("should render class PIN label", () => {
      render(<GuestJoinForm {...defaultProps} />);
      expect(screen.getByText("Class PIN")).toBeInTheDocument();
    });

    it("should render PIN input", () => {
      render(<GuestJoinForm {...defaultProps} />);
      expect(screen.getByPlaceholderText("••••")).toBeInTheDocument();
    });

    it("should render join class button", () => {
      render(<GuestJoinForm {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Join Class/i })).toBeInTheDocument();
    });

    it("should render info note about settings", () => {
      render(<GuestJoinForm {...defaultProps} />);
      expect(screen.getByText(/You can add your roll number/i)).toBeInTheDocument();
    });
  });

  describe("input interactions", () => {
    it("should call setGuestClassCode on class code input", () => {
      render(<GuestJoinForm {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText("A3F7E2"), {
        target: { value: "ABC123" },
      });

      expect(mockActions.setGuestClassCode).toHaveBeenCalledWith("ABC123");
    });

    it("should call setGuestPin on PIN input", () => {
      render(<GuestJoinForm {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText("••••"), {
        target: { value: "1234" },
      });

      expect(mockActions.setGuestPin).toHaveBeenCalledWith("1234");
    });
  });

  describe("button state", () => {
    it("should disable button when loading", () => {
      render(<GuestJoinForm {...defaultProps} isLoading={true} />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should disable button when class code is empty", () => {
      render(
        <GuestJoinForm
          {...defaultProps}
          state={{ ...mockState, guestClassCode: "", guestPin: "1234" } as any}
        />
      );
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should disable button when PIN is not 4 digits", () => {
      render(
        <GuestJoinForm
          {...defaultProps}
          state={{ ...mockState, guestClassCode: "ABC123", guestPin: "12" } as any}
        />
      );
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should enable button with valid inputs", () => {
      render(
        <GuestJoinForm
          {...defaultProps}
          state={{ ...mockState, guestClassCode: "ABC123", guestPin: "1234" } as any}
        />
      );
      expect(screen.getByRole("button")).not.toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("should validate inputs on submit", async () => {
      const state = {
        ...mockState,
        guestClassCode: "ABC",
        guestPin: "1234",
      };

      render(<GuestJoinForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(mockActions.setGuestError).toHaveBeenCalledWith("Invalid class code");
      });
    });

    it("should call signInAnonymously on valid submission", async () => {
      const state = {
        ...mockState,
        guestClassCode: "ABC123",
        guestPin: "1234",
      };

      render(<GuestJoinForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(mockSignInAnonymously).toHaveBeenCalled();
      });
    });

    it("should call joinClass after anonymous sign in", async () => {
      const state = {
        ...mockState,
        guestClassCode: "ABC123",
        guestPin: "1234",
      };

      render(<GuestJoinForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(mockJoinClass).toHaveBeenCalledWith({
          classCode: "ABC123",
          pin: "1234",
        });
      });
    });

    it("should show success toast on successful join", async () => {
      const state = {
        ...mockState,
        guestClassCode: "ABC123",
        guestPin: "1234",
      };

      render(<GuestJoinForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          "Successfully joined class! \uD83C\uDF89"
        );
      });
    });

    it("should navigate to classes page on success", async () => {
      const state = {
        ...mockState,
        guestClassCode: "ABC123",
        guestPin: "1234",
      };

      render(<GuestJoinForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/student/classes");
      });
    });
  });

  describe("error handling", () => {
    it("should display error message when set", () => {
      render(
        <GuestJoinForm
          {...defaultProps}
          state={{ ...mockState, guestError: "Test error" } as any}
        />
      );

      expect(screen.getByText("Test error")).toBeInTheDocument();
    });

    it("should show error toast on anonymous sign in failure", async () => {
      mockSignInAnonymously.mockResolvedValue({
        error: { message: "Anonymous sign in failed" },
      });

      const state = {
        ...mockState,
        guestClassCode: "ABC123",
        guestPin: "1234",
      };

      render(<GuestJoinForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Anonymous sign in failed");
      });
    });

    it("should show error toast on join class failure", async () => {
      mockJoinClass.mockResolvedValue({
        success: false,
        error: "Class not found",
      });

      const state = {
        ...mockState,
        guestClassCode: "ABC123",
        guestPin: "1234",
      };

      render(<GuestJoinForm {...defaultProps} state={state as any} />);

      fireEvent.submit(screen.getByRole("button").closest("form")!);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Class not found");
      });
    });
  });
});
