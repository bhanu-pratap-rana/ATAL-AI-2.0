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
import { ArrowRight, CheckCircle, Dumbbell, RotateCcw, Star, ThumbsUp, Trophy } from "lucide-react";
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
    // F43: dialog semantics so screen readers announce this overlay as
    // a modal dialog and aria-modal traps assistive focus, instead of
    // it being a plain decorative div. aria-labelledby/-describedby
    // point at the title and the score-headline paragraph so the
    // announcement contains both.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-completion-title"
      aria-describedby="lesson-completion-score"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <ScoreIconChip score={score} />
          <CardTitle id="lesson-completion-title" className="text-2xl">
            {getTranslation("lessonCompletion.title", language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Score */}
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-1">
              {getTranslation("lessonCompletion.score", language)}
            </p>
            <div id="lesson-completion-score" className="text-3xl sm:text-5xl font-black mb-2">
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

function ScoreIconChip({ score }: { readonly score: number }) {
  const iconClass = "w-8 h-8 sm:w-9 sm:h-9";
  const props = { className: iconClass, strokeWidth: 2.25, "aria-hidden": true };
  let icon;
  if (score >= 90) icon = <Trophy {...props} />;
  else if (score >= 70) icon = <Star {...props} />;
  else if (score >= 50) icon = <ThumbsUp {...props} />;
  else icon = <Dumbbell {...props} />;
  return (
    <div className="mx-auto mb-2 w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-(--bento-tint-orange) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-orange-d)">
      {icon}
    </div>
  );
}
