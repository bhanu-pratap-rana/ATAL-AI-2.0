/**
 * Tests for FormErrorHelper component
 * Target: ~10 tests covering error and helper text display
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { FormErrorHelper } from "@/components/form/FormErrorHelper";

describe("FormErrorHelper", () => {
  const defaultProps = {
    errorId: "error-id",
    helperId: "helper-id",
  };

  describe("when error is provided", () => {
    it("should render error message", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          error="This field is required"
        />
      );
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("should have alert role for accessibility", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          error="Invalid input"
        />
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should use error ID", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          errorId="my-error-id"
          error="Error message"
        />
      );
      const errorElement = screen.getByRole("alert");
      expect(errorElement).toHaveAttribute("id", "my-error-id");
    });

    it("should apply error styling", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          error="Error"
        />
      );
      const errorElement = screen.getByRole("alert");
      expect(errorElement).toHaveClass("text-error");
      expect(errorElement).toHaveClass("text-sm");
    });

    it("should prioritize error over helper text", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          error="Error message"
          helperText="Helper message"
        />
      );
      expect(screen.getByText("Error message")).toBeInTheDocument();
      expect(screen.queryByText("Helper message")).not.toBeInTheDocument();
    });
  });

  describe("when helper text is provided", () => {
    it("should render helper text when no error", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          helperText="Enter your email address"
        />
      );
      expect(screen.getByText("Enter your email address")).toBeInTheDocument();
    });

    it("should use helper ID", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          helperId="my-helper-id"
          helperText="Helper"
        />
      );
      const helperElement = screen.getByText("Helper");
      expect(helperElement).toHaveAttribute("id", "my-helper-id");
    });

    it("should apply helper text styling", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          helperText="Help"
        />
      );
      const helperElement = screen.getByText("Help");
      expect(helperElement).toHaveClass("text-text-secondary");
      expect(helperElement).toHaveClass("text-xs");
    });
  });

  describe("when neither error nor helper text provided", () => {
    it("should return null", () => {
      const { container } = render(
        <FormErrorHelper {...defaultProps} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle empty string error as falsy", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          error=""
          helperText="Helper"
        />
      );
      // Empty string is falsy, so helper should show
      expect(screen.getByText("Helper")).toBeInTheDocument();
    });

    it("should handle undefined error", () => {
      render(
        <FormErrorHelper
          {...defaultProps}
          error={undefined}
          helperText="Helper shown"
        />
      );
      expect(screen.getByText("Helper shown")).toBeInTheDocument();
    });
  });
});
