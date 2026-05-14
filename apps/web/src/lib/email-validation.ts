/**
 * Email Validation Utilities
 *
 * Handles email format validation, domain verification,
 * typo detection, and email-specific masking
 */

import {
  EMAIL_MAX_LENGTH,
  EMAIL_REGEX,
  VALID_TLDS,
  BLOCKED_EMAIL_DOMAINS,
  COMMON_DOMAIN_TYPOS,
  AUTH_ERRORS,
} from "./auth-constants";

export { VALID_TLDS } from "./auth-constants";

/**
 * Why fixed map (not Levenshtein): a distance-based check against a closed
 * provider whitelist produced false positives on legitimate institutional
 * domains like `assam.gov.in` (distance 2 from `gmail.com`).
 */
export function detectDomainTypo(domain: string): {
  hasTypo: boolean;
  suggestion?: string;
} {
  const correction = COMMON_DOMAIN_TYPOS[domain];
  if (correction) {
    return { hasTypo: true, suggestion: correction };
  }
  return { hasTypo: false };
}

/**
 * Validate email domain
 */
export function isValidEmailDomain(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();

  const domainParts = lowerDomain.split(".");
  if (domainParts.length < 2) return false;

  if (domainParts.some((part) => part.length === 0)) return false;

  const domainName = domainParts[0];
  if (domainName.length < 2) return false;

  return VALID_TLDS.some((tld) => {
    return lowerDomain === tld || lowerDomain.endsWith(`.${tld}`);
  });
}

/**
 * Validates email format and provider legitimacy
 * Includes typo detection and domain validation
 */
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
  suggestion?: string;
} {
  if (!email || typeof email !== "string") {
    return { valid: false, error: AUTH_ERRORS.INVALID_EMAIL };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
    return { valid: false, error: AUTH_ERRORS.INVALID_EMAIL };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { valid: false, error: AUTH_ERRORS.INVALID_EMAIL };
  }

  const [localPart, domain] = trimmedEmail.split("@");

  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, error: AUTH_ERRORS.DISPOSABLE_EMAIL };
  }

  const typoDetection = detectDomainTypo(domain);
  if (typoDetection.hasTypo && typoDetection.suggestion) {
    const suggestedEmail = `${localPart}@${typoDetection.suggestion}`;
    return {
      valid: false,
      error: `Email domain typo detected. Did you mean ${suggestedEmail}?`,
      suggestion: suggestedEmail,
    };
  }

  if (isValidEmailDomain(domain)) {
    return { valid: true };
  }

  return { valid: false, error: AUTH_ERRORS.INVALID_EMAIL };
}

/**
 * Normalize email (trim and lowercase)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Mask email for logging
 * Re-exported from masking-utils.ts for single source of truth
 */
export { maskEmail } from "./masking-utils";
