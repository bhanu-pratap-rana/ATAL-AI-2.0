/**
 * Tests for DeleteAccountButton component
 * Target: ~13 tests covering rendering and confirmation logic
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock sonner toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

// Mock supabase client
const mockSignOut = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

// Mock auth logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
  },
}));

// Mock Dialog components
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-testid="dialog-trigger">{children}</div>,
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="dialog-footer">{children}</div>,
}));

// Helper function to find delete submit button in dialog footer
const getDeleteSubmitButton = () => {
  const dialogFooter = screen.getByTestId("dialog-footer");
  const buttons = within(dialogFooter).getAllByRole("button");
  // Find the destructive/error button (not the cancel button)
  return buttons.find((btn) =>
    btn.textContent?.includes("Delete") || btn.className.includes("bg-error")
  );
};

describe("DeleteAccountButton", () => {
  const defaultProps = {
    userEmail: "test@example.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  describe("rendering", () => {
    it("should render delete account buttons", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      // "Delete Account" appears in both trigger and submit button
      const deleteButtons = screen.getAllByText("Delete Account");
      expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("should render dialog title", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      expect(screen.getByTestId("dialog-title")).toHaveTextContent("Delete Account");
    });

    it("should render warning description", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    });

    it("should render warning list items", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      expect(screen.getByText(/remove all your profile data/i)).toBeInTheDocument();
      expect(screen.getByText(/unenroll you from all classes/i)).toBeInTheDocument();
      expect(screen.getByText(/delete all your assessment history/i)).toBeInTheDocument();
    });

    it("should display user email", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should render confirmation input", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      expect(screen.getByPlaceholderText(/type 'delete' to confirm/i)).toBeInTheDocument();
    });

    it("should render cancel button", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should display instructions text", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      expect(screen.getByText(/type/i)).toBeInTheDocument();
      expect(screen.getByText("delete")).toBeInTheDocument();
    });
  });

  describe("confirmation logic", () => {
    it("should disable delete button when confirmation text is empty", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      const submitButton = getDeleteSubmitButton();
      expect(submitButton).toBeDisabled();
    });

    it("should disable delete button when confirmation text is incorrect", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type 'delete' to confirm/i);
      fireEvent.change(input, { target: { value: "wrong" } });

      const submitButton = getDeleteSubmitButton();
      expect(submitButton).toBeDisabled();
    });

    it("should enable delete button when confirmation text is 'delete'", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type 'delete' to confirm/i);
      fireEvent.change(input, { target: { value: "delete" } });

      const submitButton = getDeleteSubmitButton();
      expect(submitButton).not.toBeDisabled();
    });

    it("should accept 'DELETE' (uppercase) as valid confirmation", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type 'delete' to confirm/i);
      fireEvent.change(input, { target: { value: "DELETE" } });

      const submitButton = getDeleteSubmitButton();
      expect(submitButton).not.toBeDisabled();
    });

    it("should accept 'Delete' (mixed case) as valid confirmation", () => {
      render(<DeleteAccountButton {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type 'delete' to confirm/i);
      fireEvent.change(input, { target: { value: "Delete" } });

      const submitButton = getDeleteSubmitButton();
      expect(submitButton).not.toBeDisabled();
    });
  });
});
