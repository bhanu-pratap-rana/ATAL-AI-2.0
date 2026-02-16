/**
 * Tests for SignOutButton component
 * Target: ~12 tests covering sign out functionality
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignOutButton } from "@/components/teacher/SignOutButton";

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase client
const mockSignOut = jest.fn();
jest.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

// Mock toast - define functions separately to avoid hoisting issues
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    get success() { return mockToastSuccess; },
    get error() { return mockToastError; },
  },
}));

// Mock auth logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
  },
}));

// Mock lucide-react LogOut icon
jest.mock("lucide-react", () => ({
  LogOut: () => <span data-testid="logout-icon" />,
}));

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

describe("SignOutButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the sign out button", () => {
      render(<SignOutButton />);
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });

    it("should render logout icon", () => {
      render(<SignOutButton />);
      expect(screen.getByTestId("logout-icon")).toBeInTheDocument();
    });

    it("should use outline variant", () => {
      render(<SignOutButton />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "outline");
    });

    it("should use sm size", () => {
      render(<SignOutButton />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-size", "sm");
    });
  });

  describe("sign out success", () => {
    it("should call supabase signOut on click", async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });
      render(<SignOutButton />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it("should show success toast on successful sign out", async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });
      render(<SignOutButton />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith("Signed out successfully!");
      });
    });

    it("should redirect to home page after sign out", async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });
      render(<SignOutButton />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("sign out error from Supabase", () => {
    it("should show error toast when sign out fails", async () => {
      mockSignOut.mockResolvedValueOnce({
        error: { message: "Session expired" },
      });
      render(<SignOutButton />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Failed to sign out: Session expired"
        );
      });
    });

    it("should not redirect when sign out fails", async () => {
      mockSignOut.mockResolvedValueOnce({
        error: { message: "Error" },
      });
      render(<SignOutButton />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("sign out exception", () => {
    it("should show generic error toast on exception", async () => {
      mockSignOut.mockRejectedValueOnce(new Error("Network error"));
      render(<SignOutButton />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "An error occurred while signing out"
        );
      });
    });

    it("should not redirect on exception", async () => {
      mockSignOut.mockRejectedValueOnce(new Error("Network error"));
      render(<SignOutButton />);

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
