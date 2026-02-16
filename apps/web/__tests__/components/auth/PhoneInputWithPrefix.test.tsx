/**
 * Tests for PhoneInputWithPrefix component
 * Target: ~15 tests covering phone input behavior
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhoneInputWithPrefix } from "@/components/auth/PhoneInputWithPrefix";

// Mock UI components
jest.mock("@/components/ui/input", () => ({
  Input: ({
    id,
    type,
    placeholder,
    value,
    onChange,
    disabled,
    maxLength,
    autoFocus,
    required,
    className,
    inputMode,
  }: {
    id?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    disabled?: boolean;
    maxLength?: number;
    autoFocus?: boolean;
    required?: boolean;
    className?: string;
    inputMode?: string;
  }) => (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      maxLength={maxLength}
      autoFocus={autoFocus}
      required={required}
      className={className}
      inputMode={inputMode}
    />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock("@/lib/form-utils", () => ({
  getInputDescriptionId: (id: string, error?: string, helperText?: string) =>
    error ? `${id}-error` : helperText ? `${id}-helper` : undefined,
}));

describe("PhoneInputWithPrefix", () => {
  const defaultProps = {
    id: "phone",
    value: "",
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render label", () => {
      render(<PhoneInputWithPrefix {...defaultProps} />);
      expect(screen.getByText("Phone Number")).toBeInTheDocument();
    });

    it("should render custom label", () => {
      render(<PhoneInputWithPrefix {...defaultProps} label="Mobile Number" />);
      expect(screen.getByText("Mobile Number")).toBeInTheDocument();
    });

    it("should render default prefix +91", () => {
      render(<PhoneInputWithPrefix {...defaultProps} />);
      expect(screen.getByText("+91")).toBeInTheDocument();
    });

    it("should render custom prefix", () => {
      render(<PhoneInputWithPrefix {...defaultProps} prefix="+1" />);
      expect(screen.getByText("+1")).toBeInTheDocument();
    });

    it("should render input with placeholder", () => {
      render(<PhoneInputWithPrefix {...defaultProps} />);
      expect(screen.getByPlaceholderText("9876543210")).toBeInTheDocument();
    });

    it("should render custom placeholder", () => {
      render(
        <PhoneInputWithPrefix {...defaultProps} placeholder="Enter phone" />
      );
      expect(screen.getByPlaceholderText("Enter phone")).toBeInTheDocument();
    });
  });

  describe("input behavior", () => {
    it("should call onChange with numeric value only", () => {
      const onChange = jest.fn();
      render(<PhoneInputWithPrefix {...defaultProps} onChange={onChange} />);

      const input = screen.getByPlaceholderText("9876543210");
      fireEvent.change(input, { target: { value: "abc123def456" } });

      expect(onChange).toHaveBeenCalledWith("123456");
    });

    it("should truncate value to maxLength", () => {
      const onChange = jest.fn();
      render(
        <PhoneInputWithPrefix
          {...defaultProps}
          onChange={onChange}
          maxLength={5}
        />
      );

      const input = screen.getByPlaceholderText("9876543210");
      fireEvent.change(input, { target: { value: "12345678" } });

      expect(onChange).toHaveBeenCalledWith("12345");
    });

    it("should respect default maxLength of 10", () => {
      const onChange = jest.fn();
      render(<PhoneInputWithPrefix {...defaultProps} onChange={onChange} />);

      const input = screen.getByPlaceholderText("9876543210");
      fireEvent.change(input, { target: { value: "12345678901234" } });

      expect(onChange).toHaveBeenCalledWith("1234567890");
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled is true", () => {
      render(<PhoneInputWithPrefix {...defaultProps} disabled={true} />);
      const input = screen.getByPlaceholderText("9876543210");
      expect(input).toBeDisabled();
    });
  });

  describe("error state", () => {
    it("should display error message", () => {
      render(
        <PhoneInputWithPrefix {...defaultProps} error="Invalid phone number" />
      );
      expect(screen.getByText("Invalid phone number")).toBeInTheDocument();
    });

    it("should have role=alert on error", () => {
      render(
        <PhoneInputWithPrefix {...defaultProps} error="Invalid phone number" />
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("helper text", () => {
    it("should display default helper text", () => {
      render(<PhoneInputWithPrefix {...defaultProps} />);
      expect(
        screen.getByText("Enter 10-digit phone number")
      ).toBeInTheDocument();
    });

    it("should display custom helper text", () => {
      render(
        <PhoneInputWithPrefix {...defaultProps} helperText="Custom helper" />
      );
      expect(screen.getByText("Custom helper")).toBeInTheDocument();
    });
  });
});
