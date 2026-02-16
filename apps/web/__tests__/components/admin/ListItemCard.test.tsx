/**
 * Tests for ListItemCard component
 * Target: ~20 tests covering all modal types
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ListItemCard } from "@/components/admin/modals/ListItemCard";

describe("ListItemCard", () => {
  describe("schools modal type", () => {
    const schoolItem = {
      id: "school-1",
      schoolName: "Test School",
      schoolCode: "SCH001",
      district: "Test District",
      block: "Block A",
      hasPIN: true,
    };

    it("should render school name", () => {
      render(<ListItemCard item={schoolItem} modalType="schools" />);

      expect(screen.getByText("Test School")).toBeInTheDocument();
    });

    it("should render school code", () => {
      render(<ListItemCard item={schoolItem} modalType="schools" />);

      expect(screen.getByText("SCH001")).toBeInTheDocument();
    });

    it("should render district", () => {
      render(<ListItemCard item={schoolItem} modalType="schools" />);

      expect(screen.getByText("Test District")).toBeInTheDocument();
    });

    it("should render block when provided", () => {
      render(<ListItemCard item={schoolItem} modalType="schools" />);

      expect(screen.getByText("Block: Block A")).toBeInTheDocument();
    });

    it("should show PIN Active when hasPIN is true", () => {
      render(<ListItemCard item={schoolItem} modalType="schools" />);

      expect(screen.getByText("PIN Active")).toBeInTheDocument();
    });

    it("should show No PIN when hasPIN is false", () => {
      const schoolWithoutPIN = { ...schoolItem, hasPIN: false };
      render(<ListItemCard item={schoolWithoutPIN} modalType="schools" />);

      expect(screen.getByText("No PIN")).toBeInTheDocument();
    });

    it("should not render block when null", () => {
      const schoolNoBlock = { ...schoolItem, block: null };
      render(<ListItemCard item={schoolNoBlock} modalType="schools" />);

      expect(screen.queryByText(/Block:/)).not.toBeInTheDocument();
    });
  });

  describe("teachers modal type", () => {
    const teacherItem = {
      id: "teacher-1",
      email: "teacher@example.com",
      name: "John Teacher",
      phone: "+919876543210",
      schoolName: "Test School",
      schoolCode: "SCH001",
      createdAt: "2024-01-15T10:00:00Z",
    };

    it("should render teacher name", () => {
      render(<ListItemCard item={teacherItem} modalType="teachers" />);

      expect(screen.getByText("John Teacher")).toBeInTheDocument();
    });

    it("should render teacher email", () => {
      render(<ListItemCard item={teacherItem} modalType="teachers" />);

      expect(screen.getByText("teacher@example.com")).toBeInTheDocument();
    });

    it("should render school name and code", () => {
      render(<ListItemCard item={teacherItem} modalType="teachers" />);

      expect(screen.getByText("Test School")).toBeInTheDocument();
      expect(screen.getByText("SCH001")).toBeInTheDocument();
    });

    it("should render phone when provided", () => {
      render(<ListItemCard item={teacherItem} modalType="teachers" />);

      expect(screen.getByText("Phone: +919876543210")).toBeInTheDocument();
    });

    it("should not render phone when null", () => {
      const teacherNoPhone = { ...teacherItem, phone: null };
      render(<ListItemCard item={teacherNoPhone} modalType="teachers" />);

      expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument();
    });

    it("should render join date", () => {
      render(<ListItemCard item={teacherItem} modalType="teachers" />);

      expect(screen.getByText(/Joined:/)).toBeInTheDocument();
    });
  });

  describe("students modal type", () => {
    const studentItem = {
      id: "student-1",
      email: "student@example.com",
      phone: "+919876543210",
      createdAt: "2024-01-15T10:00:00Z",
      lastSignIn: "2024-06-20T15:30:00Z",
    };

    it("should render student email", () => {
      render(<ListItemCard item={studentItem} modalType="students" />);

      expect(screen.getByText("student@example.com")).toBeInTheDocument();
    });

    it("should render phone when provided", () => {
      render(<ListItemCard item={studentItem} modalType="students" />);

      expect(screen.getByText("+919876543210")).toBeInTheDocument();
    });

    it("should render join date", () => {
      render(<ListItemCard item={studentItem} modalType="students" />);

      expect(screen.getByText(/Joined:/)).toBeInTheDocument();
    });

    it("should render last sign in when provided", () => {
      render(<ListItemCard item={studentItem} modalType="students" />);

      expect(screen.getByText(/Last Sign In:/)).toBeInTheDocument();
    });

    it("should not render last sign in when null", () => {
      const studentNoLastSignIn = { ...studentItem, lastSignIn: null };
      render(<ListItemCard item={studentNoLastSignIn} modalType="students" />);

      expect(screen.queryByText(/Last Sign In:/)).not.toBeInTheDocument();
    });
  });

  describe("activePINs modal type", () => {
    const activePINItem = {
      schoolId: "school-1",
      schoolName: "Active PIN School",
      schoolCode: "PIN001",
      districtName: "PIN District",
      lastRotatedAt: "2024-06-01T10:00:00Z",
    };

    it("should render school name", () => {
      render(<ListItemCard item={activePINItem} modalType="activePINs" />);

      expect(screen.getByText("Active PIN School")).toBeInTheDocument();
    });

    it("should render district name", () => {
      render(<ListItemCard item={activePINItem} modalType="activePINs" />);

      expect(screen.getByText("PIN District")).toBeInTheDocument();
    });

    it("should render school code", () => {
      render(<ListItemCard item={activePINItem} modalType="activePINs" />);

      expect(screen.getByText("PIN001")).toBeInTheDocument();
    });

    it("should render last rotated date", () => {
      render(<ListItemCard item={activePINItem} modalType="activePINs" />);

      expect(screen.getByText(/Last Rotated:/)).toBeInTheDocument();
    });

    it("should not render last rotated when null", () => {
      const noRotation = { ...activePINItem, lastRotatedAt: null };
      render(<ListItemCard item={noRotation} modalType="activePINs" />);

      expect(screen.queryByText(/Last Rotated:/)).not.toBeInTheDocument();
    });
  });

  describe("inactivePINs modal type", () => {
    const inactivePINItem = {
      id: "school-2",
      schoolName: "Inactive PIN School",
      schoolCode: "NO001",
      district: "Inactive District",
    };

    it("should render school name", () => {
      render(<ListItemCard item={inactivePINItem} modalType="inactivePINs" />);

      expect(screen.getByText("Inactive PIN School")).toBeInTheDocument();
    });

    it("should render district", () => {
      render(<ListItemCard item={inactivePINItem} modalType="inactivePINs" />);

      expect(screen.getByText("Inactive District")).toBeInTheDocument();
    });

    it("should render school code", () => {
      render(<ListItemCard item={inactivePINItem} modalType="inactivePINs" />);

      expect(screen.getByText("NO001")).toBeInTheDocument();
    });

    it("should render No active PIN message", () => {
      render(<ListItemCard item={inactivePINItem} modalType="inactivePINs" />);

      expect(screen.getByText("No active PIN")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should have card styling with border", () => {
      const { container } = render(
        <ListItemCard
          item={{ id: "1", schoolName: "Test", schoolCode: "T1", district: "D1" }}
          modalType="schools"
        />
      );

      expect(container.querySelector(".bg-surface")).toBeInTheDocument();
      expect(container.querySelector(".border")).toBeInTheDocument();
      expect(container.querySelector(".rounded-md")).toBeInTheDocument();
    });
  });
});
