/**
 * Tests for InfoBox Component
 *
 * Tests info box rendering including:
 * - Default variant
 * - Different variants (info, warning, success, error)
 * - Title rendering
 * - Icon rendering
 * - Custom className
 */

import { render, screen } from "@testing-library/react";
import { InfoBox } from "@/components/auth/InfoBox";

describe("InfoBox", () => {
  describe("content rendering", () => {
    it("should render children content", () => {
      render(<InfoBox>Test message</InfoBox>);

      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    it("should render title when provided", () => {
      render(<InfoBox title="Important">Content</InfoBox>);

      expect(screen.getByText("Important")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("should render icon when provided", () => {
      render(<InfoBox icon={<span data-testid="icon">ℹ️</span>}>Content</InfoBox>);

      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });

    it("should not render icon when not provided", () => {
      render(<InfoBox>Content</InfoBox>);

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("variants", () => {
    it("should render with default variant styling", () => {
      render(<InfoBox>Default</InfoBox>);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-primary-light", "border-primary");
    });

    it("should render with info variant", () => {
      render(<InfoBox variant="info">Info</InfoBox>);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-info-light", "border-info");
    });

    it("should render with warning variant", () => {
      render(<InfoBox variant="warning">Warning</InfoBox>);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-warning-light", "border-warning");
    });

    it("should render with success variant", () => {
      render(<InfoBox variant="success">Success</InfoBox>);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-success-light", "border-success");
    });

    it("should render with error variant", () => {
      render(<InfoBox variant="error">Error</InfoBox>);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-error-light", "border-error");
    });
  });

  describe("accessibility", () => {
    it("should have role=alert", () => {
      render(<InfoBox>Content</InfoBox>);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should have base styling classes", () => {
      render(<InfoBox>Content</InfoBox>);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("rounded-xl", "p-4", "border-l-4");
    });

    it("should apply custom className", () => {
      render(<InfoBox className="custom-class">Content</InfoBox>);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("custom-class");
    });
  });

  describe("title styling", () => {
    it("should have font-semibold class on title", () => {
      render(<InfoBox title="My Title">Content</InfoBox>);

      const title = screen.getByText("My Title");
      expect(title).toHaveClass("font-semibold");
    });
  });

  describe("complex content", () => {
    it("should render with all props", () => {
      render(
        <InfoBox
          variant="success"
          title="Success!"
          icon={<span>✅</span>}
          className="my-4"
        >
          Operation completed successfully.
        </InfoBox>
      );

      expect(screen.getByText("Success!")).toBeInTheDocument();
      expect(screen.getByText("✅")).toBeInTheDocument();
      expect(
        screen.getByText("Operation completed successfully.")
      ).toBeInTheDocument();

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("bg-success-light", "my-4");
    });
  });
});
