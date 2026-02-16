/**
 * Tests for SchoolDetailCard component
 * Target: ~18 tests covering school info and PIN status display
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchoolDetailCard } from "@/components/admin/pins/SchoolDetailCard";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Copy: ({ className }: { size?: number; className?: string }) => (
    <span data-testid="copy-icon" className={className}>
      Copy
    </span>
  ),
  Check: ({ className }: { size?: number; className?: string }) => (
    <span data-testid="check-icon" className={className}>
      Check
    </span>
  ),
}));

describe("SchoolDetailCard", () => {
  const schoolWithPIN = {
    schoolId: "school-123",
    schoolCode: "SCH001",
    schoolName: "Delhi Public School",
    districtName: "Central Delhi",
    currentPin: "1234",
    createdAt: "2024-01-15T10:00:00Z",
    lastRotatedAt: "2024-06-15T10:00:00Z",
  };

  const schoolWithoutPIN = {
    schoolId: "school-456",
    schoolCode: "SCH002",
    schoolName: "Modern School",
    districtName: "South Delhi",
    currentPin: null,
    createdAt: null,
    lastRotatedAt: null,
  };

  const schoolWithoutDistrict = {
    schoolId: "school-789",
    schoolCode: "SCH003",
    schoolName: "Rural School",
    districtName: null,
    currentPin: "5678",
    createdAt: "2024-02-01T10:00:00Z",
    lastRotatedAt: null,
  };

  const defaultProps = {
    school: schoolWithPIN,
    onCopyCode: jest.fn(),
    copied: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render school name", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      expect(screen.getByText("Delhi Public School")).toBeInTheDocument();
    });

    it("should render school code", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      expect(screen.getByText("SCH001")).toBeInTheDocument();
    });

    it("should render school code label", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      expect(screen.getByText("School Code:")).toBeInTheDocument();
    });

    it("should render district name when available", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      expect(screen.getByText(/Central Delhi/)).toBeInTheDocument();
    });

    it("should not render district when not available", () => {
      render(
        <SchoolDetailCard {...defaultProps} school={schoolWithoutDistrict} />
      );

      expect(screen.queryByText(/District:/)).not.toBeInTheDocument();
    });
  });

  describe("PIN status with configured PIN", () => {
    it("should show PIN configured status", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      expect(screen.getByText("✓ PIN Configured")).toBeInTheDocument();
    });

    it("should show created date", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      // Date should be formatted
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
    });

    it("should show last rotated date when available", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      expect(screen.getByText(/Last rotated:/)).toBeInTheDocument();
    });

    it("should not show last rotated when not available", () => {
      render(
        <SchoolDetailCard {...defaultProps} school={schoolWithoutDistrict} />
      );

      expect(screen.queryByText(/Last rotated:/)).not.toBeInTheDocument();
    });
  });

  describe("PIN status without configured PIN", () => {
    it("should show no PIN warning", () => {
      render(<SchoolDetailCard {...defaultProps} school={schoolWithoutPIN} />);

      expect(screen.getByText("⚠ No PIN configured")).toBeInTheDocument();
    });

    it("should not show PIN configured message", () => {
      render(<SchoolDetailCard {...defaultProps} school={schoolWithoutPIN} />);

      expect(screen.queryByText("✓ PIN Configured")).not.toBeInTheDocument();
    });

    it("should not show created date", () => {
      render(<SchoolDetailCard {...defaultProps} school={schoolWithoutPIN} />);

      expect(screen.queryByText(/Created:/)).not.toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("should render copy button", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should show copy icon when not copied", () => {
      render(<SchoolDetailCard {...defaultProps} copied={false} />);

      expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
    });

    it("should show check icon when copied", () => {
      render(<SchoolDetailCard {...defaultProps} copied={true} />);

      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
      expect(screen.queryByTestId("copy-icon")).not.toBeInTheDocument();
    });

    it("should call onCopyCode when button clicked", () => {
      const onCopyCode = jest.fn();
      render(<SchoolDetailCard {...defaultProps} onCopyCode={onCopyCode} />);

      fireEvent.click(screen.getByRole("button"));

      expect(onCopyCode).toHaveBeenCalled();
    });

    it("should have check icon with success color", () => {
      render(<SchoolDetailCard {...defaultProps} copied={true} />);

      expect(screen.getByTestId("check-icon")).toHaveClass("text-success");
    });
  });

  describe("styling", () => {
    it("should have success background styling", () => {
      const { container } = render(<SchoolDetailCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass("bg-success-light");
    });

    it("should have success border", () => {
      const { container } = render(<SchoolDetailCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveClass("border-success");
    });

    it("should have school name with success color", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      const schoolName = screen.getByText("Delhi Public School");
      expect(schoolName).toHaveClass("text-success");
    });
  });

  describe("date formatting", () => {
    it("should format created date correctly", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      // The exact format depends on locale, but the date should be present
      const createdText = screen.getByText(/Created:/);
      expect(createdText.textContent).toContain("2024");
    });

    it("should format last rotated date correctly", () => {
      render(<SchoolDetailCard {...defaultProps} />);

      const rotatedText = screen.getByText(/Last rotated:/);
      expect(rotatedText.textContent).toContain("2024");
    });
  });
});
