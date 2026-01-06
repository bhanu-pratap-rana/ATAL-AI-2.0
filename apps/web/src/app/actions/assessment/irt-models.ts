/**
 * IRT (Item Response Theory) 3PL Model Implementation
 *
 * Implements 3-Parameter Logistic (3PL) IRT model for adaptive testing
 * Based on: Lord (1980), Bock & Mislevy (1982), Chang & Ying (1999)
 *
 * Key Components:
 * - 3PL probability function
 * - Fisher Information for item precision measurement
 * - Newton-Raphson MLE for ability estimation
 * - a-Stratification for balanced item exposure control
 */

// IRT 3PL Model Types
export interface IRTItem {
  id: string
  item_code: string
  category: string
  question_text: string
  options: { id: string; text: string }[]
  correct_answer: number
  difficulty: number      // b parameter (-3 to +3)
  discrimination: number  // a parameter (0.5 to 2.5)
  guessing: number        // c parameter (0 to 0.5)
}

// Assessment categories - 5 digital literacy domains
export const CATEGORIES = [
  'contextual_application',
  'digital_content_creation',
  'digital_device_familiarity',
  'internet_web_awareness',
  'problem_solving_aptitude',
] as const

// CAT Configuration following best practices
export const CAT_CONFIG = {
  QUESTIONS_PER_CATEGORY: 6,      // Questions to select per category
  TOTAL_QUESTIONS: 30,            // 6 per category × 5 categories
  MIN_QUESTIONS_PER_CATEGORY: 4,  // Minimum for content validity
  TARGET_SE: 0.35,                // Standard error threshold for precision
  INITIAL_THETA: 0,               // Start at average ability
  THETA_BOUNDS: { min: -4, max: 4 }, // Ability estimate bounds
  A_STRATIFICATION_LAYERS: 3,     // For balanced item selection
} as const

/**
 * 3PL IRT probability function
 * P(correct) = c + (1-c) / (1 + exp(-a*(theta-b)))
 *
 * Based on Lord (1980) and best practices from PMC research
 *
 * @param theta - Student ability estimate (-4 to +4)
 * @param a - Item discrimination parameter (0.5 to 2.5)
 * @param b - Item difficulty parameter (-3 to +3)
 * @param c - Guessing parameter (0 to 0.5)
 * @returns Probability of correct response (0 to 1)
 */
export function probability3PL(theta: number, a: number, b: number, c: number): number {
  const exp_term = Math.exp(-a * (theta - b))
  return c + (1 - c) / (1 + exp_term)
}

/**
 * Fisher Information for 3PL model
 * I(theta) = a^2 * (P - c)^2 * Q / ((1 - c)^2 * P)
 *
 * Higher information = more precision at that ability level
 * Used for Maximum Fisher Information (MFI) item selection
 *
 * @param theta - Student ability estimate
 * @param a - Item discrimination
 * @param b - Item difficulty
 * @param c - Guessing parameter
 * @returns Information value (higher = more precise measurement)
 */
export function fisherInformation(theta: number, a: number, b: number, c: number): number {
  const P = probability3PL(theta, a, b, c)
  const Q = 1 - P
  if (P <= c || P >= 1) return 0
  return (a * a * Math.pow(P - c, 2) * Q) / (Math.pow(1 - c, 2) * P)
}

/**
 * a-Stratification for balanced item selection
 * Prevents "greedy" selection of only high-discrimination items
 * Based on Chang & Ying (1999) and PMC research on exposure control
 *
 * @param items - Pool of items to stratify
 * @param layers - Number of stratification layers (typically 3)
 * @returns Items grouped by discrimination parameter into strata
 */
export function stratifyByDiscrimination(items: IRTItem[], layers: number = 3): IRTItem[][] {
  const sorted = [...items].sort((a, b) => a.discrimination - b.discrimination)
  const layerSize = Math.ceil(sorted.length / layers)
  const strata: IRTItem[][] = []

  for (let i = 0; i < layers; i++) {
    strata.push(sorted.slice(i * layerSize, (i + 1) * layerSize))
  }

  return strata
}

/**
 * Update ability estimate using Newton-Raphson Maximum Likelihood Estimation
 *
 * Based on Bock & Mislevy (1982) and standard IRT estimation procedures
 * Iteratively refines theta based on observed responses using MLE
 *
 * @param currentTheta - Current ability estimate
 * @param responses - Array of item responses with correct/incorrect flags
 * @returns Updated theta and standard error
 */
export function updateTheta(
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

      // First derivative of log-likelihood
      const u = correct ? 1 : 0
      firstDerivative += a * W * (u - P) / P

      // Second derivative (negative of Fisher information)
      secondDerivative -= a * a * W * W * Q / P
    }

    // Avoid division by zero
    if (Math.abs(secondDerivative) < 0.0001) break

    // Newton-Raphson update
    const delta = firstDerivative / (-secondDerivative)
    theta += delta

    // Bound theta to prevent extreme estimates
    theta = Math.max(CAT_CONFIG.THETA_BOUNDS.min, Math.min(CAT_CONFIG.THETA_BOUNDS.max, theta))

    // Check convergence
    if (Math.abs(delta) < tolerance) break
  }

  // Calculate standard error from test information
  let totalInfo = 0
  for (const { item } of responses) {
    totalInfo += fisherInformation(theta, item.discrimination, item.difficulty, item.guessing)
  }
  const se = totalInfo > 0 ? 1 / Math.sqrt(totalInfo) : 1.0

  return { theta, se }
}
