/**
 * IRT Assessment Unit Tests
 *
 * Tests the Item Response Theory (IRT) functionality:
 * - 3PL probability function
 * - Fisher Information calculation
 * - a-Stratification algorithm
 * - Newton-Raphson MLE theta estimation
 * - Content balancing across categories
 * - CAT configuration validation
 *
 * Based on IRT best practices from:
 * - Chang & Ying (1999) a-Stratification
 * - Babcock & Weiss (2012) Stopping Rules
 * - Lord (1980) 3PL Model
 */

// IRT 3PL Model Types for testing
interface IRTItem {
  id: string
  item_code: string
  category: string
  question_text: string
  options: { id: string; text: string }[]
  correct_answer: number
  difficulty: number
  discrimination: number
  guessing: number
}

// CAT Configuration - must match assessment.ts
const CAT_CONFIG = {
  QUESTIONS_PER_CATEGORY: 6,
  TOTAL_QUESTIONS: 30,
  MIN_QUESTIONS_PER_CATEGORY: 4,
  TARGET_SE: 0.35,
  INITIAL_THETA: 0,
  THETA_BOUNDS: { min: -4, max: 4 },
  A_STRATIFICATION_LAYERS: 3,
}

const CATEGORIES = [
  'contextual_application',
  'digital_content_creation',
  'digital_device_familiarity',
  'internet_web_awareness',
  'problem_solving_aptitude',
] as const

/**
 * 3PL IRT probability function
 * P(correct) = c + (1-c) / (1 + exp(-a*(theta-b)))
 */
function probability3PL(theta: number, a: number, b: number, c: number): number {
  const exp_term = Math.exp(-a * (theta - b))
  return c + (1 - c) / (1 + exp_term)
}

/**
 * Fisher Information for 3PL model
 * I(theta) = a^2 * (P - c)^2 * Q / ((1 - c)^2 * P)
 */
function fisherInformation(theta: number, a: number, b: number, c: number): number {
  const P = probability3PL(theta, a, b, c)
  const Q = 1 - P
  if (P <= c || P >= 1) return 0
  return (a * a * Math.pow(P - c, 2) * Q) / (Math.pow(1 - c, 2) * P)
}

/**
 * a-Stratification for balanced item selection
 */
function stratifyByDiscrimination(items: IRTItem[], layers: number = 3): IRTItem[][] {
  const sorted = [...items].sort((a, b) => a.discrimination - b.discrimination)
  const layerSize = Math.ceil(sorted.length / layers)
  const strata: IRTItem[][] = []

  for (let i = 0; i < layers; i++) {
    strata.push(sorted.slice(i * layerSize, (i + 1) * layerSize))
  }

  return strata
}

/**
 * Newton-Raphson MLE theta estimation
 */
function updateTheta(
  currentTheta: number,
  responses: { item: IRTItem; correct: boolean }[]
): { theta: number; se: number } {
  if (responses.length === 0) {
    return { theta: CAT_CONFIG.INITIAL_THETA, se: 1.0 }
  }

  let theta = currentTheta
  const maxIterations = 25
  const tolerance = 0.001

  for (let iter = 0; iter < maxIterations; iter++) {
    let firstDerivative = 0
    let secondDerivative = 0

    for (const { item, correct } of responses) {
      const a = item.discrimination
      const b = item.difficulty
      const c = item.guessing

      const P = probability3PL(theta, a, b, c)
      const Q = 1 - P
      const W = (P - c) / (1 - c)

      const u = correct ? 1 : 0
      firstDerivative += a * W * (u - P) / P
      secondDerivative -= a * a * W * W * Q / P
    }

    if (Math.abs(secondDerivative) < 0.0001) break

    const delta = firstDerivative / (-secondDerivative)
    theta += delta

    theta = Math.max(CAT_CONFIG.THETA_BOUNDS.min, Math.min(CAT_CONFIG.THETA_BOUNDS.max, theta))

    if (Math.abs(delta) < tolerance) break
  }

  let totalInfo = 0
  for (const { item } of responses) {
    totalInfo += fisherInformation(theta, item.discrimination, item.difficulty, item.guessing)
  }
  const se = totalInfo > 0 ? 1 / Math.sqrt(totalInfo) : 1.0

  return { theta, se }
}

