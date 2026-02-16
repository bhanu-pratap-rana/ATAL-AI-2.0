/**
 * Tests for Phone Validation Utilities
 *
 * Tests phone validation functions including:
 * - Format validation (generic and India-specific)
 * - Sanitization
 * - Optional phone validation
 */

import {
  validatePhoneNumber,
  validatePhone,
  sanitizePhone,
  validateOptionalPhone,
  sanitizeProfilePhone,
} from '@/lib/phone-validation';

describe('validatePhoneNumber (generic)', () => {
  it('should accept 10-digit number', () => {
    const result = validatePhoneNumber('1234567890');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBeDefined();
  });

  it('should accept number with country code', () => {
    const result = validatePhoneNumber('+919876543210');
    expect(result.valid).toBe(true);
  });

  it('should accept formatted number', () => {
    const result = validatePhoneNumber('(123) 456-7890');
    expect(result.valid).toBe(true);
  });

  it('should reject too short number', () => {
    const result = validatePhoneNumber('12345');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10 digits');
  });

  it('should reject too long number', () => {
    const result = validatePhoneNumber('1234567890123456');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too long');
  });
});

describe('validatePhone (India-specific)', () => {
  it('should accept valid Indian number', () => {
    const result = validatePhone('9876543210');
    expect(result.valid).toBe(true);
  });

  it('should accept number with +91 prefix', () => {
    const result = validatePhone('+919876543210');
    expect(result.valid).toBe(true);
  });

  it('should accept number with 91 prefix', () => {
    const result = validatePhone('919876543210');
    expect(result.valid).toBe(true);
  });

  it('should accept number with 0 prefix', () => {
    const result = validatePhone('09876543210');
    expect(result.valid).toBe(true);
  });

  it('should reject null/undefined', () => {
    const result = validatePhone(null as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject empty string', () => {
    const result = validatePhone('');
    expect(result.valid).toBe(false);
  });

  it('should reject too short number', () => {
    const result = validatePhone('98765');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10 digits');
  });
});

describe('sanitizePhone', () => {
  it('should strip non-digit characters', () => {
    expect(sanitizePhone('(123) 456-7890')).toBe('+911234567890');
  });

  it('should handle +91 prefix', () => {
    expect(sanitizePhone('+919876543210')).toBe('+919876543210');
  });

  it('should handle 91 prefix', () => {
    expect(sanitizePhone('919876543210')).toBe('+919876543210');
  });

  it('should handle 0 prefix', () => {
    expect(sanitizePhone('09876543210')).toBe('+919876543210');
  });

  it('should add +91 prefix to 10-digit number', () => {
    expect(sanitizePhone('9876543210')).toBe('+919876543210');
  });

  it('should truncate to correct length', () => {
    const result = sanitizePhone('98765432109999');
    expect(result.length).toBe(13); // +91 (3) + 10 digits
  });
});

describe('validateOptionalPhone', () => {
  it('should accept empty string', () => {
    const result = validateOptionalPhone('');
    expect(result.valid).toBe(true);
  });

  it('should accept undefined', () => {
    const result = validateOptionalPhone(undefined);
    expect(result.valid).toBe(true);
  });

  it('should accept null', () => {
    const result = validateOptionalPhone(null);
    expect(result.valid).toBe(true);
  });

  it('should accept whitespace only', () => {
    const result = validateOptionalPhone('   ');
    expect(result.valid).toBe(true);
  });

  it('should accept valid 10-digit number', () => {
    const result = validateOptionalPhone('9876543210');
    expect(result.valid).toBe(true);
  });

  it('should accept formatted number', () => {
    const result = validateOptionalPhone('987 654 3210');
    expect(result.valid).toBe(true);
  });

  it('should reject too short number', () => {
    const result = validateOptionalPhone('98765');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10 digits');
  });

  it('should reject too long number', () => {
    const result = validateOptionalPhone('98765432109999');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10 digits only');
  });

  it('should reject number not starting with 6-9', () => {
    const result = validateOptionalPhone('1234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid Indian mobile');
  });

  it('should accept number starting with 6', () => {
    const result = validateOptionalPhone('6234567890');
    expect(result.valid).toBe(true);
  });

  it('should accept number starting with 7', () => {
    const result = validateOptionalPhone('7234567890');
    expect(result.valid).toBe(true);
  });

  it('should accept number starting with 8', () => {
    const result = validateOptionalPhone('8234567890');
    expect(result.valid).toBe(true);
  });

  it('should accept number starting with 9', () => {
    const result = validateOptionalPhone('9234567890');
    expect(result.valid).toBe(true);
  });
});

describe('sanitizeProfilePhone', () => {
  it('should strip non-digit characters', () => {
    expect(sanitizeProfilePhone('987-654-3210')).toBe('9876543210');
  });

  it('should limit to 10 digits', () => {
    expect(sanitizeProfilePhone('98765432109999')).toBe('9876543210');
  });

  it('should handle formatted input', () => {
    expect(sanitizeProfilePhone('(987) 654-3210')).toBe('9876543210');
  });

  it('should return empty string for non-digit input', () => {
    expect(sanitizeProfilePhone('abc')).toBe('');
  });

  it('should preserve leading zeros in digits', () => {
    expect(sanitizeProfilePhone('0987654321')).toBe('0987654321');
  });
});
