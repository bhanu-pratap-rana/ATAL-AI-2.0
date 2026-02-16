/**
 * Tests for AssessmentTimer.tsx
 * Target: ~10 tests covering timer display and behavior
 */

import { render, screen } from "@testing-library/react";
import { AssessmentTimer, CompactTimer } from "@/components/assessment/AssessmentTimer";

// Mock the useTimer hook
jest.mock("@/hooks/useTimer", () => ({
  useTimer: jest.fn().mockReturnValue(0),
  formatTimeMMSS: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  },
}));

import { useTimer } from "@/hooks/useTimer";

describe("AssessmentTimer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTimer as jest.Mock).mockReturnValue(0);
  });

  describe("rendering", () => {
    it("should render with timer role", () => {
      render(<AssessmentTimer />);

      expect(screen.getByRole("timer")).toBeInTheDocument();
    });

    it("should display initial time as 00:00", () => {
      render(<AssessmentTimer />);

      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("should display timer icon", () => {
      render(<AssessmentTimer />);

      expect(screen.getByText("⏱️")).toBeInTheDocument();
    });

    it("should have accessible label", () => {
      render(<AssessmentTimer />);

      const timer = screen.getByRole("timer");
      expect(timer).toHaveAttribute("aria-label", expect.stringContaining("Elapsed time"));
    });

    it("should apply custom className", () => {
      render(<AssessmentTimer className="custom-class" />);

      const timer = screen.getByRole("timer");
      expect(timer).toHaveClass("custom-class");
    });
  });

  describe("time display", () => {
    it("should display formatted time from useTimer", () => {
      (useTimer as jest.Mock).mockReturnValue(125); // 2:05

      render(<AssessmentTimer />);

      expect(screen.getByText("02:05")).toBeInTheDocument();
    });

    it("should display large times correctly", () => {
      (useTimer as jest.Mock).mockReturnValue(3661); // 61:01

      render(<AssessmentTimer />);

      expect(screen.getByText("61:01")).toBeInTheDocument();
    });
  });

  describe("props passing", () => {
    it("should pass isPaused to useTimer", () => {
      render(<AssessmentTimer isPaused={true} />);

      expect(useTimer).toHaveBeenCalledWith(
        expect.objectContaining({ isPaused: true })
      );
    });

    it("should pass initialSeconds to useTimer", () => {
      render(<AssessmentTimer initialSeconds={60} />);

      expect(useTimer).toHaveBeenCalledWith(
        expect.objectContaining({ initialSeconds: 60 })
      );
    });

    it("should pass onTimeUpdate callback to useTimer", () => {
      const onTimeUpdate = jest.fn();
      render(<AssessmentTimer onTimeUpdate={onTimeUpdate} />);

      expect(useTimer).toHaveBeenCalledWith(
        expect.objectContaining({ onTimeUpdate })
      );
    });
  });
});

describe("CompactTimer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTimer as jest.Mock).mockReturnValue(0);
  });

  describe("rendering", () => {
    it("should render with timer role", () => {
      render(<CompactTimer />);

      expect(screen.getByRole("timer")).toBeInTheDocument();
    });

    it("should display time without icon", () => {
      render(<CompactTimer />);

      expect(screen.getByText("00:00")).toBeInTheDocument();
      expect(screen.queryByText("⏱️")).not.toBeInTheDocument();
    });

    it("should have accessible label", () => {
      render(<CompactTimer />);

      const timer = screen.getByRole("timer");
      expect(timer).toHaveAttribute("aria-label", expect.stringContaining("Elapsed time"));
    });
  });

  describe("time display", () => {
    it("should display formatted time from useTimer", () => {
      (useTimer as jest.Mock).mockReturnValue(90); // 1:30

      render(<CompactTimer />);

      expect(screen.getByText("01:30")).toBeInTheDocument();
    });
  });

  describe("props passing", () => {
    it("should pass props to useTimer", () => {
      const onTimeUpdate = jest.fn();
      render(
        <CompactTimer
          isPaused={true}
          initialSeconds={30}
          onTimeUpdate={onTimeUpdate}
        />
      );

      expect(useTimer).toHaveBeenCalledWith({
        isPaused: true,
        initialSeconds: 30,
        onTimeUpdate,
      });
    });
  });
});
