"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ClassAssessmentData {
  readonly classId: string;
  readonly className: string;
  readonly subject: string | null | undefined;
  readonly studentCount: number;
  readonly assessmentsTaken: number;
  readonly averageScore: number | null;
}

interface ClassAssessmentCardProps {
  readonly classData: ClassAssessmentData;
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number | null): string {
  if (score === null) return "bg-slate-50 text-slate-400";
  if (score >= 80) return "bg-success-light text-success-dark";
  if (score >= 60) return "bg-warning-light text-warning-dark";
  return "bg-error-light text-error-dark";
}

export function ClassAssessmentCard({
  classData,
}: ClassAssessmentCardProps) {
  return (
    <Card className="card-responsive">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg md:text-xl">
            {classData.className}
          </CardTitle>
          {classData.subject && (
            <span className="text-sm text-slate-500">
              {classData.subject}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-xl font-black text-primary">
              {classData.studentCount}
            </p>
            <p className="text-xs text-slate-500">Students</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-2xl">
            <p className="text-xl font-black text-info-dark">
              {classData.assessmentsTaken}
            </p>
            <p className="text-xs text-slate-500">
              Assessments
            </p>
          </div>
          <div
            className={`text-center p-3 rounded-2xl ${getScoreColor(classData.averageScore)}`}
          >
            <p className="text-xl font-black">
              {classData.averageScore === null
                ? "-"
                : `${classData.averageScore}%`}
            </p>
            <p className="text-xs">Avg Score</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/teacher/classes/${classData.classId}`}>
            <Button
              variant="outline"
              size="sm"
              className="touch-target"
            >
              View Class
            </Button>
          </Link>
          <Link href={`/app/teacher/assessments/${classData.classId}`}>
            <Button
              variant="outline"
              size="sm"
              className="touch-target"
            >
              View Results
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
