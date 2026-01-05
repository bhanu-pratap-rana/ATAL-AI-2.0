'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ResultCircle } from './ResultCircle'
import { CategoryBreakdown, CategoryStrengths } from './CategoryBreakdown'
import { LevelBadge, LevelCard } from './LevelBadge'

/**
 * ATAL AI Assessment Summary - Enhanced with IRT Scoring
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 *
 * Features:
 * - IRT-based ability estimation (theta score)
 * - Circular score display with animation
 * - Category breakdown with progress bars
 * - Skill level badge with IRT proficiency
 * - Strengths/weaknesses analysis
 * - Retake assessment option
 */

interface IRTCategoryScore {
  readonly theta: number
  readonly score: number
  readonly proficiency: string
  readonly correct: number
  readonly total: number
}

interface IRTData {
  readonly theta: number
  readonly standardError: number
  readonly proficiencyLevel: string
  readonly categoryScores: Record<string, IRTCategoryScore>
}

interface AssessmentSummaryProps {
  readonly score: number
  readonly totalQuestions: number
  readonly correctAnswers: number
  readonly moduleBreakdown: Record<string, { total: number; correct: number }>
  readonly avgResponseTime: number
  readonly irtData?: IRTData
}

export function AssessmentSummary({
  score,
  totalQuestions,
  correctAnswers,
  moduleBreakdown,
  avgResponseTime,
  irtData,
}: AssessmentSummaryProps) {
  const router = useRouter()

  const getScoreMessage = (score: number) => {
    if (score >= 80) {
      return {
        emoji: '🎉',
        title: 'Excellent Work!',
        message: 'You have a strong foundation in digital literacy. Great job!',
      }
    } else if (score >= 60) {
      return {
        emoji: '👍',
        title: 'Good Job!',
        message: 'You have a solid understanding. Keep building on this foundation!',
      }
    } else if (score >= 40) {
      return {
        emoji: '📚',
        title: 'Great Start!',
        message: 'You are on your way! The lessons will help strengthen your skills.',
      }
    } else {
      return {
        emoji: '🚀',
        title: 'Ready to Learn!',
        message: 'This is your starting point. Every expert was once a beginner!',
      }
    }
  }

  const scoreMessage = getScoreMessage(score)

  // Format time display
  const formatTime = (ms: number) => {
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Card - Celebration */}
        <div className="card-gradient mb-6">
          <div className="bg-white rounded-xl p-6 md:p-8">
            {/* Celebration Banner */}
            <div className="text-center mb-6">
              <span className="text-5xl mb-4 block">{scoreMessage.emoji}</span>
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
                {scoreMessage.title}
              </h1>
              <p className="text-lg text-text-secondary">{scoreMessage.message}</p>
            </div>

            {/* Score and Level Row */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-6 border-t border-b border-border">
              {/* Score Circle */}
              <ResultCircle
                percentage={score}
                size={160}
                label="Overall Score"
              />

              {/* Stats Column */}
              <div className="flex flex-col gap-4 text-center md:text-left">
                {/* Correct/Total */}
                <div>
                  <div className="text-3xl font-bold text-text-primary">
                    {correctAnswers}/{totalQuestions}
                  </div>
                  <div className="text-sm text-text-tertiary">Correct Answers</div>
                </div>

                {/* Level Badge */}
                <div>
                  <LevelBadge score={score} size="lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Breakdown */}
          <div className="card">
            <CategoryBreakdown categories={moduleBreakdown} />
          </div>

          {/* Strengths & Weaknesses + Stats */}
          <div className="space-y-6">
            {/* Strengths & Weaknesses */}
            <div className="card space-y-4">
              <CategoryStrengths categories={moduleBreakdown} type="strengths" />
              <CategoryStrengths categories={moduleBreakdown} type="weaknesses" />
            </div>

            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Response Time */}
                <div className="bg-primary-light p-4 rounded-lg">
                  <div className="text-2xl font-bold text-primary-dark">
                    {formatTime(avgResponseTime)}
                  </div>
                  <div className="text-xs text-primary/80">Avg. Response Time</div>
                </div>

                {/* Modules Covered */}
                <div className="bg-success-light p-4 rounded-lg">
                  <div className="text-2xl font-bold text-success-dark">
                    {Object.keys(moduleBreakdown).length}
                  </div>
                  <div className="text-xs text-success/80">Modules Covered</div>
                </div>
              </div>

              {/* IRT-Enhanced Stats */}
              {irtData && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-text-secondary mb-3">
                    Ability Estimate (IRT)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary-light p-3 rounded-lg">
                      <div className="text-xl font-bold text-secondary-dark">
                        θ = {irtData.theta.toFixed(2)}
                      </div>
                      <div className="text-xs text-secondary/80">Ability Score</div>
                    </div>
                    <div className="bg-warning-light p-3 rounded-lg">
                      <div className="text-xl font-bold text-warning-dark">
                        ±{irtData.standardError.toFixed(2)}
                      </div>
                      <div className="text-xs text-warning/80">Standard Error</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-text-tertiary text-center">
                    Your ability level: <span className="font-semibold">{irtData.proficiencyLevel}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Level Card */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Your Skill Level</h2>
          <LevelCard score={score} className="max-w-sm mx-auto" />
        </div>

        {/* Next Steps */}
        <div className="card">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            What&apos;s Next?
          </h2>
          <p className="text-text-secondary mb-6">
            Based on your assessment, we&apos;ve identified learning modules that will help
            you grow your digital literacy skills. Start your learning journey now!
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => router.push('/app/curriculum')}
              size="lg"
              className="flex-1"
            >
              Start Learning
            </Button>
            <Button
              onClick={() => router.push('/app/assessment/start')}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Retake Assessment
            </Button>
            <Button
              onClick={() => router.push('/app/dashboard')}
              variant="ghost"
              size="lg"
              className="flex-1"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
