/**
 * Tests for InvitePanel component
 * Target: ~20 tests covering QR code generation, copying, and sharing
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InvitePanel } from "@/components/teacher/InvitePanel";

// Mock QRCode
jest.mock("qrcode", () => ({
  toCanvas: jest.fn((canvas, url, options, callback) => {
    if (callback) callback(null);
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

// Mock loggers
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    error: jest.fn(),
  },
}));

jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
  },
}));

// Mock theme colors
jest.mock("@/lib/constants/theme-colors", () => ({
  QR_CODE_COLORS: {
    dark: "#000000",
    light: "#ffffff",
  },
}));

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    className,
    size,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
    size?: string;
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

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
};

const mockOpen = jest.fn();

describe("InvitePanel", () => {
  const defaultProps = {
    classCode: "ABC123",
    joinPin: "4567",
    className: "Math Class",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });
    globalThis.open = mockOpen;
    // Mock getComputedStyle
    jest.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "#000000",
    } as CSSStyleDeclaration);
  });

  describe("rendering", () => {
    it("should render heading", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(screen.getByText("Student Invitation")).toBeInTheDocument();
    });

    it("should render description text", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(
        screen.getByText(/Share these codes with students to join your class/i)
      ).toBeInTheDocument();
    });

    it("should render QR code label", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(screen.getByText("QR Code")).toBeInTheDocument();
    });

    it("should render canvas for QR code", () => {
      const { container } = render(<InvitePanel {...defaultProps} />);
      expect(container.querySelector("canvas")).toBeInTheDocument();
    });

    it("should render class code label", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(screen.getByText("Class Code")).toBeInTheDocument();
    });

    it("should render join PIN label", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(screen.getByText("Join PIN")).toBeInTheDocument();
    });
  });

  describe("class code display", () => {
    it("should display the class code", () => {
      render(<InvitePanel {...defaultProps} classCode="XYZ789" />);
      expect(screen.getByText("XYZ789")).toBeInTheDocument();
    });

    it("should show 6-character code description", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(
        screen.getByText(/Students will enter this 6-character code/i)
      ).toBeInTheDocument();
    });

    it("should render copy class code button", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /Copy Class Code/i })
      ).toBeInTheDocument();
    });
  });

  describe("join PIN display", () => {
    it("should display the join PIN", () => {
      render(<InvitePanel {...defaultProps} joinPin="9999" />);
      expect(screen.getByText("9999")).toBeInTheDocument();
    });

    it("should show 4-digit PIN description", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(
        screen.getByText(/4-digit PIN for class security/i)
      ).toBeInTheDocument();
    });

    it("should render copy PIN button", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /Copy PIN/i })
      ).toBeInTheDocument();
    });
  });

  describe("invite link section", () => {
    it("should render direct invite link label", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(screen.getByText("Direct Invite Link")).toBeInTheDocument();
    });

    it("should display invite link with correct format", () => {
      render(<InvitePanel {...defaultProps} />);
      // Check for the path and query params (origin may be localhost in jsdom)
      expect(
        screen.getByText(/\/join\?code=ABC123&pin=4567&via=invite/i)
      ).toBeInTheDocument();
    });

    it("should render copy invite link button", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /Copy Invite Link/i })
      ).toBeInTheDocument();
    });

    it("should render share on WhatsApp button", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /Share on WhatsApp/i })
      ).toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("should copy class code to clipboard", async () => {
      render(<InvitePanel {...defaultProps} />);

      fireEvent.click(
        screen.getByRole("button", { name: /Copy Class Code/i })
      );

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith("ABC123");
      });
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Class code copied to clipboard!"
      );
    });

    it("should copy PIN to clipboard", async () => {
      render(<InvitePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Copy PIN/i }));

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith("4567");
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("PIN copied to clipboard!");
    });

    it("should copy invite link to clipboard", async () => {
      render(<InvitePanel {...defaultProps} />);

      fireEvent.click(
        screen.getByRole("button", { name: /Copy Invite Link/i })
      );

      await waitFor(() => {
        // Check the link contains the expected path and params
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining("/join?code=ABC123&pin=4567&via=invite")
        );
      });
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Invite link copied to clipboard!"
      );
    });

    it("should show error toast when copy fails", async () => {
      mockClipboard.writeText.mockRejectedValueOnce(new Error("Copy failed"));

      render(<InvitePanel {...defaultProps} />);

      fireEvent.click(
        screen.getByRole("button", { name: /Copy Class Code/i })
      );

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Failed to copy to clipboard"
        );
      });
    });
  });

  describe("WhatsApp sharing", () => {
    it("should open WhatsApp with share link", () => {
      render(<InvitePanel {...defaultProps} />);

      fireEvent.click(
        screen.getByRole("button", { name: /Share on WhatsApp/i })
      );

      expect(mockOpen).toHaveBeenCalledTimes(1);
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining("https://wa.me/?text="),
        "_blank"
      );
    });

    it("should include class name in WhatsApp message", () => {
      render(<InvitePanel {...defaultProps} className="Science Class" />);

      fireEvent.click(
        screen.getByRole("button", { name: /Share on WhatsApp/i })
      );

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining("Science%20Class"),
        "_blank"
      );
    });
  });

  describe("info banners", () => {
    it("should show best for sharing info", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(screen.getByText(/Best for sharing:/i)).toBeInTheDocument();
    });

    it("should show how it works info", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(screen.getByText(/How it works:/i)).toBeInTheDocument();
    });

    it("should mention guest access", () => {
      render(<InvitePanel {...defaultProps} />);
      expect(
        screen.getByText(/allows anonymous guest access/i)
      ).toBeInTheDocument();
    });
  });
});
