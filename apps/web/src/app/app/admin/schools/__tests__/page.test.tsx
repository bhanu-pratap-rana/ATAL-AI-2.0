/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
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
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  Shield: () => <span data-testid="shield-icon">Shield</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  Copy: () => <span data-testid="copy-icon">Copy</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  MapPin: () => <span data-testid="mappin-icon">MapPin</span>,
}));

// Mock school actions
const mockCheckAdminAuth = jest.fn();
const mockSearchSchools = jest.fn();
const mockRotateStaffPin = jest.fn();

jest.mock("@/app/actions/school", () => ({
  checkAdminAuth: () => mockCheckAdminAuth(),
  searchSchools: (...args: unknown[]) => mockSearchSchools(...args),
  rotateStaffPin: (...args: unknown[]) => mockRotateStaffPin(...args),
}));

// Mock school-finder actions
const mockGetDistricts = jest.fn();
const mockGetBlocksByDistrict = jest.fn();
const mockGetSchoolsByDistrictAndBlock = jest.fn();
const mockGetSchoolPinStatus = jest.fn();

jest.mock("@/app/actions/school-finder", () => ({
  getDistricts: () => mockGetDistricts(),
  getBlocksByDistrict: (...args: unknown[]) => mockGetBlocksByDistrict(...args),
  getSchoolsByDistrictAndBlock: (...args: unknown[]) => mockGetSchoolsByDistrictAndBlock(...args),
  getSchoolPinStatus: (...args: unknown[]) => mockGetSchoolPinStatus(...args),
}));

import AdminSchoolsPage from "../page";
import { toast } from "sonner";

// Helper to find and click the search button
async function performSearch(query: string) {
  const searchInput = screen.getByPlaceholderText(/school name/i);
  await userEvent.type(searchInput, query + "{enter}");
}

