/**
 * Tests for IconBox component
 * Target: ~10 tests covering icon display with sizes
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { IconBox } from "@/components/ui/icon-box";

describe("IconBox", () => {
  describe("rendering", () => {
    it("should render children", () => {
      render(<IconBox>📚</IconBox>);
      expect(screen.getByText("📚")).toBeInTheDocument();
    });

    it("should render as div element", () => {
      const { container } = render(<IconBox>🎯</IconBox>);
      expect(container.firstChild?.nodeName).toBe("DIV");
    });

    it("should apply default classes", () => {
      const { container } = render(<IconBox>📊</IconBox>);
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveClass("flex");
      expect(box).toHaveClass("items-center");
      expect(box).toHaveClass("justify-center");
      expect(box).toHaveClass("rounded-xl");
      expect(box).toHaveClass("bg-primary-light");
    });
  });

  describe("size prop", () => {
    it("should apply default (md) size classes", () => {
      const { container } = render(<IconBox>🔔</IconBox>);
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveClass("w-12");
      expect(box).toHaveClass("h-12");
      expect(box).toHaveClass("text-xl");
    });

    it("should apply sm size classes", () => {
      const { container } = render(<IconBox size="sm">🌟</IconBox>);
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveClass("w-10");
      expect(box).toHaveClass("h-10");
      expect(box).toHaveClass("text-lg");
    });

    it("should apply md size classes explicitly", () => {
      const { container } = render(<IconBox size="md">💡</IconBox>);
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveClass("w-12");
      expect(box).toHaveClass("h-12");
      expect(box).toHaveClass("text-xl");
    });

    it("should apply lg size classes", () => {
      const { container } = render(<IconBox size="lg">🎉</IconBox>);
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveClass("w-16");
      expect(box).toHaveClass("h-16");
      expect(box).toHaveClass("text-2xl");
    });
  });

  describe("className prop", () => {
    it("should merge custom className", () => {
      const { container } = render(
        <IconBox className="custom-class">🔥</IconBox>
      );
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveClass("custom-class");
      expect(box).toHaveClass("rounded-xl"); // Still has default classes
    });

    it("should allow overriding default classes", () => {
      const { container } = render(
        <IconBox className="bg-red-500">⭐</IconBox>
      );
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveClass("bg-red-500");
    });
  });

  describe("with different content", () => {
    it("should render emoji content", () => {
      render(<IconBox>🚀</IconBox>);
      expect(screen.getByText("🚀")).toBeInTheDocument();
    });

    it("should render text content", () => {
      render(<IconBox>AB</IconBox>);
      expect(screen.getByText("AB")).toBeInTheDocument();
    });

    it("should render element content", () => {
      render(
        <IconBox>
          <span data-testid="inner">Icon</span>
        </IconBox>
      );
      expect(screen.getByTestId("inner")).toBeInTheDocument();
    });
  });
});
