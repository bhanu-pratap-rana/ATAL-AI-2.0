"use client";

/**
 * Assessment Breakdown Component
 *
 * Shows per-question details for a completed assessment:
 * - Question text with answer options
 * - User's chosen answer vs correct answer
 * - Time spent per question
 * - IRT difficulty/discrimination info
 *
 * Used on assessment detail pages to show full breakdown.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock,
  Brain,
  Filter,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDurationMMSS } from "@/lib/utils/format-date";

interface QuestionResponse {
  id: string;
  item_id: string;
  module: string;
  chosen_option: string | null;
  is_correct: boolean | null;
  rt_ms: number | null;
  created_at: string;
}

interface QuestionDetails {
  id: string;
  question_text: string;
  options: Record<string, string>; // { "A": "Option text", "B": "...", etc. }
  correct_answer: string;
  difficulty: number | null;
  discrimination: number | null;
  category: string | null;
}

interface AssessmentBreakdownProps {
  readonly responses: QuestionResponse[];
  readonly questionDetails: Map<string, QuestionDetails>;
  readonly showFilters?: boolean;
}

const FILTER_ICONS: Record<string, LucideIcon> = { correct: CheckCircle2, incorrect: XCircle, all: CircleDot };

// PR-67: null-safe wrapper around the canonical mm:ss formatter.
const formatTime = (ms: number | null) => (ms === null ? "-" : formatDurationMMSS(ms));

function getDifficultyLabel(difficulty: number | null): {
  label: string;
  color: string;
} {
  if (difficulty === null) return { label: "Unknown", color: "text-slate-400" };
  if (difficulty <= -1) return { label: "Easy", color: "text-success" };
  if (difficulty <= 0.5) return { label: "Medium", color: "text-warning" };
  if (difficulty <= 1.5) return { label: "Hard", color: "text-primary" };
  return { label: "Very Hard", color: "text-error" };
}

type FilterMode = "all" | "correct" | "incorrect";

export function AssessmentBreakdown({
  responses,
  questionDetails,
  showFilters = true,
}: AssessmentBreakdownProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const toggleExpanded = (responseId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedQuestions(newExpanded);
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(responses.map((r) => r.id)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  // Filter responses
  const filteredResponses = responses.filter((r) => {
    if (filterMode === "correct") return r.is_correct === true;
    if (filterMode === "incorrect") return r.is_correct === false;
    return true;
  });

  // Stats
  const correctCount = responses.filter((r) => r.is_correct === true).length;
  const incorrectCount = responses.filter((r) => r.is_correct === false).length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filter Buttons */}
        {showFilters && (
          <div role="radiogroup" aria-label="Filter responses" className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Button
              type="button"
              role="radio"
              aria-checked={filterMode === "all"}
              size="sm"
              variant="ghost"
              onClick={() => setFilterMode("all")}
              className={cn(
                "text-sm rounded-full",
                filterMode === "all"
                  ? "bg-primary text-white hover:bg-primary"
                  : "bg-slate-50 hover:bg-slate-100"
              )}
            >
              All ({responses.length})
            </Button>
            <Button
              type="button"
              role="radio"
              aria-checked={filterMode === "correct"}
              size="sm"
              variant="ghost"
              onClick={() => setFilterMode("correct")}
              className={cn(
                "text-sm rounded-full",
                filterMode === "correct"
                  ? "bg-success text-white hover:bg-success"
                  : "bg-slate-50 hover:bg-slate-100"
              )}
            >
              Correct ({correctCount})
            </Button>
            <Button
              type="button"
              role="radio"
              aria-checked={filterMode === "incorrect"}
              size="sm"
              variant="ghost"
              onClick={() => setFilterMode("incorrect")}
              className={cn(
                "text-sm rounded-full",
                filterMode === "incorrect"
                  ? "bg-error text-white hover:bg-error"
                  : "bg-slate-50 hover:bg-slate-100"
              )}
            >
              Incorrect ({incorrectCount})
            </Button>
          </div>
        )}

        {/* Expand/Collapse */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filteredResponses.map((response, index) => {
          const details = questionDetails.get(response.item_id);
          const isExpanded = expandedQuestions.has(response.id);
          const isCorrect = response.is_correct === true;
          const difficulty = getDifficultyLabel(details?.difficulty ?? null);

          return (
            <Card
              key={response.id}
              className={cn(
                "overflow-hidden transition-colors",
                isCorrect
                  ? "border-success/30 bg-success/5"
                  : "border-error/30 bg-error/5"
              )}
            >
              {/* Header - Always Visible */}
              <Button
                type="button"
                variant="ghost"
                aria-expanded={isExpanded}
                onClick={() => toggleExpanded(response.id)}
                className="w-full h-auto p-4 justify-start gap-4 text-left hover:bg-white/50 whitespace-normal rounded-none"
              >
                {/* Question Number */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-medium",
                    isCorrect ? "bg-success" : "bg-error"
                  )}
                >
                  {index + 1}
                </div>

                {/* Status Icon */}
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                    isCorrect
                      ? "bg-success/10 text-success"
                      : "bg-error/10 text-error"
                  )}
                >
                  {isCorrect ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </div>

                {/* Question Preview */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text truncate">
                    {details?.question_text || `Question ${index + 1}`}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="capitalize">{response.module}</span>
                    <span>•</span>
                    <span className={difficulty.color}>{difficulty.label}</span>
                    {response.rt_ms && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(response.rt_ms)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </Button>

              {/* Expanded Content */}
              {isExpanded && details && (
                <CardContent className="border-t border-slate-200 bg-white pt-4">
                  {/* Full Question Text */}
                  <div className="mb-4">
                    <h4 className="font-black text-text mb-2">Question:</h4>
                    <p className="text-slate-500">
                      {details.question_text}
                    </p>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-2 mb-4">
                    <h4 className="font-black text-text">Answer Options:</h4>
                    {Object.entries(details.options).map(([key, text]) => {
                      const isChosen = response.chosen_option === key;
                      const isCorrectAnswer = details.correct_answer === key;

                      return (
                        <div
                          key={key}
                          className={cn(
                            "p-3 rounded-2xl border-2 flex items-start gap-3",
                            isCorrectAnswer
                              ? "border-success bg-success/10"
                              : isChosen
                                ? "border-error bg-error/10"
                                : "border-slate-200 bg-slate-50"
                          )}
                        >
                          {/* Option Key */}
                          <span
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                              isCorrectAnswer
                                ? "bg-success text-white"
                                : isChosen
                                  ? "bg-error text-white"
                                  : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {key}
                          </span>

                          {/* Option Text */}
                          <span className="flex-1 text-slate-500">
                            {text}
                          </span>

                          {/* Indicator Icons */}
                          {isCorrectAnswer && (
                            <Check className="w-5 h-5 text-success shrink-0" />
                          )}
                          {isChosen && !isCorrectAnswer && (
                            <X className="w-5 h-5 text-error shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* IRT Info (if available) */}
                  {(details.difficulty !== null ||
                    details.discrimination !== null) && (
                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-200">
                      <span className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        IRT Parameters:
                      </span>
                      {details.difficulty !== null && (
                        <span>
                          Difficulty: {details.difficulty.toFixed(2)}
                        </span>
                      )}
                      {details.discrimination !== null && (
                        <span>
                          Discrimination: {details.discrimination.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredResponses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <EmptyStateIcon filterMode={filterMode} />
            <h3 className="font-black text-text mb-1">
              {filterMode === "correct"
                ? "No correct answers to show"
                : filterMode === "incorrect"
                  ? "Great! No incorrect answers!"
                  : "No questions found"}
            </h3>
            <p className="text-sm text-slate-500">
              {filterMode !== "all" && "Try changing the filter to see more questions."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyStateIcon({ filterMode }: { readonly filterMode: string }) {
  const Icon = FILTER_ICONS[filterMode] ?? CircleDot;
  return (
    <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-(--bento-tint-orange) border-4 border-white shadow-sm flex items-center justify-center text-(--bento-orange-d)">
      <Icon className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
    </div>
  );
}
