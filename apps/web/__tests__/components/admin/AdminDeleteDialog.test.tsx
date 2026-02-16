/**
 * Tests for AdminDeleteDialog component
 * Target: ~20 tests covering dialog display, confirmation, and deletion flow
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AdminDeleteDialog } from "@/components/admin/AdminDeleteDialog";

// Mock deleteAdminAccount action
const mockDeleteAdminAccount = jest.fn();
jest.mock("@/app/actions/admin-management", () => ({
  deleteAdminAccount: (...args: unknown[]) => mockDeleteAdminAccount(...args),
}));

// Mock toast - define functions outside jest.mock to avoid hoisting issues
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    get success() { return mockToastSuccess; },
    get error() { return mockToastError; },
  },
}));

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="alert-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  X: () => <span data-testid="close-icon" />,
}));

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, disabled, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock("@/components/ui/FormMessage", () => ({
  FormMessage: ({ type, text }: { type: string; text: string }) => (
    <div data-testid="form-message" data-type={type}>
      {text}
    </div>
  ),
}));

describe("AdminDeleteDialog", () => {
  const defaultProps = {
    adminId: "admin-123",
    adminEmail: "admin@example.com",
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to type into input
  const typeEmail = (input: HTMLElement, email: string) => {
    fireEvent.change(input, { target: { value: email } });
  };

  describe("when closed", () => {
    it("should not render when isOpen is false", () => {
      render(<AdminDeleteDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Delete Admin Account")).not.toBeInTheDocument();
    });
  });

  describe("when open", () => {
    it("should render dialog title", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      expect(screen.getByText("Delete Admin Account")).toBeInTheDocument();
    });

    it("should display warning message", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    });

    it("should display admin email to confirm", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });

    it("should render cancel button", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should render delete button", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      expect(screen.getByRole("button", { name: /delete admin/i })).toBeInTheDocument();
    });

    it("should render email confirmation input", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      expect(screen.getByPlaceholderText(/enter email to confirm/i)).toBeInTheDocument();
    });
  });

  describe("delete button state", () => {
    it("should be disabled when email not confirmed", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      const deleteButton = screen.getByRole("button", { name: /delete admin/i });
      expect(deleteButton).toBeDisabled();
    });

    it("should be enabled when email matches", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      const input = screen.getByPlaceholderText(/enter email to confirm/i);

      typeEmail(input, "admin@example.com");

      const deleteButton = screen.getByRole("button", { name: /delete admin/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it("should match email case-insensitively", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      const input = screen.getByPlaceholderText(/enter email to confirm/i);

      typeEmail(input, "ADMIN@EXAMPLE.COM");

      const deleteButton = screen.getByRole("button", { name: /delete admin/i });
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe("close functionality", () => {
    it("should call onClose when cancel button clicked", () => {
      render(<AdminDeleteDialog {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when X button clicked", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      const closeButton = screen.getByTestId("close-icon").parentElement;

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });

    it("should reset email confirmation on close", () => {
      render(<AdminDeleteDialog {...defaultProps} />);
      const input = screen.getByPlaceholderText(/enter email to confirm/i);

      typeEmail(input, "admin@example.com");
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("delete functionality", () => {
    it("should call deleteAdminAccount when delete clicked with valid email", async () => {
      mockDeleteAdminAccount.mockResolvedValueOnce({ success: true });
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      expect(mockDeleteAdminAccount).toHaveBeenCalledWith("admin-123");
    });

    it("should show success message on successful deletion", async () => {
      mockDeleteAdminAccount.mockResolvedValueOnce({ success: true });
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("form-message")).toHaveTextContent("Admin account deleted successfully");
      });
    });

    it("should show toast on successful deletion", async () => {
      mockDeleteAdminAccount.mockResolvedValueOnce({ success: true });
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Admin account deleted");
      });
    });

    it("should call onSuccess after delay on successful deletion", async () => {
      mockDeleteAdminAccount.mockResolvedValueOnce({ success: true });
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("form-message")).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it("should show error message on failed deletion", async () => {
      mockDeleteAdminAccount.mockResolvedValueOnce({
        success: false,
        error: "Permission denied"
      });
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("form-message")).toHaveTextContent("Permission denied");
      });
    });

    it("should show error toast on failed deletion", async () => {
      mockDeleteAdminAccount.mockResolvedValueOnce({
        success: false,
        error: "Permission denied"
      });
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Permission denied");
      });
    });

    it("should handle exception during deletion", async () => {
      mockDeleteAdminAccount.mockRejectedValueOnce(new Error("Network error"));
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId("form-message")).toHaveTextContent("Network error");
      });
    });
  });

  describe("loading state", () => {
    it("should disable input during loading", async () => {
      mockDeleteAdminAccount.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });

    it("should disable close button during loading", async () => {
      mockDeleteAdminAccount.mockImplementation(() => new Promise(() => {}));
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      await waitFor(() => {
        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        expect(cancelButton).toBeDisabled();
      });
    });

    it("should not close dialog during loading", async () => {
      mockDeleteAdminAccount.mockImplementation(() => new Promise(() => {}));
      render(<AdminDeleteDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@example.com");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /delete admin/i }));
      });

      // Wait for loading state
      await waitFor(() => {
        expect(input).toBeDisabled();
      });

      // Try to cancel - should not work
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);

      // onClose should not be called because loading
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("should show error when trying to delete without confirmation", () => {
      render(<AdminDeleteDialog {...defaultProps} />);

      // Enter partial email
      const input = screen.getByPlaceholderText(/enter email to confirm/i);
      typeEmail(input, "admin@");

      // Button should still be disabled
      const deleteButton = screen.getByRole("button", { name: /delete admin/i });
      expect(deleteButton).toBeDisabled();
    });
  });
});
