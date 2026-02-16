/**
 * Tests for AssessmentSkeleton component
 * Target: ~10 tests covering rendering and structure
 */

import React from "react";
import { render } from "@testing-library/react";
import { AssessmentSkeleton } from "@/components/assessment/AssessmentSkeleton";

describe("AssessmentSkeleton", () => {
  describe("rendering", () => {
    it("should render without crashing", () => {
      render(<AssessmentSkeleton />);

      // Main container should exist
      expect(document.querySelector(".min-h-screen")).toBeInTheDocument();
    });

    it("should have correct background color class", () => {
      render(<AssessmentSkeleton />);

      const container = document.querySelector(".bg-cream");
      expect(container).toBeInTheDocument();
    });

    it("should be centered with max-width", () => {
      render(<AssessmentSkeleton />);

      const maxWidthContainer = document.querySelector(".max-w-3xl");
      expect(maxWidthContainer).toBeInTheDocument();
    });
  });

  describe("progress bar skeleton", () => {
    it("should render progress bar skeleton area", () => {
      render(<AssessmentSkeleton />);

      // Progress bar area with animation
      const progressArea = document.querySelector(".mb-6.animate-pulse");
      expect(progressArea).toBeInTheDocument();
    });

    it("should have skeleton placeholders for progress info", () => {
      render(<AssessmentSkeleton />);

      // Progress text placeholders
      const skeletonBars = document.querySelectorAll(".h-4.bg-border.rounded");
      expect(skeletonBars.length).toBeGreaterThanOrEqual(2);
    });

    it("should have rounded-full progress bar skeleton", () => {
      render(<AssessmentSkeleton />);

      const progressBar = document.querySelector(".h-2.bg-border.rounded-full");
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("question card skeleton", () => {
    it("should render question card with gradient border", () => {
      render(<AssessmentSkeleton />);

      const gradientCard = document.querySelector(".card-gradient");
      expect(gradientCard).toBeInTheDocument();
    });

    it("should have white background card inside", () => {
      render(<AssessmentSkeleton />);

      const whiteCard = document.querySelector(".bg-white.rounded-xl");
      expect(whiteCard).toBeInTheDocument();
    });

    it("should render module badge skeleton", () => {
      render(<AssessmentSkeleton />);

      const moduleBadge = document.querySelector(".bg-primary-light.rounded-full");
      expect(moduleBadge).toBeInTheDocument();
    });
  });

  describe("options skeleton", () => {
    it("should render 4 option skeletons", () => {
      render(<AssessmentSkeleton />);

      // Look for option containers with border
      const options = document.querySelectorAll(".border-2.border-border.bg-surface");
      expect(options.length).toBe(4);
    });

    it("should have radio button placeholders in options", () => {
      render(<AssessmentSkeleton />);

      // Radio button circles
      const radioCircles = document.querySelectorAll(".rounded-full.border-2.border-border.bg-white");
      expect(radioCircles.length).toBe(4);
    });
  });

  describe("button skeleton", () => {
    it("should render button skeleton", () => {
      render(<AssessmentSkeleton />);

      const buttonSkeleton = document.querySelector(".h-11.bg-border.rounded-md");
      expect(buttonSkeleton).toBeInTheDocument();
    });

    it("should be positioned at right side", () => {
      render(<AssessmentSkeleton />);

      const buttonContainer = document.querySelector(".flex.justify-end");
      expect(buttonContainer).toBeInTheDocument();
    });
  });

  describe("helper text skeleton", () => {
    it("should render helper text skeletons", () => {
      render(<AssessmentSkeleton />);

      // Helper text area
      const helperArea = document.querySelector(".mt-4.space-y-2");
      expect(helperArea).toBeInTheDocument();
    });

    it("should have centered helper text placeholders", () => {
      render(<AssessmentSkeleton />);

      // Centered skeleton text
      const centeredPlaceholders = document.querySelectorAll(".mx-auto");
      expect(centeredPlaceholders.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("animation", () => {
    it("should have pulse animation on skeleton elements", () => {
      render(<AssessmentSkeleton />);

      const animatedElements = document.querySelectorAll(".animate-pulse");
      expect(animatedElements.length).toBeGreaterThanOrEqual(2);
    });
  });
});
