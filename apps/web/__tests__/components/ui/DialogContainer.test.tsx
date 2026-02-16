/**
 * Tests for DialogContainer component
 * Target: ~15 tests covering dialog display, accessibility, and interactions
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DialogContainer } from "@/components/ui/DialogContainer";

// Mock the native dialog element methods
const mockShowModal = jest.fn();
const mockClose = jest.fn();

beforeAll(() => {
  // Mock HTMLDialogElement methods not available in jsdom
  HTMLDialogElement.prototype.showModal = mockShowModal;
  HTMLDialogElement.prototype.close = mockClose;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DialogContainer", () => {
  const defaultProps = {
    open: true,
    title: "Test Dialog",
    onClose: jest.fn(),
    children: <p>Dialog content</p>,
  };

  describe("rendering", () => {
    it("should render dialog element", () => {
      const { container } = render(<DialogContainer {...defaultProps} />);
      // Dialog element may not have role accessible if not open yet, check for the element itself
      expect(container.querySelector("dialog")).toBeInTheDocument();
    });

    it("should render title", () => {
      render(<DialogContainer {...defaultProps} title="My Dialog Title" />);
      expect(screen.getByText("My Dialog Title")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(
        <DialogContainer {...defaultProps}>
          <p>Custom content here</p>
        </DialogContainer>
      );
      expect(screen.getByText("Custom content here")).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(<DialogContainer {...defaultProps} />);
      expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
    });

    it("should render close button with × symbol", () => {
      render(<DialogContainer {...defaultProps} />);
      expect(screen.getByText("×")).toBeInTheDocument();
    });
  });

  describe("open/close behavior", () => {
    it("should call showModal when open is true", () => {
      render(<DialogContainer {...defaultProps} open={true} />);
      expect(mockShowModal).toHaveBeenCalled();
    });

    it("should call close when open is false", () => {
      render(<DialogContainer {...defaultProps} open={false} />);
      expect(mockClose).toHaveBeenCalled();
    });

    it("should call onClose when close button clicked", () => {
      const onClose = jest.fn();
      render(<DialogContainer {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText("Close dialog"));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("size variants", () => {
    it("should apply sm size class", () => {
      const { container } = render(<DialogContainer {...defaultProps} size="sm" />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("max-w-sm");
    });

    it("should apply md size class by default", () => {
      const { container } = render(<DialogContainer {...defaultProps} />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("max-w-md");
    });

    it("should apply lg size class", () => {
      const { container } = render(<DialogContainer {...defaultProps} size="lg" />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("max-w-lg");
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(<DialogContainer {...defaultProps} className="custom-class" />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("custom-class");
    });

    it("should merge custom className with default classes", () => {
      const { container } = render(<DialogContainer {...defaultProps} className="my-custom" />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("bg-white");
      expect(dialog?.className).toContain("rounded-lg");
      expect(dialog?.className).toContain("my-custom");
    });
  });

  describe("accessibility", () => {
    it("should have aria-labelledby pointing to title", () => {
      const { container } = render(<DialogContainer {...defaultProps} />);
      const dialog = container.querySelector("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "dialog-title");
    });

    it("should render title with correct id", () => {
      render(<DialogContainer {...defaultProps} title="Accessible Title" />);
      const title = screen.getByText("Accessible Title");
      expect(title).toHaveAttribute("id", "dialog-title");
    });

    it("should render title as h2 element", () => {
      const { container } = render(<DialogContainer {...defaultProps} title="Heading Title" />);
      const heading = container.querySelector("h2");
      expect(heading).toHaveTextContent("Heading Title");
    });
  });

  describe("styling", () => {
    it("should have white background", () => {
      const { container } = render(<DialogContainer {...defaultProps} />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("bg-white");
    });

    it("should have rounded corners", () => {
      const { container } = render(<DialogContainer {...defaultProps} />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("rounded-lg");
    });

    it("should have shadow", () => {
      const { container } = render(<DialogContainer {...defaultProps} />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("shadow-lg");
    });

    it("should have backdrop styling", () => {
      const { container } = render(<DialogContainer {...defaultProps} />);
      const dialog = container.querySelector("dialog");
      expect(dialog?.className).toContain("backdrop:bg-black/50");
    });
  });
});
