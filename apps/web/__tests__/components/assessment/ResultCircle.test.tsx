/**
 * Tests for ResultCircle and CompactResultCircle components
 * Target: ~18 tests covering rendering, color coding, and animation
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ResultCircle, CompactResultCircle } from "@/components/assessment/ResultCircle";

describe("ResultCircle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("should render percentage display", () => {
      render(<ResultCircle percentage={75} animate={false} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should render default label", () => {
      render(<ResultCircle percentage={50} animate={false} />);

      expect(screen.getByText("Score")).toBeInTheDocument();
    });

    it("should render custom label", () => {
      render(<ResultCircle percentage={50} label="Your Result" animate={false} />);

      expect(screen.getByText("Your Result")).toBeInTheDocument();
    });

    it("should render SVG with role img", () => {
      render(<ResultCircle percentage={80} animate={false} />);

      expect(screen.getByRole("img", { name: "Score: 80%" })).toBeInTheDocument();
    });
  });

  describe("performance text", () => {
    it("should show 'Excellent!' for scores >= 80", () => {
      render(<ResultCircle percentage={85} animate={false} />);

      expect(screen.getByText("Excellent!")).toBeInTheDocument();
    });

    it("should show 'Good!' for scores >= 60", () => {
      render(<ResultCircle percentage={65} animate={false} />);

      expect(screen.getByText("Good!")).toBeInTheDocument();
    });

    it("should show 'Keep Practicing' for scores < 60", () => {
      render(<ResultCircle percentage={45} animate={false} />);

      expect(screen.getByText("Keep Practicing")).toBeInTheDocument();
    });
  });

  describe("color classes", () => {
    it("should apply success color for high scores", () => {
      const { container } = render(<ResultCircle percentage={85} animate={false} />);

      expect(container.querySelector(".text-success")).toBeInTheDocument();
    });

    it("should apply warning color for medium scores", () => {
      const { container } = render(<ResultCircle percentage={65} animate={false} />);

      expect(container.querySelector(".text-warning")).toBeInTheDocument();
    });

    it("should apply error color for low scores", () => {
      const { container } = render(<ResultCircle percentage={45} animate={false} />);

      expect(container.querySelector(".text-error")).toBeInTheDocument();
    });
  });

  describe("size customization", () => {
    it("should apply custom size", () => {
      const { container } = render(<ResultCircle percentage={50} size={200} animate={false} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "200");
      expect(svg).toHaveAttribute("height", "200");
    });

    it("should use default size of 160", () => {
      const { container } = render(<ResultCircle percentage={50} animate={false} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "160");
    });
  });

  describe("stroke width", () => {
    it("should apply custom stroke width", () => {
      const { container } = render(
        <ResultCircle percentage={50} strokeWidth={16} animate={false} />
      );

      const circles = container.querySelectorAll("circle");
      circles.forEach((circle) => {
        expect(circle).toHaveAttribute("stroke-width", "16");
      });
    });
  });

  describe("animation", () => {
    it("should start at 0 when animate is true", () => {
      render(<ResultCircle percentage={75} animate={true} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should animate to final percentage", async () => {
      render(<ResultCircle percentage={75} animate={true} />);

      // Advance timers to complete animation
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText("75%")).toBeInTheDocument();
      });
    });

    it("should show final percentage immediately when animate is false", () => {
      render(<ResultCircle percentage={75} animate={false} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("should apply custom class name", () => {
      const { container } = render(
        <ResultCircle percentage={50} className="custom-result" animate={false} />
      );

      expect(container.querySelector(".custom-result")).toBeInTheDocument();
    });
  });
});

describe("CompactResultCircle", () => {
  describe("rendering", () => {
    it("should render percentage", () => {
      render(<CompactResultCircle percentage={65} />);

      expect(screen.getByText("65%")).toBeInTheDocument();
    });

    it("should render SVG with accessibility label", () => {
      render(<CompactResultCircle percentage={80} />);

      expect(screen.getByRole("img", { name: "Score: 80%" })).toBeInTheDocument();
    });
  });

  describe("size", () => {
    it("should use default size of 64", () => {
      const { container } = render(<CompactResultCircle percentage={50} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "64");
    });

    it("should apply custom size", () => {
      const { container } = render(<CompactResultCircle percentage={50} size={48} />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "48");
    });
  });

  describe("color classes", () => {
    it("should apply success color for high scores", () => {
      const { container } = render(<CompactResultCircle percentage={90} />);

      expect(container.querySelector(".text-success")).toBeInTheDocument();
    });

    it("should apply warning color for medium scores", () => {
      const { container } = render(<CompactResultCircle percentage={70} />);

      expect(container.querySelector(".text-warning")).toBeInTheDocument();
    });

    it("should apply error color for low scores", () => {
      const { container } = render(<CompactResultCircle percentage={40} />);

      expect(container.querySelector(".text-error")).toBeInTheDocument();
    });
  });

  describe("stroke width", () => {
    it("should use default stroke width of 6", () => {
      const { container } = render(<CompactResultCircle percentage={50} />);

      const circle = container.querySelector("circle");
      expect(circle).toHaveAttribute("stroke-width", "6");
    });

    it("should apply custom stroke width", () => {
      const { container } = render(<CompactResultCircle percentage={50} strokeWidth={4} />);

      const circle = container.querySelector("circle");
      expect(circle).toHaveAttribute("stroke-width", "4");
    });
  });
});
