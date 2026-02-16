/**
 * Tests for TabNavigation component
 * Target: ~15 tests covering tab navigation behavior
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabNavigation } from "@/components/student/TabNavigation";

describe("TabNavigation", () => {
  const defaultTabs = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "learn", label: "Learn", icon: "📚" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];

  const defaultProps = {
    tabs: defaultTabs,
    activeTab: "home",
    onTabChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render all tabs", () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Learn")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    it("should render tab icons", () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByText("🏠")).toBeInTheDocument();
      expect(screen.getByText("📚")).toBeInTheDocument();
      expect(screen.getByText("👤")).toBeInTheDocument();
    });

    it("should render tablist role", () => {
      render(<TabNavigation {...defaultProps} />);
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("should render tab role for each button", () => {
      render(<TabNavigation {...defaultProps} />);
      expect(screen.getAllByRole("tab")).toHaveLength(3);
    });
  });

  describe("active tab", () => {
    it("should mark active tab with aria-selected", () => {
      render(<TabNavigation {...defaultProps} activeTab="learn" />);

      const learnTab = screen.getByRole("tab", { name: /Learn/i });
      const homeTab = screen.getByRole("tab", { name: /Home/i });

      expect(learnTab).toHaveAttribute("aria-selected", "true");
      expect(homeTab).toHaveAttribute("aria-selected", "false");
    });

    it("should apply active styling to selected tab", () => {
      render(<TabNavigation {...defaultProps} activeTab="home" />);

      const homeTab = screen.getByRole("tab", { name: /Home/i });
      expect(homeTab.className).toContain("bg-gradient-primary");
      expect(homeTab.className).toContain("text-white");
    });

    it("should apply inactive styling to non-selected tabs", () => {
      render(<TabNavigation {...defaultProps} activeTab="home" />);

      const learnTab = screen.getByRole("tab", { name: /Learn/i });
      expect(learnTab.className).toContain("bg-transparent");
      expect(learnTab.className).toContain("text-text-secondary");
    });
  });

  describe("interaction", () => {
    it("should call onTabChange when tab clicked", () => {
      const onTabChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={onTabChange} />);

      fireEvent.click(screen.getByRole("tab", { name: /Learn/i }));

      expect(onTabChange).toHaveBeenCalledWith("learn");
    });

    it("should call onTabChange with correct tab id", () => {
      const onTabChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={onTabChange} />);

      fireEvent.click(screen.getByRole("tab", { name: /Profile/i }));

      expect(onTabChange).toHaveBeenCalledWith("profile");
    });
  });

  describe("disabled state", () => {
    it("should disable all tabs when disabled prop is true", () => {
      render(<TabNavigation {...defaultProps} disabled={true} />);

      const tabs = screen.getAllByRole("tab");
      tabs.forEach((tab) => {
        expect(tab).toBeDisabled();
      });
    });

    it("should apply disabled styling when disabled", () => {
      render(<TabNavigation {...defaultProps} disabled={true} />);

      const tabs = screen.getAllByRole("tab");
      tabs.forEach((tab) => {
        expect(tab.className).toContain("opacity-50");
      });
    });

    it("should set aria-disabled when disabled", () => {
      render(<TabNavigation {...defaultProps} disabled={true} />);

      const tabs = screen.getAllByRole("tab");
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute("aria-disabled", "true");
      });
    });

    it("should not call onTabChange when disabled", () => {
      const onTabChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={onTabChange} disabled={true} />);

      fireEvent.click(screen.getByRole("tab", { name: /Learn/i }));

      expect(onTabChange).not.toHaveBeenCalled();
    });
  });

  describe("individual tab disabled", () => {
    it("should disable individual tab when tab.disabled is true", () => {
      const tabsWithDisabled = [
        { id: "home", label: "Home" },
        { id: "learn", label: "Learn", disabled: true },
        { id: "profile", label: "Profile" },
      ];

      render(<TabNavigation {...defaultProps} tabs={tabsWithDisabled} />);

      expect(screen.getByRole("tab", { name: /Home/i })).not.toBeDisabled();
      expect(screen.getByRole("tab", { name: /Learn/i })).toBeDisabled();
      expect(screen.getByRole("tab", { name: /Profile/i })).not.toBeDisabled();
    });

    it("should not call onTabChange for disabled tab", () => {
      const onTabChange = jest.fn();
      const tabsWithDisabled = [
        { id: "home", label: "Home" },
        { id: "learn", label: "Learn", disabled: true },
      ];

      render(
        <TabNavigation
          {...defaultProps}
          tabs={tabsWithDisabled}
          onTabChange={onTabChange}
        />
      );

      fireEvent.click(screen.getByRole("tab", { name: /Learn/i }));

      expect(onTabChange).not.toHaveBeenCalled();
    });
  });

  describe("size variants", () => {
    it("should apply default size classes", () => {
      render(<TabNavigation {...defaultProps} />);

      const tab = screen.getByRole("tab", { name: /Home/i });
      expect(tab.className).toContain("py-2");
      expect(tab.className).toContain("px-4");
      expect(tab.className).toContain("text-sm");
    });

    it("should apply sm size classes", () => {
      render(<TabNavigation {...defaultProps} size="sm" />);

      const tab = screen.getByRole("tab", { name: /Home/i });
      expect(tab.className).toContain("py-1.5");
      expect(tab.className).toContain("px-3");
      expect(tab.className).toContain("text-xs");
    });

    it("should apply lg size classes", () => {
      render(<TabNavigation {...defaultProps} size="lg" />);

      const tab = screen.getByRole("tab", { name: /Home/i });
      expect(tab.className).toContain("py-3");
      expect(tab.className).toContain("px-5");
      expect(tab.className).toContain("text-base");
    });
  });

  describe("without icons", () => {
    it("should render tabs without icons", () => {
      const tabsWithoutIcons = [
        { id: "home", label: "Home" },
        { id: "learn", label: "Learn" },
      ];

      render(<TabNavigation {...defaultProps} tabs={tabsWithoutIcons} />);

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Learn")).toBeInTheDocument();
    });
  });
});
