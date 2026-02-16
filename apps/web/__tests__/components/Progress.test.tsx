/**
 * Unit Tests for Progress Component
 */

import { render } from '@testing-library/react';
import { Progress } from '@/components/ui/progress';

describe('Progress Component', () => {
  it('should render with default value', () => {
    const { container } = render(<Progress />);
    const progress = container.firstChild;
    expect(progress).toBeInTheDocument();
  });

  it('should render progress bar element', () => {
    const { container } = render(<Progress value={50} />);
    const progressBar = container.querySelector('div > div');
    expect(progressBar).toBeInTheDocument();
  });

  it('should accept different value props', () => {
    const values = [0, 25, 50, 75, 100];
    values.forEach(value => {
      const { container } = render(<Progress value={value} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('should handle undefined value', () => {
    const { container } = render(<Progress value={undefined} />);
    const progressBar = container.querySelector('div > div');
    expect(progressBar).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Progress className="custom-progress" />);
    const progress = container.firstChild;
    expect(progress).toHaveClass('custom-progress');
  });

  it('should have base styles', () => {
    const { container } = render(<Progress />);
    const progress = container.firstChild;
    expect(progress).toHaveClass('relative');
    expect(progress).toHaveClass('rounded-full');
    expect(progress).toHaveClass('overflow-hidden');
  });

  it('should pass additional props', () => {
    const { container } = render(<Progress data-testid="progress-bar" />);
    const progress = container.firstChild;
    expect(progress).toHaveAttribute('data-testid', 'progress-bar');
  });

  it('should have progress indicator element', () => {
    const { container } = render(<Progress value={50} />);
    // The inner div with bg-primary is the progress indicator
    const indicator = container.querySelector('.bg-primary');
    expect(indicator).toBeInTheDocument();
  });
});
