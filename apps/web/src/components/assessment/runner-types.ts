/**
 * AssessmentRunner — shared types
 *
 * Extracted from AssessmentRunner.tsx as part of SP8 T8.3 decomposition.
 * No behavior change; pure type-level move so sub-components and hooks
 * can import the same shapes without circular imports.
 */

export interface Question {
  id: string;
  itemCode: string;
  category: string;
  questionNumber: number;
  questionText: string;
  options: { id: string; text: string }[];
  _correctIndex: number;
  _difficulty: number;
  _discrimination: number;
  _guessing: number;
}

export interface ResponseData {
  itemId: string;
  module: string;
  isCorrect: boolean;
  rtMs: number;
  focusBlurCount: number;
  chosenOption: string;
}

export interface QuestionHistoryItem {
  question: Question;
  shuffledOptions: { id: string; text: string }[];
  shuffleMap: number[];
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  hasBeenAnswered: boolean;
  skipped: boolean;
  /** UX-A8: Student explicitly flagged the question as confusing (vs intentional skip) */
  confused?: boolean;
  rtMs: number;
  thetaBefore?: number;
  thetaAfter?: number;
}

/** IRT State for real-time ability tracking */
export interface IRTState {
  theta: number; // Current ability estimate
  se: number; // Standard error
  answeredCount: number; // Number of answered questions
  correctCount: number; // Number of correct answers
}
