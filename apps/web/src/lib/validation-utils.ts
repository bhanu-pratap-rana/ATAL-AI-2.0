/**
 * Centralized Validation Utilities - Main Export & Utilities
 *
 * This file re-exports validation functions from specialized modules
 * for backward compatibility and provides general utility functions.
 *
 * Validation modules (for large file refactoring per rule.md):
 * - email-validation.ts - Email format, domain, typo detection (155 lines)
 * - password-utils.ts - NIST 2025 compliant password validation (268 lines)
 * - phone-validation.ts - Phone number format (87 lines)
 * - code-validation.ts - Class codes, PINs, OTPs (130 lines)
 * - name-validation.ts - Names, roll numbers (55 lines)
 *
 * Main file: validation-utils.ts (re-exports + utilities, ~67 lines)
 * Total: ~617 lines properly split across modules ✓
 */

// Re-export from specialized modules for backward compatibility
export {
  VALID_TLDS,
  detectDomainTypo,
  isValidEmailDomain,
  validateEmail,
  normalizeEmail,
  maskEmail,
} from './email-validation'

// Password validation - NIST 2025 Compliant
export {
  validatePasswordNist2025,
  getPasswordValidationError,
  estimatePasswordStrengthNist2025,
  getPasswordStrengthLabelNist2025,
  isPasswordBreached,
  NIST_2025_PASSWORD_RULES,
  NIST_2025_MIN_PASSWORD_LENGTH,
} from './password-utils'

// Backward compatibility wrappers for legacy code
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const error = getPasswordValidationError(password)
  return {
    valid: !error,
    errors: error ? [error] : [],
  }
}

export function calculatePasswordStrength(password: string): number {
  return estimatePasswordStrengthNist2025(password)
}

export function getPasswordStrengthLabel(score: number): string {
  return getPasswordStrengthLabelNist2025(score)
}

export function validatePasswordSimple(password: string): { valid: boolean; error?: string } {
  const error = getPasswordValidationError(password)
  return {
    valid: !error,
    error,
  }
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): { valid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' }
  }
  return { valid: true }
}

// Legacy type export for backward compatibility
export interface PasswordRequirements {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecial: boolean
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecial: false,
}

export const PASSWORD_SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

export {
  validatePhoneNumber,
  sanitizePhone,
  validatePhone,
  maskPhoneNumber,
  validateOptionalPhone,
  sanitizeProfilePhone,
} from './phone-validation'

export {
  validateSchoolCode,
  validateClassCode,
  sanitizeClassCode,
  validatePIN,
  sanitizePIN,
  sanitizeOTP,
  validateOTP,
} from './code-validation'

export {
  validateName,
  validateRollNumber,
  sanitizeString,
} from './name-validation'
