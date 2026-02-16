/**
 * Unit Tests for Masking Utilities
 */

import {
  maskEmail,
  maskPhone,
  maskPhoneNumber,
  maskUserId,
  maskToken,
  maskSensitiveData,
} from '@/lib/masking-utils';

describe('Masking Utilities', () => {
  describe('maskEmail', () => {
    it('should mask email keeping first 2 characters of local part', () => {
      expect(maskEmail('john.doe@example.com')).toBe('jo***@example.com');
    });

    it('should return "unknown" for undefined/empty email', () => {
      expect(maskEmail(undefined)).toBe('unknown');
      expect(maskEmail('')).toBe('unknown');
    });

    it('should return masked format for malformed emails', () => {
      expect(maskEmail('invalid')).toBe('***@***');
    });

    it('should handle short local parts', () => {
      expect(maskEmail('a@example.com')).toBe('a***@example.com');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone keeping last 4 digits', () => {
      expect(maskPhone('+919876543210')).toBe('***3210');
      expect(maskPhone('9876543210')).toBe('***3210');
    });

    it('should return "unknown" for undefined/empty phone', () => {
      expect(maskPhone(undefined)).toBe('unknown');
      expect(maskPhone('')).toBe('unknown');
    });

    it('should return "****" for very short numbers', () => {
      expect(maskPhone('123')).toBe('****');
    });

    it('should handle formatted phone numbers', () => {
      expect(maskPhone('(987) 654-3210')).toBe('***3210');
    });
  });

  describe('maskPhoneNumber', () => {
    it('should be an alias for maskPhone', () => {
      expect(maskPhoneNumber('9876543210')).toBe('***3210');
    });
  });

  describe('maskUserId', () => {
    it('should mask user ID keeping first 8 characters', () => {
      expect(maskUserId('abc12345-6789-def0-ghij-klmnopqrstuv')).toBe('abc12345...');
    });

    it('should return "unknown" for undefined/empty ID', () => {
      expect(maskUserId(undefined)).toBe('unknown');
      expect(maskUserId('')).toBe('unknown');
    });

    it('should handle short IDs', () => {
      expect(maskUserId('abc')).toBe('abc...');
    });
  });

  describe('maskToken', () => {
    it('should mask long tokens keeping first 20 characters', () => {
      const longToken = 'abcdefghijklmnopqrstuvwxyz1234567890';
      expect(maskToken(longToken)).toBe('abcdefghijklmnopqrst...');
    });

    it('should return "***" for short tokens', () => {
      expect(maskToken('short')).toBe('***');
    });

    it('should return "unknown" for undefined/empty token', () => {
      expect(maskToken(undefined)).toBe('unknown');
      expect(maskToken('')).toBe('unknown');
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask email fields', () => {
      const data = { email: 'user@example.com', name: 'John' };
      const masked = maskSensitiveData(data) as Record<string, unknown>;
      expect(masked.email).toBe('us***@example.com');
      expect(masked.name).toBe('John');
    });

    it('should mask phone fields', () => {
      const data = { phone: '9876543210' };
      const masked = maskSensitiveData(data) as Record<string, unknown>;
      expect(masked.phone).toBe('***3210');
    });

    it('should mask password fields completely', () => {
      const data = { password: 'secret123', pwd: 'another' };
      const masked = maskSensitiveData(data) as Record<string, unknown>;
      expect(masked.password).toBe('***');
      expect(masked.pwd).toBe('***');
    });

    it('should mask token fields', () => {
      const data = { token: 'a'.repeat(30) };
      const masked = maskSensitiveData(data) as Record<string, unknown>;
      expect(masked.token).toContain('...');
    });

    it('should mask nested objects', () => {
      const data = {
        user: {
          email: 'test@example.com',
        },
      };
      const masked = maskSensitiveData(data) as Record<string, Record<string, unknown>>;
      expect(masked.user.email).toBe('te***@example.com');
    });

    it('should handle arrays', () => {
      const data = [{ email: 'a@b.com' }, { email: 'c@d.com' }];
      const masked = maskSensitiveData(data) as Array<Record<string, unknown>>;
      expect(masked[0].email).toBe('a***@b.com');
      expect(masked[1].email).toBe('c***@d.com');
    });

    it('should handle non-object data', () => {
      expect(maskSensitiveData('string')).toBe('string');
      expect(maskSensitiveData(123)).toBe(123);
      expect(maskSensitiveData(null)).toBe(null);
    });

    it('should respect max depth', () => {
      const deep = {
        l1: {
          l2: {
            l3: {
              l4: {
                email: 'deep@example.com',
              },
            },
          },
        },
      };
      // Should not throw and should handle depth limit gracefully
      const masked = maskSensitiveData(deep);
      expect(masked).toBeDefined();
    });
  });
});
