/**
 * Tests for Home Page
 * Tests the role selection landing page
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage(props: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) {
    return (
      <img
        src={props.src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        className={props.className}
      />
    );
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the welcome title", () => {
      render(<HomePage />);

      expect(screen.getByText("Welcome to ATAL AI")).toBeInTheDocument();
    });

    it("should render role selection description", () => {
      render(<HomePage />);

      expect(
        screen.getByText("Choose your role to get started")
      ).toBeInTheDocument();
    });

    it("should render Teacher button", () => {
      render(<HomePage />);

      expect(
        screen.getByRole("button", { name: /I'm a Teacher/i })
      ).toBeInTheDocument();
    });

    it("should render Student button", () => {
      render(<HomePage />);

      expect(
        screen.getByRole("button", { name: /I'm a Student/i })
      ).toBeInTheDocument();
    });

    it("should render teacher icon", () => {
      render(<HomePage />);

      expect(screen.getByText("👨‍🏫")).toBeInTheDocument();
    });

    it("should render student icon", () => {
      render(<HomePage />);

      expect(screen.getByText("🎓")).toBeInTheDocument();
    });

    it("should render teacher description", () => {
      render(<HomePage />);

      expect(
        screen.getByText(/Register with school credentials/i)
      ).toBeInTheDocument();
    });

    it("should render student description", () => {
      render(<HomePage />);

      expect(
        screen.getByText(/Sign in or create account/i)
      ).toBeInTheDocument();
    });

    it("should render info box", () => {
      render(<HomePage />);

      expect(screen.getByText(/New here\?/i)).toBeInTheDocument();
    });

    it("should render info about teachers needing verification", () => {
      render(<HomePage />);

      expect(
        screen.getByText(/Teachers need school verification/i)
      ).toBeInTheDocument();
    });

    it("should render info about student sign-in options", () => {
      render(<HomePage />);

      expect(
        screen.getByText(/Students can join with email, phone, or as a guest/i)
      ).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to teacher start page when Teacher button is clicked", () => {
      render(<HomePage />);

      const teacherButton = screen.getByRole("button", { name: /I'm a Teacher/i });
      fireEvent.click(teacherButton);

      expect(mockPush).toHaveBeenCalledWith("/teacher/start");
    });

    it("should navigate to student start page when Student button is clicked", () => {
      render(<HomePage />);

      const studentButton = screen.getByRole("button", { name: /I'm a Student/i });
      fireEvent.click(studentButton);

      expect(mockPush).toHaveBeenCalledWith("/student/start");
    });
  });

  describe("Accessibility", () => {
    it("should have buttons with proper roles", () => {
      render(<HomePage />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("should have info section with helpful content", () => {
      render(<HomePage />);

      expect(screen.getByText("💡 New here?")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should render Teacher button with default variant", () => {
      render(<HomePage />);

      const teacherButton = screen.getByRole("button", { name: /I'm a Teacher/i });
      expect(teacherButton).toBeInTheDocument();
    });

    it("should render Student button with outline variant", () => {
      render(<HomePage />);

      const studentButton = screen.getByRole("button", { name: /I'm a Student/i });
      expect(studentButton).toBeInTheDocument();
    });
  });
});
