/**
 * Tests for ModuleCard component
 * Target: ~18 tests covering module card display and states
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ModuleCard, Module, ModuleProgress } from "@/components/learn/ModuleCard";

// Mock Next.js Link
jest.mock("next/link", () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock Card components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
}));

// Mock Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, className, variant }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <button className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

describe("ModuleCard", () => {
  const defaultModule: Module = {
    id: "module-1",
    name_en: "Introduction to AI",
    name_as: "এ আই পৰিচয়",
    description: "Learn the basics of artificial intelligence",
    icon: "🤖",
    topics: 5,
    color: "from-blue-500 to-blue-600",
    culturalNote: "AI in Assamese context",
  };

  const defaultProgress: ModuleProgress = {
    module_id: "module-1",
    topics_completed: 2,
    average_mastery: 75,
    is_complete: false,
  };

  const defaultProps = {
    module: defaultModule,
    progress: defaultProgress,
    progressPercent: 40,
    isUnlocked: true,
    index: 1,
  };

  describe("rendering", () => {
    it("should render module name", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.getByText("Introduction to AI")).toBeInTheDocument();
    });

    it("should render module name in Assamese", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.getByText("এ আই পৰিচয়")).toBeInTheDocument();
    });

    it("should render module icon", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.getByText("🤖")).toBeInTheDocument();
    });

    it("should render module description", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.getByText("Learn the basics of artificial intelligence")).toBeInTheDocument();
    });

    it("should render cultural note when provided", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.getByText(/AI in Assamese context/)).toBeInTheDocument();
    });

    it("should not render cultural note when not provided", () => {
      const moduleWithoutNote = { ...defaultModule, culturalNote: undefined };
      render(<ModuleCard {...defaultProps} module={moduleWithoutNote} />);
      expect(screen.queryByText(/AI in Assamese context/)).not.toBeInTheDocument();
    });
  });

  describe("progress display", () => {
    it("should display topics completed count", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.getByText("2/5")).toBeInTheDocument();
    });

    it("should display progress percentage", () => {
      render(<ModuleCard {...defaultProps} progressPercent={40} />);
      expect(screen.getByText("40% complete")).toBeInTheDocument();
    });

    it("should display average mastery", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.getByText("Avg: 75%")).toBeInTheDocument();
    });
  });

  describe("completion state", () => {
    it("should show checkmark when module is complete", () => {
      const completeProgress = { ...defaultProgress, is_complete: true };
      render(<ModuleCard {...defaultProps} progress={completeProgress} />);
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("should not show checkmark when module is incomplete", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.queryByText("✓")).not.toBeInTheDocument();
    });

    it("should show Review Module button when complete", () => {
      const completeProgress = { ...defaultProgress, is_complete: true };
      render(<ModuleCard {...defaultProps} progress={completeProgress} />);
      expect(screen.getByText("Review Module")).toBeInTheDocument();
    });
  });

  describe("unlocked state", () => {
    it("should show Continue Learning when in progress", () => {
      render(<ModuleCard {...defaultProps} />);
      expect(screen.getByText("Continue Learning")).toBeInTheDocument();
    });

    it("should show Start Module when not started", () => {
      const noProgress = { ...defaultProgress, topics_completed: 0 };
      render(<ModuleCard {...defaultProps} progress={noProgress} />);
      expect(screen.getByText("Start Module")).toBeInTheDocument();
    });

    it("should link to module page", () => {
      render(<ModuleCard {...defaultProps} />);
      const link = screen.getByTestId("next-link");
      expect(link).toHaveAttribute("href", "/app/learn/module-1");
    });
  });

  describe("locked state", () => {
    it("should show lock icon when locked", () => {
      render(<ModuleCard {...defaultProps} isUnlocked={false} />);
      expect(screen.getByText("🔒")).toBeInTheDocument();
    });

    it("should show unlock message when locked", () => {
      render(<ModuleCard {...defaultProps} isUnlocked={false} index={1} />);
      expect(screen.getByText("Complete Module 1 to unlock")).toBeInTheDocument();
    });

    it("should not show button when locked", () => {
      render(<ModuleCard {...defaultProps} isUnlocked={false} />);
      expect(screen.queryByText("Continue Learning")).not.toBeInTheDocument();
      expect(screen.queryByText("Start Module")).not.toBeInTheDocument();
    });

    it("should not link to module page when locked", () => {
      render(<ModuleCard {...defaultProps} isUnlocked={false} />);
      expect(screen.queryByTestId("next-link")).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should apply hover styles when unlocked", () => {
      render(<ModuleCard {...defaultProps} isUnlocked={true} />);
      const card = screen.getByTestId("card");
      expect(card.className).toContain("hover:shadow-lg");
      expect(card.className).toContain("cursor-pointer");
    });

    it("should apply disabled styles when locked", () => {
      render(<ModuleCard {...defaultProps} isUnlocked={false} />);
      const card = screen.getByTestId("card");
      expect(card.className).toContain("opacity-60");
      expect(card.className).toContain("cursor-not-allowed");
    });

    it("should apply success border when complete", () => {
      const completeProgress = { ...defaultProgress, is_complete: true };
      render(<ModuleCard {...defaultProps} progress={completeProgress} />);
      const card = screen.getByTestId("card");
      expect(card.className).toContain("border-success");
    });
  });
});