// Sample items for testing
const createSampleItem = (overrides: Partial<IRTItem> = {}): IRTItem => ({
  id: `item-${Math.random().toString(36).substring(7)}`,
  item_code: 'TEST_001',
  category: 'digital_device_familiarity',
  question_text: 'Test question',
  options: [
    { id: 'A', text: 'Option A' },
    { id: 'B', text: 'Option B' },
    { id: 'C', text: 'Option C' },
    { id: 'D', text: 'Option D' },
  ],
  correct_answer: 1,
  difficulty: 0,
  discrimination: 1.0,
  guessing: 0.25,
  ...overrides,
})

describe('IRT Assessment Tests', () => {
  describe('3PL Probability Function', () => {
    it('should return guessing parameter for very low ability', () => {
      const theta = -4 // Very low ability
      const a = 1.5 // discrimination
      const b = 0 // difficulty
      const c = 0.25 // guessing

      const prob = probability3PL(theta, a, b, c)

      // At very low ability, probability approaches guessing parameter
      expect(prob).toBeGreaterThanOrEqual(c)
      expect(prob).toBeLessThan(0.35) // Should be close to guessing
    })

    it('should return near 1 for very high ability', () => {
      const theta = 4 // Very high ability
      const a = 1.5
      const b = 0
      const c = 0.25

      const prob = probability3PL(theta, a, b, c)

      expect(prob).toBeGreaterThan(0.95)
      expect(prob).toBeLessThanOrEqual(1)
    })

    it('should return 0.5 + (1-c)/2 when theta equals difficulty', () => {
      const theta = 0
      const a = 1.5
      const b = 0 // theta = b
      const c = 0.25

      const prob = probability3PL(theta, a, b, c)
      const expectedMidpoint = c + (1 - c) / 2 // 0.25 + 0.375 = 0.625

      expect(prob).toBeCloseTo(expectedMidpoint, 2)
    })

    it('should increase probability with higher discrimination at theta > b', () => {
      const theta = 1
      const b = 0
      const c = 0.25

      const probLowA = probability3PL(theta, 0.5, b, c)
      const probHighA = probability3PL(theta, 2.0, b, c)

      // Higher discrimination = steeper curve = higher probability at theta > b
      expect(probHighA).toBeGreaterThan(probLowA)
    })

    it('should always return value between c and 1', () => {
      const testCases = [
        { theta: -3, a: 1.0, b: 0, c: 0.2 },
        { theta: 0, a: 1.5, b: 0, c: 0.25 },
        { theta: 3, a: 2.0, b: 1, c: 0.3 },
        { theta: -1, a: 0.8, b: -2, c: 0.1 },
      ]

      testCases.forEach(({ theta, a, b, c }) => {
        const prob = probability3PL(theta, a, b, c)
        expect(prob).toBeGreaterThanOrEqual(c)
        expect(prob).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('Fisher Information', () => {
    it('should be maximum near difficulty parameter', () => {
      const a = 1.5
      const b = 0
      const c = 0.25

      const infoAtB = fisherInformation(b, a, b, c)
      const infoFarFromB = fisherInformation(b + 2, a, b, c)

      // Information is maximized near the item difficulty
      expect(infoAtB).toBeGreaterThan(infoFarFromB)
    })

    it('should increase with discrimination parameter', () => {
      const theta = 0
      const b = 0
      const c = 0.25

      const infoLowA = fisherInformation(theta, 0.5, b, c)
      const infoHighA = fisherInformation(theta, 2.0, b, c)

      // Higher discrimination = more information
      expect(infoHighA).toBeGreaterThan(infoLowA)
    })

    it('should be positive for all valid parameter combinations', () => {
      const testCases = [
        { theta: 0, a: 1.0, b: 0, c: 0.25 },
        { theta: 1, a: 1.5, b: 0.5, c: 0.2 },
        { theta: -1, a: 2.0, b: -0.5, c: 0.3 },
      ]

      testCases.forEach(({ theta, a, b, c }) => {
        const info = fisherInformation(theta, a, b, c)
        expect(info).toBeGreaterThanOrEqual(0)
      })
    })

    it('should return 0 when probability equals guessing', () => {
      // At very low ability, P ≈ c, so information ≈ 0
      const theta = -10 // Extremely low ability
      const a = 1.0
      const b = 0
      const c = 0.25

      const info = fisherInformation(theta, a, b, c)
      expect(info).toBeLessThan(0.01) // Very close to 0
    })
  })

  describe('a-Stratification', () => {
    it('should divide items into specified number of strata', () => {
      const items: IRTItem[] = [
        createSampleItem({ id: '1', discrimination: 0.5 }),
        createSampleItem({ id: '2', discrimination: 1.0 }),
        createSampleItem({ id: '3', discrimination: 1.5 }),
        createSampleItem({ id: '4', discrimination: 2.0 }),
        createSampleItem({ id: '5', discrimination: 2.5 }),
        createSampleItem({ id: '6', discrimination: 0.8 }),
      ]

      const strata = stratifyByDiscrimination(items, 3)

      expect(strata).toHaveLength(3)
    })

    it('should sort items by discrimination within strata', () => {
      const items: IRTItem[] = [
        createSampleItem({ id: '1', discrimination: 2.5 }),
        createSampleItem({ id: '2', discrimination: 0.5 }),
        createSampleItem({ id: '3', discrimination: 1.5 }),
        createSampleItem({ id: '4', discrimination: 1.0 }),
      ]

      const strata = stratifyByDiscrimination(items, 2)

      // First stratum should have lower discrimination items
      expect(strata[0]![0]!.discrimination).toBeLessThan(strata[1]![0]!.discrimination)
    })

    it('should include all items across strata', () => {
      const items: IRTItem[] = Array.from({ length: 10 }, (_, i) =>
        createSampleItem({ id: `${i}`, discrimination: 0.5 + i * 0.2 })
      )

      const strata = stratifyByDiscrimination(items, 3)
      const totalItems = strata.reduce((sum, s) => sum + s.length, 0)

      expect(totalItems).toBe(items.length)
    })

    it('should handle single layer stratification', () => {
      const items: IRTItem[] = [
        createSampleItem({ id: '1', discrimination: 1.0 }),
        createSampleItem({ id: '2', discrimination: 1.5 }),
      ]

      const strata = stratifyByDiscrimination(items, 1)

      expect(strata).toHaveLength(1)
      expect(strata[0]).toHaveLength(2)
    })
  })

  describe('Newton-Raphson MLE Theta Estimation', () => {
    it('should return initial theta for empty responses', () => {
      const result = updateTheta(0, [])

      expect(result.theta).toBe(CAT_CONFIG.INITIAL_THETA)
      expect(result.se).toBe(1.0)
    })

    it('should increase theta after all correct responses', () => {
      const item = createSampleItem({ difficulty: 0, discrimination: 1.5, guessing: 0.25 })
      const responses = [
        { item, correct: true },
        { item, correct: true },
        { item, correct: true },
      ]

      const result = updateTheta(0, responses)

      expect(result.theta).toBeGreaterThan(0)
    })

    it('should decrease theta after all incorrect responses', () => {
      const item = createSampleItem({ difficulty: 0, discrimination: 1.5, guessing: 0.25 })
      const responses = [
        { item, correct: false },
        { item, correct: false },
        { item, correct: false },
      ]

      const result = updateTheta(0, responses)

      expect(result.theta).toBeLessThan(0)
    })

    it('should stay near 0 with mixed responses on medium items', () => {
      const item = createSampleItem({ difficulty: 0, discrimination: 1.0, guessing: 0.25 })
      const responses = [
        { item, correct: true },
        { item, correct: false },
        { item, correct: true },
        { item, correct: false },
      ]

      const result = updateTheta(0, responses)

      expect(Math.abs(result.theta)).toBeLessThan(1)
    })

    it('should respect theta bounds', () => {
      const easyItem = createSampleItem({ difficulty: -3, discrimination: 2.0, guessing: 0.25 })
      const hardItem = createSampleItem({ difficulty: 3, discrimination: 2.0, guessing: 0.25 })

      // All correct on easy items
      const correctResponses = Array.from({ length: 20 }, () => ({ item: easyItem, correct: true }))
      const correctResult = updateTheta(0, correctResponses)

      // All incorrect on hard items
      const incorrectResponses = Array.from({ length: 20 }, () => ({ item: hardItem, correct: false }))
      const incorrectResult = updateTheta(0, incorrectResponses)

      expect(correctResult.theta).toBeLessThanOrEqual(CAT_CONFIG.THETA_BOUNDS.max)
      expect(incorrectResult.theta).toBeGreaterThanOrEqual(CAT_CONFIG.THETA_BOUNDS.min)
    })

    it('should decrease SE with more responses', () => {
      const item = createSampleItem({ difficulty: 0, discrimination: 1.5, guessing: 0.25 })

      const fewResponses = [{ item, correct: true }]
      const manyResponses = Array.from({ length: 10 }, () => ({ item, correct: true }))

      const fewResult = updateTheta(0, fewResponses)
      const manyResult = updateTheta(0, manyResponses)

      expect(manyResult.se).toBeLessThan(fewResult.se)
    })
  })

  describe('CAT Configuration', () => {
    it('should have correct total questions (5 categories × 6 questions)', () => {
      expect(CAT_CONFIG.TOTAL_QUESTIONS).toBe(30)
      expect(CAT_CONFIG.TOTAL_QUESTIONS).toBe(CATEGORIES.length * CAT_CONFIG.QUESTIONS_PER_CATEGORY)
    })

    it('should have 5 digital literacy categories', () => {
      expect(CATEGORIES).toHaveLength(5)
      expect(CATEGORIES).toContain('contextual_application')
      expect(CATEGORIES).toContain('digital_content_creation')
      expect(CATEGORIES).toContain('digital_device_familiarity')
      expect(CATEGORIES).toContain('internet_web_awareness')
      expect(CATEGORIES).toContain('problem_solving_aptitude')
    })

    it('should have valid theta bounds', () => {
      expect(CAT_CONFIG.THETA_BOUNDS.min).toBe(-4)
      expect(CAT_CONFIG.THETA_BOUNDS.max).toBe(4)
      expect(CAT_CONFIG.THETA_BOUNDS.min).toBeLessThan(CAT_CONFIG.THETA_BOUNDS.max)
    })

    it('should have reasonable target SE', () => {
      // SE of 0.35 corresponds to reliability ~0.88
      // This is acceptable for educational assessment
      expect(CAT_CONFIG.TARGET_SE).toBe(0.35)
      expect(CAT_CONFIG.TARGET_SE).toBeGreaterThan(0)
      expect(CAT_CONFIG.TARGET_SE).toBeLessThan(1)
    })

    it('should have minimum questions per category for content validity', () => {
      expect(CAT_CONFIG.MIN_QUESTIONS_PER_CATEGORY).toBe(4)
      expect(CAT_CONFIG.MIN_QUESTIONS_PER_CATEGORY).toBeLessThanOrEqual(CAT_CONFIG.QUESTIONS_PER_CATEGORY)
    })

    it('should start at average ability (theta = 0)', () => {
      expect(CAT_CONFIG.INITIAL_THETA).toBe(0)
    })
  })

  describe('Content Balancing', () => {
    it('should maintain minimum questions per category', () => {
      // Simulate category counting
      const answeredByCategory: Record<string, number> = {
        contextual_application: 6,
        digital_content_creation: 6,
        digital_device_familiarity: 6,
        internet_web_awareness: 3, // Below minimum
        problem_solving_aptitude: 6,
      }

      const belowMinimum = CATEGORIES.filter(
        cat => (answeredByCategory[cat] || 0) < CAT_CONFIG.MIN_QUESTIONS_PER_CATEGORY
      )

      expect(belowMinimum).toContain('internet_web_awareness')
      expect(belowMinimum).toHaveLength(1)
    })

    it('should prioritize categories with fewer questions', () => {
      const answeredByCategory: Record<string, number> = {
        contextual_application: 3,
        digital_content_creation: 5,
        digital_device_familiarity: 4,
        internet_web_awareness: 2,
        problem_solving_aptitude: 4,
      }

      const minCount = Math.min(...Object.values(answeredByCategory))
      const priorityCategories = CATEGORIES.filter(
        cat => answeredByCategory[cat] === minCount
      )

      expect(priorityCategories).toContain('internet_web_awareness')
      expect(minCount).toBe(2)
    })
  })

  describe('Proficiency Level Mapping', () => {
    const getProficiencyLevel = (theta: number): string => {
      if (theta >= 1.5) return 'Advanced'
      if (theta >= 0.5) return 'Proficient'
      if (theta >= -0.5) return 'Developing'
      if (theta >= -1.5) return 'Basic'
      return 'Beginner'
    }

    it('should map theta >= 1.5 to Advanced', () => {
      expect(getProficiencyLevel(1.5)).toBe('Advanced')
      expect(getProficiencyLevel(2.0)).toBe('Advanced')
      expect(getProficiencyLevel(4.0)).toBe('Advanced')
    })

    it('should map theta 0.5-1.5 to Proficient', () => {
      expect(getProficiencyLevel(0.5)).toBe('Proficient')
      expect(getProficiencyLevel(1.0)).toBe('Proficient')
      expect(getProficiencyLevel(1.49)).toBe('Proficient')
    })

    it('should map theta -0.5 to 0.5 to Developing', () => {
      expect(getProficiencyLevel(-0.5)).toBe('Developing')
      expect(getProficiencyLevel(0)).toBe('Developing')
      expect(getProficiencyLevel(0.49)).toBe('Developing')
    })

    it('should map theta -1.5 to -0.5 to Basic', () => {
      expect(getProficiencyLevel(-1.5)).toBe('Basic')
      expect(getProficiencyLevel(-1.0)).toBe('Basic')
      expect(getProficiencyLevel(-0.51)).toBe('Basic')
    })

    it('should map theta < -1.5 to Beginner', () => {
      expect(getProficiencyLevel(-1.51)).toBe('Beginner')
      expect(getProficiencyLevel(-2.0)).toBe('Beginner')
      expect(getProficiencyLevel(-4.0)).toBe('Beginner')
    })
  })

  describe('Theta to Percentage Score Conversion', () => {
    const thetaToPercent = (theta: number): number => {
      // Map theta from [-3, 3] to [0, 100]
      const normalized = (theta + 3) / 6
      return Math.round(Math.max(0, Math.min(100, normalized * 100)))
    }

    it('should map theta -3 to 0%', () => {
      expect(thetaToPercent(-3)).toBe(0)
    })

    it('should map theta 0 to 50%', () => {
      expect(thetaToPercent(0)).toBe(50)
    })

    it('should map theta 3 to 100%', () => {
      expect(thetaToPercent(3)).toBe(100)
    })

    it('should clamp values outside range', () => {
      expect(thetaToPercent(-5)).toBe(0)
      expect(thetaToPercent(5)).toBe(100)
    })

    it('should interpolate intermediate values correctly', () => {
      expect(thetaToPercent(-1.5)).toBe(25)
      expect(thetaToPercent(1.5)).toBe(75)
    })
  })

  describe('Item Parameter Validation', () => {
    it('should validate difficulty bounds (-4 to 4)', () => {
      const validDifficulties = [-3, -1, 0, 1, 3]
      const invalidDifficulties = [-5, 5, -10, 10]

      validDifficulties.forEach(b => {
        expect(b).toBeGreaterThanOrEqual(-4)
        expect(b).toBeLessThanOrEqual(4)
      })

      invalidDifficulties.forEach(b => {
        const isValid = b >= -4 && b <= 4
        expect(isValid).toBe(false)
      })
    })

    it('should validate discrimination bounds (0.1 to 3.0)', () => {
      const validDiscriminations = [0.5, 1.0, 1.5, 2.0, 2.5]
      const invalidDiscriminations = [0, 0.05, 3.5, 4.0]

      validDiscriminations.forEach(a => {
        expect(a).toBeGreaterThanOrEqual(0.1)
        expect(a).toBeLessThanOrEqual(3.0)
      })

      invalidDiscriminations.forEach(a => {
        const isValid = a >= 0.1 && a <= 3.0
        expect(isValid).toBe(false)
      })
    })

    it('should validate guessing bounds (0 to 0.5)', () => {
      const validGuessing = [0, 0.2, 0.25, 0.3, 0.5]
      const invalidGuessing = [-0.1, 0.6, 1.0]

      validGuessing.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(0.5)
      })

      invalidGuessing.forEach(c => {
        const isValid = c >= 0 && c <= 0.5
        expect(isValid).toBe(false)
      })
    })
  })
})
