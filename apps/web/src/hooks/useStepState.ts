"use client";

/**
 * Step/Tab Navigation State Hook
 * Consolidates duplicated step and tab navigation logic
 * Used by: useSignInState, useSignUpState, onboarding flows, etc.
 */

import { useState, useCallback } from "react";

export interface UseStepStateResult<T extends string> {
  /** Current step/tab */
  step: T;
  /** Go to specific step */
  setStep: (step: T) => void;
  /** Go to previous step (if available) */
  goToPrevious?: (currentStep: T, steps: T[]) => void;
  /** Go to next step (if available) */
  goToNext?: (currentStep: T, steps: T[]) => void;
}

/**
 * Hook for managing step/tab navigation state
 *
 * @param initialStep Initial step value
 * @returns Step state and handlers
 *
 * @example
 * const stepState = useStepState<"email" | "password" | "verify">("email");
 *
 * const steps: Array<typeof stepState.step> = ["email", "password", "verify"];
 *
 * return (
 *   <>
 *     <TabComponent currentTab={stepState.step} />
 *     <button onClick={() => stepState.setStep("password")}>Next</button>
 *   </>
 * );
 */
export function useStepState<T extends string>(
  initialStep: T,
): UseStepStateResult<T> {
  const [step, setStep] = useState<T>(initialStep);

  const goToStep = useCallback((newStep: T) => {
    setStep(newStep);
  }, []);

  return {
    step,
    setStep: goToStep,
  };
}
