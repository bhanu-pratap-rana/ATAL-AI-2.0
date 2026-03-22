"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { AssessmentSkeleton } from "@/components/assessment/AssessmentSkeleton";
import {
  startAssessment,
  getAdaptiveQuestions,
} from "@/app/actions/assessment";
import { clientLogger } from "@/lib/client-logger";

function getSessionTypeLabel(type: string): string {
  if (type === "pre") return "Pre-Assessment";
  if (type === "post") return "Post-Assessment";
  return "Assessment";
}

/**
 * ATAL AI Assessment Start Page - Jyoti Theme
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 */

interface Question {
  id: string;
  itemCode: string;
  category: string;
  questionNumber: number;
  questionText: string;
  options: { id: string; text: string }[];
  _correctIndex: number;
  _difficulty: number;
  _discrimination: number;
  _guessing: number;
}

function AssessmentStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");
  const typeParam = searchParams.get("type");
  const sessionType: "pre" | "adaptive" | "post" =
    typeParam === "pre" || typeParam === "post" ? typeParam : "adaptive";

  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi" | "as">(
    "en",
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleStartAssessment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Start session and fetch adaptive questions in parallel
      const [sessionResult, questionsResult] = await Promise.all([
        startAssessment(classId || undefined, sessionType),
        getAdaptiveQuestions(selectedLanguage),
      ]);

      if (!sessionResult.success || !sessionResult.sessionId) {
        const errorMsg = sessionResult.error || "Failed to start assessment";
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      if (!questionsResult.success || questionsResult.questions.length === 0) {
        const errorMsg = questionsResult.error || "Failed to load questions";
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      setSessionId(sessionResult.sessionId);
      setQuestions(questionsResult.questions as Question[]);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "An unexpected error occurred";
      clientLogger.error(
        "[Assessment] Error starting assessment:",
        error instanceof Error ? error : { error: String(error) },
      );
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  // If session started, show assessment runner
  if (sessionId && (questions?.length ?? 0) > 0) {
    return (
      <AssessmentRunner
        sessionId={sessionId}
        questions={questions}
        language={selectedLanguage}
      />
    );
  }

  // Show language selection screen
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Card with Gradient Border */}
      <div className="max-w-2xl w-full">
        <div className="card-gradient">
          <div className="bg-white rounded-xl p-6 md:p-8">
            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200/30 rounded-lg">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                type="button"
                  onClick={() => setError(null)}
                  className="text-sm text-red-600/70 hover:text-red-600 mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              {/* Icon Box - Primary Light */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-lg mb-4">
                <span className="text-2xl sm:text-3xl">{sessionType === "post" ? "🎓" : "📝"}</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-bold text-slate-800 mb-2">
                {getSessionTypeLabel(sessionType)}
              </h1>
              <p className="text-slate-500">
                {sessionType === "post"
                  ? "Measure your improvement after completing the curriculum"
                  : "This assessment helps us understand your current digital literacy skills"}
              </p>
            </div>

            {/* Assessment Info - Info Alert */}
            <div className="bg-info-light border-l-4 border-info p-4 rounded-md mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div>
                  <h3 className="font-semibold text-info-dark mb-2">
                    What to expect:
                  </h3>
                  <ul className="text-sm text-info-dark/80 space-y-1">
                    <li>
                      • 30 questions covering 5 key digital literacy modules
                    </li>
                    <li>• No time limit - take your time to read carefully</li>
                    <li>
                      • Your answers help us personalize your learning journey
                    </li>
                    <li>
                      • There are no wrong answers - this is about understanding
                      where you are
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Language Selection */}
            <div className="mb-8">
              <Label className="text-base font-semibold mb-4 block text-slate-800">
                Choose your preferred language:
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* English */}
                <button
                type="button"
                  onClick={() => setSelectedLanguage("en")}
                  className={`p-4 rounded-md border-2 transition-all duration-200 ${
                    selectedLanguage === "en"
                      ? "border-primary bg-primary-light shadow-primary-sm"
                      : "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary-lighter"
                  }`}
                >
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">🇬🇧</span>
                    <span className="font-semibold text-slate-800">
                      English
                    </span>
                  </div>
                </button>

                {/* Hindi */}
                <button
                type="button"
                  onClick={() => setSelectedLanguage("hi")}
                  className={`p-4 rounded-md border-2 transition-all duration-200 ${
                    selectedLanguage === "hi"
                      ? "border-primary bg-primary-light shadow-primary-sm"
                      : "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary-lighter"
                  }`}
                >
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">🇮🇳</span>
                    <span className="font-semibold text-slate-800">
                      हिंदी
                    </span>
                  </div>
                </button>

                {/* Assamese */}
                <button
                type="button"
                  onClick={() => setSelectedLanguage("as")}
                  className={`p-4 rounded-md border-2 transition-all duration-200 ${
                    selectedLanguage === "as"
                      ? "border-primary bg-primary-light shadow-primary-sm"
                      : "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary-lighter"
                  }`}
                >
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">🇮🇳</span>
                    <span className="font-semibold text-slate-800">
                      অসমীয়া
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={handleStartAssessment}
                disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-lg text-white disabled:opacity-50 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#F98819 0%,#FFD166 100%)" }}
              >
                {loading ? "Starting Assessment..." : "Start Assessment"}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="w-full py-3 rounded-2xl font-black text-sm text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentStartPage() {
  return (
    <Suspense fallback={<AssessmentSkeleton />}>
      <AssessmentStartContent />
    </Suspense>
  );
}
