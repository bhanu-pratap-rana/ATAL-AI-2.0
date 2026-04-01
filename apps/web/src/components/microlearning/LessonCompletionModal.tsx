"use client";

/**
 * Lesson Completion Modal
 *
 * Shows personalized feedback after completing a lesson:
 * - Score with visual indicator
 * - Points earned and new badges
 * - Personalized message based on performance
 * - Action buttons for next steps
 *
 * Trilingual support: English, Hindi, Assamese
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowRight, RotateCcw, Trophy, Star } from "lucide-react";
import type { SupportedLanguage } from "@/types/common";
import { getTranslation } from "@/lib/i18n";

interface CompletionData {
  readonly score: number;
  readonly status: "in_progress" | "mastered";
  readonly attempts: number;
  readonly pointsAwarded: number;
  readonly newBadges: Array<{ id: string; name_en: string }>;
}

interface LessonCompletionModalProps {
  readonly data: CompletionData;
  readonly topicName: string;
  readonly language: SupportedLanguage;
  readonly onContinue: () => void;
  readonly onReviewAgain: () => void;
}


function getPersonalizedMessage(
  score: number,
  attempts: number,
  topicName: string,
  language: SupportedLanguage,
): string {
  if (score >= 90) {
    const key = attempts === 1 ? "lessonCompletion.msgExcellentFirst" : "lessonCompletion.msgExcellent";
    return getTranslation(key, language, { topic: topicName });
  }
  if (score >= 70) return getTranslation("lessonCompletion.msgGood", language, { topic: topicName });
  if (score >= 50) return getTranslation("lessonCompletion.msgOk", language, { topic: topicName });
  return getTranslation("lessonCompletion.msgKeepGoing", language, { topic: topicName });
}

/**
 * Get emoji/icon based on score
 */
function getScoreEmoji(score: number): string {
  if (score >= 90) return "🏆";
  if (score >= 70) return "⭐";
  if (score >= 50) return "👍";
  return "💪";
}

export function LessonCompletionModal({
  data,
  topicName,
  language,
  onContinue,
  onReviewAgain,
}: LessonCompletionModalProps) {
  const { score, attempts, pointsAwarded, newBadges } = data;
  const isPassing = score >= 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="text-4xl sm:text-5xl mb-2">{getScoreEmoji(score)}</div>
          <CardTitle className="text-2xl">
            {getTranslation("lessonCompletion.title", language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Score */}
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-1">
              {getTranslation("lessonCompletion.score", language)}
            </p>
            <div className="text-3xl sm:text-5xl font-black mb-2">
              {score}%
            </div>
            <Progress
              value={score}
              className={`h-3 ${isPassing ? "[&>div]:bg-success" : "[&>div]:bg-warning"}`}
            />
            <p className="text-xs text-slate-500 mt-1">
              {getTranslation("lessonCompletion.attempt", language)} #{attempts}
            </p>
          </div>

          {/* Personalized message */}
          <p className="text-center text-sm leading-relaxed">
            {getPersonalizedMessage(score, attempts, topicName, language)}
          </p>

          {/* Points */}
          {pointsAwarded > 0 && (
            <div className="flex items-center justify-center gap-2 bg-warning/10 rounded-2xl p-3">
              <Star className="h-5 w-5 text-warning" />
              <span className="font-semibold">
                +{pointsAwarded} {getTranslation("lessonCompletion.points", language)}
              </span>
            </div>
          )}

          {/* Badges */}
          {newBadges.length > 0 && (
            <div className="space-y-2">
              {newBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center justify-center gap-2 bg-primary/10 rounded-2xl p-3"
                >
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-semibold">
                    {getTranslation("lessonCompletion.newBadge", language)} {badge.name_en}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onReviewAgain}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {getTranslation("lessonCompletion.reviewAgain", language)}
            </Button>
            <Button
              onClick={onContinue}
              className={`flex-1 ${isPassing ? "bg-success hover:bg-success/90" : ""}`}
            >
              {isPassing ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-1" />
              )}
              {getTranslation("lessonCompletion.continue", language)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