describe("AdminSchoolsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authorized
    mockCheckAdminAuth.mockResolvedValue({ authorized: true });
  });

  describe("Authorization", () => {
    it("shows loading state while verifying authorization", () => {
      mockCheckAdminAuth.mockImplementation(() => new Promise(() => {}));

      render(<AdminSchoolsPage />);

      expect(screen.getByText(/verifying authorization/i)).toBeInTheDocument();
    });

    it("shows access denied when not authorized", async () => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: false, error: "Admin access required" });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
        expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
      });
    });

    it("shows admin login button when access denied", async () => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: false });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /admin login/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /go back home/i })).toBeInTheDocument();
      });
    });

    it("shows main page when authorized", async () => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: true });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByText("School PIN Management")).toBeInTheDocument();
      });
    });

    it("handles authorization check error", async () => {
      mockCheckAdminAuth.mockRejectedValue(new Error("Network error"));

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
        expect(screen.getByText(/failed to verify authorization/i)).toBeInTheDocument();
      });
    });
  });

  describe("School Search", () => {
    beforeEach(() => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: true });
    });

    it("renders search input", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });
    });

    it("displays search results", async () => {
      mockSearchSchools.mockResolvedValue({
        success: true,
        data: [
          { id: "1", school_code: "SC001", school_name: "Test School", district: "District A" },
          { id: "2", school_code: "SC002", school_name: "Another School", district: "District B" },
        ],
      });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("Test");

      await waitFor(() => {
        expect(screen.getByText("Test School")).toBeInTheDocument();
        expect(screen.getByText("Another School")).toBeInTheDocument();
      });
    });

    it("shows info toast when no results found", async () => {
      mockSearchSchools.mockResolvedValue({ success: true, data: [] });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("NonexistentSchool");

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith("No schools found matching your search");
      });
    });

    it("handles search error", async () => {
      mockSearchSchools.mockResolvedValue({ success: false, error: "Search failed" });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("Test");

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Search failed");
      });
    });

    it("triggers search on Enter key", async () => {
      mockSearchSchools.mockResolvedValue({ success: true, data: [] });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("Test");

      await waitFor(() => {
        expect(mockSearchSchools).toHaveBeenCalledWith("Test");
      });
    });
  });

  describe("School Selection", () => {
    beforeEach(() => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: true });
      mockSearchSchools.mockResolvedValue({
        success: true,
        data: [
          { id: "1", school_code: "SC001", school_name: "Test School", district: "District A" },
        ],
      });
      mockGetSchoolPinStatus.mockResolvedValue({
        success: true,
        exists: true,
        createdAt: "2024-01-01",
        lastRotatedAt: "2024-01-15",
      });
    });

    it("selects school from search results", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("Test");

      await waitFor(() => {
        expect(screen.getByText("Test School")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test School"));

      await waitFor(() => {
        expect(screen.getByText(/selected school/i)).toBeInTheDocument();
      });
    });

    it("shows PIN status after selecting school", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("Test");

      await waitFor(() => {
        expect(screen.getByText("Test School")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test School"));

      await waitFor(() => {
        expect(screen.getByText(/pin exists/i)).toBeInTheDocument();
      });
    });

    it("shows 'No PIN Found' when school has no PIN", async () => {
      mockGetSchoolPinStatus.mockResolvedValue({
        success: true,
        exists: false,
      });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("Test");

      await waitFor(() => {
        expect(screen.getByText("Test School")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test School"));

      await waitFor(() => {
        expect(screen.getByText(/no pin found/i)).toBeInTheDocument();
      });
    });
  });

  describe("PIN Rotation Form", () => {
    beforeEach(() => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: true });
      mockSearchSchools.mockResolvedValue({
        success: true,
        data: [
          { id: "1", school_code: "SC001", school_name: "Test School", district: "District A" },
        ],
      });
      mockGetSchoolPinStatus.mockResolvedValue({
        success: true,
        exists: true,
        createdAt: "2024-01-01",
      });
    });

    async function selectSchool() {
      await performSearch("Test");

      await waitFor(() => {
        expect(screen.getByText("Test School")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test School"));

      await waitFor(() => {
        expect(screen.getByLabelText(/staff pin/i)).toBeInTheDocument();
      });
    }

    it("shows PIN rotation form after selecting school", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await selectSchool();

      expect(screen.getByLabelText(/staff pin/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm pin/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /rotate pin/i })).toBeInTheDocument();
    });

    it("validates PIN minimum length", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await selectSchool();

      const pinInput = screen.getByLabelText(/staff pin/i);
      const confirmInput = screen.getByLabelText(/confirm pin/i);
      await userEvent.type(pinInput, "123");
      await userEvent.type(confirmInput, "123");

      const form = screen.getByRole("button", { name: /rotate pin/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("PIN must be at least 4 characters long");
      });
    });

    it("validates PIN confirmation match", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await selectSchool();

      const pinInput = screen.getByLabelText(/staff pin/i);
      const confirmInput = screen.getByLabelText(/confirm pin/i);
      await userEvent.type(pinInput, "1234");
      await userEvent.type(confirmInput, "5678");

      const form = screen.getByRole("button", { name: /rotate pin/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("PINs do not match");
      });
    });

    it("successfully rotates PIN", async () => {
      mockRotateStaffPin.mockResolvedValue({
        success: true,
        schoolName: "Test School",
      });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await selectSchool();

      const pinInput = screen.getByLabelText(/staff pin/i);
      const confirmInput = screen.getByLabelText(/confirm pin/i);
      await userEvent.type(pinInput, "1234");
      await userEvent.type(confirmInput, "1234");

      const form = screen.getByRole("button", { name: /rotate pin/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("rotated successfully"));
      });
    });

    it("handles PIN rotation error", async () => {
      mockRotateStaffPin.mockResolvedValue({
        success: false,
        error: "Failed to rotate PIN",
      });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await selectSchool();

      const pinInput = screen.getByLabelText(/staff pin/i);
      const confirmInput = screen.getByLabelText(/confirm pin/i);
      await userEvent.type(pinInput, "1234");
      await userEvent.type(confirmInput, "1234");

      const form = screen.getByRole("button", { name: /rotate pin/i }).closest("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to rotate PIN");
      });
    });

    it("shows 'Create PIN' for schools without existing PIN", async () => {
      mockGetSchoolPinStatus.mockResolvedValue({
        success: true,
        exists: false,
      });

      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await selectSchool();

      expect(screen.getByRole("button", { name: /create pin/i })).toBeInTheDocument();
    });
  });

  describe("School Finder Modal", () => {
    beforeEach(() => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: true });
      mockGetDistricts.mockResolvedValue({
        success: true,
        data: [{ name: "District A" }, { name: "District B" }],
      });
      mockGetBlocksByDistrict.mockResolvedValue({
        success: true,
        data: [{ name: "Block 1" }, { name: "Block 2" }],
      });
      mockGetSchoolsByDistrictAndBlock.mockResolvedValue({
        success: true,
        data: [
          { id: "1", school_code: "SC001", school_name: "School One", block: "Block 1" },
        ],
      });
      mockGetSchoolPinStatus.mockResolvedValue({
        success: true,
        exists: false,
      });
    });

    it("opens finder modal when clicking browse button", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByText(/browse by district/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/browse by district/i));

      await waitFor(() => {
        expect(screen.getByText(/find school by location/i)).toBeInTheDocument();
      });
    });

    it("loads districts in finder modal", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByText(/browse by district/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/browse by district/i));

      await waitFor(() => {
        expect(mockGetDistricts).toHaveBeenCalled();
      });
    });

    it("closes finder modal when clicking close button", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByText(/browse by district/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/browse by district/i));

      await waitFor(() => {
        expect(screen.getByText(/find school by location/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/find school by location/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Copy Button", () => {
    beforeEach(() => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: true });
      mockSearchSchools.mockResolvedValue({
        success: true,
        data: [
          { id: "1", school_code: "SC001", school_name: "Test School", district: "District A" },
        ],
      });
      mockGetSchoolPinStatus.mockResolvedValue({
        success: true,
        exists: false,
      });

      // Mock clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });
    });

    it("copies school code to clipboard", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("Test");

      await waitFor(() => {
        expect(screen.getByText("Test School")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test School"));

      await waitFor(() => {
        expect(screen.getByText(/selected school/i)).toBeInTheDocument();
      });

      // Find the copy button in the selected school display
      const copyButton = screen.getByTitle("Copy to clipboard");
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("SC001");
      expect(toast.success).toHaveBeenCalledWith("Code copied to clipboard");
    });
  });

  describe("Help Guide", () => {
    beforeEach(() => {
      mockCheckAdminAuth.mockResolvedValue({ authorized: true });
      mockSearchSchools.mockResolvedValue({
        success: true,
        data: [
          { id: "1", school_code: "SC001", school_name: "Test School", district: "District A" },
        ],
      });
      mockGetSchoolPinStatus.mockResolvedValue({
        success: true,
        exists: false,
      });
    });

    it("displays quick guide after selecting school", async () => {
      render(<AdminSchoolsPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/school name/i)).toBeInTheDocument();
      });

      await performSearch("Test");

      await waitFor(() => {
        expect(screen.getByText("Test School")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test School"));

      await waitFor(() => {
        expect(screen.getByText(/quick guide/i)).toBeInTheDocument();
      });
    });
  });
});
