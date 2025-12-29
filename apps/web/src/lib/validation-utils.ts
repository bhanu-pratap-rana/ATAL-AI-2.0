/**
 * Centralized Validation Utilities - Main Export & Utilities
 *
 * This file re-exports validation functions from specialized modules
 * for backward compatibility and provides general utility functions.
 *
 * Validation modules (for large file refactoring per rule.md):
 * - email-validation.ts - Email format, domain, typo detection (155 lines)
 * - password-validation.ts - Password strength, requirements (110 lines)
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

export type {
  PasswordRequirements,
} from './password-validation'

export {
  DEFAULT_PASSWORD_REQUIREMENTS,
  PASSWORD_SPECIAL_CHARS,
  validatePassword,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  validatePasswordSimple,
  validatePasswordMatch,
} from './password-validation'

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
