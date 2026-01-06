/**
 * Sign-up specific state management hook
 * Manages email, phone, guest, and username sign-up flows separately
 * Extracted from the 671-line useAuthState god-object
 */

import { useState, useCallback } from "react";

export type SignUpTab = "email" | "phone" | "guest" | "username";
export type PhoneOtpStep = "phone" | "verify";
export type UsernameStep = "username" | "profile";

export interface SignUpState {
  currentTab: SignUpTab;
  // Email sign-up
  email: string;
  emailPassword: string;
  emailPasswordConfirm: string;
  emailError: string | null;
  emailOtpSent: boolean;
  emailOtp: string;
  emailOtpError: string | null;
  // Phone sign-up
  phoneNumber: string;
  phoneOtpStep: PhoneOtpStep;
  phoneOtp: string;
  phonePassword: string;
  phonePasswordConfirm: string;
  phoneOtpError: string | null;
  phoneError: string | null;
  // Guest sign-up
  guestClassCode: string;
  guestRollNumber: string;
  guestPin: string;
  guestError: string | null;
  // Username sign-up
  username: string;
  usernamePassword: string;
  usernamePasswordConfirm: string;
  usernameError: string | null;
  usernameStep: UsernameStep;
}

export interface SignUpActions {
  setCurrentTab: (tab: SignUpTab) => void;
  // Email
  setEmail: (value: string) => void;
  setEmailPassword: (value: string) => void;
  setEmailPasswordConfirm: (value: string) => void;
  setEmailError: (error: string | null) => void;
  setEmailOtpSent: (sent: boolean) => void;
  setEmailOtp: (value: string) => void;
  setEmailOtpError: (error: string | null) => void;
  resetEmail: () => void;
  // Phone
  setPhoneNumber: (value: string) => void;
  setPhoneOtp: (value: string) => void;
  setPhonePassword: (value: string) => void;
  setPhonePasswordConfirm: (value: string) => void;
  setPhoneOtpStep: (step: PhoneOtpStep) => void;
  setPhoneOtpError: (error: string | null) => void;
  setPhoneError: (error: string | null) => void;
  resetPhone: () => void;
  // Guest
  setGuestClassCode: (value: string) => void;
  setGuestRollNumber: (value: string) => void;
  setGuestPin: (value: string) => void;
  setGuestError: (error: string | null) => void;
  resetGuest: () => void;
  // Username
  setUsername: (value: string) => void;
  setUsernamePassword: (value: string) => void;
  setUsernamePasswordConfirm: (value: string) => void;
  setUsernameError: (error: string | null) => void;
  setUsernameStep: (step: UsernameStep) => void;
  resetUsername: () => void;
  // Clear all
  resetAll: () => void;
}

const initialState: SignUpState = {
  currentTab: "email",
  email: "",
  emailPassword: "",
  emailPasswordConfirm: "",
  emailError: null,
  emailOtpSent: false,
  emailOtp: "",
  emailOtpError: null,
  phoneNumber: "",
  phoneOtpStep: "phone",
  phoneOtp: "",
  phonePassword: "",
  phonePasswordConfirm: "",
  phoneOtpError: null,
  phoneError: null,
  guestClassCode: "",
  guestRollNumber: "",
  guestPin: "",
  guestError: null,
  username: "",
  usernamePassword: "",
  usernamePasswordConfirm: "",
  usernameError: null,
  usernameStep: "username",
};

/**
 * Manages sign-up state for email, phone, guest, and username authentication
 * Extracted from the monolithic useAuthState hook
 */
