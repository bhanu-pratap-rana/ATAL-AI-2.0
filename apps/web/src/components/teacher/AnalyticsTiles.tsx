"use client";

import { AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

interface AnalyticsTilesProps {
  readonly activeThisWeek: number;
  readonly avgMinutesPerDay: number;
  readonly atRiskCount: number;
}

/**
 * At-risk tile styling based on risk status
 */
interface AtRiskStyles {
  readonly cardClass: string;
  readonly descriptionClass: string;
  readonly iconBackgroundClass: string;
  readonly hasAtRisk: boolean;
  readonly numberClass: string;
  readonly textClass: string;
  readonly statusMessage: string;
}

/**
 * Get all styling and text for the at-risk card based on count
 */
function getAtRiskStyles(atRiskCount: number): AtRiskStyles {
  const hasAtRiskStudents = atRiskCount > 0;

  return {
    cardClass: `border-2 ${hasAtRiskStudents ? "border-warning/40 bg-linear-to-br from-warning/10 to-warning/5" : "border-slate-200 bg-linear-to-br from-surface to-white-dark"}`,
    descriptionClass: hasAtRiskStudents
      ? "text-warning-dark font-medium"
      : "text-slate-800 font-medium",
    iconBackgroundClass: hasAtRiskStudents ? "bg-warning" : "bg-text-tertiary",
    hasAtRisk: hasAtRiskStudents,
    numberClass: hasAtRiskStudents
      ? "text-warning-dark"
      : "text-slate-800",
    textClass: hasAtRiskStudents ? "text-warning" : "text-slate-500",
    statusMessage: hasAtRiskStudents
      ? "with mastery below 40%"
      : "All students engaged",
  };
}

export function AnalyticsTiles({
  activeThisWeek,
  avgMinutesPerDay,
  atRiskCount,
}: AnalyticsTilesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Active This Week */}
      <Card className="border-2 border-success/30 bg-linear-to-br from-success-light to-success/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-success font-medium">
              Active This Week
            </CardDescription>
            <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center text-white">
              <Users className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl lg:text-4xl font-black text-success">
              {activeThisWeek}
            </div>
            <p className="text-sm text-success/80">
              {activeThisWeek === 1 ? "student" : "students"} active this
              week
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Avg Minutes Per Day */}
      <Card className="border-2 border-cyan/30 bg-linear-to-br from-cyan-lightest to-cyan/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-cyan-dark font-medium">
              Avg Minutes/Day
            </CardDescription>
            <div className="w-10 h-10 bg-cyan rounded-full flex items-center justify-center text-white">
              <Clock className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl lg:text-4xl font-black text-cyan-dark">
              {avgMinutesPerDay.toFixed(1)}
            </div>
            <p className="text-sm text-cyan">minutes per student per day</p>
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Students */}
      {(() => {
        const styles = getAtRiskStyles(atRiskCount);
        return (
          <Card className={styles.cardClass}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className={styles.descriptionClass}>
                  At-Risk Students
                </CardDescription>
                <div
                  className={`w-10 h-10 ${styles.iconBackgroundClass} rounded-full flex items-center justify-center text-white`}
                >
                  {styles.hasAtRisk ? (
                    <AlertTriangle className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className={`text-xl sm:text-2xl lg:text-4xl font-black ${styles.numberClass}`}>
                  {atRiskCount}
                </div>
                <p className={`text-sm ${styles.textClass}`}>
                  {styles.statusMessage}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
