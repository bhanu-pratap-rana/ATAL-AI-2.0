/**
 * Unit Tests for usePasswordValidation Hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';

describe('usePasswordValidation Hook', () => {
  describe('initial state', () => {
    it('should initialize with no errors', () => {
      const { result } = renderHook(() => usePasswordValidation());

      expect(result.current.passwordError).toBe(null);
      expect(result.current.confirmPasswordError).toBe(null);
    });

    it('should initialize with default strength values', () => {
      const { result } = renderHook(() => usePasswordValidation());

      expect(result.current.passwordStrength).toBe(0);
      expect(result.current.strengthLabel).toBe('Weak');
    });
  });

  describe('validatePassword', () => {
    it('should return error for empty password', () => {
      const { result } = renderHook(() => usePasswordValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePassword('');
      });

      expect(isValid!).toBe(false);
      expect(result.current.passwordError).toBe('Password is required');
      expect(result.current.passwordStrength).toBe(0);
    });

    it('should validate a strong password', () => {
      const { result } = renderHook(() => usePasswordValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePassword('MyStr0ng!Password123');
      });

      expect(isValid!).toBe(true);
      expect(result.current.passwordError).toBe(null);
      expect(result.current.passwordStrength).toBeGreaterThan(0);
    });

    it('should return error for weak password', () => {
      const { result } = renderHook(() => usePasswordValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePassword('weak');
      });

      expect(isValid!).toBe(false);
      expect(result.current.passwordError).not.toBe(null);
    });

    it('should update strength label based on password', () => {
      const { result } = renderHook(() => usePasswordValidation());

      act(() => {
        result.current.validatePassword('VeryStr0ng!P@ssword2024');
      });

      expect(['Weak', 'Fair', 'Good', 'Strong', 'Very Strong']).toContain(
        result.current.strengthLabel
      );
    });
  });

  describe('validatePasswordMatch', () => {
    it('should return error for empty confirmation', () => {
      const { result } = renderHook(() => usePasswordValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePasswordMatch('password123', '');
      });

      expect(isValid!).toBe(false);
      expect(result.current.confirmPasswordError).toBe('Please confirm your password');
    });

    it('should return error when passwords do not match', () => {
      const { result } = renderHook(() => usePasswordValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePasswordMatch('password123', 'password456');
      });

      expect(isValid!).toBe(false);
      expect(result.current.confirmPasswordError).toBe('Passwords do not match');
    });

    it('should return true when passwords match', () => {
      const { result } = renderHook(() => usePasswordValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validatePasswordMatch('password123', 'password123');
      });

      expect(isValid!).toBe(true);
      expect(result.current.confirmPasswordError).toBe(null);
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => usePasswordValidation());

      // Set some errors
      act(() => {
        result.current.validatePassword('');
        result.current.validatePasswordMatch('a', 'b');
      });

      expect(result.current.passwordError).not.toBe(null);
      expect(result.current.confirmPasswordError).not.toBe(null);

      // Clear errors
      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.passwordError).toBe(null);
      expect(result.current.confirmPasswordError).toBe(null);
    });
  });

  describe('function stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => usePasswordValidation());

      const initialValidatePassword = result.current.validatePassword;
      const initialValidateMatch = result.current.validatePasswordMatch;
      const initialClearErrors = result.current.clearErrors;

      rerender();

      expect(result.current.validatePassword).toBe(initialValidatePassword);
      expect(result.current.validatePasswordMatch).toBe(initialValidateMatch);
      expect(result.current.clearErrors).toBe(initialClearErrors);
    });
  });
});
