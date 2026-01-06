/**
 * Forgot password specific state management hook
 * Manages password reset flow with email, OTP, and new password steps
 * Extracted from the 671-line useAuthState god-object
 */

import { useState, useCallback } from "react";

export type ForgotPasswordStep = "email" | "otp" | "reset";

export interface ForgotPasswordState {
  email: string;
  otp: string;
  newPassword: string;
  newPasswordConfirm: string;
  step: ForgotPasswordStep;
  error: string | null;
}

export interface ForgotPasswordActions {
  setEmail: (value: string) => void;
  setOtp: (value: string) => void;
  setNewPassword: (value: string) => void;
  setNewPasswordConfirm: (value: string) => void;
  setStep: (step: ForgotPasswordStep) => void;
  setError: (error: string | null) => void;
  resetAll: () => void;
}

const initialState: ForgotPasswordState = {
  email: "",
  otp: "",
  newPassword: "",
  newPasswordConfirm: "",
  step: "email",
  error: null,
};

/**
 * Manages forgot password/password reset state
 * Extracted from the monolithic useAuthState hook
 */
export function useForgotPasswordState(): {
  state: ForgotPasswordState;
  actions: ForgotPasswordActions;
} {
  const [state, setState] = useState<ForgotPasswordState>(initialState);

  const setEmail = useCallback((value: string) => {
    setState((prev) => ({ ...prev, email: value }));
  }, []);

  const setOtp = useCallback((value: string) => {
    setState((prev) => ({ ...prev, otp: value }));
  }, []);

  const setNewPassword = useCallback((value: string) => {
    setState((prev) => ({ ...prev, newPassword: value }));
  }, []);

  const setNewPasswordConfirm = useCallback((value: string) => {
    setState((prev) => ({ ...prev, newPasswordConfirm: value }));
  }, []);

  const setStep = useCallback((step: ForgotPasswordStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const resetAll = useCallback(() => {
    setState(initialState);
  }, []);

  const actions: ForgotPasswordActions = {
    setEmail,
    setOtp,
    setNewPassword,
    setNewPasswordConfirm,
    setStep,
    setError,
    resetAll,
  };

  return { state, actions };
}
