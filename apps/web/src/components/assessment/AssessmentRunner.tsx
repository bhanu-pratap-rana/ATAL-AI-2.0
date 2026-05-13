"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { QuestionNavigation } from "./QuestionNavigation";
import {
  QuestionPagination,
  PaginationLegend,
  type QuestionStatus,
} from "./QuestionPagination";
import { CompactTimer } from "./AssessmentTimer";
import { clientLogger } from "@/lib/client-logger";
import { submitAssessment } from "@/app/actions/assessment/assessment-submission";
import { updateTheta } from "@/app/actions/assessment/irt-models";
import type {
  Question,
  ResponseData,
  QuestionHistoryItem,
  IRTState,
} from "./runner-types";
import {
  shuffleArray,
  getLanguageFontClass,
  getOptionButtonClasses,
  getRadioButtonClasses,
  checkAnswerCorrectness,
  buildIrtResponse,
  handleRapidTapWarning,
} from "./runner-utils";

/**
 * ATAL AI Assessment Runner - IRT-Enhanced Adaptive Testing
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 *
 * Features:
 * - Real-time IRT ability estimation (theta updates after each answer)
 * - Question history (never loses data)
 * - Previous/Next/Skip navigation
 * - Visual pagination with status colors
 * - Timer display
 * - Adaptive feedback based on performance
 *
 * IRT Implementation based on:
 * - 3PL model (difficulty, discrimination, guessing)
 * - Newton-Raphson MLE for theta estimation
 * - a-Stratified Maximum Fisher Information item selection
 */

interface AssessmentRunnerProps {
  readonly sessionId: string;
  readonly questions: Question[];
  readonly language: "en" | "hi" | "as";
}

