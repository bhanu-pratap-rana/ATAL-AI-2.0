/**
 * Lesson Page with AI Tutor Sidebar
 *
 * Main learning interface for individual topics.
 * Features:
 * - Adaptive content based on learning style
 * - AI Tutor sidebar for questions
 * - Practice questions with feedback
 * - Progress tracking
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { VoiceChat } from "@/components/ai/VoiceChat";
import { createClient } from "@/lib/supabase-browser";
import { clientLogger } from "@/lib/client-logger";
import { getConfidenceLevel } from "@/lib/form-utils";

// Lesson content interface
interface LessonContent {
  title_en: string;
  title_as: string;
  sections: Array<{
    type:
      | "text"
      | "image"
      | "video"
      | "activity"
      | "curriculum"
      | "definition"
      | "example"
      | "exercise"
      | "cultural_context";
    content: string;
    image_url?: string;
  }>;
  practice_questions: Array<{
    id: string;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
}

/**
 * Section navigation button info
 */
interface SectionNavButton {
  readonly label: string;
  readonly onClick: () => void;
  readonly className?: string;
}

/**
 * Get next section navigation button based on section and question state
 */
function getNextSectionButton(
  currentSection: number,
  totalSections: number,
  hasPracticeQuestions: boolean,
  onNextSection: () => void,
  onShowPractice: () => void,
  onComplete: () => void,
): SectionNavButton {
  if (currentSection < totalSections - 1) {
    return {
      label: "Next →",
      onClick: onNextSection,
    };
  }

  if (hasPracticeQuestions) {
    return {
      label: "Practice Questions →",
      onClick: onShowPractice,
    };
  }

  return {
    label: "Complete Lesson ✓",
    onClick: onComplete,
    className: "bg-success hover:bg-success-dark",
  };
}

// Default content for topics without specific content in database
const DEFAULT_LESSON: LessonContent = {
  title_en: "Lesson Content",
  title_as: "পাঠ বিষয়বস্তু",
  sections: [
    {
      type: "text",
      content:
        "This lesson content is being prepared. In the meantime, you can ask the AI Tutor any questions about this topic!",
    },
  ],
  practice_questions: [],
};

/**
 * Helper: Generate AI welcome message based on language and lesson
 */
