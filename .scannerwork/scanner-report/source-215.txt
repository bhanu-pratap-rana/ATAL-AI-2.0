/**
 * Sign-in specific state management hook
 * Manages email, phone, and username sign-in flows separately
 * Extracted from the 671-line useAuthState god-object
 */

import { useState, useCallback } from "react";

export type SignInTab = "email" | "phone" | "username";

export interface SignInState {
  currentTab: SignInTab;
  // Email sign-in
  email: string;
  emailPassword: string;
  emailError: string | null;
  // Phone sign-in
  phoneNumber: string;
  phonePassword: string;
  phoneError: string | null;
  // Username sign-in
  username: string;
  usernamePassword: string;
  usernameError: string | null;
}

export interface SignInActions {
  setCurrentTab: (tab: SignInTab) => void;
  // Email
  setEmail: (value: string) => void;
  setEmailPassword: (value: string) => void;
  setEmailError: (error: string | null) => void;
  resetEmail: () => void;
  // Phone
  setPhoneNumber: (value: string) => void;
  setPhonePassword: (value: string) => void;
  setPhoneError: (error: string | null) => void;
  resetPhone: () => void;
  // Username
  setUsername: (value: string) => void;
  setUsernamePassword: (value: string) => void;
  setUsernameError: (error: string | null) => void;
  resetUsername: () => void;
  // Clear all
  resetAll: () => void;
}

const initialState: SignInState = {
  currentTab: "email",
  email: "",
  emailPassword: "",
  emailError: null,
  phoneNumber: "",
  phonePassword: "",
  phoneError: null,
  username: "",
  usernamePassword: "",
  usernameError: null,
};

/**
 * Manages sign-in state for email, phone, and username authentication
 * Extracted from the monolithic useAuthState hook
 */
export function useSignInState(): {
  state: SignInState;
  actions: SignInActions;
} {
  const [state, setState] = useState<SignInState>(initialState);

  const setCurrentTab = useCallback((tab: SignInTab) => {
    setState((prev) => ({ ...prev, currentTab: tab }));
  }, []);

  // Email handlers
  const setEmail = useCallback((value: string) => {
    setState((prev) => ({ ...prev, email: value }));
  }, []);

  const setEmailPassword = useCallback((value: string) => {
    setState((prev) => ({ ...prev, emailPassword: value }));
  }, []);

  const setEmailError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, emailError: error }));
  }, []);

  const resetEmail = useCallback(() => {
    setState((prev) => ({
      ...prev,
      email: "",
      emailPassword: "",
      emailError: null,
    }));
  }, []);

  // Phone handlers
  const setPhoneNumber = useCallback((value: string) => {
    setState((prev) => ({ ...prev, phoneNumber: value }));
  }, []);

  const setPhonePassword = useCallback((value: string) => {
    setState((prev) => ({ ...prev, phonePassword: value }));
  }, []);

  const setPhoneError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, phoneError: error }));
  }, []);

  const resetPhone = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phoneNumber: "",
      phonePassword: "",
      phoneError: null,
    }));
  }, []);

  // Username handlers
  const setUsername = useCallback((value: string) => {
    setState((prev) => ({ ...prev, username: value }));
  }, []);

  const setUsernamePassword = useCallback((value: string) => {
    setState((prev) => ({ ...prev, usernamePassword: value }));
  }, []);

  const setUsernameError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, usernameError: error }));
  }, []);

  const resetUsername = useCallback(() => {
    setState((prev) => ({
      ...prev,
      username: "",
      usernamePassword: "",
      usernameError: null,
    }));
  }, []);

  // Reset all
  const resetAll = useCallback(() => {
    setState(initialState);
  }, []);

  const actions: SignInActions = {
    setCurrentTab,
    setEmail,
    setEmailPassword,
    setEmailError,
    resetEmail,
    setPhoneNumber,
    setPhonePassword,
    setPhoneError,
    resetPhone,
    setUsername,
    setUsernamePassword,
    setUsernameError,
    resetUsername,
    resetAll,
  };

  return { state, actions };
}
