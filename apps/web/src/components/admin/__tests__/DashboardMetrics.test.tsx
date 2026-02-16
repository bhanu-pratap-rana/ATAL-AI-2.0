/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardMetrics } from "../DashboardMetrics";

// Mock admin-metrics actions
jest.mock("@/app/actions/admin-metrics", () => ({
  getDashboardMetrics: jest.fn(),
  getSchoolsWithActivePINs: jest.fn(),
  getAllSchools: jest.fn(),
  getAllTeachers: jest.fn(),
  getAllStudents: jest.fn(),
  getSchoolsWithoutPINs: jest.fn(),
}));

// Mock client logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock lucide icons
jest.mock("lucide-react", () => ({
  School: () => <span data-testid="school-icon">School</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  Lock: () => <span data-testid="lock-icon">Lock</span>,
  GraduationCap: () => <span data-testid="graduation-icon">GraduationCap</span>,
}));

// TYPE SAFETY: Define proper interfaces for test mocks instead of using `any`
interface MockDataModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

interface MockListItem {
  name?: string;
  email?: string;
  schoolName?: string;
}

interface MockListItemCardProps {
  item: MockListItem;
  modalType: "schools" | "teachers" | "students" | "activePins" | "inactivePins";
}

// Mock DataModal
jest.mock("@/components/admin/modals/DataModal", () => ({
  DataModal: ({ isOpen, title, children, searchQuery, onSearchChange, onClose, isLoading }: MockDataModalProps) => (
    isOpen ? (
      <div data-testid="data-modal">
        <h2>{title}</h2>
        <input
          data-testid="search-input"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button onClick={onClose} data-testid="close-modal">Close</button>
        {isLoading ? <div data-testid="modal-loading">Loading...</div> : children}
      </div>
    ) : null
  ),
}));

// Mock ListItemCard
jest.mock("@/components/admin/modals/ListItemCard", () => ({
  ListItemCard: ({ item, modalType }: MockListItemCardProps) => {
    // Prioritize name for teachers/students, schoolName for schools/pins
    const displayText = modalType === "teachers" || modalType === "students"
      ? (item.name || item.email)
      : (item.schoolName || item.name || item.email);
    return (
      <div data-testid="list-item-card">
        {displayText}
      </div>
    );
  },
}));

import {
  getDashboardMetrics,
  getSchoolsWithActivePINs,
  getAllSchools,
  getAllTeachers,
  getAllStudents,
  getSchoolsWithoutPINs,
} from "@/app/actions/admin-metrics";

const mockMetrics = {
  totalSchools: 150,
  totalTeachers: 500,
  totalStudents: 5000,
  activePins: 120,
  inactivePins: 30,
};

const mockSchools = [
  { id: "s1", schoolName: "School A", schoolCode: "SA001", district: "District 1", block: "Block A" },
  { id: "s2", schoolName: "School B", schoolCode: "SB002", district: "District 2", block: null },
];

const mockTeachers = [
  { id: "t1", email: "teacher1@example.com", name: "Teacher One", phone: "1234567890", schoolName: "School A", schoolCode: "SA001", createdAt: "2024-01-01" },
  { id: "t2", email: "teacher2@example.com", name: "Teacher Two", phone: null, schoolName: "School B", schoolCode: "SB002", createdAt: "2024-01-02" },
];

const mockStudents = [
  { id: "st1", email: "student1@example.com", phone: "9876543210", createdAt: "2024-01-01", lastSignIn: "2024-01-10" },
  { id: "st2", email: "student2@example.com", phone: null, createdAt: "2024-01-02", lastSignIn: null },
];

const mockActivePINSchools = [
  { schoolId: "s1", schoolName: "School A", schoolCode: "SA001", districtName: "District 1", lastRotatedAt: "2024-01-15" },
];

const mockInactivePINSchools = [
  { id: "s2", schoolName: "School B", schoolCode: "SB002", district: "District 2" },
];

