"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
import { CardTitle } from "@/components/ui/card";
} from "@/components/ui/card";

interface AnalyticsTilesProps {
  readonly activeThisWeek: number;
  readonly avgMinutesPerDay: number;
  readonly atRiskCount: number;
}

export function AnalyticsTiles({
  activeThisWeek,
  avgMinutesPerDay,
  atRiskCount,
}: AnalyticsTilesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Active This Week */}
      <Card className="border-2 border-success/30 bg-gradient-to-br from-success-light to-success/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-success font-medium">
              Active This Week
            </CardDescription>
            <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="text-4xl font-bold text-success">
              {activeThisWeek}
            </div>
            <p className="text-sm text-success/80">
              {activeThisWeek === 1 ? "student" : "students"} completed
              assessments
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Avg Minutes Per Day */}
      <Card className="border-2 border-cyan/30 bg-gradient-to-br from-cyan-lightest to-cyan/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-cyan-dark font-medium">
              Avg Minutes/Day
            </CardDescription>
            <div className="w-10 h-10 bg-cyan rounded-full flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="text-4xl font-bold text-cyan-dark">
              {avgMinutesPerDay.toFixed(1)}
            </div>
            <p className="text-sm text-cyan">minutes per student per day</p>
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Students */}
      <Card
        className={`border-2 ${atRiskCount > 0 ? "border-warning/40 bg-gradient-to-br from-warning/10 to-warning/5" : "border-border bg-gradient-to-br from-surface to-surface-dark"}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription
              className={
                atRiskCount > 0
                  ? "text-warning-dark font-medium"
                  : "text-text-primary font-medium"
              }
            >
              At-Risk Students
            </CardDescription>
            <div
              className={`w-10 h-10 ${atRiskCount > 0 ? "bg-warning" : "bg-text-tertiary"} rounded-full flex items-center justify-center`}
            >
              <span className="text-2xl">{atRiskCount > 0 ? "⚠️" : "✅"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div
              className={`text-4xl font-bold ${atRiskCount > 0 ? "text-warning-dark" : "text-text-primary"}`}
            >
              {atRiskCount}
            </div>
            <p
              className={`text-sm ${atRiskCount > 0 ? "text-warning" : "text-text-secondary"}`}
            >
              {atRiskCount === 0
                ? "All students engaged"
                : "with >30% rapid guessing"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
