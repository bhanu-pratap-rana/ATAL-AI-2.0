/**
 * Learning Style Card Component
 *
 * Displays a single learning style score with visual indicator.
 * Used in the Learning Style Profile dashboard.
 */

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LearningStyleCardProps {
  style: "visual" | "text" | "auditory";
  score: number;
  isActive: boolean;
  Icon: LucideIcon;
  title: string;
  activityCount: number;
  activityLabel: string;
}

// Style-specific gradient colors
const STYLE_COLORS = {
  visual: {
    gradient: "from-info to-info/80",
    bg: "bg-info/5",
    border: "border-info/30",
    text: "text-info",
    bar: "bg-info",
  },
  text: {
    gradient: "from-success to-success/80",
    bg: "bg-success/5",
    border: "border-success/30",
    text: "text-success",
    bar: "bg-success",
  },
  auditory: {
    gradient: "from-secondary to-secondary/80",
    bg: "bg-secondary/5",
    border: "border-secondary/30",
    text: "text-secondary",
    bar: "bg-secondary",
  },
};

export function LearningStyleCard({
  style,
  score,
  isActive,
  Icon,
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
          : "bg-slate-50 border-slate-100 hover:border-slate-200"
      }`}
    >
      <CardContent className="pt-6">
        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm ${
              isActive ? `${colors.bar} text-white` : "bg-slate-100 text-slate-600"
            }`}
          >
            <Icon className="w-6 h-6" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <div>
            <h3 className={`font-black ${isActive ? colors.text : "text-slate-800"}`}>
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
            <span className="text-sm text-slate-500">Score</span>
            <span className={`text-2xl font-black ${isActive ? colors.text : "text-slate-800"}`}>
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
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{activityLabel}</span>
            <span className={`font-medium ${isActive ? colors.text : "text-slate-500"}`}>
              {activityCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
