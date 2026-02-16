/**
 * Tests for StatCard component
 * Target: ~12 tests covering stat display with trends
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/ui/stat-card";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, whileHover, transition, ...props }: React.HTMLAttributes<HTMLDivElement> & { whileHover?: object; transition?: object }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock IconBox
jest.mock("@/components/ui/icon-box", () => ({
  IconBox: ({ children, size }: { children: React.ReactNode; size?: string }) => (
    <span data-testid="icon-box" data-size={size}>
      {children}
    </span>
  ),
}));

describe("StatCard", () => {
  const defaultProps = {
    icon: "📊",
    value: 42,
    label: "Total Items",
  };

  describe("rendering", () => {
    it("should render the icon", () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByTestId("icon-box")).toHaveTextContent("📊");
    });

    it("should render the value", () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should render string value", () => {
      render(<StatCard {...defaultProps} value="1.2K" />);
      expect(screen.getByText("1.2K")).toBeInTheDocument();
    });

    it("should render the label", () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByText("Total Items")).toBeInTheDocument();
    });

    it("should pass size to IconBox", () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.getByTestId("icon-box")).toHaveAttribute("data-size", "lg");
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <StatCard {...defaultProps} className="custom-stat" />
      );
      expect(container.firstChild).toHaveClass("custom-stat");
    });

    it("should preserve default classes", () => {
      const { container } = render(
        <StatCard {...defaultProps} className="custom" />
      );
      expect(container.firstChild).toHaveClass("bg-white");
      expect(container.firstChild).toHaveClass("rounded-xl");
    });
  });

  describe("trend display", () => {
    it("should not show trend when not provided", () => {
      render(<StatCard {...defaultProps} />);
      expect(screen.queryByText("↑")).not.toBeInTheDocument();
      expect(screen.queryByText("↓")).not.toBeInTheDocument();
    });

    it("should show positive trend with up arrow", () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: 15, isPositive: true }}
        />
      );
      expect(screen.getByText(/↑/)).toBeInTheDocument();
      expect(screen.getByText(/15%/)).toBeInTheDocument();
    });

    it("should show negative trend with down arrow", () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: 10, isPositive: false }}
        />
      );
      expect(screen.getByText(/↓/)).toBeInTheDocument();
      expect(screen.getByText(/10%/)).toBeInTheDocument();
    });

    it("should apply success color for positive trend", () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: 5, isPositive: true }}
        />
      );
      const trendElement = screen.getByText(/↑ 5%/);
      expect(trendElement).toHaveClass("text-success");
    });

    it("should apply error color for negative trend", () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: 8, isPositive: false }}
        />
      );
      const trendElement = screen.getByText(/↓ 8%/);
      expect(trendElement).toHaveClass("text-error");
    });

    it("should display absolute value for negative numbers", () => {
      render(
        <StatCard
          {...defaultProps}
          trend={{ value: -20, isPositive: false }}
        />
      );
      expect(screen.getByText(/20%/)).toBeInTheDocument();
    });
  });

  describe("different value types", () => {
    it("should render zero value", () => {
      render(<StatCard {...defaultProps} value={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should render large numbers", () => {
      render(<StatCard {...defaultProps} value={999999} />);
      expect(screen.getByText("999999")).toBeInTheDocument();
    });

    it("should render decimal numbers", () => {
      render(<StatCard {...defaultProps} value={3.14} />);
      expect(screen.getByText("3.14")).toBeInTheDocument();
    });
  });
});
