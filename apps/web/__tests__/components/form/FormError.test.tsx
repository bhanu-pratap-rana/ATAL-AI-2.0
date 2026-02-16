/**
 * Tests for FormError Components
 *
 * Tests error display including:
 * - Conditional rendering
 * - Accessibility attributes
 * - Dismissible functionality
 * - Custom icons
 * - Error lists
 */

import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormError,
  FormErrorWithSuggestion,
  FormErrorList,
} from "@/components/form/FormError";

describe("FormError", () => {
  describe("conditional rendering", () => {
    it("should not render when error is null", () => {
      const { container } = render(<FormError error={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render when error is undefined", () => {
      const { container } = render(<FormError error={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render when error is empty string", () => {
      const { container } = render(<FormError error="" />);
      expect(container.firstChild).toBeNull();
    });

    it("should render when error is provided", () => {
      render(<FormError error="Test error" />);
      expect(screen.getByText("Test error")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have role=alert", () => {
      render(<FormError error="Error message" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should have aria-live=polite", () => {
      render(<FormError error="Error message" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "polite");
    });

    it("should have data-testid when provided", () => {
      render(<FormError error="Error" testId="custom-error" />);
      expect(screen.getByTestId("custom-error")).toBeInTheDocument();
    });
  });

  describe("icon", () => {
    it("should render default warning emoji icon", () => {
      render(<FormError error="Error message" />);
      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("should render custom icon when provided", () => {
      render(<FormError error="Error" icon={<span>🔴</span>} />);
      expect(screen.getByText("🔴")).toBeInTheDocument();
    });

    it("should render no icon when icon is null", () => {
      render(<FormError error="Error" icon={null} />);
      expect(screen.queryByText("⚠️")).not.toBeInTheDocument();
    });
  });

  describe("dismissible", () => {
    it("should not show dismiss button by default", () => {
      render(<FormError error="Error" />);
      expect(
        screen.queryByRole("button", { name: /dismiss/i })
      ).not.toBeInTheDocument();
    });

    it("should show dismiss button when dismissible is true", () => {
      render(<FormError error="Error" dismissible onDismiss={() => {}} />);
      expect(
        screen.getByRole("button", { name: /dismiss/i })
      ).toBeInTheDocument();
    });

    it("should call onDismiss when dismiss button is clicked", () => {
      const onDismiss = jest.fn();
      render(<FormError error="Error" dismissible onDismiss={onDismiss} />);

      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("should not show dismiss button if onDismiss is not provided", () => {
      render(<FormError error="Error" dismissible />);
      expect(
        screen.queryByRole("button", { name: /dismiss/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should have default error styling", () => {
      render(<FormError error="Error" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("text-error");
    });

    it("should apply custom className", () => {
      render(<FormError error="Error" className="custom-class" />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("custom-class");
    });
  });
});

describe("FormErrorWithSuggestion", () => {
  it("should not render when error is null", () => {
    const { container } = render(<FormErrorWithSuggestion error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render error message", () => {
    render(<FormErrorWithSuggestion error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("should render suggestion button when suggestion and handler provided", () => {
    render(
      <FormErrorWithSuggestion
        error="Invalid email"
        suggestion="john@gmail.com"
        onSuggestionClick={() => {}}
      />
    );

    expect(
      screen.getByText(/Use suggestion: john@gmail.com/i)
    ).toBeInTheDocument();
  });

  it("should not render suggestion when suggestion is null", () => {
    render(
      <FormErrorWithSuggestion
        error="Invalid email"
        suggestion={null}
        onSuggestionClick={() => {}}
      />
    );

    expect(screen.queryByText(/Use suggestion/i)).not.toBeInTheDocument();
  });

  it("should call onSuggestionClick when clicked", () => {
    const onSuggestionClick = jest.fn();
    render(
      <FormErrorWithSuggestion
        error="Invalid email"
        suggestion="john@gmail.com"
        onSuggestionClick={onSuggestionClick}
      />
    );

    fireEvent.click(screen.getByText(/Use suggestion/i));

    expect(onSuggestionClick).toHaveBeenCalledTimes(1);
  });

  it("should use custom suggestion label", () => {
    render(
      <FormErrorWithSuggestion
        error="Error"
        suggestion="corrected"
        onSuggestionClick={() => {}}
        suggestionLabel="Did you mean"
      />
    );

    expect(screen.getByText(/Did you mean: corrected/i)).toBeInTheDocument();
  });
});

describe("FormErrorList", () => {
  it("should not render when errors is null", () => {
    const { container } = render(<FormErrorList errors={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("should not render when errors is empty array", () => {
    const { container } = render(<FormErrorList errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render list of errors", () => {
    render(<FormErrorList errors={["Error 1", "Error 2", "Error 3"]} />);

    expect(screen.getByText("Error 1")).toBeInTheDocument();
    expect(screen.getByText("Error 2")).toBeInTheDocument();
    expect(screen.getByText("Error 3")).toBeInTheDocument();
  });

  it("should render title when provided", () => {
    render(
      <FormErrorList errors={["Error"]} title="Password requirements:" />
    );

    expect(screen.getByText("Password requirements:")).toBeInTheDocument();
  });

  it("should have role=alert", () => {
    render(<FormErrorList errors={["Error"]} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should have data-testid when provided", () => {
    render(<FormErrorList errors={["Error"]} testId="error-list" />);
    expect(screen.getByTestId("error-list")).toBeInTheDocument();
  });

  it("should render as unordered list", () => {
    render(<FormErrorList errors={["Error 1", "Error 2"]} />);

    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();
    expect(list.tagName).toBe("UL");
  });
});
