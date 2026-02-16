/**
 * Tests for Card UI components
 * Target: ~15 tests covering Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card Components", () => {
  describe("Card", () => {
    it("should render children", () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("should apply default classes", () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("border");
      expect(card).toHaveClass("bg-white");
      expect(card).toHaveClass("shadow-sm");
    });

    it("should merge custom className", () => {
      render(
        <Card data-testid="card" className="my-custom-class">
          Content
        </Card>
      );
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("my-custom-class");
      expect(card).toHaveClass("rounded-lg");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should pass additional props", () => {
      render(
        <Card data-testid="card" aria-label="Test card">
          Content
        </Card>
      );
      expect(screen.getByTestId("card")).toHaveAttribute(
        "aria-label",
        "Test card"
      );
    });
  });

  describe("CardHeader", () => {
    it("should render children", () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText("Header content")).toBeInTheDocument();
    });

    it("should apply default classes", () => {
      render(<CardHeader data-testid="header">Content</CardHeader>);
      const header = screen.getByTestId("header");
      expect(header).toHaveClass("flex");
      expect(header).toHaveClass("flex-col");
      expect(header).toHaveClass("p-6");
    });

    it("should merge custom className", () => {
      render(
        <CardHeader data-testid="header" className="custom-header">
          Content
        </CardHeader>
      );
      expect(screen.getByTestId("header")).toHaveClass("custom-header");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardHeader ref={ref}>Content</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("CardTitle", () => {
    it("should render as h3 element", () => {
      render(<CardTitle>Title Text</CardTitle>);
      expect(
        screen.getByRole("heading", { level: 3, name: "Title Text" })
      ).toBeInTheDocument();
    });

    it("should apply default classes", () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId("title");
      expect(title).toHaveClass("text-2xl");
      expect(title).toHaveClass("font-semibold");
    });

    it("should merge custom className", () => {
      render(
        <CardTitle data-testid="title" className="custom-title">
          Title
        </CardTitle>
      );
      expect(screen.getByTestId("title")).toHaveClass("custom-title");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<CardTitle ref={ref}>Title</CardTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe("CardDescription", () => {
    it("should render as p element", () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText("Description text").tagName).toBe("P");
    });

    it("should apply default classes", () => {
      render(<CardDescription data-testid="desc">Text</CardDescription>);
      const desc = screen.getByTestId("desc");
      expect(desc).toHaveClass("text-sm");
      expect(desc).toHaveClass("text-text-secondary");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<CardDescription ref={ref}>Description</CardDescription>);
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe("CardContent", () => {
    it("should render children", () => {
      render(<CardContent>Content area</CardContent>);
      expect(screen.getByText("Content area")).toBeInTheDocument();
    });

    it("should apply default classes", () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId("content");
      expect(content).toHaveClass("p-6");
      expect(content).toHaveClass("pt-0");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardContent ref={ref}>Content</CardContent>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("CardFooter", () => {
    it("should render children", () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText("Footer content")).toBeInTheDocument();
    });

    it("should apply default classes", () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId("footer");
      expect(footer).toHaveClass("flex");
      expect(footer).toHaveClass("items-center");
      expect(footer).toHaveClass("p-6");
      expect(footer).toHaveClass("pt-0");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardFooter ref={ref}>Footer</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("Composition", () => {
    it("should work together as a composed card", () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>My Card Title</CardTitle>
            <CardDescription>This is a description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(
        screen.getByRole("heading", { name: "My Card Title" })
      ).toBeInTheDocument();
      expect(screen.getByText("This is a description")).toBeInTheDocument();
      expect(screen.getByText("Main content goes here")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Action" })
      ).toBeInTheDocument();
    });
  });
});
