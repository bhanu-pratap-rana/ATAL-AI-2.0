/**
 * Centralized Validation Utilities — re-export barrel.
 *
 * Re-exports from the specialized modules under apps/web/src/lib/:
 *   email-validation.ts · password-utils.ts · phone-validation.ts · code-validation.ts
 *
 * Plus a few thin backward-compat wrappers used by legacy callers.
 */

// Re-export from specialized modules for backward compatibility
export {
  VALID_TLDS,
  detectDomainTypo,
  isValidEmailDomain,
  normalizeEmail,
  maskEmail,
  validateEmail,
} from "./email-validation";

// Password validation - NIST 2025 Compliant
import {
  getPasswordValidationError,
  getPasswordStrengthLabelNist2025,
} from "./password-utils";

export {
  validatePasswordNist2025,
  getPasswordValidationError,
  estimatePasswordStrengthNist2025,
  getPasswordStrengthLabelNist2025,
  isPasswordBreached,
  NIST_2025_PASSWORD_RULES,
  NIST_2025_MIN_PASSWORD_LENGTH,
} from "./password-utils";

// Backward compatibility wrappers for legacy code
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const error = getPasswordValidationError(password);
  return {
    valid: !error,
    errors: error ? [error] : [],
  };
}

export function getPasswordStrengthLabel(score: number): string {
  return getPasswordStrengthLabelNist2025(score);
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string,
): { valid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match" };
  }
  return { valid: true };
}

// CLEANUP: Removed unused PasswordRequirements, DEFAULT_PASSWORD_REQUIREMENTS, PASSWORD_SPECIAL_CHARS
// These were legacy types that are no longer used (NIST 2025 compliance replaced them)

export {
  validatePhoneNumber,
  sanitizePhone,
  validatePhone,
  maskPhoneNumber,
  validateOptionalPhone,
  sanitizeProfilePhone,
} from "./phone-validation";

export {
  // CLEANUP: Removed validateSchoolCode (never used)
  validateClassCode,
  sanitizeClassCode,
  validatePIN,
  sanitizePIN,
  sanitizeOTP,
  validateOTP,
} from "./code-validation";

// CLEANUP: Removed name-validation.ts re-exports (validateName, validateRollNumber, sanitizeString)
// These functions were never used by any consumer
