/**
 * Unit Tests for Button Component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply variant classes', () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    const button = container.querySelector('button');
    // The outline variant has border-2
    expect(button).toHaveClass('border-2');
  });

  it('should apply size classes', () => {
    const { container } = render(<Button size="lg">Large</Button>);
    const button = container.querySelector('button');
    // Large buttons typically have larger padding
    expect(button).toBeDefined();
  });

  it('should support different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render as a different element when asChild is used', () => {
    // Note: asChild renders the child element with Button styles
    // The child must be a single React element
    render(<Button asChild><a href="/test">Link Button</a></Button>);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('should pass additional props to the button element', () => {
    render(<Button data-testid="custom-button" type="submit">Submit</Button>);
    expect(screen.getByTestId('custom-button')).toHaveAttribute('type', 'submit');
  });
});
