/**
 * Unit Tests for Crypto Utilities
 */

import {
  secureRandomInt,
  secureRandomIntRange,
  secureRandomFloat,
  secureShuffleArray,
  secureRandomJitter,
} from '@/lib/crypto-utils';

describe('Crypto Utilities', () => {
  describe('secureRandomInt', () => {
    it('should return 0 for max <= 0', () => {
      expect(secureRandomInt(0)).toBe(0);
      expect(secureRandomInt(-5)).toBe(0);
    });

    it('should return values within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const result = secureRandomInt(10);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(10);
      }
    });

    it('should return integer values', () => {
      for (let i = 0; i < 10; i++) {
        const result = secureRandomInt(100);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('secureRandomIntRange', () => {
    it('should return values within specified range', () => {
      for (let i = 0; i < 100; i++) {
        const result = secureRandomIntRange(10, 20);
        expect(result).toBeGreaterThanOrEqual(10);
        expect(result).toBeLessThanOrEqual(20);
      }
    });

    it('should work with negative ranges', () => {
      for (let i = 0; i < 50; i++) {
        const result = secureRandomIntRange(-10, -5);
        expect(result).toBeGreaterThanOrEqual(-10);
        expect(result).toBeLessThanOrEqual(-5);
      }
    });

    it('should return the same value when min equals max', () => {
      expect(secureRandomIntRange(5, 5)).toBe(5);
    });
  });

  describe('secureRandomFloat', () => {
    it('should return values between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const result = secureRandomFloat();
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1);
      }
    });

    it('should return floating point values', () => {
      let foundDecimal = false;
      for (let i = 0; i < 20; i++) {
        const result = secureRandomFloat();
        if (result !== Math.floor(result)) {
          foundDecimal = true;
          break;
        }
      }
      expect(foundDecimal).toBe(true);
    });
  });

  describe('secureShuffleArray', () => {
    it('should not modify the original array', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      secureShuffleArray(original);
      expect(original).toEqual(copy);
    });

    it('should return array with same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = secureShuffleArray(original);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should return array with same length', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = secureShuffleArray(original);
      expect(shuffled.length).toBe(original.length);
    });

    it('should handle empty arrays', () => {
      const result = secureShuffleArray([]);
      expect(result).toEqual([]);
    });

    it('should handle single element arrays', () => {
      const result = secureShuffleArray([42]);
      expect(result).toEqual([42]);
    });

    it('should work with different types', () => {
      const strings = ['a', 'b', 'c', 'd'];
      const shuffled = secureShuffleArray(strings);
      expect(shuffled.sort()).toEqual(strings.sort());
    });
  });

  describe('secureRandomJitter', () => {
    it('should return values within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const result = secureRandomJitter(1000);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1000);
      }
    });

    it('should return 0 for maxMs of 0', () => {
      expect(secureRandomJitter(0)).toBe(0);
    });
  });
});
