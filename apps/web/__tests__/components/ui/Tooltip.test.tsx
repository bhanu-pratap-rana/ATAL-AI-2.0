/**
 * Tests for Tooltip UI components
 * Target: ~10 tests covering Tooltip components
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

describe("Tooltip Components", () => {
  // Helper to render tooltip with provider
  const renderTooltip = (content: React.ReactNode = "Tooltip text") => {
    return render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent>{content}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  describe("TooltipProvider", () => {
    it("should render children", () => {
      render(
        <TooltipProvider>
          <div>Child content</div>
        </TooltipProvider>
      );
      expect(screen.getByText("Child content")).toBeInTheDocument();
    });
  });

  describe("Tooltip", () => {
    it("should render trigger button", () => {
      renderTooltip();
      expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
    });

    it("should not show tooltip content initially", () => {
      renderTooltip();
      // Use queryAllByText since Radix may render content in multiple places
      const tooltips = screen.queryAllByText("Tooltip text");
      expect(tooltips.length).toBe(0);
    });

    it("should have correct state attribute on trigger", () => {
      renderTooltip();
      const trigger = screen.getByRole("button", { name: "Hover me" });

      // Radix sets data-state attribute on trigger
      expect(trigger).toHaveAttribute("data-state", "closed");
    });
  });

  describe("TooltipTrigger", () => {
    it("should render as child element with asChild prop", () => {
      renderTooltip();
      const button = screen.getByRole("button", { name: "Hover me" });
      expect(button.tagName).toBe("BUTTON");
    });

    it("should work with different trigger elements", () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>Span trigger</span>
            </TooltipTrigger>
            <TooltipContent>Tooltip for span</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByText("Span trigger");
      expect(trigger.tagName).toBe("SPAN");
    });
  });

  describe("TooltipContent", () => {
    it("should render tooltip content with role on focus", async () => {
      renderTooltip("Test Content");
      const trigger = screen.getByRole("button", { name: "Hover me" });

      // Focus the trigger
      fireEvent.focus(trigger);

      // After focus, the tooltip should be described by its content
      await waitFor(() => {
        expect(trigger).toHaveAttribute("aria-describedby");
      });
    });
  });

  describe("keyboard interaction", () => {
    it("should show tooltip on focus", async () => {
      renderTooltip("Focus tooltip");
      const trigger = screen.getByRole("button", { name: "Hover me" });

      fireEvent.focus(trigger);

      // Radix tooltips show on focus - use findAllByText to handle duplicates
      await waitFor(() => {
        const tooltips = screen.getAllByText("Focus tooltip");
        expect(tooltips.length).toBeGreaterThan(0);
      });
    });
  });

  describe("multiple tooltips", () => {
    it("should support multiple tooltips on page", () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Button 1</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip 1</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Button 2</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip 2</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(screen.getByRole("button", { name: "Button 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Button 2" })).toBeInTheDocument();
    });
  });
});
