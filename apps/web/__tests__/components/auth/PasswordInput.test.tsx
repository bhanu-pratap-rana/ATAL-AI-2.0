/**
 * Tests for PasswordInput Component
 *
 * Tests password input functionality including:
 * - Show/hide password toggle
 * - Error and helper text display
 * - Disabled state
 * - Accessibility attributes
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from "@/components/ui/PasswordInput";

describe("PasswordInput", () => {
  const defaultProps = {
    id: "password-input",
    value: "",
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render with default label", () => {
      render(<PasswordInput {...defaultProps} />);

      expect(screen.getByText("Password")).toBeInTheDocument();
    });

    it("should render with custom label", () => {
      render(<PasswordInput {...defaultProps} label="New Password" />);

      expect(screen.getByText("New Password")).toBeInTheDocument();
    });

    it("should render input as password type by default", () => {
      render(<PasswordInput {...defaultProps} />);

      expect(screen.getByLabelText("Password")).toHaveAttribute(
        "type",
        "password"
      );
    });

    it("should render with default placeholder", () => {
      render(<PasswordInput {...defaultProps} />);

      expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    });

    it("should render with custom placeholder", () => {
      render(<PasswordInput {...defaultProps} placeholder="Enter password" />);

      expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    });
  });

  describe("show/hide toggle", () => {
    it("should show toggle button by default", () => {
      render(<PasswordInput {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /show password/i })
      ).toBeInTheDocument();
    });

    it("should toggle password visibility when button clicked", () => {
      render(<PasswordInput {...defaultProps} value="secret123" />);

      const input = screen.getByLabelText("Password");
      expect(input).toHaveAttribute("type", "password");

      fireEvent.click(screen.getByRole("button", { name: /show password/i }));

      expect(input).toHaveAttribute("type", "text");
      expect(
        screen.getByRole("button", { name: /hide password/i })
      ).toBeInTheDocument();
    });

    it("should hide toggle button when showToggle is false", () => {
      render(<PasswordInput {...defaultProps} showToggle={false} />);

      expect(
        screen.queryByRole("button", { name: /password/i })
      ).not.toBeInTheDocument();
    });

    it("should toggle back to password type", () => {
      render(<PasswordInput {...defaultProps} />);

      const input = screen.getByLabelText("Password");
      const toggleButton = screen.getByRole("button", {
        name: /show password/i,
      });

      // Show password
      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute("type", "text");

      // Hide password
      fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
      expect(input).toHaveAttribute("type", "password");
    });
  });

  describe("value handling", () => {
    it("should display value", () => {
      render(<PasswordInput {...defaultProps} value="secret123" />);

      expect(screen.getByLabelText("Password")).toHaveValue("secret123");
    });

    it("should call onChange when value changes", () => {
      const onChange = jest.fn();
      render(<PasswordInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "newpassword" },
      });

      expect(onChange).toHaveBeenCalledWith("newpassword");
    });
  });

  describe("error state", () => {
    it("should display error message", () => {
      render(<PasswordInput {...defaultProps} error="Password is required" />);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Password is required"
      );
    });

    it("should display helper text when no error", () => {
      render(
        <PasswordInput {...defaultProps} helpText="Minimum 8 characters" />
      );

      expect(screen.getByText("Minimum 8 characters")).toBeInTheDocument();
    });

    it("should not display helper when error is shown", () => {
      render(
        <PasswordInput
          {...defaultProps}
          error="Too short"
          helpText="Minimum 8 characters"
        />
      );

      expect(
        screen.queryByText("Minimum 8 characters")
      ).not.toBeInTheDocument();
      expect(screen.getByText("Too short")).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled", () => {
      render(<PasswordInput {...defaultProps} disabled />);

      expect(screen.getByLabelText("Password")).toBeDisabled();
    });

    it("should disable toggle button when input is disabled", () => {
      render(<PasswordInput {...defaultProps} disabled />);

      expect(
        screen.getByRole("button", { name: /show password/i })
      ).toBeDisabled();
    });
  });

  describe("required attribute", () => {
    it("should be required by default", () => {
      render(<PasswordInput {...defaultProps} />);

      expect(screen.getByLabelText("Password")).toBeRequired();
    });

    it("should not be required when required is false", () => {
      render(<PasswordInput {...defaultProps} required={false} />);

      expect(screen.getByLabelText("Password")).not.toBeRequired();
    });
  });

  describe("accessibility", () => {
    it("should have aria-label", () => {
      render(<PasswordInput {...defaultProps} />);

      expect(screen.getByLabelText("Password")).toHaveAttribute(
        "aria-label",
        "Password"
      );
    });

    it("should associate label with input", () => {
      render(<PasswordInput {...defaultProps} />);

      const label = screen.getByText("Password");
      expect(label).toHaveAttribute("for", "password-input");
    });
  });
});
