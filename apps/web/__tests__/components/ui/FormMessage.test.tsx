/**
 * Tests for FormMessage component
 * Target: ~15 tests covering message types and close functionality
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormMessage } from "@/components/ui/FormMessage";

describe("FormMessage", () => {
  describe("rendering", () => {
    it("should render message text", () => {
      render(<FormMessage type="info" text="This is an info message" />);
      expect(screen.getByText("This is an info message")).toBeInTheDocument();
    });

    it("should have alert role for accessibility", () => {
      render(<FormMessage type="error" text="Error occurred" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("message types", () => {
    it("should render success message with checkmark icon", () => {
      render(<FormMessage type="success" text="Success!" />);
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("should render error message with X icon", () => {
      render(<FormMessage type="error" text="Error!" />);
      expect(screen.getByText("✕")).toBeInTheDocument();
    });

    it("should render info message with info icon", () => {
      render(<FormMessage type="info" text="Info!" />);
      expect(screen.getByText("ℹ")).toBeInTheDocument();
    });

    it("should render warning message with warning icon", () => {
      render(<FormMessage type="warning" text="Warning!" />);
      expect(screen.getByText("⚠")).toBeInTheDocument();
    });

    it("should apply success styling", () => {
      render(<FormMessage type="success" text="Success" />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bg-success/10");
      expect(alert.className).toContain("text-success-dark");
    });

    it("should apply error styling", () => {
      render(<FormMessage type="error" text="Error" />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bg-error/10");
      expect(alert.className).toContain("text-error");
    });

    it("should apply info styling", () => {
      render(<FormMessage type="info" text="Info" />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bg-info/10");
      expect(alert.className).toContain("text-info-dark");
    });

    it("should apply warning styling", () => {
      render(<FormMessage type="warning" text="Warning" />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bg-warning/10");
      expect(alert.className).toContain("text-warning-dark");
    });
  });

  describe("close button", () => {
    it("should not render close button when onClose not provided", () => {
      render(<FormMessage type="info" text="Message" />);
      expect(screen.queryByLabelText("Close message")).not.toBeInTheDocument();
    });

    it("should render close button when onClose provided", () => {
      const handleClose = jest.fn();
      render(<FormMessage type="info" text="Message" onClose={handleClose} />);
      expect(screen.getByLabelText("Close message")).toBeInTheDocument();
    });

    it("should call onClose when close button clicked", () => {
      const handleClose = jest.fn();
      render(<FormMessage type="info" text="Message" onClose={handleClose} />);

      fireEvent.click(screen.getByLabelText("Close message"));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("should render close button with × character", () => {
      const handleClose = jest.fn();
      render(<FormMessage type="info" text="Message" onClose={handleClose} />);
      expect(screen.getByText("×")).toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("should merge custom className", () => {
      render(<FormMessage type="info" text="Message" className="my-custom-class" />);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("my-custom-class");
    });
  });
});
