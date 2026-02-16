/**
 * Tests for StatisticsDashboard component
 * Target: ~12 tests covering statistics display
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { StatisticsDashboard } from "@/components/admin/pins/StatisticsDashboard";

describe("StatisticsDashboard", () => {
  const defaultStats = {
    totalSchools: 100,
    schoolsWithPINs: 75,
  };

  describe("rendering", () => {
    it("should render nothing when stats is null", () => {
      const { container } = render(<StatisticsDashboard stats={null} />);

      expect(container.firstChild).toBeNull();
    });

    it("should render when stats are provided", () => {
      render(<StatisticsDashboard stats={defaultStats} />);

      expect(screen.getByText("Total Schools")).toBeInTheDocument();
    });

    it("should render three stat cards", () => {
      render(<StatisticsDashboard stats={defaultStats} />);

      expect(screen.getByText("Total Schools")).toBeInTheDocument();
      expect(screen.getByText("With PIN")).toBeInTheDocument();
      expect(screen.getByText("Without PIN")).toBeInTheDocument();
    });
  });

  describe("total schools display", () => {
    it("should display total schools count", () => {
      render(<StatisticsDashboard stats={defaultStats} />);

      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("should display different total schools count", () => {
      render(<StatisticsDashboard stats={{ ...defaultStats, totalSchools: 250 }} />);

      expect(screen.getByText("250")).toBeInTheDocument();
    });
  });

  describe("schools with PIN display", () => {
    it("should display schools with PIN count", () => {
      render(<StatisticsDashboard stats={defaultStats} />);

      expect(screen.getByText("75")).toBeInTheDocument();
    });

    it("should display correct percentage for schools with PIN", () => {
      render(<StatisticsDashboard stats={defaultStats} />);

      // 75/100 = 75%
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should calculate percentage correctly for different values", () => {
      render(<StatisticsDashboard stats={{ totalSchools: 200, schoolsWithPINs: 50 }} />);

      // 50/200 = 25%
      expect(screen.getByText("25%")).toBeInTheDocument();
    });
  });

  describe("schools without PIN display", () => {
    it("should calculate schools without PIN", () => {
      render(<StatisticsDashboard stats={defaultStats} />);

      // 100 - 75 = 25
      expect(screen.getByText("25")).toBeInTheDocument();
    });

    it("should display correct percentage for schools without PIN", () => {
      render(<StatisticsDashboard stats={defaultStats} />);

      // 25/100 = 25%
      // The component shows both 75% and 25%
      const percentages = screen.getAllByText("25%");
      expect(percentages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("edge cases", () => {
    it("should handle zero schools with PINs", () => {
      render(<StatisticsDashboard stats={{ totalSchools: 50, schoolsWithPINs: 0 }} />);

      expect(screen.getByText("0")).toBeInTheDocument();
      // 50 appears twice - once for total and once for without PIN
      const fifties = screen.getAllByText("50");
      expect(fifties.length).toBe(2);
    });

    it("should handle all schools having PINs", () => {
      render(<StatisticsDashboard stats={{ totalSchools: 50, schoolsWithPINs: 50 }} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("should round percentages correctly", () => {
      // 33/100 = 33%
      render(<StatisticsDashboard stats={{ totalSchools: 100, schoolsWithPINs: 33 }} />);

      expect(screen.getByText("33%")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should have grid layout with 3 columns", () => {
      const { container } = render(<StatisticsDashboard stats={defaultStats} />);

      const grid = container.firstChild;
      expect(grid).toHaveClass("grid-cols-3");
    });

    it("should have success border on PIN card", () => {
      const { container } = render(<StatisticsDashboard stats={defaultStats} />);

      const cards = container.querySelectorAll(".border-l-success");
      expect(cards.length).toBe(1);
    });

    it("should have warning border on no PIN card", () => {
      const { container } = render(<StatisticsDashboard stats={defaultStats} />);

      const cards = container.querySelectorAll(".border-l-warning");
      expect(cards.length).toBe(1);
    });
  });
});
