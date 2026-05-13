"use client";

/**
 * useIrtState — adaptive IRT ability state for the AssessmentRunner.
 *
 * Encapsulates the theta / standard-error / answered-count / correct-count
 * tracking that previously lived inline in AssessmentRunner. Owns:
 *
 *   - initial state (theta = 0 = average, se = 1 = high uncertainty)
 *   - the `recordResponse(updatedResponses, questions)` action that
 *     converts ResponseData[] → IRTResponse[], runs the 3PL
 *     Newton-Raphson update, and persists the new state.
 *
 * Extracted from AssessmentRunner.tsx as part of SP8 T8.3 (PR-3) to push
 * the runner below CLAUDE.md's 500-LOC rule and to make the adaptive
 * logic unit-testable without rendering the whole component.
 */

import { useCallback, useState } from "react";
import { updateTheta } from "@/app/actions/assessment/irt-models";
import { buildIrtResponse } from "./runner-utils";
import type { IRTState, Question, ResponseData } from "./runner-types";

const INITIAL_IRT_STATE: IRTState = {
  theta: 0, // Average ability
  se: 1, // High initial uncertainty
  answeredCount: 0,
  correctCount: 0,
};

export interface UseIrtState {
  readonly state: IRTState;
  /**
   * Update ability estimate after an answer. Pass the FULL updated
   * response list (not just the new one) so theta is re-fit against
   * the complete observation history every step — required by the
   * 3PL Newton-Raphson estimator.
   */
  readonly recordResponse: (
    updatedResponses: ResponseData[],
    questions: Question[],
  ) => void;
}

export function useIrtState(): UseIrtState {
  const [state, setState] = useState<IRTState>(INITIAL_IRT_STATE);

  // Note: we don't include `state.theta` in the deps array because the
  // callback always reads the latest theta via the functional setter
  // form. Including it would re-create the callback on every answer
  // and bust memoized children downstream.
  const recordResponse = useCallback(
    (updatedResponses: ResponseData[], questions: Question[]) => {
      const irtResponses = updatedResponses.map((r) =>
        buildIrtResponse(r, questions),
      );
      setState((prev) => {
        const { theta: newTheta, se: newSe } = updateTheta(
          prev.theta,
          irtResponses,
        );
        return {
          theta: newTheta,
          se: newSe,
          answeredCount: updatedResponses.length,
          correctCount: updatedResponses.filter((r) => r.isCorrect).length,
        };
      });
    },
    [],
  );

  return { state, recordResponse };
}