export function useSignUpState(): {
  state: SignUpState;
  actions: SignUpActions;
} {
  const [state, setState] = useState<SignUpState>(initialState);

  const setCurrentTab = useCallback((tab: SignUpTab) => {
    setState((prev) => ({ ...prev, currentTab: tab }));
  }, []);

  // Email handlers
  const setEmail = useCallback((value: string) => {
    setState((prev) => ({ ...prev, email: value }));
  }, []);

  const setEmailPassword = useCallback((value: string) => {
    setState((prev) => ({ ...prev, emailPassword: value }));
  }, []);

  const setEmailPasswordConfirm = useCallback((value: string) => {
    setState((prev) => ({ ...prev, emailPasswordConfirm: value }));
  }, []);

  const setEmailError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, emailError: error }));
  }, []);

  const setEmailOtpSent = useCallback((sent: boolean) => {
    setState((prev) => ({ ...prev, emailOtpSent: sent }));
  }, []);

  const setEmailOtp = useCallback((value: string) => {
    setState((prev) => ({ ...prev, emailOtp: value }));
  }, []);

  const setEmailOtpError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, emailOtpError: error }));
  }, []);

  const resetEmail = useCallback(() => {
    setState((prev) => ({
      ...prev,
      email: "",
      emailPassword: "",
      emailPasswordConfirm: "",
      emailError: null,
      emailOtpSent: false,
      emailOtp: "",
      emailOtpError: null,
    }));
  }, []);

  // Phone handlers
  const setPhoneNumber = useCallback((value: string) => {
    setState((prev) => ({ ...prev, phoneNumber: value }));
  }, []);

  const setPhoneOtp = useCallback((value: string) => {
    setState((prev) => ({ ...prev, phoneOtp: value }));
  }, []);

  const setPhonePassword = useCallback((value: string) => {
    setState((prev) => ({ ...prev, phonePassword: value }));
  }, []);

  const setPhonePasswordConfirm = useCallback((value: string) => {
    setState((prev) => ({ ...prev, phonePasswordConfirm: value }));
  }, []);

  const setPhoneOtpStep = useCallback((step: PhoneOtpStep) => {
    setState((prev) => ({ ...prev, phoneOtpStep: step }));
  }, []);

  const setPhoneOtpError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, phoneOtpError: error }));
  }, []);

  const setPhoneError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, phoneError: error }));
  }, []);

  const resetPhone = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phoneNumber: "",
      phoneOtpStep: "phone",
      phoneOtp: "",
      phonePassword: "",
      phonePasswordConfirm: "",
      phoneOtpError: null,
      phoneError: null,
    }));
  }, []);

  // Guest handlers
  const setGuestClassCode = useCallback((value: string) => {
    setState((prev) => ({ ...prev, guestClassCode: value }));
  }, []);

  const setGuestRollNumber = useCallback((value: string) => {
    setState((prev) => ({ ...prev, guestRollNumber: value }));
  }, []);

  const setGuestPin = useCallback((value: string) => {
    setState((prev) => ({ ...prev, guestPin: value }));
  }, []);

  const setGuestError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, guestError: error }));
  }, []);

  const resetGuest = useCallback(() => {
    setState((prev) => ({
      ...prev,
      guestClassCode: "",
      guestRollNumber: "",
      guestPin: "",
      guestError: null,
    }));
  }, []);

  // Username handlers
  const setUsername = useCallback((value: string) => {
    setState((prev) => ({ ...prev, username: value }));
  }, []);

  const setUsernamePassword = useCallback((value: string) => {
    setState((prev) => ({ ...prev, usernamePassword: value }));
  }, []);

  const setUsernamePasswordConfirm = useCallback((value: string) => {
    setState((prev) => ({ ...prev, usernamePasswordConfirm: value }));
  }, []);

  const setUsernameError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, usernameError: error }));
  }, []);

  const setUsernameStep = useCallback((step: UsernameStep) => {
    setState((prev) => ({ ...prev, usernameStep: step }));
  }, []);

  const resetUsername = useCallback(() => {
    setState((prev) => ({
      ...prev,
      username: "",
      usernamePassword: "",
      usernamePasswordConfirm: "",
      usernameError: null,
      usernameStep: "username",
    }));
  }, []);

  // Reset all
  const resetAll = useCallback(() => {
    setState(initialState);
  }, []);

  const actions: SignUpActions = {
    setCurrentTab,
    setEmail,
    setEmailPassword,
    setEmailPasswordConfirm,
    setEmailError,
    setEmailOtpSent,
    setEmailOtp,
    setEmailOtpError,
    resetEmail,
    setPhoneNumber,
    setPhoneOtp,
    setPhonePassword,
    setPhonePasswordConfirm,
    setPhoneOtpStep,
    setPhoneOtpError,
    setPhoneError,
    resetPhone,
    setGuestClassCode,
    setGuestRollNumber,
    setGuestPin,
    setGuestError,
    resetGuest,
    setUsername,
    setUsernamePassword,
    setUsernamePasswordConfirm,
    setUsernameError,
    setUsernameStep,
    resetUsername,
    resetAll,
  };

  return { state, actions };
}
