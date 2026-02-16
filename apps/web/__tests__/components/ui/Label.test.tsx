/**
 * Tests for Label UI component
 * Target: ~10 tests covering label rendering and styling
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Label } from "@/components/ui/label";

describe("Label", () => {
  describe("rendering", () => {
    it("should render label text", () => {
      render(<Label>Email Address</Label>);
      expect(screen.getByText("Email Address")).toBeInTheDocument();
    });

    it("should render as label element", () => {
      render(<Label>Name</Label>);
      expect(screen.getByText("Name").tagName).toBe("LABEL");
    });

    it("should apply default classes", () => {
      render(<Label data-testid="label">Test</Label>);
      const label = screen.getByTestId("label");
      expect(label).toHaveClass("text-sm");
      expect(label).toHaveClass("font-medium");
      expect(label).toHaveClass("leading-none");
    });
  });

  describe("className prop", () => {
    it("should merge custom className", () => {
      render(
        <Label data-testid="label" className="my-custom-class">
          Test
        </Label>
      );
      const label = screen.getByTestId("label");
      expect(label).toHaveClass("my-custom-class");
      expect(label).toHaveClass("text-sm");
    });

    it("should allow overriding default classes", () => {
      render(
        <Label data-testid="label" className="text-lg">
          Test
        </Label>
      );
      const label = screen.getByTestId("label");
      expect(label).toHaveClass("text-lg");
    });
  });

  describe("htmlFor prop", () => {
    it("should associate label with input via htmlFor", () => {
      render(
        <>
          <Label htmlFor="email-input">Email</Label>
          <input id="email-input" type="email" />
        </>
      );

      const input = screen.getByLabelText("Email");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "email");
    });
  });

  describe("ref forwarding", () => {
    it("should forward ref to label element", () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Test</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe("additional props", () => {
    it("should pass through additional props", () => {
      render(
        <Label data-testid="label" aria-describedby="help-text">
          Field
        </Label>
      );
      expect(screen.getByTestId("label")).toHaveAttribute(
        "aria-describedby",
        "help-text"
      );
    });

    it("should support onClick handler", () => {
      const handleClick = jest.fn();
      render(<Label onClick={handleClick}>Clickable Label</Label>);

      screen.getByText("Clickable Label").click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("with form inputs", () => {
    it("should work with checkbox input", () => {
      render(
        <div className="flex items-center gap-2">
          <input id="terms" type="checkbox" />
          <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
      );

      const checkbox = screen.getByLabelText("Accept terms and conditions");
      expect(checkbox).toHaveAttribute("type", "checkbox");
    });

    it("should work with radio input", () => {
      render(
        <div className="flex items-center gap-2">
          <input id="option1" type="radio" name="options" />
          <Label htmlFor="option1">Option 1</Label>
        </div>
      );

      const radio = screen.getByLabelText("Option 1");
      expect(radio).toHaveAttribute("type", "radio");
    });
  });
});
