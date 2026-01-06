/**
 * ResultCircle Component Tests
 * Tests for the assessment result circular progress display
 */

import { render, screen, act } from '@testing-library/react'
import { ResultCircle, CompactResultCircle } from '@/components/assessment/ResultCircle'

describe('ResultCircle', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Percentage Display', () => {
    it('should display the percentage value', () => {
      render(<ResultCircle percentage={75} animate={false} />)
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should display 0% for zero score', () => {
      render(<ResultCircle percentage={0} animate={false} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('should display 100% for perfect score', () => {
      render(<ResultCircle percentage={100} animate={false} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Label Display', () => {
    it('should display default "Score" label', () => {
      render(<ResultCircle percentage={50} animate={false} />)
      expect(screen.getByText('Score')).toBeInTheDocument()
    })

    it('should display custom label', () => {
      render(<ResultCircle percentage={50} label="Overall Score" animate={false} />)
      expect(screen.getByText('Overall Score')).toBeInTheDocument()
    })
  })

  describe('Performance Text', () => {
    it('should show "Excellent!" for 80% or higher', () => {
      render(<ResultCircle percentage={80} animate={false} />)
      expect(screen.getByText('Excellent!')).toBeInTheDocument()
    })

    it('should show "Excellent!" for 100%', () => {
      render(<ResultCircle percentage={100} animate={false} />)
      expect(screen.getByText('Excellent!')).toBeInTheDocument()
    })

    it('should show "Good!" for 60-79%', () => {
      render(<ResultCircle percentage={65} animate={false} />)
      expect(screen.getByText('Good!')).toBeInTheDocument()
    })

    it('should show "Good!" for exactly 60%', () => {
      render(<ResultCircle percentage={60} animate={false} />)
      expect(screen.getByText('Good!')).toBeInTheDocument()
    })

    it('should show "Keep Practicing" for below 60%', () => {
      render(<ResultCircle percentage={45} animate={false} />)
      expect(screen.getByText('Keep Practicing')).toBeInTheDocument()
    })

    it('should show "Keep Practicing" for 0%', () => {
      render(<ResultCircle percentage={0} animate={false} />)
      expect(screen.getByText('Keep Practicing')).toBeInTheDocument()
    })
  })

  describe('Animation', () => {
    it('should animate from 0 to target percentage', () => {
      render(<ResultCircle percentage={50} animate={true} />)

      // Initially should show 0
      expect(screen.getByText('0%')).toBeInTheDocument()

      // Advance timer to complete animation
      act(() => {
        jest.advanceTimersByTime(1600)
      })

      // Should now show target percentage
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should show final percentage immediately when animate is false', () => {
      render(<ResultCircle percentage={75} animate={false} />)
      expect(screen.getByText('75%')).toBeInTheDocument()
    })
  })

  describe('Size Configuration', () => {
    it('should render SVG with default size', () => {
      render(<ResultCircle percentage={50} animate={false} />)
      const svg = screen.getByRole('img', { name: /score: 50%/i })
      expect(svg).toHaveAttribute('width', '160')
      expect(svg).toHaveAttribute('height', '160')
    })

    it('should render SVG with custom size', () => {
      render(<ResultCircle percentage={50} size={200} animate={false} />)
      const svg = screen.getByRole('img', { name: /score: 50%/i })
      expect(svg).toHaveAttribute('width', '200')
      expect(svg).toHaveAttribute('height', '200')
    })
  })

  describe('Accessibility', () => {
    it('should have descriptive aria-label on SVG', () => {
      render(<ResultCircle percentage={85} animate={false} />)
      expect(screen.getByRole('img', { name: /score: 85%/i })).toBeInTheDocument()
    })
  })

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ResultCircle percentage={50} animate={false} className="custom-class" />
      )
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})

describe('CompactResultCircle', () => {
  describe('Rendering', () => {
    it('should render with default size', () => {
      render(<CompactResultCircle percentage={50} />)
      const svg = screen.getByRole('img', { name: /score: 50%/i })
      expect(svg).toHaveAttribute('width', '64')
      expect(svg).toHaveAttribute('height', '64')
    })

    it('should render with custom size', () => {
      render(<CompactResultCircle percentage={50} size={80} />)
      const svg = screen.getByRole('img', { name: /score: 50%/i })
      expect(svg).toHaveAttribute('width', '80')
      expect(svg).toHaveAttribute('height', '80')
    })

    it('should display percentage', () => {
      render(<CompactResultCircle percentage={75} />)
      expect(screen.getByText('75%')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(<CompactResultCircle percentage={90} />)
      expect(screen.getByRole('img', { name: /score: 90%/i })).toBeInTheDocument()
    })
  })
})
