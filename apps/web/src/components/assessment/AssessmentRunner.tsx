'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { submitAssessment, calculateIRTScore, updateAbilityEstimate } from '@/app/actions/assessment'
import { ASSESSMENT_TIMING } from '@/lib/constants/ui-timings'
import { QuestionNavigation } from './QuestionNavigation'
import { QuestionPagination, PaginationLegend, type QuestionStatus } from './QuestionPagination'
import { CompactTimer } from './AssessmentTimer'
import { clientLogger } from '@/lib/client-logger'

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

interface Question {
  id: string
  itemCode: string
  category: string
  questionNumber: number
  questionText: string
  options: { id: string; text: string }[]
  _correctIndex: number
  _difficulty: number
  _discrimination: number
  _guessing: number
}

// Fisher-Yates shuffle for option randomization
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    if (temp !== undefined && shuffled[j] !== undefined) {
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
  }
  return shuffled
}

interface AssessmentRunnerProps {
  readonly sessionId: string
  readonly questions: Question[]
  readonly language: 'en' | 'hi' | 'as'
}

interface ResponseData {
  itemId: string
  module: string
  isCorrect: boolean
  rtMs: number
  focusBlurCount: number
  chosenOption: string
}

interface QuestionHistoryItem {
  question: Question
  shuffledOptions: { id: string; text: string }[]
  shuffleMap: number[]
  selectedAnswer: number | null
  isCorrect: boolean | null
  hasBeenAnswered: boolean
  skipped: boolean
  rtMs: number
  thetaBefore?: number
  thetaAfter?: number
}

// IRT State for real-time ability tracking
interface IRTState {
  theta: number          // Current ability estimate
  se: number             // Standard error
  answeredCount: number  // Number of answered questions
  correctCount: number   // Number of correct answers
}

