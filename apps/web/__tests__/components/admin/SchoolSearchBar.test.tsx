/**
 * Tests for SchoolSearchBar component
 * Target: ~18 tests covering search, suggestions, and selection
 */

import React, { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchoolSearchBar } from "@/components/admin/pins/SchoolSearchBar";

// Mock lucide-react
jest.mock("lucide-react", () => ({
  Search: ({ className }: { className?: string }) => (
    <span data-testid="search-icon" className={className}>
      Search
    </span>
  ),
  Loader: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className}>
      Loading
    </span>
  ),
}));

describe("SchoolSearchBar", () => {
  const mockSchools = [
    {
      schoolId: "1",
      schoolCode: "SCH001",
      schoolName: "Delhi Public School",
      districtName: "Central Delhi",
    },
    {
      schoolId: "2",
      schoolCode: "SCH002",
      schoolName: "Modern School",
      districtName: "South Delhi",
    },
    {
      schoolId: "3",
      schoolCode: "SCH003",
      schoolName: "St. Xavier's School",
      districtName: null,
    },
  ];

  const defaultProps = {
    searchQuery: "",
    onSearchChange: jest.fn(),
    filteredSchools: mockSchools,
    showSuggestions: false,
    onSelectSchool: jest.fn(),
    loadingSchoolDetails: false,
    searchInputRef: createRef<HTMLInputElement>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render search input", () => {
      render(<SchoolSearchBar {...defaultProps} />);

      expect(
        screen.getByPlaceholderText(/search by school name or code/i)
      ).toBeInTheDocument();
    });

    it("should render search icon", () => {
      render(<SchoolSearchBar {...defaultProps} />);

      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });

    it("should display search query in input", () => {
      render(<SchoolSearchBar {...defaultProps} searchQuery="Delhi" />);

      expect(screen.getByDisplayValue("Delhi")).toBeInTheDocument();
    });

    it("should not show suggestions when showSuggestions is false", () => {
      render(<SchoolSearchBar {...defaultProps} showSuggestions={false} />);

      expect(screen.queryByText("Delhi Public School")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loader when loadingSchoolDetails is true", () => {
      render(<SchoolSearchBar {...defaultProps} loadingSchoolDetails={true} />);

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });

    it("should not show loader when not loading", () => {
      render(<SchoolSearchBar {...defaultProps} loadingSchoolDetails={false} />);

      expect(screen.queryByTestId("loader-icon")).not.toBeInTheDocument();
    });

    it("should disable input when loading", () => {
      render(<SchoolSearchBar {...defaultProps} loadingSchoolDetails={true} />);

      expect(screen.getByPlaceholderText(/search by school name or code/i)).toBeDisabled();
    });
  });

  describe("search functionality", () => {
    it("should call onSearchChange when typing", () => {
      render(<SchoolSearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText(/search by school name or code/i);
      fireEvent.change(input, { target: { value: "Delhi" } });

      expect(defaultProps.onSearchChange).toHaveBeenCalledWith("Delhi");
    });

    it("should call onSearchChange for each keystroke", () => {
      const onSearchChange = jest.fn();
      render(<SchoolSearchBar {...defaultProps} onSearchChange={onSearchChange} />);

      const input = screen.getByPlaceholderText(/search by school name or code/i);
      fireEvent.change(input, { target: { value: "D" } });
      fireEvent.change(input, { target: { value: "De" } });

      expect(onSearchChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("suggestions dropdown", () => {
    it("should show suggestions when showSuggestions is true", () => {
      render(<SchoolSearchBar {...defaultProps} showSuggestions={true} />);

      expect(screen.getByText("Delhi Public School")).toBeInTheDocument();
      expect(screen.getByText("Modern School")).toBeInTheDocument();
    });

    it("should display school code in suggestions", () => {
      render(<SchoolSearchBar {...defaultProps} showSuggestions={true} />);

      expect(screen.getByText(/Code: SCH001/)).toBeInTheDocument();
    });

    it("should display district name when available", () => {
      render(<SchoolSearchBar {...defaultProps} showSuggestions={true} />);

      expect(screen.getByText(/Central Delhi/)).toBeInTheDocument();
    });

    it("should not display district for schools without district", () => {
      const schools = [
        {
          schoolId: "3",
          schoolCode: "SCH003",
          schoolName: "Test School",
          districtName: null,
        },
      ];
      render(
        <SchoolSearchBar
          {...defaultProps}
          filteredSchools={schools}
          showSuggestions={true}
        />
      );

      const schoolItem = screen.getByText("Test School").closest("button");
      expect(schoolItem?.textContent).not.toContain("•");
    });

    it("should limit visible suggestions to 10", () => {
      const manySchools = Array.from({ length: 15 }, (_, i) => ({
        schoolId: `${i}`,
        schoolCode: `SCH${i.toString().padStart(3, "0")}`,
        schoolName: `School ${i}`,
        districtName: null,
      }));

      render(
        <SchoolSearchBar
          {...defaultProps}
          filteredSchools={manySchools}
          showSuggestions={true}
        />
      );

      // Should show "more schools" message
      expect(screen.getByText("5 more schools...")).toBeInTheDocument();
    });

    it("should show correct count of remaining schools", () => {
      const manySchools = Array.from({ length: 25 }, (_, i) => ({
        schoolId: `${i}`,
        schoolCode: `SCH${i.toString().padStart(3, "0")}`,
        schoolName: `School ${i}`,
        districtName: null,
      }));

      render(
        <SchoolSearchBar
          {...defaultProps}
          filteredSchools={manySchools}
          showSuggestions={true}
        />
      );

      expect(screen.getByText("15 more schools...")).toBeInTheDocument();
    });
  });

  describe("school selection", () => {
    it("should call onSelectSchool when clicking a suggestion", () => {
      render(<SchoolSearchBar {...defaultProps} showSuggestions={true} />);

      const schoolButton = screen.getByText("Delhi Public School").closest("button");
      fireEvent.click(schoolButton!);

      expect(defaultProps.onSelectSchool).toHaveBeenCalledWith(mockSchools[0]);
    });

    it("should disable suggestion buttons when loading", () => {
      render(
        <SchoolSearchBar
          {...defaultProps}
          showSuggestions={true}
          loadingSchoolDetails={true}
        />
      );

      const schoolButton = screen.getByText("Delhi Public School").closest("button");
      expect(schoolButton).toBeDisabled();
    });
  });

  describe("no results", () => {
    it("should show no results message when suggestions empty", () => {
      render(
        <SchoolSearchBar
          {...defaultProps}
          filteredSchools={[]}
          showSuggestions={true}
        />
      );

      expect(screen.getByText("No schools found")).toBeInTheDocument();
    });

    it("should not show no results when showSuggestions is false", () => {
      render(
        <SchoolSearchBar
          {...defaultProps}
          filteredSchools={[]}
          showSuggestions={false}
        />
      );

      expect(screen.queryByText("No schools found")).not.toBeInTheDocument();
    });
  });

  describe("ref handling", () => {
    it("should forward ref to input element", () => {
      const ref = createRef<HTMLInputElement>();
      render(<SchoolSearchBar {...defaultProps} searchInputRef={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});
