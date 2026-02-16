/**
 * Unit Tests for Input Component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('should render an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should handle text input', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');

    fireEvent.change(input, { target: { value: 'test value' } });
    expect(input).toHaveValue('test value');
  });

  it('should apply type attribute', () => {
    render(<Input type="email" data-testid="email-input" />);
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled data-testid="disabled-input" />);
    const input = screen.getByTestId('disabled-input');
    expect(input).toBeDisabled();
  });

  it('should display error message when error prop is provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should call onFocus handler', () => {
    const handleFocus = jest.fn();
    render(<Input onFocus={handleFocus} data-testid="focus-input" />);

    fireEvent.focus(screen.getByTestId('focus-input'));
    expect(handleFocus).toHaveBeenCalledTimes(1);
  });

  it('should call onBlur handler', () => {
    const handleBlur = jest.fn();
    render(<Input onBlur={handleBlur} data-testid="blur-input" />);

    fireEvent.blur(screen.getByTestId('blur-input'));
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should call onChange handler', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="change-input" />);

    fireEvent.change(screen.getByTestId('change-input'), { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    render(<Input className="custom-input" data-testid="custom-input" />);
    const input = screen.getByTestId('custom-input');
    expect(input).toHaveClass('custom-input');
  });

  it('should support password type', () => {
    render(<Input type="password" data-testid="password-input" />);
    const input = screen.getByTestId('password-input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should support number type', () => {
    render(<Input type="number" data-testid="number-input" />);
    const input = screen.getByTestId('number-input');
    expect(input).toHaveAttribute('type', 'number');
  });
});
