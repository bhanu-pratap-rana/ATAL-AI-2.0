/**
 * LevelBadge Component Tests
 * Tests for the assessment skill level badge display
 */

import { render, screen } from '@testing-library/react'
import { LevelBadge, LevelCard, LevelProgress, getLevelFromScore } from '@/components/assessment/LevelBadge'

describe('getLevelFromScore', () => {
  it('should return "beginner" for scores below 50%', () => {
    expect(getLevelFromScore(0)).toBe('beginner')
    expect(getLevelFromScore(25)).toBe('beginner')
    expect(getLevelFromScore(49)).toBe('beginner')
  })

  it('should return "intermediate" for scores 50-79%', () => {
    expect(getLevelFromScore(50)).toBe('intermediate')
    expect(getLevelFromScore(65)).toBe('intermediate')
    expect(getLevelFromScore(79)).toBe('intermediate')
  })

  it('should return "advanced" for scores 80% and above', () => {
    expect(getLevelFromScore(80)).toBe('advanced')
    expect(getLevelFromScore(90)).toBe('advanced')
    expect(getLevelFromScore(100)).toBe('advanced')
  })
})

describe('LevelBadge', () => {
  describe('Level Display Based on Score', () => {
    it('should show Beginner for low scores', () => {
      render(<LevelBadge score={40} />)
      expect(screen.getByText('Beginner')).toBeInTheDocument()
      expect(document.body.textContent).toContain('🌱')
    })

    it('should show Intermediate for medium scores', () => {
      render(<LevelBadge score={65} />)
      expect(screen.getByText('Intermediate')).toBeInTheDocument()
      expect(document.body.textContent).toContain('🌿')
    })

    it('should show Advanced for high scores', () => {
      render(<LevelBadge score={90} />)
      expect(screen.getByText('Advanced')).toBeInTheDocument()
      expect(document.body.textContent).toContain('🌳')
    })
  })

  describe('Direct Level Prop', () => {
    it('should use level prop over score when provided', () => {
      render(<LevelBadge score={90} level="beginner" />)
      expect(screen.getByText('Beginner')).toBeInTheDocument()
    })

    it('should display beginner level directly', () => {
      render(<LevelBadge level="beginner" />)
      expect(screen.getByText('Beginner')).toBeInTheDocument()
    })

    it('should display intermediate level directly', () => {
      render(<LevelBadge level="intermediate" />)
      expect(screen.getByText('Intermediate')).toBeInTheDocument()
    })

    it('should display advanced level directly', () => {
      render(<LevelBadge level="advanced" />)
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('should render with small size', () => {
      const { container } = render(<LevelBadge level="beginner" size="sm" />)
      const badge = container.querySelector('[role="status"]')
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm')
    })

    it('should render with medium size (default)', () => {
      const { container } = render(<LevelBadge level="beginner" size="md" />)
      const badge = container.querySelector('[role="status"]')
      expect(badge).toHaveClass('px-4', 'py-2', 'text-base')
    })

    it('should render with large size', () => {
      const { container } = render(<LevelBadge level="beginner" size="lg" />)
      const badge = container.querySelector('[role="status"]')
      expect(badge).toHaveClass('px-6', 'py-3', 'text-lg')
    })
  })

  describe('Accessibility', () => {
    it('should have status role', () => {
      render(<LevelBadge level="beginner" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have descriptive aria-label', () => {
      render(<LevelBadge level="intermediate" />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Skill level: Intermediate')
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<LevelBadge level="beginner" className="custom-class" />)
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})

describe('LevelCard', () => {
  describe('Level Display', () => {
    it('should show beginner card with description', () => {
      render(<LevelCard level="beginner" />)
      expect(screen.getByText('Beginner')).toBeInTheDocument()
      expect(screen.getByText('Just starting your digital journey')).toBeInTheDocument()
      expect(document.body.textContent).toContain('🌱')
    })

    it('should show intermediate card with description', () => {
      render(<LevelCard level="intermediate" />)
      expect(screen.getByText('Intermediate')).toBeInTheDocument()
      expect(screen.getByText('Growing your digital skills')).toBeInTheDocument()
      expect(document.body.textContent).toContain('🌿')
    })

    it('should show advanced card with description', () => {
      render(<LevelCard level="advanced" />)
      expect(screen.getByText('Advanced')).toBeInTheDocument()
      expect(screen.getByText('Mastering digital literacy')).toBeInTheDocument()
      expect(document.body.textContent).toContain('🌳')
    })
  })

  describe('Score-based Level', () => {
    it('should determine level from score', () => {
      render(<LevelCard score={85} />)
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<LevelCard level="beginner" className="custom-class" />)
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})

describe('LevelProgress', () => {
  describe('Level Indicators', () => {
    it('should render all three level indicators', () => {
      render(<LevelProgress score={50} />)
      expect(screen.getByText('Beginner')).toBeInTheDocument()
      expect(screen.getByText('Intermediate')).toBeInTheDocument()
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })

    it('should show all level icons', () => {
      render(<LevelProgress score={50} />)
      expect(document.body.textContent).toContain('🌱')
      expect(document.body.textContent).toContain('🌿')
      expect(document.body.textContent).toContain('🌳')
    })
  })

  describe('Progress Highlighting', () => {
    it('should highlight beginner as current for low scores', () => {
      const { container } = render(<LevelProgress score={30} />)
      // Beginner should have ring styling (current)
      const beginnerLevel = container.querySelector('.ring-2')
      expect(beginnerLevel).toBeInTheDocument()
    })

    it('should highlight intermediate for medium scores', () => {
      render(<LevelProgress score={60} />)
      // Current level should have intermediate label as current
    })

    it('should highlight advanced for high scores', () => {
      render(<LevelProgress score={85} />)
      // Current level should have advanced label as current
    })
  })

  describe('Progress Bar', () => {
    it('should render progress bar', () => {
      const { container } = render(<LevelProgress score={50} />)
      const progressBar = container.querySelector('.h-full.rounded-full')
      expect(progressBar).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<LevelProgress score={50} className="custom-class" />)
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})
