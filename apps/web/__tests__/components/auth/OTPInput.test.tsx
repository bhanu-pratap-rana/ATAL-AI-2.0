/**
 * Tests for OTPInput Component
 *
 * Tests OTP input functionality including:
 * - Rendering label and input
 * - Numeric-only input filtering
 * - Error and helper text display
 * - Disabled state
 * - Accessibility attributes
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { OTPInput } from "@/components/auth/OTPInput";

describe("OTPInput", () => {
  const defaultProps = {
    id: "otp-input",
    label: "Verification Code",
    value: "",
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render label", () => {
      render(<OTPInput {...defaultProps} />);

      expect(screen.getByText("Verification Code")).toBeInTheDocument();
    });

    it("should render input with correct type", () => {
      render(<OTPInput {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("inputMode", "numeric");
    });

    it("should render with default placeholder", () => {
      render(<OTPInput {...defaultProps} />);

      expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
    });

    it("should render with custom placeholder", () => {
      render(<OTPInput {...defaultProps} placeholder="------" />);

      expect(screen.getByPlaceholderText("------")).toBeInTheDocument();
    });

    it("should render default helper text", () => {
      render(<OTPInput {...defaultProps} />);

      expect(screen.getByText("Enter the 6-digit code")).toBeInTheDocument();
    });
  });

  describe("value handling", () => {
    it("should display value", () => {
      render(<OTPInput {...defaultProps} value="123456" />);

      expect(screen.getByRole("textbox")).toHaveValue("123456");
    });

    it("should call onChange with numeric-only value", () => {
      const onChange = jest.fn();
      render(<OTPInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "12ab34" },
      });

      expect(onChange).toHaveBeenCalledWith("1234");
    });

    it("should truncate value to maxLength", () => {
      const onChange = jest.fn();
      render(<OTPInput {...defaultProps} onChange={onChange} maxLength={6} />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "12345678" },
      });

      expect(onChange).toHaveBeenCalledWith("123456");
    });

    it("should filter out non-numeric characters", () => {
      const onChange = jest.fn();
      render(<OTPInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "abc123def" },
      });

      expect(onChange).toHaveBeenCalledWith("123");
    });
  });

  describe("error state", () => {
    it("should display error message when error prop is provided", () => {
      render(<OTPInput {...defaultProps} error="Invalid code" />);

      expect(screen.getByRole("alert")).toHaveTextContent("Invalid code");
    });

    it("should not display helper text when error is shown", () => {
      render(
        <OTPInput
          {...defaultProps}
          error="Invalid code"
          helperText="Enter code"
        />
      );

      expect(screen.queryByText("Enter code")).not.toBeInTheDocument();
      expect(screen.getByText("Invalid code")).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled prop is true", () => {
      render(<OTPInput {...defaultProps} disabled />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("should have aria-label", () => {
      render(<OTPInput {...defaultProps} />);

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-label",
        "Verification Code"
      );
    });

    it("should be marked as required", () => {
      render(<OTPInput {...defaultProps} />);

      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("should associate label with input via htmlFor", () => {
      render(<OTPInput {...defaultProps} />);

      const label = screen.getByText("Verification Code");
      expect(label).toHaveAttribute("for", "otp-input");
    });
  });

  describe("autoFocus", () => {
    it("should not auto-focus by default", () => {
      render(<OTPInput {...defaultProps} />);

      expect(screen.getByRole("textbox")).not.toHaveFocus();
    });

    it("should auto-focus when autoFocus is true", () => {
      render(<OTPInput {...defaultProps} autoFocus />);

      expect(screen.getByRole("textbox")).toHaveFocus();
    });
  });
});
