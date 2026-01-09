/**
 * Profile setup specific state management hook
 * Manages student profile information collection after sign-up
 * Extracted from the 671-line useAuthState god-object
 */

import { useState, useCallback } from "react";

export interface ProfileSetupState {
  name: string;
  gender: "male" | "female" | "";
  rollNumber: string;
  phone: string;
  schoolName: string;
  className: string;
  village: string;
  error: string | null;
}

export interface ProfileSetupActions {
  setName: (value: string) => void;
  setGender: (value: "male" | "female" | "") => void;
  setRollNumber: (value: string) => void;
  setPhone: (value: string) => void;
  setSchoolName: (value: string) => void;
  setClassName: (value: string) => void;
  setVillage: (value: string) => void;
  setError: (error: string | null) => void;
  resetAll: () => void;
}

const initialState: ProfileSetupState = {
  name: "",
  gender: "",
  rollNumber: "",
  phone: "",
  schoolName: "",
  className: "",
  village: "",
  error: null,
};

/**
 * Manages student profile setup state
 * Collected after successful sign-up to complete user information
 * Extracted from the monolithic useAuthState hook
 */
export function useProfileSetupState(): {
  state: ProfileSetupState;
  actions: ProfileSetupActions;
} {
  const [state, setState] = useState<ProfileSetupState>(initialState);

  const setName = useCallback((value: string) => {
    setState((prev) => ({ ...prev, name: value }));
  }, []);

  const setGender = useCallback((value: "male" | "female" | "") => {
    setState((prev) => ({ ...prev, gender: value }));
  }, []);

  const setRollNumber = useCallback((value: string) => {
    setState((prev) => ({ ...prev, rollNumber: value }));
  }, []);

  const setPhone = useCallback((value: string) => {
    setState((prev) => ({ ...prev, phone: value }));
  }, []);

  const setSchoolName = useCallback((value: string) => {
    setState((prev) => ({ ...prev, schoolName: value }));
  }, []);

  const setClassName = useCallback((value: string) => {
    setState((prev) => ({ ...prev, className: value }));
  }, []);

  const setVillage = useCallback((value: string) => {
    setState((prev) => ({ ...prev, village: value }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const resetAll = useCallback(() => {
    setState(initialState);
  }, []);

  const actions: ProfileSetupActions = {
    setName,
    setGender,
    setRollNumber,
    setPhone,
    setSchoolName,
    setClassName,
    setVillage,
    setError,
    resetAll,
  };

  return { state, actions };
}
