/**
 * Tests for Offline Page
 * Tests the PWA offline fallback page UI rendering
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import OfflinePage from "@/app/offline/page";

describe("OfflinePage", () => {
  describe("Rendering", () => {
    it("should render the offline page", () => {
      render(<OfflinePage />);

      expect(screen.getByText("You're Offline")).toBeInTheDocument();
    });

    it("should render the offline icon", () => {
      render(<OfflinePage />);

      expect(screen.getByRole("figure")).toBeInTheDocument();
    });

    it("should render connection instruction", () => {
      render(<OfflinePage />);

      expect(
        screen.getByText(/Please check your internet connection/i)
      ).toBeInTheDocument();
    });

    it("should render Try Again button", () => {
      render(<OfflinePage />);

      expect(
        screen.getByRole("button", { name: /Try Again/i })
      ).toBeInTheDocument();
    });

    it("should render Go to Home button", () => {
      render(<OfflinePage />);

      expect(
        screen.getByRole("button", { name: /Go to Home/i })
      ).toBeInTheDocument();
    });

    it("should render network status indicator", () => {
      render(<OfflinePage />);

      expect(screen.getByText(/No Internet Connection/i)).toBeInTheDocument();
    });

    it("should render ATAL AI branding", () => {
      render(<OfflinePage />);

      expect(screen.getByText("ATAL AI")).toBeInTheDocument();
    });

    it("should render cached content info", () => {
      render(<OfflinePage />);

      expect(
        screen.getByText(/Cached content may still be available/i)
      ).toBeInTheDocument();
    });

    it("should render learning continues offline text", () => {
      render(<OfflinePage />);

      expect(screen.getByText(/Learning continues offline/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have aria-label on offline icon", () => {
      render(<OfflinePage />);

      const figure = screen.getByRole("figure");
      expect(figure).toHaveAttribute("aria-label", "Offline indicator");
    });

    it("should have aria-live on status indicator", () => {
      render(<OfflinePage />);

      const output = screen.getByRole("status");
      expect(output).toHaveAttribute("aria-live", "polite");
    });

    it("should have buttons with proper roles", () => {
      render(<OfflinePage />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });
  });

  describe("Button Interactions", () => {
    it("should handle mouse hover on Try Again button", () => {
      render(<OfflinePage />);

      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });

      fireEvent.mouseOver(tryAgainButton);
      fireEvent.mouseOut(tryAgainButton);

      expect(tryAgainButton).toBeInTheDocument();
    });

    it("should handle focus on Try Again button", () => {
      render(<OfflinePage />);

      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });

      fireEvent.focus(tryAgainButton);
      fireEvent.blur(tryAgainButton);

      expect(tryAgainButton).toBeInTheDocument();
    });

    it("should handle touch on Try Again button", () => {
      render(<OfflinePage />);

      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });

      fireEvent.touchStart(tryAgainButton);
      fireEvent.touchEnd(tryAgainButton);

      expect(tryAgainButton).toBeInTheDocument();
    });

    it("should handle mouse hover on Go to Home button", () => {
      render(<OfflinePage />);

      const homeButton = screen.getByRole("button", { name: /Go to Home/i });

      fireEvent.mouseOver(homeButton);
      fireEvent.mouseOut(homeButton);

      expect(homeButton).toBeInTheDocument();
    });

    it("should handle focus on Go to Home button", () => {
      render(<OfflinePage />);

      const homeButton = screen.getByRole("button", { name: /Go to Home/i });

      fireEvent.focus(homeButton);
      fireEvent.blur(homeButton);

      expect(homeButton).toBeInTheDocument();
    });

    it("should handle touch on Go to Home button", () => {
      render(<OfflinePage />);

      const homeButton = screen.getByRole("button", { name: /Go to Home/i });

      fireEvent.touchStart(homeButton);
      fireEvent.touchEnd(homeButton);

      expect(homeButton).toBeInTheDocument();
    });
  });

  describe("Style Interactions", () => {
    it("should have proper button styling", () => {
      render(<OfflinePage />);

      const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });
      const homeButton = screen.getByRole("button", { name: /Go to Home/i });

      // Buttons should have styles applied
      expect(tryAgainButton).toHaveStyle({ width: "100%" });
      expect(homeButton).toHaveStyle({ width: "100%" });
    });

    it("should render offline emoji icon", () => {
      render(<OfflinePage />);

      // The emoji is part of the figure
      const figure = screen.getByRole("figure");
      expect(figure.textContent).toContain("📡");
    });
  });
});
