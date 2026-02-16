/**
 * Tests for AuthCard.tsx
 * Target: ~10 tests covering auth card presentation and layout
 */

import { render, screen } from "@testing-library/react";
import { AuthCard } from "@/components/auth/AuthCard";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src, ...props }: { alt: string; src: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} {...props} />
  ),
}));

describe("AuthCard", () => {
  const defaultProps = {
    title: "Welcome",
    children: <div>Test Content</div>,
  };

  describe("rendering", () => {
    it("should render the card with title", () => {
      render(<AuthCard {...defaultProps} />);

      expect(screen.getByRole("heading", { name: "Welcome", level: 2 })).toBeInTheDocument();
    });

    it("should render the ATAL AI branding", () => {
      render(<AuthCard {...defaultProps} />);

      expect(screen.getByRole("heading", { name: "ATAL AI Tutorial", level: 1 })).toBeInTheDocument();
    });

    it("should render the subtitle", () => {
      render(<AuthCard {...defaultProps} />);

      expect(screen.getByText("Smart Learning Platform")).toBeInTheDocument();
    });

    it("should render the logo", () => {
      render(<AuthCard {...defaultProps} />);

      const logo = screen.getByAltText("ATAL AI Logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/assets/logo.png");
    });

    it("should render children content", () => {
      render(<AuthCard {...defaultProps} />);

      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });
  });

  describe("description", () => {
    it("should render description when provided", () => {
      render(<AuthCard {...defaultProps} description="Please sign in to continue" />);

      expect(screen.getByText("Please sign in to continue")).toBeInTheDocument();
    });

    it("should not render description element when not provided", () => {
      const { container } = render(<AuthCard {...defaultProps} />);

      // The card header div should not have a description paragraph
      const cardHeader = container.querySelector(".mb-5.sm\\:mb-6.md\\:mb-7");
      const paragraphs = cardHeader?.querySelectorAll("p");

      // Check that there's no description paragraph (only the main subtitle outside the card)
      expect(paragraphs?.length ?? 0).toBe(0);
    });
  });

  describe("multiple children", () => {
    it("should render multiple children", () => {
      render(
        <AuthCard title="Sign In">
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button type="submit">Sign In</button>
        </AuthCard>
      );

      expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<AuthCard {...defaultProps} />);

      const h1 = screen.getByRole("heading", { level: 1 });
      const h2 = screen.getByRole("heading", { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
    });

    it("should have alt text for logo image", () => {
      render(<AuthCard {...defaultProps} />);

      const logo = screen.getByRole("img");
      expect(logo).toHaveAttribute("alt", "ATAL AI Logo");
    });
  });
});
