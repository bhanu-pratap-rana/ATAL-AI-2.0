/**
 * Tests for StudentSearchResults component
 * Target: ~15 tests covering rendering, selection, and accessibility
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StudentSearchResults } from "@/components/teacher/StudentSearchResults";

describe("StudentSearchResults", () => {
  const mockStudents = [
    { id: "student-1", email: "alice@example.com" },
    { id: "student-2", email: "bob@example.com" },
    { id: "student-3", email: "charlie@example.com" },
  ];

  const defaultProps = {
    results: mockStudents,
    selectedStudent: null,
    onSelectStudent: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render null when results array is empty", () => {
      const { container } = render(
        <StudentSearchResults {...defaultProps} results={[]} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render label when results exist", () => {
      render(<StudentSearchResults {...defaultProps} />);

      expect(screen.getByText("Select Student")).toBeInTheDocument();
    });

    it("should render all student results", () => {
      render(<StudentSearchResults {...defaultProps} />);

      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      expect(screen.getByText("charlie@example.com")).toBeInTheDocument();
    });

    it("should render student IDs", () => {
      render(<StudentSearchResults {...defaultProps} />);

      expect(screen.getByText("student-1")).toBeInTheDocument();
      expect(screen.getByText("student-2")).toBeInTheDocument();
      expect(screen.getByText("student-3")).toBeInTheDocument();
    });

    it("should render list with proper aria-label", () => {
      render(<StudentSearchResults {...defaultProps} />);

      expect(screen.getByRole("list", { name: "Student search results" })).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("should call onSelectStudent when student button is clicked", () => {
      const mockOnSelect = jest.fn();
      render(
        <StudentSearchResults {...defaultProps} onSelectStudent={mockOnSelect} />
      );

      const aliceButton = screen.getByRole("button", {
        name: /Select student: alice@example.com/i,
      });
      fireEvent.click(aliceButton);

      expect(mockOnSelect).toHaveBeenCalledWith({
        id: "student-1",
        email: "alice@example.com",
      });
    });

    it("should show selected state when student is selected", () => {
      render(
        <StudentSearchResults
          {...defaultProps}
          selectedStudent={mockStudents[0]}
        />
      );

      const aliceButton = screen.getByRole("button", {
        name: /Select student: alice@example.com/i,
      });
      expect(aliceButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should not show selected state for non-selected students", () => {
      render(
        <StudentSearchResults
          {...defaultProps}
          selectedStudent={mockStudents[0]}
        />
      );

      const bobButton = screen.getByRole("button", {
        name: /Select student: bob@example.com/i,
      });
      expect(bobButton).toHaveAttribute("aria-pressed", "false");
    });

    it("should have bg-primary/10 class when student is selected", () => {
      render(
        <StudentSearchResults
          {...defaultProps}
          selectedStudent={mockStudents[1]}
        />
      );

      const bobButton = screen.getByRole("button", {
        name: /Select student: bob@example.com/i,
      });
      expect(bobButton).toHaveClass("bg-primary/10");
    });
  });

  describe("loading state", () => {
    it("should disable all buttons when loading", () => {
      render(<StudentSearchResults {...defaultProps} isLoading={true} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("should enable buttons when not loading", () => {
      render(<StudentSearchResults {...defaultProps} isLoading={false} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });

    it("should default isLoading to false", () => {
      render(
        <StudentSearchResults
          results={mockStudents}
          selectedStudent={null}
          onSelectStudent={jest.fn()}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper aria-label for each student button", () => {
      render(<StudentSearchResults {...defaultProps} />);

      expect(
        screen.getByRole("button", {
          name: /Select student: alice@example.com \(ID: student-1\)/i,
        })
      ).toBeInTheDocument();
    });

    it("should associate label with student list", () => {
      render(<StudentSearchResults {...defaultProps} />);

      const label = screen.getByText("Select Student");
      expect(label).toHaveAttribute("for", "student-list");
    });

    it("should have list role for results container", () => {
      render(<StudentSearchResults {...defaultProps} />);

      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("should have listitems for each student", () => {
      render(<StudentSearchResults {...defaultProps} />);

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    it("should handle single result", () => {
      render(
        <StudentSearchResults
          {...defaultProps}
          results={[{ id: "only-1", email: "only@example.com" }]}
        />
      );

      expect(screen.getByText("only@example.com")).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("should handle student with special characters in email", () => {
      render(
        <StudentSearchResults
          {...defaultProps}
          results={[{ id: "special", email: "test+filter@example.com" }]}
        />
      );

      expect(screen.getByText("test+filter@example.com")).toBeInTheDocument();
    });
  });
});
