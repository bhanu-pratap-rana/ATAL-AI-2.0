/**
 * Learning Style Card Component
 *
 * Displays a single learning style score with visual indicator.
 * Used in the Learning Style Profile dashboard.
 */

import { Card, CardContent } from "@/components/ui/card";

interface LearningStyleCardProps {
  style: "visual" | "text" | "auditory";
  score: number;
  isActive: boolean;
  icon: string;
  title: string;
  activityCount: number;
  activityLabel: string;
}

// Style-specific gradient colors
const STYLE_COLORS = {
  visual: {
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    bar: "bg-blue-500",
  },
  text: {
    gradient: "from-green-500 to-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    bar: "bg-green-500",
  },
  auditory: {
    gradient: "from-purple-500 to-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    bar: "bg-purple-500",
  },
};

export function LearningStyleCard({
  style,
  score,
  isActive,
  icon,
  title,
  activityCount,
  activityLabel,
}: LearningStyleCardProps) {
  const colors = STYLE_COLORS[style];

  return (
    <Card
      className={`card-responsive transition-all duration-300 ${
        isActive
          ? `${colors.bg} ${colors.border} border-2 shadow-lg scale-[1.02]`
          : "bg-surface border-border-light hover:border-border"
      }`}
    >
      <CardContent className="pt-6">
        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className={`font-semibold ${isActive ? colors.text : "text-text-primary"}`}>
              {title}
            </h3>
            {isActive && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Dominant
              </span>
            )}
          </div>
        </div>

        {/* Score Display */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-secondary">Score</span>
            <span className={`text-2xl font-bold ${isActive ? colors.text : "text-text-primary"}`}>
              {score}%
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-border rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${colors.bar}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Activity Stat */}
        <div className="pt-3 border-t border-border-light">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">{activityLabel}</span>
            <span className={`font-medium ${isActive ? colors.text : "text-text-secondary"}`}>
              {activityCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
