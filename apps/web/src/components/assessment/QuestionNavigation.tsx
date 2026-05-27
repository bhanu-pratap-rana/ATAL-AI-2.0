"use client";

import { SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ATAL AI Assessment Question Navigation - Jyoti Theme
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 *
 * Button layout: [Previous] [Skip] [Clear] [Submit & Next]
 * On last question: [Submit & Next] → [Complete Assessment]
 */

interface QuestionNavigationProps {
  readonly currentIndex: number;
  readonly totalQuestions: number;
  readonly hasSelectedAnswer: boolean;
  readonly isSubmitting: boolean;
  readonly canGoBack: boolean;
  readonly isReviewingHistory: boolean;
  readonly onPrevious: () => void;
  readonly onSkip: () => void;
  readonly onClear: () => void;
  readonly onNext: () => void;
}

/**
 * Get next button text based on submission and question state
 */
function getNextButtonText(
  isSubmitting: boolean,
  isLastQuestion: boolean,
  isReviewingHistory: boolean,
  hasSelectedAnswer: boolean,
): string {
  if (isSubmitting) {
    return "Submitting...";
  }
  if (isLastQuestion && !isReviewingHistory) {
    return "Complete Assessment";
  }
  if (hasSelectedAnswer) {
    return "Submit & Next";
  }
  return "Next";
}

/**
 * F-PROD-AS03: keep the screen-reader announcement aligned with what's
 * shown. Previously the aria-label always said "Go to next question"
 * even when the button text was "Complete Assessment", confusing
 * screen-reader users.
 */
function getNextButtonAriaLabel(
  isLastQuestion: boolean,
  isReviewingHistory: boolean,
  hasSelectedAnswer: boolean,
): string {
  if (isLastQuestion && !isReviewingHistory) {
    return hasSelectedAnswer
      ? "Submit answer and complete assessment"
      : "Complete assessment";
  }
  return hasSelectedAnswer
    ? "Submit answer and go to next question"
    : "Go to next question";
}

export function QuestionNavigation({
  currentIndex,
  totalQuestions,
  hasSelectedAnswer,
  isSubmitting,
  canGoBack,
  isReviewingHistory,
  onPrevious,
  onSkip,
  onClear,
  onNext,
}: QuestionNavigationProps) {
  const isFirstQuestion = currentIndex === 0 && !canGoBack;
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  // Determine button text based on state
  const nextButtonText = getNextButtonText(
    isSubmitting,
    isLastQuestion,
    isReviewingHistory,
    hasSelectedAnswer,
  );

  return (
    <div className="mt-6">
      {/* Mobile: Stack buttons vertically */}
      <div className="flex flex-col gap-3 sm:hidden">
        {/* Primary action row */}
        <div className="flex gap-2">
          {/* Previous */}
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstQuestion || isSubmitting}
            className="flex-1 min-h-[2.75rem]"
            aria-label="Go to previous question"
          >
            <span className="mr-1">←</span>
            <span>Previous</span>
          </Button>

          {/* Submit/Next */}
          <Button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            loading={isSubmitting}
            className="flex-1 min-h-[2.75rem]"
            aria-label={getNextButtonAriaLabel(
              isLastQuestion,
              isReviewingHistory,
              hasSelectedAnswer,
            )}
          >
            {nextButtonText}
            {!isLastQuestion && <span className="ml-1">→</span>}
          </Button>
        </div>

        {/* Secondary action row */}
        <div className="flex gap-2">
          {/* Skip */}
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isSubmitting || isReviewingHistory}
            className="flex-1 text-warning hover:text-warning-dark hover:bg-warning-light min-h-[2.75rem]"
            aria-label="Skip this question"
          >
            Skip
          </Button>

          {/* Clear Response */}
          {hasSelectedAnswer && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClear}
              disabled={isSubmitting}
              className="flex-1 text-slate-500 hover:text-slate-800 min-h-[2.75rem]"
              aria-label="Clear your selected answer"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Desktop: Single row with all buttons */}
      <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
        {/* Left side: Previous */}
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstQuestion || isSubmitting}
          className="min-w-[120px]"
          aria-label="Go to previous question"
        >
          <span className="mr-2">←</span>
          <span>Previous</span>
        </Button>

        {/* Center: Skip and Clear */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isSubmitting || isReviewingHistory}
            className="text-warning hover:text-warning-dark hover:bg-warning-light gap-1.5"
            aria-label="Skip this question"
          >
            <SkipForward size={16} strokeWidth={2.5} aria-hidden="true" />
            Skip
          </Button>

          {hasSelectedAnswer && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClear}
              disabled={isSubmitting}
              className="text-slate-500 hover:text-slate-800"
              aria-label="Clear your selected answer"
            >
              ✕ Clear
            </Button>
          )}
        </div>

        {/* Right side: Submit/Next */}
        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          loading={isSubmitting}
          size="lg"
          className="min-w-[160px]"
          aria-label={getNextButtonAriaLabel(
            isLastQuestion,
            isReviewingHistory,
            hasSelectedAnswer,
          )}
        >
          {nextButtonText}
          {!isLastQuestion && <span className="ml-2">→</span>}
        </Button>
      </div>
    </div>
  );
}
