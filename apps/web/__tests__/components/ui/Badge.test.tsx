/**
 * Tests for Badge Component
 *
 * Tests badge rendering including:
 * - Default variant rendering
 * - Different variants
 * - Custom className
 * - Children rendering
 */

import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("should render children correctly", () => {
    render(<Badge>Test Badge</Badge>);

    expect(screen.getByText("Test Badge")).toBeInTheDocument();
  });

  it("should render with default variant styling", () => {
    render(<Badge>Default</Badge>);

    const badge = screen.getByText("Default");
    expect(badge).toHaveClass("bg-primary-light", "text-primary");
  });

  it("should render with success variant", () => {
    render(<Badge variant="success">Success</Badge>);

    const badge = screen.getByText("Success");
    expect(badge).toHaveClass("bg-success-light", "text-success");
  });

  it("should render with warning variant", () => {
    render(<Badge variant="warning">Warning</Badge>);

    const badge = screen.getByText("Warning");
    expect(badge).toHaveClass("bg-warning-light", "text-warning");
  });

  it("should render with error variant", () => {
    render(<Badge variant="error">Error</Badge>);

    const badge = screen.getByText("Error");
    expect(badge).toHaveClass("bg-error-light", "text-error");
  });

  it("should render with info variant", () => {
    render(<Badge variant="info">Info</Badge>);

    const badge = screen.getByText("Info");
    expect(badge).toHaveClass("bg-info-light", "text-info");
  });

  it("should render with accent variant", () => {
    render(<Badge variant="accent">Accent</Badge>);

    const badge = screen.getByText("Accent");
    expect(badge).toHaveClass("bg-accent-light", "text-accent-dark");
  });

  it("should render with secondary variant", () => {
    render(<Badge variant="secondary">Secondary</Badge>);

    const badge = screen.getByText("Secondary");
    expect(badge).toHaveClass("bg-surface-dark", "text-text-primary");
  });

  it("should apply custom className", () => {
    render(<Badge className="custom-class">Custom</Badge>);

    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("custom-class");
  });

  it("should render as a span element", () => {
    render(<Badge>Span Badge</Badge>);

    const badge = screen.getByText("Span Badge");
    expect(badge.tagName).toBe("SPAN");
  });

  it("should have base styling classes", () => {
    render(<Badge>Styled</Badge>);

    const badge = screen.getByText("Styled");
    expect(badge).toHaveClass(
      "inline-flex",
      "items-center",
      "px-3",
      "py-1",
      "text-xs",
      "font-semibold",
      "rounded-full"
    );
  });
});