export function AssessmentRunner({
  sessionId,
  questions,
  language,
}: AssessmentRunnerProps) {
  const router = useRouter()

  // Question history - stores ALL questions user has seen (NEVER shrinks)
  const [questionHistory, setQuestionHistory] = useState<QuestionHistoryItem[]>([])
  // -1 means we're on a new question (beyond history)
  // >= 0 means we're reviewing a question in history
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1)

  // Current question index (0-based, corresponds to questions array)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<ResponseData[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [focusBlurCount, setFocusBlurCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRapidWarning, setShowRapidWarning] = useState(false)
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0)

  // IRT State for real-time adaptive tracking
  const [irtState, setIrtState] = useState<IRTState>({
    theta: 0,      // Initial ability at average
    se: 1.0,       // High initial uncertainty
    answeredCount: 0,
    correctCount: 0,
  })

  // Refs
  const questionRef = useRef<HTMLHeadingElement>(null)
  const questionStartTimeRef = useRef<number>(Date.now())

  // Derived state
  const isReviewingHistory = currentHistoryIndex >= 0
  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  // Language-specific font classes
  const fontClass = language === 'hi' ? 'font-devanagari' : language === 'as' ? 'font-bengali' : ''

  // Get current question data (from history if reviewing, else generate fresh)
  const { shuffledOptions, shuffleMap } = useMemo(() => {
    // If reviewing history, use stored shuffle
    if (isReviewingHistory && questionHistory[currentHistoryIndex]) {
      const historyItem = questionHistory[currentHistoryIndex]
      return {
        shuffledOptions: historyItem.shuffledOptions,
        shuffleMap: historyItem.shuffleMap,
      }
    }

    // Generate new shuffle for current question
    if (!currentQuestion) return { shuffledOptions: [], shuffleMap: [] }

    const indices = currentQuestion.options.map((_, i) => i)
    const shuffledIndices = shuffleArray([...indices])
    const shuffledOpts = shuffledIndices.map((i) => currentQuestion.options[i])

    return { shuffledOptions: shuffledOpts, shuffleMap: shuffledIndices }
  }, [currentQuestion, isReviewingHistory, currentHistoryIndex, questionHistory])

  // Calculate question statuses for pagination
  const questionStatuses: QuestionStatus[] = useMemo(() => {
    return questions.map((_, index) => {
      if (index === currentIndex) return 'current'

      const historyItem = questionHistory.find(
        (h) => questions.indexOf(h.question) === index
      )

      if (historyItem) {
        if (historyItem.hasBeenAnswered) return 'answered'
        if (historyItem.skipped) return 'skipped'
      }

      return 'unanswered'
    })
  }, [questions, currentIndex, questionHistory])

  // Focus management when question changes
  useEffect(() => {
    questionStartTimeRef.current = Date.now()
    if (questionRef.current) {
      questionRef.current.focus()
    }
  }, [currentIndex, currentHistoryIndex])

  // Load selected answer when reviewing history
  useEffect(() => {
    if (isReviewingHistory && questionHistory[currentHistoryIndex]) {
      setSelectedOption(questionHistory[currentHistoryIndex].selectedAnswer)
    }
  }, [isReviewingHistory, currentHistoryIndex, questionHistory])

  // Track focus/blur events
  useEffect(() => {
    const handleBlur = () => {
      setFocusBlurCount((prev) => prev + 1)
    }

    globalThis.addEventListener('blur', handleBlur)
    return () => globalThis.removeEventListener('blur', handleBlur)
  }, [])

  // Submit assessment data
  const submitAssessmentData = useCallback(async (finalResponses: ResponseData[]) => {
    setIsSubmitting(true)

    try {
      const result = await submitAssessment(sessionId, finalResponses)

      if (result.success) {
        toast.success('Assessment completed!')
        router.push(`/app/assessment/summary?session=${sessionId}`)
      } else {
        toast.error(result.error || 'Failed to submit assessment')
        setIsSubmitting(false)
      }
    } catch (error) {
      clientLogger.error('Assessment submission failed', error instanceof Error ? error : undefined)
      toast.error('An unexpected error occurred')
      setIsSubmitting(false)
    }
  }, [sessionId, router])

  // Handle option selection
  const handleOptionSelect = useCallback((optionIndex: number) => {
    setSelectedOption(optionIndex)
  }, [])

  // Clear selected answer
  const handleClear = useCallback(() => {
    setSelectedOption(null)
  }, [])

  // Handle Previous navigation
  const handlePrevious = useCallback(() => {
    if (isReviewingHistory && currentHistoryIndex > 0) {
      // Move back in history
      setCurrentHistoryIndex(currentHistoryIndex - 1)
      setCurrentIndex(questions.indexOf(questionHistory[currentHistoryIndex - 1].question))
    } else if (!isReviewingHistory && questionHistory.length > 0) {
      // Enter history mode at the last item
      const lastIndex = questionHistory.length - 1
      setCurrentHistoryIndex(lastIndex)
      setCurrentIndex(questions.indexOf(questionHistory[lastIndex].question))
    }
    setSelectedOption(null)
  }, [isReviewingHistory, currentHistoryIndex, questionHistory, questions])

  // Handle Skip
  const handleSkip = useCallback(() => {
    if (isReviewingHistory) return // Can't skip when reviewing

    const rtMs = Date.now() - questionStartTimeRef.current

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
    }

    setQuestionHistory([...questionHistory, historyItem])
    setSelectedOption(null)
    setFocusBlurCount(0)

    // Move to next question
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [isReviewingHistory, currentQuestion, shuffledOptions, shuffleMap, questionHistory, currentIndex, questions.length])

  // Handle Next/Submit
  const handleNext = useCallback(() => {
    const rtMs = Date.now() - questionStartTimeRef.current

    // Show rapid tap warning if too fast
    if (rtMs < ASSESSMENT_TIMING.rapidResponseThreshold && selectedOption !== null) {
      setShowRapidWarning(true)
      setTimeout(() => setShowRapidWarning(false), ASSESSMENT_TIMING.rapidWarningDuration)
    }

    // If reviewing history
    if (isReviewingHistory) {
      // Update the history item if answer changed
      if (selectedOption !== null) {
        const originalOptionIndex = shuffleMap[selectedOption]
        // _correctIndex is 1-based from database, convert to 0-based
        const isCorrect = originalOptionIndex === currentQuestion._correctIndex - 1

        const updatedHistory = [...questionHistory]
        updatedHistory[currentHistoryIndex] = {
          ...updatedHistory[currentHistoryIndex],
          selectedAnswer: selectedOption,
          isCorrect,
          hasBeenAnswered: true,
          skipped: false,
        }
        setQuestionHistory(updatedHistory)
      }

      // Navigate forward
      if (currentHistoryIndex < questionHistory.length - 1) {
        // More history ahead
        setCurrentHistoryIndex(currentHistoryIndex + 1)
        setCurrentIndex(questions.indexOf(questionHistory[currentHistoryIndex + 1].question))
      } else {
        // Exit history mode, continue with new questions
        setCurrentHistoryIndex(-1)
        const nextIndex = questions.indexOf(questionHistory[questionHistory.length - 1].question) + 1
        if (nextIndex < questions.length) {
          setCurrentIndex(nextIndex)
        }
      }
      setSelectedOption(null)
      return
    }

    // Not reviewing - handle normally
    if (selectedOption === null) {
      toast.error('Please select an answer')
      return
    }

    const originalOptionIndex = shuffleMap[selectedOption]
    // _correctIndex is 1-based from database, convert to 0-based
    const isCorrect = originalOptionIndex === currentQuestion._correctIndex - 1

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
    }
    setQuestionHistory([...questionHistory, historyItem])

    // Record response
    const response: ResponseData = {
      itemId: currentQuestion.id,
      module: currentQuestion.category,
      isCorrect,
      rtMs,
      focusBlurCount,
      chosenOption: shuffledOptions[selectedOption]?.text || '',
    }

    // Update IRT ability estimate (theta) after each answer
    const updatedResponses = [...responses, response]
    const irtResponses = updatedResponses.map((r, i) => {
      const q = questions.find(q => q.id === r.itemId)
      return {
        difficulty: q?._difficulty || 0,
        discrimination: q?._discrimination || 1.0,
        guessing: q?._guessing || 0.2,
        isCorrect: r.isCorrect,
      }
    })

    // Update theta asynchronously
    updateAbilityEstimate(irtResponses, irtState.theta).then(result => {
      setIrtState({
        theta: result.theta,
        se: result.se,
        answeredCount: updatedResponses.length,
        correctCount: updatedResponses.filter(r => r.isCorrect).length,
      })
    }).catch(err => {
      clientLogger.error('Failed to update IRT ability estimate', err instanceof Error ? err : undefined)
    })

    setSelectedOption(null)
    setResponses(updatedResponses)
    setFocusBlurCount(0)

    // Move to next or submit
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Last question - compile all responses and submit
      const allResponses = [...responses, response]
      submitAssessmentData(allResponses)
    }
  }, [
    isReviewingHistory,
    selectedOption,
    shuffleMap,
    currentQuestion,
    questionHistory,
    currentHistoryIndex,
    shuffledOptions,
    responses,
    focusBlurCount,
    currentIndex,
    questions,
    submitAssessmentData,
  ])

  // Jump to specific question (from pagination)
  const handleJumpTo = useCallback((index: number) => {
    // Can only jump within history
    const historyIndex = questionHistory.findIndex(
      (h) => questions.indexOf(h.question) === index
    )

    if (historyIndex >= 0) {
      setCurrentHistoryIndex(historyIndex)
      setCurrentIndex(index)
      setSelectedOption(questionHistory[historyIndex].selectedAnswer)
    }
  }, [questionHistory, questions])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const direction = e.key === 'ArrowDown' ? 1 : -1
        const newIndex = selectedOption === null
          ? 0
          : (selectedOption + direction + shuffledOptions.length) % shuffledOptions.length
        handleOptionSelect(newIndex)
      }

      if ((e.key === 'Enter' || e.key === ' ') && selectedOption !== null) {
        e.preventDefault()
        handleNext()
      }

      const num = parseInt(e.key)
      if (num >= 1 && num <= shuffledOptions.length) {
        e.preventDefault()
        handleOptionSelect(num - 1)
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [selectedOption, shuffledOptions.length, isSubmitting, handleOptionSelect, handleNext])

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-tertiary">Loading assessment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Header */}
        <div className="mb-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary" id="progress-text">
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
        </div>

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
            className="mb-4 bg-warning-light border-l-4 border-warning p-4 rounded-md"
            role="alert"
            aria-live="polite"
          >
            <p className="text-sm text-warning-dark">
              Take your time! Reading the question carefully helps you learn better.
            </p>
          </div>
        )}

        {/* Question Card */}
        <div className="card-gradient">
          <div className="bg-white rounded-xl p-6 md:p-8">
            {/* Category Badge */}
            <div className="mb-6">
              <span
                className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-light rounded-full mb-4"
                aria-label={`Category: ${currentQuestion.category.replaceAll('_', ' ')}`}
              >
                {currentQuestion.category.replaceAll('_', ' ').toUpperCase()}
              </span>
              <h2
                ref={questionRef}
                id="question-text"
                className={`text-xl md:text-2xl font-bold text-text-primary ${fontClass}`}
                tabIndex={-1}
              >
                {currentQuestion.questionText}
              </h2>
            </div>

            {/* Options */}
            <div
              role="radiogroup"
              aria-labelledby="question-text"
              className="space-y-3"
            >
              {shuffledOptions.map((option: { id: string; text: string }, index: number) => (
                <button
                  key={option.id}
                  role="radio"
                  aria-checked={selectedOption === index}
                  aria-label={`Option ${option.id}: ${option.text}`}
                  onClick={() => handleOptionSelect(index)}
                  className={`w-full text-left p-4 rounded-md border-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    selectedOption === index
                      ? 'border-primary bg-primary-light shadow-primary-sm'
                      : 'border-border bg-white hover:border-primary/30 hover:bg-primary-lighter'
                  }`}
                  disabled={isSubmitting}
                  tabIndex={0}
                >
                  <div className="flex items-start gap-3">
                    <div
                      aria-hidden="true"
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedOption === index
                          ? 'border-primary bg-primary'
                          : 'border-border bg-white'
                      }`}
                    >
                      {selectedOption === index && (
                        <div className="w-3 h-3 bg-white rounded-full" />
                      )}
                    </div>
                    <span className={`text-base text-text-primary ${fontClass}`}>
                      <span className="font-semibold mr-2">{option.id}.</span>
                      {option.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>

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
          </div>
        </div>

        {/* Helper Text */}
        <div className="mt-4 space-y-2">
          <p className="text-sm text-text-secondary text-center">
            Take your time to read each question carefully
          </p>
          <p className="text-xs text-text-tertiary text-center">
            Use arrow keys to navigate options, Enter/Space to submit, or 1-4 for quick selection
          </p>
        </div>
      </div>
    </div>
  )
}
