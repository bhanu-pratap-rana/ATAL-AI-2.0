/**
 * CategoryBreakdown Component Tests
 * Tests for the assessment category/module breakdown display
 */

import { render, screen } from '@testing-library/react'
import { CategoryBreakdown, CategoryStrengths } from '@/components/assessment/CategoryBreakdown'

describe('CategoryBreakdown', () => {
  const mockCategories = {
    'digital-device-familiarity': { total: 10, correct: 8 },
    'internet-web-awareness': { total: 10, correct: 6 },
    'digital-content-creation': { total: 10, correct: 4 },
    'problem-solving-aptitude': { total: 10, correct: 9 },
    'contextual-application': { total: 10, correct: 5 },
  }

  describe('Rendering', () => {
    it('should render category performance title', () => {
      render(<CategoryBreakdown categories={mockCategories} />)
      expect(screen.getByText('Category Performance')).toBeInTheDocument()
    })

    it('should render all categories', () => {
      render(<CategoryBreakdown categories={mockCategories} />)
      expect(screen.getByText('Digital Devices')).toBeInTheDocument()
      expect(screen.getByText('Internet & Web')).toBeInTheDocument()
      expect(screen.getByText('Content Creation')).toBeInTheDocument()
      expect(screen.getByText('Problem Solving')).toBeInTheDocument()
      expect(screen.getByText('Application')).toBeInTheDocument()
    })

    it('should render category icons', () => {
      render(<CategoryBreakdown categories={mockCategories} />)
      // Icons should be present (as aria-hidden elements)
      const container = document.body
      expect(container.textContent).toContain('💻')
      expect(container.textContent).toContain('🌐')
      expect(container.textContent).toContain('🎨')
      expect(container.textContent).toContain('🧩')
      expect(container.textContent).toContain('🎯')
    })

    it('should display correct/total counts', () => {
      render(<CategoryBreakdown categories={mockCategories} />)
      expect(screen.getByText('8/10')).toBeInTheDocument()
      expect(screen.getByText('6/10')).toBeInTheDocument()
      expect(screen.getByText('4/10')).toBeInTheDocument()
      expect(screen.getByText('9/10')).toBeInTheDocument()
      expect(screen.getByText('5/10')).toBeInTheDocument()
    })

    it('should display percentage values', () => {
      render(<CategoryBreakdown categories={mockCategories} />)
      expect(screen.getByText('80%')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
      expect(screen.getByText('40%')).toBeInTheDocument()
      expect(screen.getByText('90%')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should render progress bars with correct aria attributes', () => {
      render(<CategoryBreakdown categories={mockCategories} />)
      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars.length).toBe(5)
    })
  })

  describe('Sorting', () => {
    it('should sort categories by percentage descending', () => {
      render(<CategoryBreakdown categories={mockCategories} />)
      const percentages = screen.getAllByText(/^\d+%$/)
      // First should be highest (90%), last should be lowest (40%)
      expect(percentages[0].textContent).toBe('90%')
      expect(percentages[percentages.length - 1].textContent).toBe('40%')
    })
  })

  describe('Empty State', () => {
    it('should return null for empty categories', () => {
      const { container } = render(<CategoryBreakdown categories={{}} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle 0 correct answers', () => {
      const categories = { 'test-category': { total: 10, correct: 0 } }
      render(<CategoryBreakdown categories={categories} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('0/10')).toBeInTheDocument()
    })

    it('should handle perfect score', () => {
      const categories = { 'test-category': { total: 10, correct: 10 } }
      render(<CategoryBreakdown categories={categories} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('10/10')).toBeInTheDocument()
    })

    it('should handle unknown category keys gracefully', () => {
      const categories = { 'unknown-category': { total: 10, correct: 5 } }
      render(<CategoryBreakdown categories={categories} />)
      // Should capitalize and format the unknown key
      expect(screen.getByText('Unknown Category')).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CategoryBreakdown categories={mockCategories} className="custom-class" />
      )
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})

describe('CategoryStrengths', () => {
  const mockCategories = {
    'digital-device-familiarity': { total: 10, correct: 9 },
    'internet-web-awareness': { total: 10, correct: 6 },
    'digital-content-creation': { total: 10, correct: 3 },
    'problem-solving-aptitude': { total: 10, correct: 8 },
    'contextual-application': { total: 10, correct: 4 },
  }

  describe('Strengths Mode', () => {
    it('should render strengths title with icon', () => {
      render(<CategoryStrengths categories={mockCategories} type="strengths" />)
      expect(screen.getByText('Your Strengths')).toBeInTheDocument()
      expect(document.body.textContent).toContain('💪')
    })

    it('should show top 2 performing categories', () => {
      render(<CategoryStrengths categories={mockCategories} type="strengths" />)
      // Top 2 are Digital Devices (90%) and Problem Solving (80%)
      expect(screen.getByText('Digital Devices')).toBeInTheDocument()
      expect(screen.getByText('Problem Solving')).toBeInTheDocument()
    })

    it('should apply success styling for strengths', () => {
      const { container } = render(<CategoryStrengths categories={mockCategories} type="strengths" />)
      // Should have success-colored badges
      const badges = container.querySelectorAll('.bg-success-light')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('Weaknesses Mode', () => {
    it('should render weaknesses title with icon', () => {
      render(<CategoryStrengths categories={mockCategories} type="weaknesses" />)
      expect(screen.getByText('Areas to Improve')).toBeInTheDocument()
      expect(document.body.textContent).toContain('📚')
    })

    it('should show bottom 2 performing categories', () => {
      render(<CategoryStrengths categories={mockCategories} type="weaknesses" />)
      // Bottom 2 are Content Creation (30%) and Application (40%)
      expect(screen.getByText('Content Creation')).toBeInTheDocument()
      expect(screen.getByText('Application')).toBeInTheDocument()
    })

    it('should apply warning styling for weaknesses', () => {
      const { container } = render(<CategoryStrengths categories={mockCategories} type="weaknesses" />)
      // Should have warning-colored badges
      const badges = container.querySelectorAll('.bg-warning-light')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('Percentage Display', () => {
    it('should show percentage in badges', () => {
      render(<CategoryStrengths categories={mockCategories} type="strengths" />)
      expect(screen.getByText('(90%)')).toBeInTheDocument()
      expect(screen.getByText('(80%)')).toBeInTheDocument()
    })
  })

  describe('Icons', () => {
    it('should display category icons in badges', () => {
      render(<CategoryStrengths categories={mockCategories} type="strengths" />)
      expect(document.body.textContent).toContain('💻') // Digital Devices
      expect(document.body.textContent).toContain('🧩') // Problem Solving
    })
  })
})