function getAIWelcomeMessage(
  language: "en" | "hi" | "as",
  lesson: LessonContent,
): string {
  if (language === "as") {
    return `নমস্কাৰ! মই আপোনাৰ AI শিক্ষক। "${lesson.title_as}" বিষয়ে কিবা প্ৰশ্ন আছে নেকি?`;
  }
  if (language === "hi") {
    return `नमस्ते! मैं आपका AI शिक्षक हूँ। "${lesson.title_en}" के बारे में कोई सवाल है?`;
  }
  return `Hello! I'm your AI Tutor. Do you have any questions about "${lesson.title_en}"?`;
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;
  const topicId = params.topicId as string;

  const [currentSection, setCurrentSection] = useState(0);
  const [showPractice, setShowPractice] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState<
    Record<string, number | null>
  >({});
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [language, setLanguage] = useState<"en" | "hi" | "as">("en");
  const [lesson, setLesson] = useState<LessonContent>(DEFAULT_LESSON);
  const [loading, setLoading] = useState(true);

  /**
   * Helper: Fetch practice questions for topic
   */
  async function fetchPracticeQuestions(
    supabase: ReturnType<typeof createClient>,
    topicId: string,
  ): Promise<
    Array<{
      id: string;
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    }>
  > {
    const { data: questionsData, error: questionsError } = await supabase
      .from("practice_questions")
      .select("*")
      .eq("topic_id", topicId)
      .order("order_index", { ascending: true });

    if (questionsError) {
      clientLogger.error(
        "[LessonPage] Error fetching practice questions",
        questionsError instanceof Error
          ? questionsError
          : { error: String(questionsError) },
      );
    }

    return (questionsData || []).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options || [],
      correct: q.correct_index || 0,
      explanation: q.explanation || "",
    }));
  }

  /**
   * Helper: Build lesson content from database data
   */
  function buildLessonFromData(
    contentData: Array<{
      content_type: string;
      content: string;
      metadata?: { title_en?: string; title_as?: string; image_url?: string };
    }>,
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    }>,
    topicId: string,
  ): LessonContent {
    const sections = contentData.map((c) => ({
      type: c.content_type as LessonContent["sections"][0]["type"],
      content: c.content,
      image_url: c.metadata?.image_url,
    }));

    const firstContent = contentData[0].content || "";
    const firstLine = firstContent.split("\n")[0].trim();
    const extractedTitle = firstLine.replace(/^#*\s*/, "");

    return {
      title_en:
        contentData[0].metadata?.title_en ||
        extractedTitle ||
        `Topic ${topicId}`,
      title_as: contentData[0].metadata?.title_as || topicId,
      sections,
      practice_questions: questions,
    };
  }

  /**
   * Fetch lesson content from database (refactored to reduce cognitive complexity)
   * CRITICAL FIX: Reduced complexity from 26 to <15 by extracting helper functions
   */
  useEffect(() => {
    const fetchLessonContent = async () => {
      try {
        const supabase = createClient();

        const { data: contentData, error: contentError } = await supabase
          .from("curriculum_content")
          .select("*")
          .eq("topic_id", topicId)
          .eq("module_id", moduleId);

        if (contentError) {
          clientLogger.error(
            "[LessonPage] Error fetching lesson content",
            contentError instanceof Error
              ? contentError
              : { error: String(contentError) },
          );
          setLesson(DEFAULT_LESSON);
          setLoading(false);
          return;
        }

        const questions = await fetchPracticeQuestions(supabase, topicId);

        if (contentData?.length > 0) {
          const lesson = buildLessonFromData(contentData, questions, topicId);
          setLesson(lesson);
        } else {
          setLesson(DEFAULT_LESSON);
        }

        setLoading(false);
      } catch (error) {
        clientLogger.error(
          "[LessonPage] Error fetching lesson",
          error instanceof Error ? error : { error: String(error) },
        );
        setLesson(DEFAULT_LESSON);
        setLoading(false);
      }
    };

    fetchLessonContent();
  }, [moduleId, topicId]);

  // AI Chat integration
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/tutor/chat",
      body: {
        language,
        topicId,
        moduleId,
        inputMode,
      },
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content: getAIWelcomeMessage(language, lesson),
        },
      ],
    });

  // Handle voice transcript
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const syntheticEvent = {
        target: { value: text },
      } as React.ChangeEvent<HTMLInputElement>;
      handleInputChange(syntheticEvent);

      // Auto-submit after voice input
      setTimeout(() => {
        const form = document.getElementById("chat-form") as HTMLFormElement;
        if (form) form.requestSubmit();
      }, 100);
    },
    [handleInputChange],
  );

  // Calculate practice score
  const calculateScore = () => {
    if (lesson.practice_questions.length === 0) return 0;

    let correct = 0;
    for (const q of lesson.practice_questions) {
      if (practiceAnswers[q.id] === q.correct) {
        correct++;
      }
    }
    return Math.round((correct / lesson.practice_questions.length) * 100);
  };

  // Helper: Get option button styling based on state
  // Reduces nested ternary from 4 levels to simple if/else
  const getOptionButtonClassName = (
    showResult: boolean,
    isCorrect: boolean,
    isSelected: boolean,
  ): string => {
    if (showResult) {
      if (isCorrect) return "bg-success-light border-success";
      return isSelected ? "bg-error-light border-error" : "bg-muted";
    }
    return isSelected
      ? "border-primary bg-primary/10"
      : "hover:border-primary/50";
  };

  // Helper: Get progress bar color based on section state
  const getProgressBarColor = (
    idx: number,
    currentSection: number,
    showPractice: boolean,
  ): string => {
    if (idx === currentSection && !showPractice) return "bg-primary";
    if (idx < currentSection) return "bg-success";
    return "bg-muted";
  };

  // Helper: Get input placeholder text by language
  const getInputPlaceholder = (): string => {
    switch (language) {
      case "as":
        return "আপোনাৰ প্ৰশ্ন লিখক...";
      case "hi":
        return "अपना प्रश्न टाइप करें...";
      default:
        return "Type your question...";
    }
  };

  const handlePracticeSubmit = async () => {
    setPracticeSubmitted(true);

    // Save practice responses to database
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Save each response
        for (const q of lesson.practice_questions) {
          const answer = practiceAnswers[q.id];
          if (answer !== null && answer !== undefined) {
            await supabase.from("formative_responses").insert({
              student_id: user.id,
              topic_id: topicId,
              question_id: q.id,
              is_correct: answer === q.correct,
              response_time_ms: null,
              ai_hint_requested: false,
            });
          }
        }
      }
    } catch (error) {
      clientLogger.error(
        "[LessonPage] Error saving practice responses",
        error instanceof Error ? error : { error: String(error) },
      );
    }
  };

  const handleComplete = async () => {
    // Update knowledge state in database
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const score = calculateScore();
        const status = score >= 70 ? "completed" : "in_progress";

        await supabase.from("student_knowledge_state").upsert(
          {
            student_id: user.id,
            module_id: moduleId,
            topic_id: topicId,
            mastery_score: score,
            status: status,
            confidence_level: getConfidenceLevel(score),
            attempts: 1,
            last_attempt_at: new Date().toISOString(),
          },
          {
            onConflict: "student_id,module_id,topic_id",
          },
        );
      }
    } catch (error) {
      clientLogger.error(
        "[LessonPage] Error updating knowledge state",
        error instanceof Error ? error : { error: String(error) },
      );
    }

    router.push(`/app/learn/${moduleId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 bg-muted rounded" />
            <Card>
              <CardHeader>
                <div className="h-8 w-64 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded mt-2" />
              </CardHeader>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="flex">
        {/* Main Content Area */}
        <main
          className={`flex-1 p-4 md:p-6 transition-all ${showAITutor ? "mr-96" : ""}`}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Back Link */}
            <Link
              href={`/app/learn/${moduleId}`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
            >
              ← Back to Module
            </Link>

            {/* Lesson Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {lesson.title_en}
                    </CardTitle>
                    <p className="text-muted-foreground">{lesson.title_as}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowAITutor(!showAITutor)}
                    className="gap-2"
                  >
                    🤖 {showAITutor ? "Hide" : "Show"} AI Tutor
                  </Button>
                </div>

                {/* Section Progress */}
                <div className="flex gap-2 mt-4">
                  {lesson.sections.map((_, idx) => (
                    <button
                      key={`section-${idx}`}
                      onClick={() => {
                        setCurrentSection(idx);
                        setShowPractice(false);
                      }}
                      className={`w-8 h-2 rounded-full transition-all ${getProgressBarColor(idx, currentSection, showPractice)}`}
                    />
                  ))}
                  {lesson.practice_questions.length > 0 && (
                    <button
                      onClick={() => setShowPractice(true)}
                      className={`px-3 h-2 rounded-full transition-all ${
                        showPractice ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Lesson Content or Practice */}
            {showPractice ? (
              <Card>
                <CardHeader>
                  <CardTitle>Practice Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {lesson.practice_questions.map((q, qIdx) => (
                    <div key={q.id} className="space-y-3">
                      <p className="font-medium">
                        {qIdx + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((option, oIdx) => {
                          const isSelected = practiceAnswers[q.id] === oIdx;
                          const isCorrect = oIdx === q.correct;
                          const showResult = practiceSubmitted;

                          return (
                            <button
                              key={oIdx}
                              onClick={() => {
                                if (!practiceSubmitted) {
                                  setPracticeAnswers({
                                    ...practiceAnswers,
                                    [q.id]: oIdx,
                                  });
                                }
                              }}
                              disabled={practiceSubmitted}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${getOptionButtonClassName(showResult, isCorrect, isSelected)}`}
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              {option}
                              {showResult && isCorrect && " ✓"}
                            </button>
                          );
                        })}
                      </div>
                      {practiceSubmitted && (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Submit / Results */}
                  <div className="pt-4 border-t">
                    {practiceSubmitted ? (
                      <div className="text-center space-y-4">
                        <div className="text-4xl font-bold">
                          {calculateScore()}%
                        </div>
                        <p className="text-muted-foreground">
                          {calculateScore() >= 70
                            ? "🎉 Great job! You passed!"
                            : "Keep learning and try again!"}
                        </p>
                        <Button
                          onClick={handleComplete}
                          className="bg-success hover:bg-success-dark"
                        >
                          Complete Lesson ✓
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handlePracticeSubmit}
                        disabled={
                          Object.keys(practiceAnswers).length <
                          lesson.practice_questions.length
                        }
                        className="w-full"
                      >
                        Submit Answers
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  {lesson.sections[currentSection] && (
                    <MarkdownRenderer
                      content={lesson.sections[currentSection].content}
                      className="prose prose-sm dark:prose-invert max-w-none"
                    />
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-8">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentSection(Math.max(0, currentSection - 1))
                      }
                      disabled={currentSection === 0}
                    >
                      ← Previous
                    </Button>

                    {(() => {
                      const navButton = getNextSectionButton(
                        currentSection,
                        lesson.sections.length,
                        lesson.practice_questions.length > 0,
                        () => setCurrentSection(currentSection + 1),
                        () => setShowPractice(true),
                        handleComplete,
                      );

                      return (
                        <Button
                          onClick={navButton.onClick}
                          className={navButton.className}
                        >
                          {navButton.label}
                        </Button>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        {/* AI Tutor Sidebar */}
        {showAITutor && (
          <aside className="fixed right-0 top-0 bottom-0 w-96 bg-background border-l shadow-xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-cyan/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-semibold">AI Tutor</h3>
                    <p className="text-xs text-muted-foreground">
                      Ask me anything!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAITutor(false)}
                  className="text-muted-foreground hover:text-primary"
                >
                  ✕
                </button>
              </div>

              {/* Language & Mode Selection */}
              <div className="flex gap-2 mt-3">
                <select
                  value={language}
                  onChange={(e) =>
                    setLanguage(e.target.value as "en" | "hi" | "as")
                  }
                  className="flex-1 text-sm rounded-md border bg-background p-1"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="as">অসমীয়া</option>
                </select>
                <Button
                  variant={inputMode === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("text")}
                >
                  Text
                </Button>
                <Button
                  variant={inputMode === "voice" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("voice")}
                >
                  Voice
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex gap-1">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce delay-100">●</span>
                      <span className="animate-bounce delay-200">●</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              {inputMode === "text" ? (
                <form
                  id="chat-form"
                  onSubmit={handleSubmit}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder={getInputPlaceholder()}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <Button type="submit" disabled={!input.trim() || isLoading}>
                    Send
                  </Button>
                </form>
              ) : (
                <VoiceChat
                  language={language}
                  onTranscript={handleVoiceTranscript}
                  disabled={isLoading}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
