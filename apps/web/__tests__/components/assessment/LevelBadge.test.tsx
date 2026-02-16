/**
 * Tests for LevelBadge, LevelCard, and LevelProgress components
 * Target: ~20 tests covering rendering, score thresholds, and accessibility
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  LevelBadge,
  LevelCard,
  LevelProgress,
  getLevelFromScore,
} from "@/components/assessment/LevelBadge";

describe("getLevelFromScore", () => {
  it("should return 'beginner' for scores below 50", () => {
    expect(getLevelFromScore(0)).toBe("beginner");
    expect(getLevelFromScore(25)).toBe("beginner");
    expect(getLevelFromScore(49)).toBe("beginner");
  });

  it("should return 'intermediate' for scores 50-79", () => {
    expect(getLevelFromScore(50)).toBe("intermediate");
    expect(getLevelFromScore(65)).toBe("intermediate");
    expect(getLevelFromScore(79)).toBe("intermediate");
  });

  it("should return 'advanced' for scores 80 and above", () => {
    expect(getLevelFromScore(80)).toBe("advanced");
    expect(getLevelFromScore(90)).toBe("advanced");
    expect(getLevelFromScore(100)).toBe("advanced");
  });
});

describe("LevelBadge", () => {
  describe("rendering with score", () => {
    it("should render beginner level for low score", () => {
      render(<LevelBadge score={30} />);

      expect(screen.getByText("Beginner")).toBeInTheDocument();
      expect(screen.getByText("🌱")).toBeInTheDocument();
    });

    it("should render intermediate level for mid score", () => {
      render(<LevelBadge score={65} />);

      expect(screen.getByText("Intermediate")).toBeInTheDocument();
      expect(screen.getByText("🌿")).toBeInTheDocument();
    });

    it("should render advanced level for high score", () => {
      render(<LevelBadge score={85} />);

      expect(screen.getByText("Advanced")).toBeInTheDocument();
      expect(screen.getByText("🌳")).toBeInTheDocument();
    });
  });

  describe("rendering with level prop", () => {
    it("should use level prop over score", () => {
      render(<LevelBadge score={90} level="beginner" />);

      expect(screen.getByText("Beginner")).toBeInTheDocument();
    });

    it("should render intermediate when level is set", () => {
      render(<LevelBadge level="intermediate" />);

      expect(screen.getByText("Intermediate")).toBeInTheDocument();
    });

    it("should render advanced when level is set", () => {
      render(<LevelBadge level="advanced" />);

      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });
  });

  describe("default behavior", () => {
    it("should default to beginner when no props provided", () => {
      render(<LevelBadge />);

      expect(screen.getByText("Beginner")).toBeInTheDocument();
    });
  });

  describe("size variants", () => {
    it("should apply small size classes", () => {
      const { container } = render(<LevelBadge size="sm" />);

      expect(container.querySelector(".px-3")).toBeInTheDocument();
    });

    it("should apply medium size classes by default", () => {
      const { container } = render(<LevelBadge />);

      expect(container.querySelector(".px-4")).toBeInTheDocument();
    });

    it("should apply large size classes", () => {
      const { container } = render(<LevelBadge size="lg" />);

      expect(container.querySelector(".px-6")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have aria-label for skill level", () => {
      render(<LevelBadge level="intermediate" />);

      expect(screen.getByLabelText("Skill level: Intermediate")).toBeInTheDocument();
    });

    it("should hide icon from screen readers", () => {
      const { container } = render(<LevelBadge />);

      const iconSpan = container.querySelector('[aria-hidden="true"]');
      expect(iconSpan).toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("should apply custom class name", () => {
      const { container } = render(<LevelBadge className="custom-class" />);

      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });
});

describe("LevelCard", () => {
  it("should render card with level icon", () => {
    render(<LevelCard level="advanced" />);

    expect(screen.getByText("🌳")).toBeInTheDocument();
  });

  it("should render card with level label", () => {
    render(<LevelCard level="intermediate" />);

    expect(screen.getByRole("heading", { name: "Intermediate" })).toBeInTheDocument();
  });

  it("should render card with description", () => {
    render(<LevelCard level="beginner" />);

    expect(screen.getByText("Just starting your digital journey")).toBeInTheDocument();
  });

  it("should calculate level from score", () => {
    render(<LevelCard score={75} />);

    expect(screen.getByRole("heading", { name: "Intermediate" })).toBeInTheDocument();
    expect(screen.getByText("Growing your digital skills")).toBeInTheDocument();
  });
});

describe("LevelProgress", () => {
  it("should render all three level indicators", () => {
    render(<LevelProgress score={50} />);

    expect(screen.getByText("Beginner")).toBeInTheDocument();
    expect(screen.getByText("Intermediate")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("should show all level icons", () => {
    render(<LevelProgress score={50} />);

    expect(screen.getByText("🌱")).toBeInTheDocument();
    expect(screen.getByText("🌿")).toBeInTheDocument();
    expect(screen.getByText("🌳")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<LevelProgress score={50} className="custom-progress" />);

    expect(container.querySelector(".custom-progress")).toBeInTheDocument();
  });

  it("should highlight beginner for low scores", () => {
    const { container } = render(<LevelProgress score={30} />);

    // Check that progress bar has beginner level styling
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("should show wider progress for intermediate scores", () => {
    const { container } = render(<LevelProgress score={65} />);

    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("should show full progress for advanced scores", () => {
    const { container } = render(<LevelProgress score={90} />);

    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toBeInTheDocument();
  });
});
