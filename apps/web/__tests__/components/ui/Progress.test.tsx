/**
 * Tests for Progress Component
 *
 * Tests progress bar rendering including:
 * - Default rendering
 * - Value display
 * - Custom className
 * - Value edge cases
 */

import { render } from "@testing-library/react";
import { Progress } from "@/components/ui/progress";

describe("Progress", () => {
  describe("rendering", () => {
    it("should render progress bar", () => {
      const { container } = render(<Progress value={50} />);

      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should have correct base styling", () => {
      const { container } = render(<Progress value={50} />);

      const progressWrapper = container.firstChild as HTMLElement;
      expect(progressWrapper).toHaveClass(
        "relative",
        "h-4",
        "w-full",
        "overflow-hidden",
        "rounded-full"
      );
    });
  });

  describe("value handling", () => {
    it("should set correct transform for 75% value", () => {
      const { container } = render(<Progress value={75} />);

      // The inner progress bar (second div)
      const wrapper = container.firstChild as HTMLElement;
      const progressBar = wrapper.firstChild as HTMLElement;
      expect(progressBar.style.transform).toBe("translateX(-25%)");
    });

    it("should set correct transform for 0% value", () => {
      const { container } = render(<Progress value={0} />);

      const wrapper = container.firstChild as HTMLElement;
      const progressBar = wrapper.firstChild as HTMLElement;
      expect(progressBar.style.transform).toBe("translateX(-100%)");
    });

    it("should set correct transform for 100% value", () => {
      const { container } = render(<Progress value={100} />);

      const wrapper = container.firstChild as HTMLElement;
      const progressBar = wrapper.firstChild as HTMLElement;
      expect(progressBar.style.transform).toBe("translateX(-0%)");
    });

    it("should handle undefined value as 0", () => {
      const { container } = render(<Progress />);

      const wrapper = container.firstChild as HTMLElement;
      const progressBar = wrapper.firstChild as HTMLElement;
      expect(progressBar.style.transform).toBe("translateX(-100%)");
    });

    it("should set correct transform for 50% value (half full)", () => {
      const { container } = render(<Progress value={50} />);

      const wrapper = container.firstChild as HTMLElement;
      const progressBar = wrapper.firstChild as HTMLElement;
      expect(progressBar.style.transform).toBe("translateX(-50%)");
    });
  });

  describe("styling", () => {
    it("should apply custom className to wrapper", () => {
      const { container } = render(
        <Progress value={50} className="custom-class" />
      );

      const progressWrapper = container.firstChild as HTMLElement;
      expect(progressWrapper).toHaveClass("custom-class");
    });

    it("should have primary background on progress bar", () => {
      const { container } = render(<Progress value={50} />);

      const wrapper = container.firstChild as HTMLElement;
      const progressBar = wrapper.firstChild as HTMLElement;
      expect(progressBar).toHaveClass("bg-primary");
    });

    it("should have transition-all class for smooth animation", () => {
      const { container } = render(<Progress value={50} />);

      const wrapper = container.firstChild as HTMLElement;
      const progressBar = wrapper.firstChild as HTMLElement;
      expect(progressBar).toHaveClass("transition-all");
    });
  });

  describe("ref forwarding", () => {
    it("should forward ref to the wrapper element", () => {
      const ref = jest.fn();
      render(<Progress value={50} ref={ref} />);

      expect(ref).toHaveBeenCalled();
    });
  });
});
