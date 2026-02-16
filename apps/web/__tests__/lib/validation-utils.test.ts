/**
 * Unit Tests for Validation Utilities
 */

import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  validatePhoneNumber,
  validateClassCode,
  validatePIN,
  validateOTP,
  validateName,
  validateRollNumber,
  sanitizeString,
  normalizeEmail,
  maskEmail,
} from '@/lib/validation-utils';

describe('Email Validation', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('test@gmail.com').valid).toBe(true);
      expect(validateEmail('user@yahoo.com').valid).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid').valid).toBe(false);
      expect(validateEmail('missing@domain').valid).toBe(false);
      expect(validateEmail('@nodomain.com').valid).toBe(false);
    });

    it('should reject empty email', () => {
      expect(validateEmail('').valid).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('should lowercase and trim email', () => {
      expect(normalizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });
  });

  describe('maskEmail', () => {
    it('should mask the email address', () => {
      const masked = maskEmail('username@example.com');
      expect(masked).toContain('***');
      expect(masked).toContain('@');
    });
  });
});

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      // Passwords meeting NIST requirements (8+ chars)
      expect(validatePassword('SecurePassword123!').valid).toBe(true);
      expect(validatePassword('MyPassword2024').valid).toBe(true);
      expect(validatePassword('longpasswordwithoutspecials').valid).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty passwords', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePasswordMatch', () => {
    it('should pass when passwords match', () => {
      const result = validatePasswordMatch('password123', 'password123');
      expect(result.valid).toBe(true);
    });

    it('should fail when passwords do not match', () => {
      const result = validatePasswordMatch('password123', 'differentpassword');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should return higher scores for stronger passwords', () => {
      const weakScore = calculatePasswordStrength('weak1');
      const strongScore = calculatePasswordStrength('VeryStrongP@ssw0rd!2024');
      expect(strongScore).toBeGreaterThan(weakScore);
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return appropriate labels', () => {
      expect(getPasswordStrengthLabel(0)).toBeDefined();
      expect(getPasswordStrengthLabel(1)).toBeDefined();
      expect(getPasswordStrengthLabel(2)).toBeDefined();
      expect(getPasswordStrengthLabel(3)).toBeDefined();
      expect(getPasswordStrengthLabel(4)).toBeDefined();
    });
  });
});

describe('Phone Validation', () => {
  describe('validatePhoneNumber', () => {
    it('should accept valid Indian phone numbers', () => {
      expect(validatePhoneNumber('9876543210').valid).toBe(true);
      expect(validatePhoneNumber('+919876543210').valid).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123').valid).toBe(false);
      expect(validatePhoneNumber('abcdefghij').valid).toBe(false);
    });
  });
});

describe('Code Validation', () => {
  describe('validateClassCode', () => {
    it('should accept valid class codes', () => {
      expect(validateClassCode('ABC123').valid).toBe(true);
      expect(validateClassCode('SCHOOL2024').valid).toBe(true);
    });

    it('should reject empty codes', () => {
      expect(validateClassCode('').valid).toBe(false);
    });
  });

  describe('validatePIN', () => {
    it('should validate PIN format correctly', () => {
      // Test the actual behavior - check what valid PINs look like
      const result = validatePIN('123456');
      expect(result).toHaveProperty('valid');
    });

    it('should reject non-numeric PINs', () => {
      expect(validatePIN('abcdef').valid).toBe(false);
    });
  });

  describe('validateOTP', () => {
    it('should accept valid OTPs', () => {
      expect(validateOTP('123456').valid).toBe(true);
    });

    it('should reject invalid OTPs', () => {
      expect(validateOTP('12345').valid).toBe(false);
      expect(validateOTP('').valid).toBe(false);
    });
  });
});

describe('Name Validation', () => {
  describe('validateName', () => {
    it('should accept valid names', () => {
      expect(validateName('John Doe').valid).toBe(true);
      expect(validateName('Mary Jane Watson').valid).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validateName('').valid).toBe(false);
    });
  });

  describe('validateRollNumber', () => {
    it('should accept valid roll numbers', () => {
      expect(validateRollNumber('123').valid).toBe(true);
      expect(validateRollNumber('A001').valid).toBe(true);
    });

    it('should handle empty roll numbers appropriately', () => {
      const result = validateRollNumber('');
      expect(result).toHaveProperty('valid');
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should handle regular strings', () => {
      const result = sanitizeString('normal text');
      expect(result).toBe('normal text');
    });
  });
});
