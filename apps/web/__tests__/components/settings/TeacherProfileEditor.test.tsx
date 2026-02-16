/**
 * Tests for TeacherProfileEditor Component
 * Tests profile editing and validation for teachers
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock updateTeacherProfile
const mockUpdateTeacherProfile = jest.fn();
jest.mock("@/app/actions/teacher-onboard", () => ({
  updateTeacherProfile: (...args: unknown[]) => mockUpdateTeacherProfile(...args),
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

import { TeacherProfileEditor } from "@/components/settings/TeacherProfileEditor";

describe("TeacherProfileEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateTeacherProfile.mockResolvedValue({ success: true });
  });

  const completeProfile = {
    user_id: "teacher-123",
    name: "Jane Doe",
    gender: "female" as const,
    phone: "9876543210",
    subject: "Mathematics",
    village: "Test Village",
    school_code: "SCH001",
    school_id: "school-123",
  };

  const incompleteProfile = {
    user_id: "teacher-123",
    name: "Jane Doe",
    gender: null,
    phone: null,
    subject: null,
    village: null,
    school_code: "SCH001",
    school_id: "school-123",
  };

  describe("Display Mode - Complete Profile", () => {
    it("should display profile information", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      expect(screen.getByText("Teacher Profile")).toBeInTheDocument();
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("female")).toBeInTheDocument();
      expect(screen.getByText("9876543210")).toBeInTheDocument();
      expect(screen.getByText("Mathematics")).toBeInTheDocument();
      expect(screen.getByText("SCH001")).toBeInTheDocument();
    });

    it("should show edit button", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      expect(
        screen.getByRole("button", { name: /Edit/i })
      ).toBeInTheDocument();
    });

    it("should display user email", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      expect(screen.getByText("teacher@example.com")).toBeInTheDocument();
    });
  });

  describe("Incomplete Profile Warning", () => {
    it("should show warning when gender is missing", () => {
      render(
        <TeacherProfileEditor
          profile={incompleteProfile}
          userEmail="teacher@example.com"
        />
      );

      expect(screen.getByText("Profile Incomplete")).toBeInTheDocument();
      expect(
        screen.getByText(/Please complete your profile by adding your gender/i)
      ).toBeInTheDocument();
    });

    it("should not show warning for complete profile", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      expect(screen.queryByText("Profile Incomplete")).not.toBeInTheDocument();
    });

    it("should show gender not set message", () => {
      render(
        <TeacherProfileEditor
          profile={incompleteProfile}
          userEmail="teacher@example.com"
        />
      );

      expect(screen.getByText("Not set - Please update")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("should enter edit mode when edit button is clicked", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      expect(screen.getByLabelText("Name *")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    });

    it("should populate form with existing values", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      expect(screen.getByLabelText("Name *")).toHaveValue("Jane Doe");
      expect(screen.getByLabelText("Phone")).toHaveValue("9876543210");
      expect(screen.getByLabelText("Subject")).toHaveValue("Mathematics");
    });

    it("should show gender radio buttons", () => {
      const { container } = render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const maleRadio = container.querySelector("#teacher-gender-male") as HTMLInputElement;
      const femaleRadio = container.querySelector("#teacher-gender-female") as HTMLInputElement;

      expect(maleRadio).toBeInTheDocument();
      expect(femaleRadio).toBeInTheDocument();
      expect(femaleRadio.checked).toBe(true);
    });

    it("should cancel editing and restore values", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const nameInput = screen.getByLabelText("Name *");
      fireEvent.change(nameInput, { target: { value: "Changed Name" } });

      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

      // Should be back to display mode with original value
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("should hide incomplete warning in edit mode", () => {
      render(
        <TeacherProfileEditor
          profile={incompleteProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      expect(screen.queryByText("Profile Incomplete")).not.toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show error when name is empty", async () => {
      render(
        <TeacherProfileEditor
          profile={{ ...completeProfile, name: "" }}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const nameInput = screen.getByLabelText("Name *");
      fireEvent.change(nameInput, { target: { value: "" } });

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText("Name and gender are required")).toBeInTheDocument();
      });

      expect(mockUpdateTeacherProfile).not.toHaveBeenCalled();
    });

    it("should show error for invalid phone number", async () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const phoneInput = screen.getByLabelText("Phone");
      fireEvent.change(phoneInput, { target: { value: "123" } });

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText("Invalid phone number")).toBeInTheDocument();
      });

      expect(mockUpdateTeacherProfile).not.toHaveBeenCalled();
    });
  });

  describe("Save Profile", () => {
    it("should save profile successfully", async () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const nameInput = screen.getByLabelText("Name *");
      fireEvent.change(nameInput, { target: { value: "Updated Name" } });

      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(mockUpdateTeacherProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Updated Name",
            gender: "female",
          })
        );
        expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
      });
    });

    it("should show error when save fails", async () => {
      mockUpdateTeacherProfile.mockResolvedValue({
        success: false,
        error: "Failed to save",
      });

      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
      fireEvent.click(screen.getByRole("button", { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to save")).toBeInTheDocument();
      });
    });

    it("should handle unexpected errors", async () => {
      mockUpdateTeacherProfile.mockRejectedValue(new Error("Network error"));

      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
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
    it("should show 'Not set' for missing optional values", () => {
      render(
        <TeacherProfileEditor
          profile={{
            ...completeProfile,
            phone: null,
            subject: null,
            village: null,
          }}
          userEmail="teacher@example.com"
        />
      );

      const notSetElements = screen.getAllByText("Not set");
      expect(notSetElements.length).toBeGreaterThan(0);
    });
  });

  describe("School Code Display", () => {
    it("should display school code as read-only", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      expect(screen.getByText("School Code")).toBeInTheDocument();
      expect(screen.getByText("SCH001")).toBeInTheDocument();
    });

    it("should not allow editing school code", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      // School code should still just be text, not an input
      expect(screen.getByText("SCH001")).toBeInTheDocument();
      expect(screen.queryByLabelText(/School Code/i)).not.toBeInTheDocument();
    });
  });

  describe("Phone Input Validation Hint", () => {
    it("should show digits needed hint when phone is incomplete", () => {
      render(
        <TeacherProfileEditor
          profile={completeProfile}
          userEmail="teacher@example.com"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

      const phoneInput = screen.getByLabelText("Phone");
      fireEvent.change(phoneInput, { target: { value: "12345" } });

      expect(screen.getByText("5 more digits needed")).toBeInTheDocument();
    });
  });
});
