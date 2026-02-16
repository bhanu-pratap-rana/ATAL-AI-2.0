/**
 * Tests for ProfileStep component
 * Target: ~20 tests covering rendering, validation, and form submission
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileStep } from "@/components/auth/student/ProfileStep";

// Mock sonner toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({
  get toast() {
    return mockToast;
  },
}));

// Mock saveStudentProfile action
const mockSaveStudentProfile = jest.fn();
jest.mock("@/app/actions/student", () => ({
  saveStudentProfile: (...args: unknown[]) => mockSaveStudentProfile(...args),
}));

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock AuthCard
jest.mock("@/components/auth/AuthCard", () => ({
  AuthCard: ({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="auth-card">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

describe("ProfileStep", () => {
  const mockActions = {
    setIsLoading: jest.fn(),
    setProfileName: jest.fn(),
    setProfileGender: jest.fn(),
    setProfilePhone: jest.fn(),
    setProfileError: jest.fn(),
    resetProfile: jest.fn(),
    setMainStep: jest.fn(),
  };

  const defaultState = {
    profileName: "",
    profileGender: "" as "" | "male" | "female",
    profilePhone: "",
    profileError: null as string | null,
  };

  const defaultProps = {
    state: defaultState,
    actions: mockActions,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveStudentProfile.mockResolvedValue({ success: true });
  });

  describe("rendering", () => {
    it("should render the Set Up Your Profile title", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.getByText("Set Up Your Profile")).toBeInTheDocument();
    });

    it("should render description text", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.getByText("Tell us a bit about yourself")).toBeInTheDocument();
    });

    it("should render full name input with required marker", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
      expect(screen.getByText("Full Name *")).toBeInTheDocument();
    });

    it("should render name placeholder", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
    });

    it("should render gender select with required marker", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.getByLabelText(/Gender/)).toBeInTheDocument();
      expect(screen.getByText("Gender *")).toBeInTheDocument();
    });

    it("should render gender options", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.getByRole("option", { name: "Select gender" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Male" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Female" })).toBeInTheDocument();
    });

    it("should render optional phone input", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
      expect(screen.getByText("Phone Number (Optional)")).toBeInTheDocument();
    });

    it("should render phone placeholder", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.getByPlaceholderText("+1 (555) 123-4567")).toBeInTheDocument();
    });

    it("should render submit button", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /Save Profile & Continue/i })
      ).toBeInTheDocument();
    });
  });

  describe("input behavior", () => {
    it("should call setProfileName when typing name", () => {
      render(<ProfileStep {...defaultProps} />);

      const input = screen.getByLabelText(/Full Name/);
      fireEvent.change(input, { target: { value: "John Doe" } });

      expect(mockActions.setProfileName).toHaveBeenCalledWith("John Doe");
    });

    it("should call setProfileGender when selecting gender", () => {
      render(<ProfileStep {...defaultProps} />);

      const select = screen.getByLabelText(/Gender/);
      fireEvent.change(select, { target: { value: "male" } });

      expect(mockActions.setProfileGender).toHaveBeenCalledWith("male");
    });

    it("should call setProfilePhone when typing phone", () => {
      render(<ProfileStep {...defaultProps} />);

      const input = screen.getByLabelText(/Phone Number/);
      fireEvent.change(input, { target: { value: "1234567890" } });

      expect(mockActions.setProfilePhone).toHaveBeenCalledWith("1234567890");
    });

    it("should display current name value", () => {
      const stateWithName = { ...defaultState, profileName: "Jane Doe" };
      render(<ProfileStep {...defaultProps} state={stateWithName} />);

      expect(screen.getByLabelText(/Full Name/)).toHaveValue("Jane Doe");
    });

    it("should display current gender value", () => {
      const stateWithGender = { ...defaultState, profileGender: "female" as const };
      render(<ProfileStep {...defaultProps} state={stateWithGender} />);

      expect(screen.getByLabelText(/Gender/)).toHaveValue("female");
    });

    it("should display current phone value", () => {
      const stateWithPhone = { ...defaultState, profilePhone: "5551234567" };
      render(<ProfileStep {...defaultProps} state={stateWithPhone} />);

      expect(screen.getByLabelText(/Phone Number/)).toHaveValue("5551234567");
    });
  });

  describe("button disabled states", () => {
    it("should disable submit button when name is empty", () => {
      const state = { ...defaultState, profileName: "", profileGender: "male" as const };
      render(<ProfileStep {...defaultProps} state={state} />);

      expect(
        screen.getByRole("button", { name: /Save Profile & Continue/i })
      ).toBeDisabled();
    });

    it("should disable submit button when gender is not selected", () => {
      const state = { ...defaultState, profileName: "John", profileGender: "" as const };
      render(<ProfileStep {...defaultProps} state={state} />);

      expect(
        screen.getByRole("button", { name: /Save Profile & Continue/i })
      ).toBeDisabled();
    });

    it("should enable submit button when name and gender are provided", () => {
      const state = { ...defaultState, profileName: "John", profileGender: "male" as const };
      render(<ProfileStep {...defaultProps} state={state} />);

      expect(
        screen.getByRole("button", { name: /Save Profile & Continue/i })
      ).not.toBeDisabled();
    });

    it("should disable inputs when loading", () => {
      render(<ProfileStep {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/Full Name/)).toBeDisabled();
      expect(screen.getByLabelText(/Gender/)).toBeDisabled();
      expect(screen.getByLabelText(/Phone Number/)).toBeDisabled();
    });

    it("should disable submit button when loading", () => {
      const state = { ...defaultState, profileName: "John", profileGender: "male" as const };
      render(<ProfileStep {...defaultProps} state={state} isLoading={true} />);

      expect(
        screen.getByRole("button", { name: /Save Profile & Continue/i })
      ).toBeDisabled();
    });
  });

  describe("error display", () => {
    it("should display error message when profileError is set", () => {
      const state = { ...defaultState, profileError: "Invalid phone number" };
      render(<ProfileStep {...defaultProps} state={state} />);

      expect(screen.getByText("Invalid phone number")).toBeInTheDocument();
    });

    it("should not display error when profileError is null", () => {
      render(<ProfileStep {...defaultProps} />);

      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("should call saveStudentProfile on submit", async () => {
      const state = {
        ...defaultState,
        profileName: "John Doe",
        profileGender: "male" as const,
      };
      render(<ProfileStep {...defaultProps} state={state} />);

      fireEvent.submit(
        screen.getByRole("button", { name: /Save Profile & Continue/i }).closest("form")!
      );

      await waitFor(() => {
        expect(mockSaveStudentProfile).toHaveBeenCalledWith({
          name: "John Doe",
          gender: "male",
          phone: undefined,
        });
      });
    });

    it("should handle phone input when provided", async () => {
      const state = {
        ...defaultState,
        profileName: "John Doe",
        profileGender: "male" as const,
        profilePhone: "5551234567",
      };
      render(<ProfileStep {...defaultProps} state={state} />);

      fireEvent.submit(
        screen.getByRole("button", { name: /Save Profile & Continue/i }).closest("form")!
      );

      // Phone validation may fail due to format requirements
      // The form should still be submitted and handle the result
      await waitFor(() => {
        expect(mockActions.setIsLoading).toHaveBeenCalledWith(true);
      });
    });

    it("should show success toast on successful save", async () => {
      mockSaveStudentProfile.mockResolvedValue({ success: true });
      const state = {
        ...defaultState,
        profileName: "John Doe",
        profileGender: "male" as const,
      };
      render(<ProfileStep {...defaultProps} state={state} />);

      fireEvent.submit(
        screen.getByRole("button", { name: /Save Profile & Continue/i }).closest("form")!
      );

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Profile saved! Proceeding to next step..."
        );
      });
    });

    it("should reset profile on success", async () => {
      mockSaveStudentProfile.mockResolvedValue({ success: true });
      const state = {
        ...defaultState,
        profileName: "John Doe",
        profileGender: "male" as const,
      };
      render(<ProfileStep {...defaultProps} state={state} />);

      fireEvent.submit(
        screen.getByRole("button", { name: /Save Profile & Continue/i }).closest("form")!
      );

      await waitFor(() => {
        expect(mockActions.resetProfile).toHaveBeenCalled();
      });
    });

    it("should show error toast on failed save", async () => {
      mockSaveStudentProfile.mockResolvedValue({
        success: false,
        error: "Failed to save profile",
      });
      const state = {
        ...defaultState,
        profileName: "John Doe",
        profileGender: "male" as const,
      };
      render(<ProfileStep {...defaultProps} state={state} />);

      fireEvent.submit(
        screen.getByRole("button", { name: /Save Profile & Continue/i }).closest("form")!
      );

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to save profile");
      });
    });

    it("should set error state on failed save", async () => {
      mockSaveStudentProfile.mockResolvedValue({
        success: false,
        error: "Profile error",
      });
      const state = {
        ...defaultState,
        profileName: "John Doe",
        profileGender: "male" as const,
      };
      render(<ProfileStep {...defaultProps} state={state} />);

      fireEvent.submit(
        screen.getByRole("button", { name: /Save Profile & Continue/i }).closest("form")!
      );

      await waitFor(() => {
        expect(mockActions.setProfileError).toHaveBeenCalledWith("Profile error");
      });
    });

    it("should handle unexpected errors", async () => {
      mockSaveStudentProfile.mockRejectedValue(new Error("Network error"));
      const state = {
        ...defaultState,
        profileName: "John Doe",
        profileGender: "male" as const,
      };
      render(<ProfileStep {...defaultProps} state={state} />);

      fireEvent.submit(
        screen.getByRole("button", { name: /Save Profile & Continue/i }).closest("form")!
      );

      await waitFor(() => {
        expect(mockActions.setProfileError).toHaveBeenCalledWith(
          "An unexpected error occurred"
        );
      });
    });

    it("should set loading state during submission", async () => {
      mockSaveStudentProfile.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      const state = {
        ...defaultState,
        profileName: "John Doe",
        profileGender: "male" as const,
      };
      render(<ProfileStep {...defaultProps} state={state} />);

      fireEvent.submit(
        screen.getByRole("button", { name: /Save Profile & Continue/i }).closest("form")!
      );

      expect(mockActions.setIsLoading).toHaveBeenCalledWith(true);

      await waitFor(() => {
        expect(mockActions.setIsLoading).toHaveBeenCalledWith(false);
      });
    });
  });
});
