/**
 * Tests for QuickGuideCard component
 * Target: ~8 tests covering rendering and content
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { QuickGuideCard } from "@/components/admin/pins/QuickGuideCard";

describe("QuickGuideCard", () => {
  describe("rendering", () => {
    it("should render the heading", () => {
      render(<QuickGuideCard />);

      expect(screen.getByRole("heading", { name: "How to manage school PINs" })).toBeInTheDocument();
    });

    it("should render the book emoji icon", () => {
      render(<QuickGuideCard />);

      expect(screen.getByText("📚")).toBeInTheDocument();
    });

    it("should render all five instruction steps", () => {
      render(<QuickGuideCard />);

      expect(screen.getByText(/Search for a school by name or code/)).toBeInTheDocument();
      expect(screen.getByText(/Click on a school from the suggestions/)).toBeInTheDocument();
      expect(screen.getByText(/View the current PIN status/)).toBeInTheDocument();
      expect(screen.getByText(/Generate and rotate a new PIN if needed/)).toBeInTheDocument();
      expect(screen.getByText(/Copy the PIN to share with school staff/)).toBeInTheDocument();
    });

    it("should render the tip section", () => {
      render(<QuickGuideCard />);

      expect(screen.getByText(/💡 Tip:/)).toBeInTheDocument();
      expect(screen.getByText(/Generate a new PIN to help schools verify their identity/)).toBeInTheDocument();
    });

    it("should render an ordered list", () => {
      render(<QuickGuideCard />);

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
      expect(list.tagName.toLowerCase()).toBe("ol");
    });

    it("should have five list items", () => {
      render(<QuickGuideCard />);

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(5);
    });

    it("should have proper styling classes", () => {
      const { container } = render(<QuickGuideCard />);

      // Check for cyan border styling
      expect(container.querySelector(".border-cyan")).toBeInTheDocument();
      expect(container.querySelector(".border-l-4")).toBeInTheDocument();
    });
  });
});
