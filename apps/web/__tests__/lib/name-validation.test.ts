/**
 * Tests for Name Validation Utilities
 *
 * Tests name and roll number validation functions
 */

import {
  validateName,
  validateRollNumber,
  sanitizeString,
} from '@/lib/name-validation';

describe('validateName', () => {
  describe('valid names', () => {
    it('should accept simple name', () => {
      const result = validateName('John');
      expect(result.valid).toBe(true);
    });

    it('should accept name with space', () => {
      const result = validateName('John Doe');
      expect(result.valid).toBe(true);
    });

    it('should accept name with hyphen', () => {
      const result = validateName('Mary-Jane');
      expect(result.valid).toBe(true);
    });

    it('should accept name with apostrophe', () => {
      const result = validateName("O'Brien");
      expect(result.valid).toBe(true);
    });

    it('should accept name with multiple spaces', () => {
      const result = validateName('John Michael Doe');
      expect(result.valid).toBe(true);
    });

    it('should trim whitespace before validation', () => {
      const result = validateName('  John Doe  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid names', () => {
    it('should reject name that is too short', () => {
      const result = validateName('J');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 2');
    });

    it('should reject empty name', () => {
      const result = validateName('');
      expect(result.valid).toBe(false);
    });

    it('should reject whitespace only', () => {
      const result = validateName('   ');
      expect(result.valid).toBe(false);
    });

    it('should reject name that is too long', () => {
      const result = validateName('a'.repeat(101));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject name with numbers', () => {
      const result = validateName('John123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('letters');
    });

    it('should reject name with special characters', () => {
      const result = validateName('John@Doe');
      expect(result.valid).toBe(false);
    });

    it('should reject name with underscore', () => {
      const result = validateName('John_Doe');
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateRollNumber', () => {
  it('should accept valid roll number', () => {
    const result = validateRollNumber('R001');
    expect(result.valid).toBe(true);
  });

  it('should accept numeric roll number', () => {
    const result = validateRollNumber('12345');
    expect(result.valid).toBe(true);
  });

  it('should accept alphanumeric roll number', () => {
    const result = validateRollNumber('2024-CS-001');
    expect(result.valid).toBe(true);
  });

  it('should reject null', () => {
    const result = validateRollNumber(null as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject undefined', () => {
    const result = validateRollNumber(undefined as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject empty string', () => {
    const result = validateRollNumber('');
    expect(result.valid).toBe(false);
  });

  it('should reject whitespace only', () => {
    const result = validateRollNumber('   ');
    expect(result.valid).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('should trim leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('should collapse multiple spaces to single space', () => {
    expect(sanitizeString('hello    world')).toBe('hello world');
  });

  it('should handle tabs and newlines', () => {
    expect(sanitizeString('hello\t\n  world')).toBe('hello world');
  });

  it('should preserve single spaces', () => {
    expect(sanitizeString('hello world')).toBe('hello world');
  });

  it('should handle empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('should handle whitespace only', () => {
    expect(sanitizeString('   ')).toBe('');
  });
});
