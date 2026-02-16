/**
 * Unit Tests for Badge Component
 */

import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge Component', () => {
  it('should render with children', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should apply default variant styles', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-primary-light');
    expect(badge).toHaveClass('text-primary');
  });

  it('should apply success variant styles', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-success-light');
    expect(badge).toHaveClass('text-success');
  });

  it('should apply warning variant styles', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-warning-light');
    expect(badge).toHaveClass('text-warning');
  });

  it('should apply error variant styles', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-error-light');
    expect(badge).toHaveClass('text-error');
  });

  it('should apply info variant styles', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-info-light');
    expect(badge).toHaveClass('text-info');
  });

  it('should apply accent variant styles', () => {
    const { container } = render(<Badge variant="accent">Accent</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-accent-light');
    expect(badge).toHaveClass('text-accent-dark');
  });

  it('should apply secondary variant styles', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-surface-dark');
    expect(badge).toHaveClass('text-text-primary');
  });

  it('should apply custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('custom-class');
  });

  it('should have base styles', () => {
    const { container } = render(<Badge>Base</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-semibold');
  });
});
