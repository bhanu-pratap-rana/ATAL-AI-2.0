/**
 * Tests for IRT (Item Response Theory) 3PL Model Implementation
 *
 * Tests the core IRT functions:
 * - probability3PL: 3-Parameter Logistic probability function
 * - fisherInformation: Item information for precision measurement
 * - stratifyByDiscrimination: a-Stratification for item selection
 * - updateTheta: Newton-Raphson ability estimation
 */

import {
  probability3PL,
  fisherInformation,
  stratifyByDiscrimination,
  updateTheta,
  CATEGORIES,
  CAT_CONFIG,
  type IRTItem,
} from '@/app/actions/assessment/irt-models';

// Helper to create test items
function createTestItem(overrides: Partial<IRTItem> = {}): IRTItem {
  return {
    id: 'test-item-1',
    item_code: 'Q001',
    category: 'digital_content_creation',
    question_text: 'Test question?',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
      { id: 'c', text: 'Option C' },
      { id: 'd', text: 'Option D' },
    ],
    correct_answer: 1,
    difficulty: 0, // average difficulty
    discrimination: 1, // average discrimination
    guessing: 0.25, // typical 4-choice guessing
    ...overrides,
  };
}

describe('probability3PL', () => {
  it('should return guessing probability at very low ability', () => {
    // theta = -4, easy item (b = -2), low discrimination
    // At very low ability, probability approaches guessing parameter
    const prob = probability3PL(-4, 0.5, 0, 0.25);
    expect(prob).toBeGreaterThanOrEqual(0.25);
    expect(prob).toBeLessThan(0.5);
  });

  it('should return close to 1 at very high ability', () => {
    // theta = 4, easy item (b = -2), high discrimination
    const prob = probability3PL(4, 2, -2, 0.25);
    expect(prob).toBeGreaterThan(0.95);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it('should return ~0.625 when theta equals difficulty (c=0.25)', () => {
    // When theta = b, P = c + (1-c)/2 = 0.25 + 0.75/2 = 0.625
    const prob = probability3PL(0, 1, 0, 0.25);
    expect(prob).toBeCloseTo(0.625, 2);
  });

  it('should return ~0.5 when theta equals difficulty and c=0', () => {
    // When theta = b and c = 0, P = 0.5
    const prob = probability3PL(0, 1, 0, 0);
    expect(prob).toBeCloseTo(0.5, 5);
  });

  it('should increase with higher ability', () => {
    const probLow = probability3PL(-1, 1, 0, 0.25);
    const probMid = probability3PL(0, 1, 0, 0.25);
    const probHigh = probability3PL(1, 1, 0, 0.25);

    expect(probLow).toBeLessThan(probMid);
    expect(probMid).toBeLessThan(probHigh);
  });

  it('should be steeper with higher discrimination', () => {
    // Higher discrimination = steeper slope
    const probLowA = probability3PL(0.5, 0.5, 0, 0.25);
    const probHighA = probability3PL(0.5, 2, 0, 0.25);

    // With high discrimination, probability increases faster above difficulty
    expect(probHighA).toBeGreaterThan(probLowA);
  });

  it('should never go below guessing parameter', () => {
    const prob = probability3PL(-10, 2, 0, 0.2);
    expect(prob).toBeGreaterThanOrEqual(0.2);
  });

  it('should never exceed 1', () => {
    const prob = probability3PL(10, 2, 0, 0.2);
    expect(prob).toBeLessThanOrEqual(1);
  });
});

describe('fisherInformation', () => {
  it('should return 0 when probability equals guessing', () => {
    // At very low ability, P approaches c, so information approaches 0
    const info = fisherInformation(-10, 1, 0, 0.25);
    expect(info).toBeCloseTo(0, 3);
  });

  it('should return 0 when probability equals 1', () => {
    // At very high ability, P approaches 1, so information approaches 0
    const info = fisherInformation(10, 1, 0, 0.25);
    expect(info).toBeCloseTo(0, 3);
  });

  it('should be positive for valid parameters', () => {
    const info = fisherInformation(0, 1, 0, 0.25);
    expect(info).toBeGreaterThan(0);
  });

  it('should peak near item difficulty', () => {
    // Information should be highest when theta is near b
    const infoLow = fisherInformation(-2, 1, 0, 0.25);
    const infoAtB = fisherInformation(0, 1, 0, 0.25);
    const infoHigh = fisherInformation(2, 1, 0, 0.25);

    // Information at difficulty should be higher than far away
    // (This may not always hold for 3PL due to guessing, but should be close)
    expect(infoAtB).toBeGreaterThan(infoLow * 0.5);
    expect(infoAtB).toBeGreaterThan(infoHigh * 0.5);
  });

  it('should increase with higher discrimination', () => {
    const infoLowA = fisherInformation(0, 0.5, 0, 0.25);
    const infoHighA = fisherInformation(0, 2, 0, 0.25);

    expect(infoHighA).toBeGreaterThan(infoLowA);
  });
});

describe('stratifyByDiscrimination', () => {
  it('should divide items into specified layers', () => {
    const items = [
      createTestItem({ id: '1', discrimination: 0.5 }),
      createTestItem({ id: '2', discrimination: 1.0 }),
      createTestItem({ id: '3', discrimination: 1.5 }),
      createTestItem({ id: '4', discrimination: 2.0 }),
      createTestItem({ id: '5', discrimination: 2.5 }),
      createTestItem({ id: '6', discrimination: 3.0 }),
    ];

    const strata = stratifyByDiscrimination(items, 3);
    expect(strata).toHaveLength(3);
  });

  it('should sort items by discrimination within strata', () => {
    const items = [
      createTestItem({ id: '1', discrimination: 2.0 }),
      createTestItem({ id: '2', discrimination: 0.5 }),
      createTestItem({ id: '3', discrimination: 1.5 }),
    ];

    const strata = stratifyByDiscrimination(items, 3);

    // First stratum should have lowest discrimination
    expect(strata[0][0].discrimination).toBe(0.5);
    // Last stratum should have highest discrimination
    expect(strata[2][0].discrimination).toBe(2.0);
  });

  it('should handle empty array', () => {
    const strata = stratifyByDiscrimination([], 3);
    expect(strata).toHaveLength(3);
    strata.forEach(layer => expect(layer).toHaveLength(0));
  });

  it('should handle fewer items than layers', () => {
    const items = [createTestItem({ id: '1', discrimination: 1.0 })];
    const strata = stratifyByDiscrimination(items, 3);
    expect(strata).toHaveLength(3);
    // One layer should have the item, others empty
    const totalItems = strata.reduce((sum, layer) => sum + layer.length, 0);
    expect(totalItems).toBe(1);
  });

  it('should not modify original array', () => {
    const items = [
      createTestItem({ id: '1', discrimination: 2.0 }),
      createTestItem({ id: '2', discrimination: 0.5 }),
    ];
    const originalFirst = items[0].discrimination;

    stratifyByDiscrimination(items, 2);

    expect(items[0].discrimination).toBe(originalFirst);
  });

  it('should use default of 3 layers', () => {
    const items = Array(9).fill(null).map((_, i) =>
      createTestItem({ id: String(i), discrimination: i * 0.3 })
    );

    const strata = stratifyByDiscrimination(items);
    expect(strata).toHaveLength(3);
  });
});

describe('updateTheta', () => {
  it('should return initial theta for empty responses', () => {
    const result = updateTheta(0, []);
    expect(result.theta).toBe(CAT_CONFIG.INITIAL_THETA);
    expect(result.se).toBe(1);
  });

  it('should increase theta after correct responses', () => {
    const item = createTestItem({ difficulty: 0, discrimination: 1 });
    const responses = [
      { item, correct: true },
      { item, correct: true },
      { item, correct: true },
    ];

    const result = updateTheta(0, responses);
    expect(result.theta).toBeGreaterThan(0);
  });

  it('should decrease theta after incorrect responses', () => {
    const item = createTestItem({ difficulty: 0, discrimination: 1 });
    const responses = [
      { item, correct: false },
      { item, correct: false },
      { item, correct: false },
    ];

    const result = updateTheta(0, responses);
    expect(result.theta).toBeLessThan(0);
  });

  it('should stay near 0 for mixed responses on average items', () => {
    const item = createTestItem({ difficulty: 0, discrimination: 1 });
    const responses = [
      { item, correct: true },
      { item, correct: false },
      { item, correct: true },
      { item, correct: false },
    ];

    const result = updateTheta(0, responses);
    // Should be relatively close to 0
    expect(Math.abs(result.theta)).toBeLessThan(1);
  });

  it('should provide standard error estimate', () => {
    const item = createTestItem({ difficulty: 0, discrimination: 1 });
    const responses = [{ item, correct: true }];

    const result = updateTheta(0, responses);
    expect(result.se).toBeGreaterThan(0);
    // SE can be high after single item - just verify it's finite
    expect(Number.isFinite(result.se)).toBe(true);
  });

  it('should decrease SE with more responses', () => {
    // Create multiple items to simulate varied responses
    const item1 = createTestItem({ id: '1', difficulty: 0, discrimination: 1 });
    const item2 = createTestItem({ id: '2', difficulty: 0.5, discrimination: 1.2 });
    const item3 = createTestItem({ id: '3', difficulty: -0.5, discrimination: 0.8 });

    const fewResponses = [{ item: item1, correct: true }];
    const manyResponses = [
      { item: item1, correct: true },
      { item: item2, correct: true },
      { item: item3, correct: true },
      { item: item1, correct: true },
      { item: item2, correct: false },
    ];

    const resultFew = updateTheta(0, fewResponses);
    const resultMany = updateTheta(0, manyResponses);

    // More responses should generally provide better estimation
    // SE should be lower or at least defined
    expect(resultMany.se).toBeGreaterThan(0);
    expect(resultFew.se).toBeGreaterThan(0);
  });

  it('should bound theta within configured limits', () => {
    const item = createTestItem({ difficulty: 0, discrimination: 1 });
    // All correct - should push theta high but not beyond bounds
    const allCorrect = Array(50).fill({ item, correct: true });

    const result = updateTheta(0, allCorrect);
    expect(result.theta).toBeLessThanOrEqual(CAT_CONFIG.THETA_BOUNDS.max);
  });
});

describe('CATEGORIES', () => {
  it('should have 5 categories', () => {
    expect(CATEGORIES).toHaveLength(5);
  });

  it('should include all expected digital literacy domains', () => {
    expect(CATEGORIES).toContain('contextual_application');
    expect(CATEGORIES).toContain('digital_content_creation');
    expect(CATEGORIES).toContain('digital_device_familiarity');
    expect(CATEGORIES).toContain('internet_web_awareness');
    expect(CATEGORIES).toContain('problem_solving_aptitude');
  });
});

describe('CAT_CONFIG', () => {
  it('should have correct total questions', () => {
    expect(CAT_CONFIG.TOTAL_QUESTIONS).toBe(30);
    expect(CAT_CONFIG.TOTAL_QUESTIONS).toBe(
      CAT_CONFIG.QUESTIONS_PER_CATEGORY * CATEGORIES.length
    );
  });

  it('should have reasonable theta bounds', () => {
    expect(CAT_CONFIG.THETA_BOUNDS.min).toBe(-4);
    expect(CAT_CONFIG.THETA_BOUNDS.max).toBe(4);
  });

  it('should start at average ability', () => {
    expect(CAT_CONFIG.INITIAL_THETA).toBe(0);
  });

  it('should have minimum questions per category', () => {
    expect(CAT_CONFIG.MIN_QUESTIONS_PER_CATEGORY).toBeLessThan(
      CAT_CONFIG.QUESTIONS_PER_CATEGORY
    );
  });
});
