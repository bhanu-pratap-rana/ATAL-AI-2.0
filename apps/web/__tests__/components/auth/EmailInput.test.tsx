/**
 * Tests for EmailInput Component
 *
 * Tests email input functionality including:
 * - Rendering label and input
 * - Email type attribute
 * - Error and helper text display
 * - Disabled state
 * - Accessibility attributes
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { EmailInput } from "@/components/auth/EmailInput";

describe("EmailInput", () => {
  const defaultProps = {
    id: "email-input",
    value: "",
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render with default label", () => {
      render(<EmailInput {...defaultProps} />);

      expect(screen.getByText("Email Address")).toBeInTheDocument();
    });

    it("should render with custom label", () => {
      render(<EmailInput {...defaultProps} label="Work Email" />);

      expect(screen.getByText("Work Email")).toBeInTheDocument();
    });

    it("should render input with email type", () => {
      render(<EmailInput {...defaultProps} />);

      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });

    it("should render with default placeholder", () => {
      render(<EmailInput {...defaultProps} />);

      expect(
        screen.getByPlaceholderText("you@example.com")
      ).toBeInTheDocument();
    });

    it("should render with custom placeholder", () => {
      render(<EmailInput {...defaultProps} placeholder="email@domain.com" />);

      expect(
        screen.getByPlaceholderText("email@domain.com")
      ).toBeInTheDocument();
    });
  });

  describe("value handling", () => {
    it("should display value", () => {
      render(<EmailInput {...defaultProps} value="test@example.com" />);

      expect(screen.getByRole("textbox")).toHaveValue("test@example.com");
    });

    it("should call onChange when value changes", () => {
      const onChange = jest.fn();
      render(<EmailInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "new@email.com" },
      });

      expect(onChange).toHaveBeenCalledWith("new@email.com");
    });
  });

  describe("error state", () => {
    it("should display error message", () => {
      render(<EmailInput {...defaultProps} error="Invalid email format" />);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid email format"
      );
    });

    it("should display helper text when no error", () => {
      render(
        <EmailInput {...defaultProps} helperText="We'll never share your email" />
      );

      expect(
        screen.getByText("We'll never share your email")
      ).toBeInTheDocument();
    });

    it("should not display helper when error is shown", () => {
      render(
        <EmailInput
          {...defaultProps}
          error="Required"
          helperText="Enter your email"
        />
      );

      expect(screen.queryByText("Enter your email")).not.toBeInTheDocument();
      expect(screen.getByText("Required")).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled", () => {
      render(<EmailInput {...defaultProps} disabled />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should allow input when not disabled", () => {
      render(<EmailInput {...defaultProps} />);

      expect(screen.getByRole("textbox")).not.toBeDisabled();
    });
  });

  describe("required attribute", () => {
    it("should be required by default", () => {
      render(<EmailInput {...defaultProps} />);

      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("should not be required when required is false", () => {
      render(<EmailInput {...defaultProps} required={false} />);

      expect(screen.getByRole("textbox")).not.toBeRequired();
    });
  });

  describe("accessibility", () => {
    it("should have aria-label", () => {
      render(<EmailInput {...defaultProps} />);

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-label",
        "Email Address"
      );
    });

    it("should associate label with input via htmlFor", () => {
      render(<EmailInput {...defaultProps} />);

      const label = screen.getByText("Email Address");
      expect(label).toHaveAttribute("for", "email-input");
    });
  });

  describe("autoFocus", () => {
    it("should not auto-focus by default", () => {
      render(<EmailInput {...defaultProps} />);

      expect(screen.getByRole("textbox")).not.toHaveFocus();
    });

    it("should auto-focus when autoFocus is true", () => {
      render(<EmailInput {...defaultProps} autoFocus />);

      expect(screen.getByRole("textbox")).toHaveFocus();
    });
  });
});
