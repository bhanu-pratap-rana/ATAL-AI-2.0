/**
 * Tests for Admin Pins Page
 * Tests the PIN management page for super admins
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// Mock the usePINManagement hook
const mockUsePINManagement = jest.fn();
jest.mock("@/hooks/usePINManagement", () => ({
  usePINManagement: () => mockUsePINManagement(),
}));

// Mock the child components
jest.mock("@/components/admin/pins/PINManagementHeader", () => ({
  PINManagementHeader: ({ isSuperAdmin }: { isSuperAdmin: boolean }) => (
    <div data-testid="pin-management-header">
      Header - Super Admin: {isSuperAdmin.toString()}
    </div>
  ),
}));

jest.mock("@/components/admin/pins/StatisticsDashboard", () => ({
  StatisticsDashboard: ({ stats }: { stats: { totalSchools: number } }) => (
    <div data-testid="statistics-dashboard">
      Stats - Total Schools: {stats.totalSchools}
    </div>
  ),
}));

jest.mock("@/components/admin/pins/SchoolSearchBar", () => ({
  SchoolSearchBar: ({ searchQuery }: { searchQuery: string }) => (
    <div data-testid="school-search-bar">Search: {searchQuery}</div>
  ),
}));

jest.mock("@/components/admin/pins/SchoolDetailCard", () => ({
  SchoolDetailCard: ({ school }: { school: { name: string } }) => (
    <div data-testid="school-detail-card">School: {school.name}</div>
  ),
}));

jest.mock("@/components/admin/pins/PINGenerator", () => ({
  PINGenerator: ({ selectedSchool }: { selectedSchool: { name: string } }) => (
    <div data-testid="pin-generator">
      PIN Generator for: {selectedSchool.name}
    </div>
  ),
}));

jest.mock("@/components/admin/pins/QuickGuideCard", () => ({
  QuickGuideCard: () => <div data-testid="quick-guide-card">Quick Guide</div>,
}));

jest.mock("@/components/admin/pins/SchoolsList", () => ({
  SchoolsList: ({ schools }: { schools: unknown[] }) => (
    <div data-testid="schools-list">Schools: {schools.length}</div>
  ),
}));

import AdminSchoolPINsPage from "@/app/(public)/admin/pins/page";

describe("AdminSchoolPINsPage", () => {
  const defaultMockReturn = {
    isLoading: false,
    isSuperAdmin: true,
    searchQuery: "",
    allSchools: [{ id: "1", name: "Test School" }],
    filteredSchools: [{ id: "1", name: "Test School" }],
    stats: {
      totalSchools: 10,
      pinsIssued: 5,
      activePins: 3,
    },
    selectedSchool: null,
    rotatingId: null,
    showNewPin: false,
    newPin: "",
    loadingSchoolDetails: false,
    showSuggestions: false,
    copied: false,
    searchInputRef: { current: null },
    setSearchQuery: jest.fn(),
    setShowNewPin: jest.fn(),
    setCopied: jest.fn(),
    handleSelectSchool: jest.fn(),
    handleSignOut: jest.fn(),
    handleGenerateRandomPin: jest.fn(),
    handleRotatePin: jest.fn(),
    copyPinToClipboard: jest.fn(),
    navigateToDashboard: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePINManagement.mockReturnValue(defaultMockReturn);
  });

  describe("Loading State", () => {
    it("should show loading spinner when loading", () => {
      mockUsePINManagement.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      });

      render(<AdminSchoolPINsPage />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Main Content", () => {
    it("should render PIN management header", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("pin-management-header")).toBeInTheDocument();
    });

    it("should render statistics dashboard", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("statistics-dashboard")).toBeInTheDocument();
    });

    it("should render school search bar", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("school-search-bar")).toBeInTheDocument();
    });

    it("should render schools list", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("schools-list")).toBeInTheDocument();
    });

    it("should show Step 1: Find School heading", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByText("Step 1: Find School")).toBeInTheDocument();
    });
  });

  describe("No School Selected", () => {
    it("should render quick guide when no school selected", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("quick-guide-card")).toBeInTheDocument();
    });

    it("should not render school detail card when no school selected", () => {
      render(<AdminSchoolPINsPage />);

      expect(
        screen.queryByTestId("school-detail-card")
      ).not.toBeInTheDocument();
    });

    it("should not render PIN generator when no school selected", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.queryByTestId("pin-generator")).not.toBeInTheDocument();
    });
  });

  describe("School Selected", () => {
    const selectedSchool = {
      id: "school-1",
      name: "Test School",
      schoolCode: "ABC123",
      pinValue: "1234",
      pinHash: "hash123",
      pinGeneratedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      mockUsePINManagement.mockReturnValue({
        ...defaultMockReturn,
        selectedSchool,
      });
    });

    it("should render school detail card when school selected", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("school-detail-card")).toBeInTheDocument();
    });

    it("should render PIN generator when school selected", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("pin-generator")).toBeInTheDocument();
    });

    it("should not render quick guide when school selected", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.queryByTestId("quick-guide-card")).not.toBeInTheDocument();
    });

    it("should show Step 2 and Step 3 headings when school selected", () => {
      render(<AdminSchoolPINsPage />);

      expect(screen.getByText("Step 2: PIN Status")).toBeInTheDocument();
      expect(
        screen.getByText("Step 3: Generate/Rotate PIN")
      ).toBeInTheDocument();
    });
  });

  describe("Super Admin Status", () => {
    it("should pass isSuperAdmin to header", () => {
      mockUsePINManagement.mockReturnValue({
        ...defaultMockReturn,
        isSuperAdmin: true,
      });

      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("pin-management-header")).toHaveTextContent(
        "Super Admin: true"
      );
    });

    it("should handle non-super admin", () => {
      mockUsePINManagement.mockReturnValue({
        ...defaultMockReturn,
        isSuperAdmin: false,
      });

      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("pin-management-header")).toHaveTextContent(
        "Super Admin: false"
      );
    });
  });

  describe("Statistics", () => {
    it("should display total schools count", () => {
      mockUsePINManagement.mockReturnValue({
        ...defaultMockReturn,
        stats: {
          totalSchools: 25,
          pinsIssued: 20,
          activePins: 15,
        },
      });

      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("statistics-dashboard")).toHaveTextContent(
        "Total Schools: 25"
      );
    });
  });

  describe("Schools List", () => {
    it("should display schools count", () => {
      mockUsePINManagement.mockReturnValue({
        ...defaultMockReturn,
        allSchools: [
          { id: "1", name: "School 1" },
          { id: "2", name: "School 2" },
          { id: "3", name: "School 3" },
        ],
      });

      render(<AdminSchoolPINsPage />);

      expect(screen.getByTestId("schools-list")).toHaveTextContent(
        "Schools: 3"
      );
    });
  });
});
