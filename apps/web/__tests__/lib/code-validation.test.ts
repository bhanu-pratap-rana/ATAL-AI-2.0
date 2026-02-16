/**
 * Tests for Code/PIN/OTP Validation Utilities
 *
 * Tests validation functions for:
 * - School codes
 * - Class codes
 * - PINs
 * - OTPs
 */

import {
  validateSchoolCode,
  validateClassCode,
  sanitizeClassCode,
  validatePIN,
  validatePin,
  sanitizePIN,
  validateOTP,
  sanitizeOTP,
} from '@/lib/code-validation';

describe('validateSchoolCode', () => {
  it('should accept valid 6-character code', () => {
    const result = validateSchoolCode('SCHOOL');
    expect(result.valid).toBe(true);
  });

  it('should accept alphanumeric code', () => {
    const result = validateSchoolCode('SCH001');
    expect(result.valid).toBe(true);
  });

  it('should convert lowercase to uppercase', () => {
    const result = validateSchoolCode('school');
    expect(result.valid).toBe(true);
  });

  it('should reject code shorter than 6 characters', () => {
    const result = validateSchoolCode('SCH01');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('6');
  });

  it('should reject code longer than 6 characters', () => {
    const result = validateSchoolCode('SCHOOL1');
    expect(result.valid).toBe(false);
  });

  it('should reject code with special characters', () => {
    const result = validateSchoolCode('SCH-01');
    expect(result.valid).toBe(false);
  });
});

describe('validateClassCode', () => {
  it('should accept valid 6-character code', () => {
    const result = validateClassCode('CLASS1');
    expect(result.valid).toBe(true);
  });

  it('should accept alphanumeric code', () => {
    const result = validateClassCode('CLS001');
    expect(result.valid).toBe(true);
  });

  it('should reject null', () => {
    const result = validateClassCode(null as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject undefined', () => {
    const result = validateClassCode(undefined as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject code shorter than 6 characters', () => {
    const result = validateClassCode('CLS01');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('6');
  });

  it('should reject code with special characters after sanitization', () => {
    // Special chars are removed during sanitization, so if result is less than 6, it fails
    const result = validateClassCode('CLS-01');
    expect(result.valid).toBe(false);
  });
});

describe('sanitizeClassCode', () => {
  it('should convert to uppercase', () => {
    expect(sanitizeClassCode('class1')).toBe('CLASS1');
  });

  it('should remove special characters', () => {
    expect(sanitizeClassCode('CLS-001')).toBe('CLS001');
  });

  it('should remove spaces', () => {
    expect(sanitizeClassCode('CLS 001')).toBe('CLS001');
  });

  it('should truncate to 6 characters', () => {
    expect(sanitizeClassCode('CLASS123')).toBe('CLASS1');
  });

  it('should handle empty string', () => {
    expect(sanitizeClassCode('')).toBe('');
  });
});

describe('validatePIN', () => {
  it('should accept valid 4-digit PIN', () => {
    const result = validatePIN('1234');
    expect(result.valid).toBe(true);
  });

  it('should accept PIN with leading zeros', () => {
    const result = validatePIN('0123');
    expect(result.valid).toBe(true);
  });

  it('should reject null', () => {
    const result = validatePIN(null as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject undefined', () => {
    const result = validatePIN(undefined as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject PIN shorter than 4 digits', () => {
    const result = validatePIN('123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('4');
  });

  it('should reject PIN longer than 4 digits', () => {
    const result = validatePIN('12345');
    expect(result.valid).toBe(false);
  });

  it('should reject non-numeric PIN', () => {
    const result = validatePIN('12ab');
    expect(result.valid).toBe(false);
  });
});

describe('validatePin (alias)', () => {
  it('should be an alias for validatePIN', () => {
    expect(validatePin).toBe(validatePIN);
  });

  it('should work the same as validatePIN', () => {
    const result = validatePin('1234');
    expect(result.valid).toBe(true);
  });
});

describe('sanitizePIN', () => {
  it('should remove non-digit characters', () => {
    expect(sanitizePIN('12-34')).toBe('1234');
  });

  it('should truncate to 4 digits', () => {
    expect(sanitizePIN('123456')).toBe('1234');
  });

  it('should handle letters', () => {
    expect(sanitizePIN('1a2b3c4d')).toBe('1234');
  });

  it('should handle empty string', () => {
    expect(sanitizePIN('')).toBe('');
  });

  it('should handle spaces', () => {
    expect(sanitizePIN('12 34')).toBe('1234');
  });
});

describe('validateOTP', () => {
  it('should accept valid 6-digit OTP', () => {
    const result = validateOTP('123456');
    expect(result.valid).toBe(true);
  });

  it('should accept OTP with leading zeros', () => {
    const result = validateOTP('012345');
    expect(result.valid).toBe(true);
  });

  it('should reject null', () => {
    const result = validateOTP(null as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject undefined', () => {
    const result = validateOTP(undefined as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('should reject OTP shorter than 6 digits', () => {
    const result = validateOTP('12345');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('6');
  });

  it('should reject OTP longer than 6 digits', () => {
    const result = validateOTP('1234567');
    expect(result.valid).toBe(false);
  });

  it('should reject non-numeric OTP', () => {
    const result = validateOTP('12ab56');
    expect(result.valid).toBe(false);
  });
});

describe('sanitizeOTP', () => {
  it('should remove non-digit characters', () => {
    expect(sanitizeOTP('12-34-56')).toBe('123456');
  });

  it('should truncate to 6 digits', () => {
    expect(sanitizeOTP('12345678')).toBe('123456');
  });

  it('should handle letters', () => {
    expect(sanitizeOTP('1a2b3c4d5e6f')).toBe('123456');
  });

  it('should handle empty string', () => {
    expect(sanitizeOTP('')).toBe('');
  });

  it('should handle spaces', () => {
    expect(sanitizeOTP('123 456')).toBe('123456');
  });
});
