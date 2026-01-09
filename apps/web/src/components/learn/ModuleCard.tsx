"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ModuleProgress {
  readonly module_id: string;
  readonly topics_completed: number;
  readonly average_mastery: number;
  readonly is_complete: boolean;
}

export interface Module {
  readonly id: string;
  readonly name_en: string;
  readonly name_as: string;
  readonly description: string;
  readonly icon: string;
  readonly topics: number;
  readonly color: string;
  readonly culturalNote?: string;
  readonly name_hi?: string;
}

interface ModuleCardProps {
  readonly module: Module;
  readonly progress: ModuleProgress;
  readonly progressPercent: number;
  readonly isUnlocked: boolean;
  readonly index: number;
}

export function ModuleCard({
  module,
  progress,
  progressPercent,
  isUnlocked,
  index,
}: ModuleCardProps) {
  return (
    <Card
      className={`transition-all ${
        isUnlocked
          ? "hover:shadow-lg cursor-pointer"
          : "opacity-60 cursor-not-allowed"
      } ${progress.is_complete ? "border-success border-2" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center text-2xl shadow-lg`}
            >
              {module.icon}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {module.name_en}
                {progress.is_complete && (
                  <span className="text-success">✓</span>
                )}
                {!isUnlocked && <span className="text-sm">🔒</span>}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{module.name_as}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {progress.topics_completed}/{module.topics}
            </div>
            <div className="text-xs text-muted-foreground">topics</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">
          {module.description}
        </p>

        {module.culturalNote && (
          <p className="text-xs text-warning-dark mb-3 flex items-center gap-1">
            <span>🏔️</span> {module.culturalNote}
          </p>
        )}

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progress.is_complete
                  ? "bg-success"
                  : `bg-gradient-to-r ${module.color}`
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercent}% complete</span>
            <span>Avg: {progress.average_mastery}%</span>
          </div>
        </div>

        {/* Action Button */}
        {isUnlocked && (
          <div className="mt-4">
            <Link href={`/app/learn/${module.id}`}>
              <Button
                className={`w-full bg-gradient-to-r ${module.color}`}
                variant={progress.is_complete ? "outline" : "default"}
              >
                {progress.is_complete
                  ? "Review Module"
                  : progress.topics_completed > 0
                    ? "Continue Learning"
                    : "Start Module"}
              </Button>
            </Link>
          </div>
        )}

        {!isUnlocked && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Complete Module {index} to unlock
          </div>
        )}
      </CardContent>
    </Card>
  );
}
