/**
 * Tests for PINGenerator.tsx
 * Target: ~15 tests covering PIN generation UI and behavior
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { PINGenerator } from "@/components/admin/pins/PINGenerator";
import type { SchoolPINInfo } from "@/app/actions/admin-pin-management";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Eye: () => <span data-testid="icon-eye" aria-hidden="true" />,
  EyeOff: () => <span data-testid="icon-eye-off" aria-hidden="true" />,
  Wand2: () => <span data-testid="icon-wand" aria-hidden="true" />,
  Copy: () => <span data-testid="icon-copy" aria-hidden="true" />,
  Check: () => <span data-testid="icon-check" aria-hidden="true" />,
}));

describe("PINGenerator", () => {
  const mockSchool: SchoolPINInfo = {
    schoolId: "school-123",
    schoolName: "Test School",
    schoolCode: "TST001",
    district: "Test District",
    block: "Test Block",
    hasPIN: true,
    pinCreatedAt: new Date().toISOString(),
    pinLastRotated: new Date().toISOString(),
  };

  const defaultProps = {
    selectedSchool: mockSchool,
    newPin: null,
    showNewPin: false,
    onShowNewPinChange: jest.fn(),
    onGeneratePin: jest.fn(),
    onRotatePin: jest.fn().mockResolvedValue(undefined),
    onCopyPin: jest.fn().mockResolvedValue(undefined),
    rotatingId: null,
    copied: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should return null when no school is selected", () => {
      const { container } = render(
        <PINGenerator {...defaultProps} selectedSchool={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render school code display", () => {
      render(<PINGenerator {...defaultProps} />);

      expect(screen.getByText("School Code")).toBeInTheDocument();
      expect(screen.getByDisplayValue("TST001")).toBeInTheDocument();
    });

    it("should render generate button when no PIN exists", () => {
      render(<PINGenerator {...defaultProps} newPin={null} />);

      expect(screen.getByText("Generate New PIN")).toBeInTheDocument();
    });

    it("should render security notice", () => {
      render(<PINGenerator {...defaultProps} />);

      expect(screen.getByText(/Security:/)).toBeInTheDocument();
      expect(screen.getByText(/Staff PINs are encrypted/)).toBeInTheDocument();
    });
  });

  describe("PIN display", () => {
    it("should show PIN when newPin is provided", () => {
      render(<PINGenerator {...defaultProps} newPin="123456" />);

      expect(screen.getByText("Generated PIN")).toBeInTheDocument();
    });

    it("should hide PIN by default (password type)", () => {
      render(
        <PINGenerator {...defaultProps} newPin="123456" showNewPin={false} />
      );

      const input = screen.getAllByDisplayValue("123456")[0];
      expect(input).toHaveAttribute("type", "password");
    });

    it("should show PIN when showNewPin is true", () => {
      render(
        <PINGenerator {...defaultProps} newPin="123456" showNewPin={true} />
      );

      const input = screen.getAllByDisplayValue("123456")[0];
      expect(input).toHaveAttribute("type", "text");
    });

    it("should show eye-off icon when PIN is visible", () => {
      render(
        <PINGenerator {...defaultProps} newPin="123456" showNewPin={true} />
      );

      expect(screen.getByTestId("icon-eye-off")).toBeInTheDocument();
    });

    it("should show eye icon when PIN is hidden", () => {
      render(
        <PINGenerator {...defaultProps} newPin="123456" showNewPin={false} />
      );

      expect(screen.getByTestId("icon-eye")).toBeInTheDocument();
    });
  });

  describe("button interactions", () => {
    it("should call onGeneratePin when generate button clicked", () => {
      render(<PINGenerator {...defaultProps} />);

      fireEvent.click(screen.getByText("Generate New PIN"));

      expect(defaultProps.onGeneratePin).toHaveBeenCalledTimes(1);
    });

    it("should call onShowNewPinChange when visibility toggle clicked", () => {
      render(
        <PINGenerator {...defaultProps} newPin="123456" showNewPin={false} />
      );

      // Find the button with the eye icon
      const visibilityButton = screen.getByTestId("icon-eye").closest("button");
      fireEvent.click(visibilityButton!);

      expect(defaultProps.onShowNewPinChange).toHaveBeenCalledWith(true);
    });

    it("should call onCopyPin when copy button clicked", () => {
      render(<PINGenerator {...defaultProps} newPin="123456" />);

      fireEvent.click(screen.getByText("Copy"));

      expect(defaultProps.onCopyPin).toHaveBeenCalledTimes(1);
    });

    it("should call onRotatePin when rotate button clicked", () => {
      render(<PINGenerator {...defaultProps} newPin="123456" />);

      fireEvent.click(screen.getByText("Rotate PIN"));

      expect(defaultProps.onRotatePin).toHaveBeenCalledTimes(1);
    });
  });

  describe("rotating state", () => {
    it("should show rotating state when rotatingId matches school", () => {
      render(
        <PINGenerator
          {...defaultProps}
          newPin="123456"
          rotatingId="school-123"
        />
      );

      expect(screen.getByText("Rotating...")).toBeInTheDocument();
    });

    it("should disable rotate button while rotating", () => {
      render(
        <PINGenerator
          {...defaultProps}
          newPin="123456"
          rotatingId="school-123"
        />
      );

      const rotateButton = screen.getByText("Rotating...").closest("button");
      expect(rotateButton).toBeDisabled();
    });
  });

  describe("copied state", () => {
    it("should show check icon when copied is true", () => {
      render(
        <PINGenerator {...defaultProps} newPin="123456" copied={true} />
      );

      expect(screen.getByTestId("icon-check")).toBeInTheDocument();
    });

    it("should show copy icon when copied is false", () => {
      render(
        <PINGenerator {...defaultProps} newPin="123456" copied={false} />
      );

      expect(screen.getByTestId("icon-copy")).toBeInTheDocument();
    });
  });
});