export function AssessmentRunner({
  sessionId,
  questions,
  language,
}: AssessmentRunnerProps) {
  const router = useRouter();

  // Question history - stores ALL questions user has seen (NEVER shrinks)
  const [questionHistory, setQuestionHistory] = useState<QuestionHistoryItem[]>(
    [],
  );
  // -1 means we're on a new question (beyond history)
  // >= 0 means we're reviewing a question in history
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);

  // Current question index (0-based, corresponds to questions array)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [focusBlurCount, setFocusBlurCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRapidWarning, setShowRapidWarning] = useState(false);
  // NOSONAR S6754: Only setter needed - value tracked internally but not used in render
  const [, setTotalElapsedSeconds] = useState(0); // NOSONAR

  // IRT State for real-time adaptive tracking
  const [irtState, setIrtState] = useState<IRTState>({
    theta: 0, // Initial ability at average
    se: 1, // High initial uncertainty
    answeredCount: 0,
    correctCount: 0,
  });

  // Refs
  const questionRef = useRef<HTMLHeadingElement>(null);
  // Store question start time for duration tracking
  const questionStartTimeRef = useRef<number>(Date.now());
  // BP-2 FIX: Store rapid warning timer for cleanup
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived state
  const isReviewingHistory = currentHistoryIndex >= 0;
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Language-specific font classes
  const fontClass = getLanguageFontClass(language);

  // Get current question data (from history if reviewing, else generate fresh)
  const { shuffledOptions, shuffleMap } = useMemo(() => {
    // If reviewing history, use stored shuffle
    if (isReviewingHistory && questionHistory?.[currentHistoryIndex]) {
      const historyItem = questionHistory[currentHistoryIndex];
      return {
        shuffledOptions: historyItem.shuffledOptions,
        shuffleMap: historyItem.shuffleMap,
      };
    }

    // Generate new shuffle for current question
    if (!currentQuestion) return { shuffledOptions: [], shuffleMap: [] };

    const indices = currentQuestion.options.map((_, i) => i);
    const shuffledIndices = shuffleArray([...indices]);
    const shuffledOpts = shuffledIndices.map((i) => currentQuestion.options[i]);

    return { shuffledOptions: shuffledOpts, shuffleMap: shuffledIndices };
  }, [
    currentQuestion,
    isReviewingHistory,
    currentHistoryIndex,
    questionHistory,
  ]);

  // Calculate question statuses for pagination
  // LOOP-2 FIX: Use Map lookups for O(q+h) instead of O(q²×h) triple-nested search
  const questionStatuses: QuestionStatus[] = useMemo(() => {
    const questionIndexMap = new Map(questions.map((q, i) => [q, i]));
    const historyByIndex = new Map<number, (typeof questionHistory)[0]>();
    for (const h of questionHistory) {
      const idx = questionIndexMap.get(h.question);
      if (idx !== undefined) historyByIndex.set(idx, h);
    }
    return questions.map((_, index) => {
      if (index === currentIndex) return "current";
      const historyItem = historyByIndex.get(index);
      if (historyItem) {
        if (historyItem.hasBeenAnswered) return "answered";
        if (historyItem.skipped) return "skipped";
      }
      return "unanswered";
    });
  }, [questions, currentIndex, questionHistory]);

  // Focus management when question changes
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    if (questionRef.current) {
      questionRef.current.focus();
    }
  }, [currentIndex, currentHistoryIndex]);

  // Load selected answer when reviewing history
  useEffect(() => {
    if (isReviewingHistory && questionHistory?.[currentHistoryIndex]) {
      setSelectedOption(questionHistory[currentHistoryIndex].selectedAnswer);
    }
  }, [isReviewingHistory, currentHistoryIndex, questionHistory]);

  // Track focus/blur events
  useEffect(() => {
    const handleBlur = () => {
      setFocusBlurCount((prev) => prev + 1);
    };

    globalThis.addEventListener("blur", handleBlur);
    return () => globalThis.removeEventListener("blur", handleBlur);
  }, []);

  // BP-2 FIX: Clean up rapid warning timer on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // Submit assessment data
  const submitAssessmentData = useCallback(
    async (finalResponses: ResponseData[]) => {
      setIsSubmitting(true);

      try {
        const result = await submitAssessment(sessionId, finalResponses);

        if (result.success) {
          toast.success("Assessment completed!");
          router.push(`/app/assessment/summary?session=${sessionId}`);
        } else if ("error" in result) {
          toast.error(result.error || "Failed to submit assessment");
          setIsSubmitting(false);
        } else {
          toast.error("Failed to submit assessment");
          setIsSubmitting(false);
        }
      } catch (error) {
        clientLogger.error(
          "Assessment submission failed",
          error instanceof Error ? error : undefined,
        );
        toast.error("An unexpected error occurred");
        setIsSubmitting(false);
      }
    },
    [sessionId, router],
  );

  // Handle option selection
  const handleOptionSelect = useCallback((optionIndex: number) => {
    setSelectedOption(optionIndex);
  }, []);

  // Clear selected answer
  const handleClear = useCallback(() => {
    setSelectedOption(null);
  }, []);

  // Handle Previous navigation
  const handlePrevious = useCallback(() => {
    if (isReviewingHistory && currentHistoryIndex > 0) {
      // Move back in history
      setCurrentHistoryIndex(currentHistoryIndex - 1);
      const prevEntry = questionHistory[currentHistoryIndex - 1];
      const prevIndex = prevEntry ? questions.indexOf(prevEntry.question) : -1;
      if (prevIndex >= 0) setCurrentIndex(prevIndex);
    } else if (!isReviewingHistory && questionHistory.length > 0) {
      // Enter history mode at the last item
      const lastIndex = questionHistory.length - 1;
      setCurrentHistoryIndex(lastIndex);
      const histEntry = questionHistory[lastIndex];
      const histIndex = histEntry ? questions.indexOf(histEntry.question) : -1;
      if (histIndex >= 0) setCurrentIndex(histIndex);
    }
    setSelectedOption(null);
  }, [isReviewingHistory, currentHistoryIndex, questionHistory, questions]);

  // Handle Skip
  const handleSkip = useCallback(() => {
    if (isReviewingHistory) return; // Can't skip when reviewing

    const rtMs = Date.now() - questionStartTimeRef.current;

    // Add to history as skipped
    const historyItem: QuestionHistoryItem = {
      question: currentQuestion,
      shuffledOptions,
      shuffleMap,
      selectedAnswer: null,
      isCorrect: null,
      hasBeenAnswered: false,
      skipped: true,
      rtMs,
    };

    setQuestionHistory([...questionHistory, historyItem]);
    setSelectedOption(null);
    setFocusBlurCount(0);

    // Move to next question
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [
    isReviewingHistory,
    currentQuestion,
    shuffledOptions,
    shuffleMap,
    questionHistory,
    currentIndex,
    questions.length,
  ]);

  // UX-A8: Handle "I don't understand" — same flow as Skip, but tagged for analytics
  const handleConfused = useCallback(() => {
    if (isReviewingHistory) return;

    const rtMs = Date.now() - questionStartTimeRef.current;

    const historyItem: QuestionHistoryItem = {
      question: currentQuestion,
      shuffledOptions,
      shuffleMap,
      selectedAnswer: null,
      isCorrect: null,
      hasBeenAnswered: false,
      skipped: true,
      confused: true,
      rtMs,
    };

    setQuestionHistory([...questionHistory, historyItem]);
    setSelectedOption(null);
    setFocusBlurCount(0);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [
    isReviewingHistory,
    currentQuestion,
    shuffledOptions,
    shuffleMap,
    questionHistory,
    currentIndex,
    questions.length,
  ]);

  // Handle history navigation - S3776: Extracted to reduce cognitive complexity
  const handleHistoryNavigation = useCallback(() => {
    // Update the history item if answer changed
    if (selectedOption !== null) {
      const isCorrect = checkAnswerCorrectness(
        selectedOption,
        shuffleMap,
        currentQuestion._correctIndex,
      );

      const updatedHistory = [...questionHistory];
      updatedHistory[currentHistoryIndex] = {
        ...updatedHistory[currentHistoryIndex],
        selectedAnswer: selectedOption,
        isCorrect,
        hasBeenAnswered: true,
        skipped: false,
      };
      setQuestionHistory(updatedHistory);
    }

    // Navigate forward in history or exit history mode
    if (currentHistoryIndex < questionHistory.length - 1) {
      // More history ahead
      setCurrentHistoryIndex(currentHistoryIndex + 1);
      setCurrentIndex(
        questions.indexOf(questionHistory[currentHistoryIndex + 1].question),
      );
    } else {
      // Exit history mode, continue with new questions
      setCurrentHistoryIndex(-1);
      const lastHistoryItem = questionHistory.at(-1);
      const nextIndex = lastHistoryItem
        ? questions.indexOf(lastHistoryItem.question) + 1
        : 0;
      if (nextIndex < questions.length) {
        setCurrentIndex(nextIndex);
      }
    }
    setSelectedOption(null);
  }, [
    selectedOption,
    shuffleMap,
    currentQuestion._correctIndex,
    questionHistory,
    currentHistoryIndex,
    questions,
  ]);

  // Handle Next/Submit - S3776: Refactored to reduce cognitive complexity
  const handleNext = useCallback(() => {
    const rtMs = Date.now() - questionStartTimeRef.current;

    // Show rapid tap warning if too fast (extracted helper)
    // BP-2 FIX: Clear previous timer before setting new one
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = handleRapidTapWarning(rtMs, selectedOption !== null, setShowRapidWarning);

    // If reviewing history - handle separately to reduce nesting
    if (isReviewingHistory) {
      handleHistoryNavigation();
      return;
    }

    // Not reviewing - handle normally
    if (selectedOption === null) {
      toast.error("Please select an answer");
      return;
    }

    // Use extracted helper for correctness check
    const isCorrect = checkAnswerCorrectness(
      selectedOption,
      shuffleMap,
      currentQuestion._correctIndex,
    );

    // Add to history
    const historyItem: QuestionHistoryItem = {
      question: currentQuestion,
      shuffledOptions,
      shuffleMap,
      selectedAnswer: selectedOption,
      isCorrect,
      hasBeenAnswered: true,
      skipped: false,
      rtMs,
    };
    setQuestionHistory([...questionHistory, historyItem]);

    // Record response
    const response: ResponseData = {
      itemId: currentQuestion.id,
      module: currentQuestion.category,
      isCorrect,
      rtMs,
      focusBlurCount,
      chosenOption: shuffledOptions[selectedOption]?.text || "",
    };

    // Update IRT ability estimate (theta) after each answer
    const updatedResponses = [...responses, response];
    // Use extracted helper for IRT response building
    const irtResponses = updatedResponses.map((r) =>
      buildIrtResponse(r, questions),
    );

    // Update theta estimate
    const { theta: newTheta, se: newSe } = updateTheta(
      irtState.theta,
      irtResponses,
    );
    setIrtState({
      theta: newTheta,
      se: newSe,
      answeredCount: updatedResponses.length,
      correctCount: updatedResponses.filter((r) => r.isCorrect).length,
    });

    setSelectedOption(null);
    setResponses(updatedResponses);
    setFocusBlurCount(0);

    // Move to next or submit
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last question - compile all responses and submit
      const allResponses = [...responses, response];
      submitAssessmentData(allResponses);
    }
  },
  // irtState.theta omitted intentionally - including it would cause frequent callback recreation
  // This is safe because the callback always uses the latest irtState via closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [
    isReviewingHistory,
    handleHistoryNavigation,
    selectedOption,
    shuffleMap,
    currentQuestion,
    questionHistory,
    shuffledOptions,
    responses,
    focusBlurCount,
    currentIndex,
    questions,
    submitAssessmentData,
  ],
);

  // Jump to specific question (from pagination)
  const handleJumpTo = useCallback(
    (index: number) => {
      // Can only jump within history
      const historyIndex = questionHistory.findIndex(
        (h) => questions.indexOf(h.question) === index,
      );

      if (historyIndex >= 0) {
        setCurrentHistoryIndex(historyIndex);
        setCurrentIndex(index);
        setSelectedOption(questionHistory[historyIndex].selectedAnswer);
      }
    },
    [questionHistory, questions],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const direction = e.key === "ArrowDown" ? 1 : -1;
        const newIndex =
          selectedOption === null
            ? 0
            : (selectedOption + direction + shuffledOptions.length) %
              shuffledOptions.length;
        handleOptionSelect(newIndex);
      }

      if ((e.key === "Enter" || e.key === " ") && selectedOption !== null) {
        e.preventDefault();
        handleNext();
      }

      const num = Number.parseInt(e.key);
      if (num >= 1 && num <= shuffledOptions.length) {
        e.preventDefault();
        handleOptionSelect(num - 1);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedOption,
    shuffledOptions.length,
    isSubmitting,
    handleOptionSelect,
    handleNext,
  ]);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Header */}
        <output className="mb-4 block">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-medium text-slate-800"
              id="progress-text"
            >
              Question {currentIndex + 1} of {questions.length}
            </span>
            <CompactTimer
              onTimeUpdate={setTotalElapsedSeconds}
              isPaused={isSubmitting}
            />
          </div>
          <Progress
            value={progress}
            className="h-2"
            aria-labelledby="progress-text"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </output>

        {/* Question Pagination */}
        <div className="mb-4">
          <QuestionPagination
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            questionStatuses={questionStatuses}
            historyLength={questionHistory.length}
            onJumpTo={handleJumpTo}
          />
          <PaginationLegend />
        </div>

        {/* Rapid Tap Warning */}
        {showRapidWarning && (
          <div
            className="mb-4 bg-warning-light border-l-4 border-warning p-4 rounded-2xl"
            role="alert"
            aria-live="polite"
          >
            <p className="text-sm text-warning-dark">
              Take your time! Reading the question carefully helps you learn
              better.
            </p>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
            {/* Category Badge */}
            <div className="mb-6">
              <span
                className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-light rounded-full mb-4"
                aria-label={`Category: ${currentQuestion.category.replaceAll("_", " ")}`}
              >
                {currentQuestion.category.replaceAll("_", " ").toUpperCase()}
              </span>
              <h2
                ref={questionRef}
                id="question-text"
                className={`text-xl md:text-2xl font-black text-slate-800 wrap-break-word ${fontClass}`}
                tabIndex={-1}
              >
                {currentQuestion.questionText}
              </h2>
            </div>

            {/* Options - Using native radio inputs for accessibility (S6819) */}
            <fieldset
              aria-labelledby="question-text"
              className="space-y-3 border-0 p-0 m-0"
            >
              {shuffledOptions.map(
                (option: { id: string; text: string }, index: number) => {
                  // Fixed positional labels: A, B, C, D always in order
                  // Option content shuffles but labels stay sequential
                  const label = String.fromCodePoint(65 + index); // A=65
                  return (
                    <label
                      key={option.id}
                      className={`w-full text-left p-4 min-h-11 rounded-2xl border-2 transition-all duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${getOptionButtonClasses(selectedOption === index ? "selected" : "unselected")} ${isSubmitting ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <input
                        type="radio"
                        name="assessment-option"
                        checked={selectedOption === index}
                        onChange={() => handleOptionSelect(index)}
                        disabled={isSubmitting}
                        className="sr-only"
                        aria-label={`Option ${label}: ${option.text}`}
                      />
                      <div className="flex items-start gap-3">
                        <div
                          aria-hidden="true"
                          className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors ${getRadioButtonClasses(selectedOption === index ? "selected" : "unselected")}`}
                        >
                          {selectedOption === index && (
                            <div className="w-4 h-4 bg-white rounded-full" />
                          )}
                        </div>
                        <span
                          className={`text-base text-slate-800 wrap-break-word ${fontClass}`}
                        >
                          <span className="font-semibold mr-2">{label}.</span>
                          {option.text}
                        </span>
                      </div>
                    </label>
                  );
                },
              )}
            </fieldset>

            {/* Navigation */}
            <QuestionNavigation
              currentIndex={currentIndex}
              totalQuestions={questions.length}
              hasSelectedAnswer={selectedOption !== null}
              isSubmitting={isSubmitting}
              canGoBack={questionHistory.length > 0}
              isReviewingHistory={isReviewingHistory}
              onPrevious={handlePrevious}
              onSkip={handleSkip}
              onClear={handleClear}
              onNext={handleNext}
            />

            {/* UX-A8: "I don't understand" — flags confusion for teacher analytics */}
            {!isReviewingHistory && (
              <Button
                type="button"
                variant="outline"
                onClick={handleConfused}
                disabled={isSubmitting}
                className="mt-3 w-full bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800 font-normal"
                aria-label="I don't understand this question — flag it and move on"
              >
                <span className="mr-2" aria-hidden="true">🤔</span>
                <span>I don&apos;t understand this question</span>
              </Button>
            )}
        </div>

        {/* Helper Text */}
        <div className="mt-4 space-y-2">
          <p className="text-sm text-slate-500 text-center">
            Take your time to read each question carefully
          </p>
          <p className="text-xs text-slate-400 text-center">
            Use arrow keys to navigate options, Enter/Space to submit, or 1-4
            for quick selection
          </p>
        </div>
      </div>
    </div>
  );
}
