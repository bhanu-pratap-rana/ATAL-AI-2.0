/**
 * Tests for StudentProfileEditor Component
 * Tests profile editing and validation
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock saveStudentProfile
const mockSaveStudentProfile = jest.fn();
jest.mock("@/app/actions/student", () => ({
  saveStudentProfile: (...args: unknown[]) => mockSaveStudentProfile(...args),
}));

// Mock validation utils
jest.mock("@/lib/validation-utils", () => ({
  validateOptionalPhone: (phone: string) => {
    if (!phone) return { valid: true };
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      return { valid: false, error: "Invalid phone number" };
    }
    return { valid: true };
  },
  sanitizeProfilePhone: (value: string) => value.replace(/\D/g, "").slice(0, 10),
}));

// Mock ui-timings
jest.mock("@/lib/constants/ui-timings", () => ({
  PROFILE_TIMING: {
    successMessage: 3000,
  },
}));

// Mock client-logger
jest.mock("@/lib/client-logger", () => ({
  clientLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { StudentProfileEditor } from "@/components/settings/StudentProfileEditor";

describe("StudentProfileEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveStudentProfile.mockResolvedValue({ success: true });
  });

  const mockProfile = {
    user_id: "user-123",
    name: "John Doe",
    gender: "male" as const,
    phone: "9876543210",
    roll_number: "ST001",
    school_name: "Test School",
    class_name: "Class 10",
    village: "Test Village",
  };

  describe("Without Profile", () => {
    it("should show create profile button when no profile", () => {
      render(
        <StudentProfileEditor
          profile={null}
          userEmail="test@example.com"
        />
      );

      expect(screen.getByText("Student Profile")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Create Profile/i })
      ).toBeInTheDocument();
    });

    it("should show message to create profile", () => {
      render(
        <StudentProfileEditor
          profile={null}
          userEmail="test@example.com"
        />
      );

      expect(
        screen.getByText(/haven't set up your student profile/i)
      ).toBeInTheDocument();
    });

    it("should enter edit mode when create profile is clicked", () => {
      render(
        <StudentProfileEditor
          profile={null}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Create Profile/i }));

      expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    });
  });

  describe("With Profile - Display Mode", () => {
    it("should display profile information", () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("male")).toBeInTheDocument();
      expect(screen.getByText("9876543210")).toBeInTheDocument();
      expect(screen.getByText("ST001")).toBeInTheDocument();
      expect(screen.getByText("Test School")).toBeInTheDocument();
    });

    it("should show edit button", () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      expect(
        screen.getByRole("button", { name: /Edit/i })
      ).toBeInTheDocument();
    });

    it("should show email for regular auth", () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
          isUsernameAuth={false}
        />
      );

      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should show username for username auth", () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
          isUsernameAuth={true}
          username="johndoe123"
        />
      );

      expect(screen.getByText("Username")).toBeInTheDocument();
      expect(screen.getByText("johndoe123")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("should enter edit mode when edit button is clicked", () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      expect(screen.getByLabelText("Name *")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    });

    it("should populate form with existing values", () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      expect(screen.getByLabelText("Name *")).toHaveValue("John Doe");
      expect(screen.getByLabelText("Phone")).toHaveValue("9876543210");
    });

    it("should show gender radio buttons", () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      expect(screen.getByLabelText(/^Male$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Female$/i)).toBeInTheDocument();
    });

    it("should cancel editing and restore values", () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const nameInput = screen.getByLabelText("Name *");
      fireEvent.change(nameInput, { target: { value: "Changed Name" } });

      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

      // Should be back to display mode with original value
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show error when name is empty", async () => {
      render(
        <StudentProfileEditor
          profile={{ ...mockProfile, name: "" }}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const nameInput = screen.getByLabelText("Name *");
      fireEvent.change(nameInput, { target: { value: "" } });

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText("Name and gender are required")).toBeInTheDocument();
      });

      expect(mockSaveStudentProfile).not.toHaveBeenCalled();
    });

    it("should show error for invalid phone number", async () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const phoneInput = screen.getByLabelText("Phone");
      fireEvent.change(phoneInput, { target: { value: "123" } });

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText("Invalid phone number")).toBeInTheDocument();
      });

      expect(mockSaveStudentProfile).not.toHaveBeenCalled();
    });
  });

  describe("Save Profile", () => {
    it("should save profile successfully", async () => {
      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const nameInput = screen.getByLabelText("Name *");
      fireEvent.change(nameInput, { target: { value: "Updated Name" } });

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(mockSaveStudentProfile).toHaveBeenCalled();
        expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
      });
    });

    it("should show error when save fails", async () => {
      mockSaveStudentProfile.mockResolvedValue({
        success: false,
        error: "Failed to save",
      });

      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to save")).toBeInTheDocument();
      });
    });

    it("should handle unexpected errors", async () => {
      mockSaveStudentProfile.mockRejectedValue(new Error("Network error"));

      render(
        <StudentProfileEditor
          profile={mockProfile}
          userEmail="test@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
      });
    });
  });

  describe("Empty Values Display", () => {
    it("should show 'Not set' for missing values", () => {
      render(
        <StudentProfileEditor
          profile={{
            user_id: "user-123",
            name: "John",
            gender: "male",
          }}
          userEmail="test@example.com"
        />
      );

      const notSetElements = screen.getAllByText("Not set");
      expect(notSetElements.length).toBeGreaterThan(0);
    });
  });
});
