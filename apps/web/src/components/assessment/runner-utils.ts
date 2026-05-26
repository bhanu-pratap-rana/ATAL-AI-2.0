/**
 * AssessmentRunner — pure helper functions
 *
 * Extracted from AssessmentRunner.tsx as part of SP8 T8.3 decomposition.
 * All exports are pure (no React hooks, no DOM access except crypto)
 * so they can be unit-tested in isolation and reused by sub-components.
 */

import { ASSESSMENT_TIMING } from "@/lib/constants/ui-timings";
import { clientLogger } from "@/lib/client-logger";
import type { IRTItem } from "@/app/actions/assessment/irt-models";
import type { Question, ResponseData } from "./runner-types";

/**
 * Fisher-Yates shuffle for option randomization.
 * Uses crypto.getRandomValues() for secure randomness so options
 * order can't be predicted by a malicious client.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    const temp = shuffled[i];
    if (shuffled?.[j] !== undefined) {
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
  }
  return shuffled;
}

/** Get language-specific font class */
export function getLanguageFontClass(language: "en" | "hi" | "as"): string {
  switch (language) {
    case "hi":
      return "font-devanagari";
    case "as":
      return "font-bengali";
    default:
      return "";
  }
}

/** Option label selection states — S2301: status keys, not boolean params */
const OPTION_CLASSES = {
  selected: "border-primary bg-primary-light shadow-primary-sm",
  unselected:
    "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary-lighter active:bg-primary-lighter/80 active:border-primary/50 active:scale-[0.99]",
} as const;

const RADIO_CLASSES = {
  selected: "border-primary bg-primary",
  unselected: "border-slate-200 bg-white",
} as const;

export function getOptionButtonClasses(status: "selected" | "unselected"): string {
  return OPTION_CLASSES[status];
}

export function getRadioButtonClasses(status: "selected" | "unselected"): string {
  return RADIO_CLASSES[status];
}

/**
 * Check if answer is correct based on shuffle map.
 *
 * BUG-012 — index handling contract:
 * - DB `_correctIndex` is 1-based (1, 2, 3, 4 for options A, B, C, D)
 * - `shuffleMap` uses 0-based indices (0, 1, 2, 3)
 * - We convert correctIndex from 1-based to 0-based before comparison.
 *
 * @param selectedOption - 0-based index of user's selected option in shuffled order
 * @param shuffleMap - Maps shuffled position to original position (0-based)
 * @param correctIndex - 1-based index from database (_correctIndex field)
 * @returns true if the selected option maps to the correct answer
 */
export function checkAnswerCorrectness(
  selectedOption: number,
  shuffleMap: number[],
  correctIndex: number,
): boolean {
  if (correctIndex < 1 || correctIndex > shuffleMap.length) {
    clientLogger.warn(
      `[AssessmentRunner] Invalid correctIndex: ${correctIndex}, expected 1-${shuffleMap.length}`,
    );
    return false;
  }
  if (selectedOption < 0 || selectedOption >= shuffleMap.length) {
    clientLogger.warn(
      `[AssessmentRunner] Invalid selectedOption: ${selectedOption}, expected 0-${shuffleMap.length - 1}`,
    );
    return false;
  }
  const originalOptionIndex = shuffleMap[selectedOption];
  const correctIndex0Based = correctIndex - 1;
  return originalOptionIndex === correctIndex0Based;
}

/** Build IRT response object from question data */
export function buildIrtResponse(
  response: ResponseData,
  questions: Question[],
): { item: IRTItem; correct: boolean } {
  const q = questions.find((question) => question.id === response.itemId);
  return {
    item: {
      id: response.itemId,
      item_code: q?.itemCode || "",
      category: q?.category || "",
      question_text: q?.questionText || "",
      options: q?.options || [],
      correct_answer: q?._correctIndex || 0,
      difficulty: q?._difficulty || 0,
      discrimination: q?._discrimination || 1,
      guessing: q?._guessing || 0.2,
    },
    correct: response.isCorrect,
  };
}

/**
 * Show rapid-tap warning if the response is suspiciously fast.
 * BP-2 — returns the timer id so the caller can clear it on unmount,
 * preventing the "setState on unmounted" leak we hit during navigation.
 */
export function handleRapidTapWarning(
  rtMs: number,
  hasSelection: boolean,
  setShowWarning: (show: boolean) => void,
): ReturnType<typeof setTimeout> | null {
  if (rtMs < ASSESSMENT_TIMING.rapidResponseThreshold && hasSelection) {
    setShowWarning(true);
    return setTimeout(
      () => setShowWarning(false),
      ASSESSMENT_TIMING.rapidWarningDuration,
    );
  }
  return null;
}