describe("DashboardMetrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("shows loading skeleton while fetching metrics", () => {
      (getDashboardMetrics as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<DashboardMetrics />);

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBe(5);
    });
  });

  describe("Error State", () => {
    it("shows error message when metrics fetch fails", async () => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: false,
        error: "Failed to load metrics"
      });

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load metrics")).toBeInTheDocument();
      });
    });

    it("shows generic error when exception occurs", async () => {
      (getDashboardMetrics as jest.Mock).mockRejectedValue(new Error("Network error"));

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("An error occurred while loading metrics")).toBeInTheDocument();
      });
    });
  });

  describe("Metrics Display", () => {
    beforeEach(() => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
    });

    it("displays all metric cards", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Schools")).toBeInTheDocument();
        expect(screen.getByText("Teachers")).toBeInTheDocument();
        expect(screen.getByText("Students")).toBeInTheDocument();
        expect(screen.getByText("Active PINs")).toBeInTheDocument();
        expect(screen.getByText("Inactive PINs")).toBeInTheDocument();
      });
    });

    it("displays correct metric values", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("150")).toBeInTheDocument(); // Schools
        expect(screen.getByText("500")).toBeInTheDocument(); // Teachers
        expect(screen.getByText("5000")).toBeInTheDocument(); // Students
        expect(screen.getByText("120")).toBeInTheDocument(); // Active PINs
        expect(screen.getByText("30")).toBeInTheDocument(); // Inactive PINs
      });
    });

    it("displays click to view text on each card", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        const clickTexts = screen.getAllByText("Click to view");
        expect(clickTexts.length).toBe(5);
      });
    });

    it("renders icons for each metric", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByTestId("school-icon")).toBeInTheDocument();
        expect(screen.getByTestId("users-icon")).toBeInTheDocument();
        expect(screen.getByTestId("graduation-icon")).toBeInTheDocument();
        expect(screen.getAllByTestId("lock-icon").length).toBe(2);
      });
    });
  });

  describe("Modal Interactions - Schools", () => {
    beforeEach(() => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getAllSchools as jest.Mock).mockResolvedValue({
        success: true,
        data: mockSchools
      });
    });

    it("opens schools modal when clicking schools card", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Schools")).toBeInTheDocument();
      });

      const schoolsCard = screen.getByText("Schools").closest("button");
      fireEvent.click(schoolsCard!);

      await waitFor(() => {
        expect(screen.getByTestId("data-modal")).toBeInTheDocument();
        expect(getAllSchools).toHaveBeenCalled();
      });
    });

    it("displays school items in modal", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Schools")).toBeInTheDocument();
      });

      const schoolsCard = screen.getByText("Schools").closest("button");
      fireEvent.click(schoolsCard!);

      await waitFor(() => {
        expect(screen.getByText("School A")).toBeInTheDocument();
        expect(screen.getByText("School B")).toBeInTheDocument();
      });
    });

    it("filters schools by search query", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Schools")).toBeInTheDocument();
      });

      const schoolsCard = screen.getByText("Schools").closest("button");
      fireEvent.click(schoolsCard!);

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "School A");

      await waitFor(() => {
        expect(screen.getByText("School A")).toBeInTheDocument();
        expect(screen.queryByText("School B")).not.toBeInTheDocument();
      });
    });

    it("closes modal when close button clicked", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Schools")).toBeInTheDocument();
      });

      const schoolsCard = screen.getByText("Schools").closest("button");
      fireEvent.click(schoolsCard!);

      await waitFor(() => {
        expect(screen.getByTestId("data-modal")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("close-modal"));

      await waitFor(() => {
        expect(screen.queryByTestId("data-modal")).not.toBeInTheDocument();
      });
    });
  });

  describe("Modal Interactions - Teachers", () => {
    beforeEach(() => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getAllTeachers as jest.Mock).mockResolvedValue({
        success: true,
        data: mockTeachers
      });
    });

    it("opens teachers modal and displays data", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Teachers")).toBeInTheDocument();
      });

      const teachersCard = screen.getByText("Teachers").closest("button");
      fireEvent.click(teachersCard!);

      await waitFor(() => {
        expect(getAllTeachers).toHaveBeenCalled();
        expect(screen.getByText("Teacher One")).toBeInTheDocument();
        expect(screen.getByText("Teacher Two")).toBeInTheDocument();
      });
    });

    it("filters teachers by name", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Teachers")).toBeInTheDocument();
      });

      const teachersCard = screen.getByText("Teachers").closest("button");
      fireEvent.click(teachersCard!);

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "Teacher One");

      await waitFor(() => {
        expect(screen.getByText("Teacher One")).toBeInTheDocument();
        expect(screen.queryByText("Teacher Two")).not.toBeInTheDocument();
      });
    });

    it("filters teachers by email", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Teachers")).toBeInTheDocument();
      });

      const teachersCard = screen.getByText("Teachers").closest("button");
      fireEvent.click(teachersCard!);

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "teacher2@example.com");

      await waitFor(() => {
        expect(screen.queryByText("Teacher One")).not.toBeInTheDocument();
        expect(screen.getByText("Teacher Two")).toBeInTheDocument();
      });
    });
  });

  describe("Modal Interactions - Students", () => {
    beforeEach(() => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getAllStudents as jest.Mock).mockResolvedValue({
        success: true,
        data: mockStudents
      });
    });

    it("opens students modal and displays data", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Students")).toBeInTheDocument();
      });

      const studentsCard = screen.getByText("Students").closest("button");
      fireEvent.click(studentsCard!);

      await waitFor(() => {
        expect(getAllStudents).toHaveBeenCalled();
        expect(screen.getByText("student1@example.com")).toBeInTheDocument();
        expect(screen.getByText("student2@example.com")).toBeInTheDocument();
      });
    });

    it("filters students by email", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Students")).toBeInTheDocument();
      });

      const studentsCard = screen.getByText("Students").closest("button");
      fireEvent.click(studentsCard!);

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "student1");

      await waitFor(() => {
        expect(screen.getByText("student1@example.com")).toBeInTheDocument();
        expect(screen.queryByText("student2@example.com")).not.toBeInTheDocument();
      });
    });

    it("filters students by phone", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Students")).toBeInTheDocument();
      });

      const studentsCard = screen.getByText("Students").closest("button");
      fireEvent.click(studentsCard!);

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "9876543210");

      await waitFor(() => {
        expect(screen.getByText("student1@example.com")).toBeInTheDocument();
        expect(screen.queryByText("student2@example.com")).not.toBeInTheDocument();
      });
    });
  });

  describe("Modal Interactions - Active PINs", () => {
    beforeEach(() => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getSchoolsWithActivePINs as jest.Mock).mockResolvedValue({
        success: true,
        data: mockActivePINSchools
      });
    });

    it("opens active PINs modal and displays data", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Active PINs")).toBeInTheDocument();
      });

      const activePinsCard = screen.getByText("Active PINs").closest("button");
      fireEvent.click(activePinsCard!);

      await waitFor(() => {
        expect(getSchoolsWithActivePINs).toHaveBeenCalled();
        expect(screen.getByText("School A")).toBeInTheDocument();
      });
    });

    it("filters active PIN schools by name", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Active PINs")).toBeInTheDocument();
      });

      const activePinsCard = screen.getByText("Active PINs").closest("button");
      fireEvent.click(activePinsCard!);

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "Nonexistent");

      await waitFor(() => {
        expect(screen.queryByText("School A")).not.toBeInTheDocument();
      });
    });
  });

  describe("Modal Interactions - Inactive PINs", () => {
    beforeEach(() => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getSchoolsWithoutPINs as jest.Mock).mockResolvedValue({
        success: true,
        data: mockInactivePINSchools
      });
    });

    it("opens inactive PINs modal and displays data", async () => {
      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Inactive PINs")).toBeInTheDocument();
      });

      const inactivePinsCard = screen.getByText("Inactive PINs").closest("button");
      fireEvent.click(inactivePinsCard!);

      await waitFor(() => {
        expect(getSchoolsWithoutPINs).toHaveBeenCalled();
        expect(screen.getByText("School B")).toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("shows empty message when no schools found", async () => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getAllSchools as jest.Mock).mockResolvedValue({
        success: true,
        data: []
      });

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Schools")).toBeInTheDocument();
      });

      const schoolsCard = screen.getByText("Schools").closest("button");
      fireEvent.click(schoolsCard!);

      await waitFor(() => {
        expect(screen.getByText("No schools found")).toBeInTheDocument();
      });
    });

    it("shows empty message when no teachers found", async () => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getAllTeachers as jest.Mock).mockResolvedValue({
        success: true,
        data: []
      });

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Teachers")).toBeInTheDocument();
      });

      const teachersCard = screen.getByText("Teachers").closest("button");
      fireEvent.click(teachersCard!);

      await waitFor(() => {
        expect(screen.getByText("No teachers found")).toBeInTheDocument();
      });
    });

    it("shows message when all schools have active PINs", async () => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getSchoolsWithoutPINs as jest.Mock).mockResolvedValue({
        success: true,
        data: []
      });

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Inactive PINs")).toBeInTheDocument();
      });

      const inactivePinsCard = screen.getByText("Inactive PINs").closest("button");
      fireEvent.click(inactivePinsCard!);

      await waitFor(() => {
        expect(screen.getByText("All schools have active PINs")).toBeInTheDocument();
      });
    });
  });

  describe("Modal Loading State", () => {
    it("shows loading state while fetching modal data", async () => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getAllSchools as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Schools")).toBeInTheDocument();
      });

      const schoolsCard = screen.getByText("Schools").closest("button");
      fireEvent.click(schoolsCard!);

      await waitFor(() => {
        expect(screen.getByTestId("modal-loading")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling in Modal", () => {
    it("handles error when loading modal data", async () => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMetrics
      });
      (getAllSchools as jest.Mock).mockRejectedValue(new Error("Network error"));

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Schools")).toBeInTheDocument();
      });

      const schoolsCard = screen.getByText("Schools").closest("button");
      fireEvent.click(schoolsCard!);

      // Modal should still open but be empty
      await waitFor(() => {
        expect(screen.getByTestId("data-modal")).toBeInTheDocument();
      });
    });
  });

  describe("Null Metrics", () => {
    it("shows error when data is null after loading", async () => {
      // When API returns success: true but data: null, component shows "Failed to load metrics" error
      // because of the condition: result?.success && result?.data
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: true,
        data: null
      });

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load metrics")).toBeInTheDocument();
      });
    });

    it("shows custom error message when API returns error", async () => {
      (getDashboardMetrics as jest.Mock).mockResolvedValue({
        success: false,
        error: "Custom error message"
      });

      render(<DashboardMetrics />);

      await waitFor(() => {
        expect(screen.getByText("Custom error message")).toBeInTheDocument();
      });
    });
  });
});
