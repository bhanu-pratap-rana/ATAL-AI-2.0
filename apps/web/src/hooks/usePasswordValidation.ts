"use client";

import { useState, useCallback } from "react";
import {
  getPasswordValidationError,
  estimatePasswordStrengthNist2025,
  getPasswordStrengthLabelNist2025,
} from "@/lib/password-utils";

/**
 * Hook for managing password validation
 * Handles validation, strength calculation, and error messages
 */
export function usePasswordValidation() {
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState("Weak");
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null);

  // Validate password and update strength
  const validatePassword = useCallback((password: string): boolean => {
    if (!password) {
      setPasswordError("Password is required");
      setPasswordStrength(0);
      setStrengthLabel("Weak");
      return false;
    }

    const error = getPasswordValidationError(password);
    setPasswordError(error);

    if (!error) {
      const strength = estimatePasswordStrengthNist2025(password);
      setPasswordStrength(strength);
      setStrengthLabel(getPasswordStrengthLabelNist2025(strength));
      return true;
    } else {
      setPasswordStrength(0);
      setStrengthLabel("Weak");
      return false;
    }
  }, []);

  // Validate password confirmation
  const validatePasswordMatch = useCallback(
    (password: string, confirmPassword: string): boolean => {
      if (!confirmPassword) {
        setConfirmPasswordError("Please confirm your password");
        return false;
      }

      if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
        return false;
      }

      setConfirmPasswordError(null);
      return true;
    },
    [],
  );

  // Clear errors
  const clearErrors = useCallback(() => {
    setPasswordError(null);
    setConfirmPasswordError(null);
  }, []);

  return {
    passwordError,
    confirmPasswordError,
    passwordStrength,
    strengthLabel,
    validatePassword,
    validatePasswordMatch,
    clearErrors,
  };
}
