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

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { ConversationalVoiceChat } from "@/components/voice/ConversationalVoiceChat";
import type { Language } from "@/hooks/useConversationalVoice";
import { createClient } from "@/lib/supabase-browser";
import { clientLogger } from "@/lib/client-logger";
import { useLanguage, LanguageSelector } from "@/components/learn/LanguageSelector";
import { LessonPlayer, LessonPlayerSkeleton, LessonCompletionModal } from "@/components/microlearning";
import { useDynamicLesson } from "@/hooks/useDynamicLesson";
import { useOfflineLesson } from "@/hooks/useOfflineLesson";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { SupportedLanguage } from "@/types/common";
import { WifiOff, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { awardLessonCompletionPoints } from "@/app/actions/gamification";
import { completeLessonAndUpdateProgress } from "@/app/actions/lesson-completion";
import { stopTTS } from "@/lib/utils/client-tts";
import { MAX_SCORE_WITHOUT_QUIZ } from "@/lib/constants/thresholds";

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
  language: SupportedLanguage,
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

/**
 * Helper: Fetch practice questions for topic filtered by language
 * FIX: Added language parameter to prevent mixed-language questions
 */
async function fetchPracticeQuestions(
  supabase: ReturnType<typeof createClient>,
  topicId: string,
  language: SupportedLanguage,
): Promise<
  Array<{
    id: string;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>
> {
  // PERFORMANCE: Select only needed columns instead of *
  const { data: questionsData, error: questionsError } = await supabase
    .from("practice_questions")
    .select("id, question, options, correct_index, explanation")
    .eq("topic_id", topicId)
    .eq("language", language) // Filter by selected language
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

function getInputPlaceholder(language: string): string {
  if (language === "as") return "আপোনাৰ প্ৰশ্ন লিখক...";
  if (language === "hi") return "अपना प्रश्न टाइप करें...";
  return "Type your question...";
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const moduleId = params.moduleId as string;
  const topicId = params.topicId as string;

  // Track pathname for cleanup on route change
  const prevPathnameRef = useRef(pathname);

  // Stop TTS when navigating away from this page
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      clientLogger.debug("[LessonPage] Route changed, stopping TTS");
      stopTTS();
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      clientLogger.debug("[LessonPage] Unmounting, stopping TTS");
      stopTTS();
    };
  }, []);

  const [showAITutor, setShowAITutor] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  // Use shared language hook with localStorage persistence
  const { language, setLanguage } = useLanguage();
  const [lesson, setLesson] = useState<LessonContent>(DEFAULT_LESSON);
  const [loading, setLoading] = useState(true);
  const [languageKey, setLanguageKey] = useState(0); // Force refetch when language changes

  // Dynamic AI-generated lesson mode - default to AI mode
  // Note: setUseDynamicMode kept for future feature toggle
  const [useDynamicMode] = useState(true);

  // Completion modal state
  const [completionData, setCompletionData] = useState<{
    score: number;
    status: "in_progress" | "mastered";
    attempts: number;
    pointsAwarded: number;
    newBadges: Array<{ id: string; name_en: string }>;
  } | null>(null);

  // Offline support
  const { isOnline } = useNetworkStatus();
  const { loadOfflineLesson, isAvailableOffline } = useOfflineLesson();
  const [offlineLesson, setOfflineLesson] = useState<ReturnType<typeof useDynamicLesson>["lesson"]>(null);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const {
    lesson: dynamicLesson,
    loading: dynamicLoading,
    error: dynamicError,
  } = useDynamicLesson({
    moduleId,
    topicId,
    language,
    enabled: useDynamicMode && isOnline, // Only fetch when online
  });

  // Offline content loading effect
  useEffect(() => {
    const loadOfflineContent = async () => {
      if (!isOnline && useDynamicMode) {
        setOfflineLoading(true);
        // When offline, try to load cached content
        const hasOffline = await isAvailableOffline(moduleId, topicId, language);
        if (hasOffline) {
          const offlineData = await loadOfflineLesson(moduleId, topicId, language);
          if (offlineData?.lesson) {
            setOfflineLesson(offlineData.lesson);
            setOfflineError(null);
            clientLogger.debug("[LessonPage] Loaded offline lesson", {
              moduleId,
              topicId,
              chunksCount: offlineData.lesson.chunks?.length || 0,
            });
          } else {
            setOfflineError("Failed to load offline content. Please re-download the lesson.");
          }
        } else {
          setOfflineError("No internet connection. Please connect to the internet to download content.");
          setOfflineLesson(null);
        }
        setOfflineLoading(false);
      } else {
        setOfflineError(null);
        setOfflineLoading(false);
      }
    };

    loadOfflineContent();
  }, [isOnline, useDynamicMode, moduleId, topicId, language, isAvailableOffline, loadOfflineLesson]);

  // Determine which lesson to show (online dynamic or offline cached)
  const activeDynamicLesson = isOnline ? dynamicLesson : offlineLesson;
  const activeDynamicLoading = isOnline ? dynamicLoading : offlineLoading;
  const activeDynamicError = isOnline ? dynamicError : offlineError;

  // Track AI response text for ConversationalVoiceChat to speak
  const [pendingAIResponse, setPendingAIResponse] = useState<string | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);

  /**
   * Fetch lesson content from database (refactored to reduce cognitive complexity)
   * CRITICAL FIX: Reduced complexity from 26 to <15 by extracting helper functions
   */
  useEffect(() => {
    const fetchLessonContent = async () => {
      try {
        const supabase = createClient();

        // PERF: Fetch language content + questions in parallel (ADR-005: no English fallback)
        const contentQuery = supabase
          .from("curriculum_content")
          .select("content_type, content, metadata")
          .eq("topic_id", topicId)
          .eq("module_id", moduleId)
          .eq("language", language);
        const questionsQuery = fetchPracticeQuestions(supabase, topicId, language);

        const [contentResult, langQuestions] =
          await Promise.all([contentQuery, questionsQuery]);

        if (contentResult.error) {
          clientLogger.error(
            "[LessonPage] Error fetching lesson content",
            contentResult.error instanceof Error
              ? contentResult.error
              : { error: String(contentResult.error) },
          );
          setLesson(DEFAULT_LESSON);
          setLoading(false);
          return;
        }

        // ADR-005: No silent fallback. If content is not available in selected
        // language, show DEFAULT_LESSON which surfaces a "coming soon" message.
        // Do NOT fall back to English — specs/learn-redesign/decisions.md.
        const contentData = contentResult.data?.length ? contentResult.data : null;
        const questions = langQuestions.length ? langQuestions : [];

        if (contentData && contentData.length > 0) {
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
  }, [moduleId, topicId, language, languageKey]); // Force refetch when language changes

  // AI Chat integration
  const { messages, input, handleInputChange, handleSubmit, append, status: chatStatus, error: chatError } =
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

  // Derive loading state from status (replaces deprecated isLoading)
  const isLoading = chatStatus === "submitted" || chatStatus === "streaming";

  // PERF-007: Limit rendered messages for performance
  const [showAllMessages, setShowAllMessages] = useState(false);
  const VISIBLE_MESSAGE_LIMIT = 20;

  const visibleMessages = useMemo(() => {
    if (showAllMessages || messages.length <= VISIBLE_MESSAGE_LIMIT) {
      return messages;
    }
    return messages.slice(-VISIBLE_MESSAGE_LIMIT);
  }, [messages, showAllMessages]);

  const hasHiddenMessages = messages.length > VISIBLE_MESSAGE_LIMIT && !showAllMessages;
  const hiddenMessageCount = messages.length - VISIBLE_MESSAGE_LIMIT;

  // Language-specific suggested questions for AI Tutor
  const suggestedQuestions = useMemo(() => {
    if (language === "hi") {
      return [
        "कंप्यूटर क्या है?",
        "इंटरनेट कैसे काम करता है?",
        "ऑनलाइन सुरक्षित कैसे रहें?",
      ];
    }
    if (language === "as") {
      return [
        "কম্পিউটাৰ কি?",
        "ইণ্টাৰনেট কেনেকৈ কাম কৰে?",
        "অনলাইনত কেনেকৈ সুৰক্ষিত থাকিব?",
      ];
    }
    return [
      "What is a computer?",
      "How does the internet work?",
      "How to stay safe online?",
    ];
  }, [language]);

  // Track AI responses for voice mode - ConversationalVoiceChat handles TTS
  useEffect(() => {
    // Only speak in voice mode when not streaming
    if (inputMode !== "voice" || chatStatus === "streaming") return;
    if (messages.length === 0) return;

    const lastMessage = messages.at(-1);
    // Set pending AI response for ConversationalVoiceChat to speak
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.id !== "welcome" &&
      lastMessage.id !== lastSpokenIdRef.current &&
      lastMessage.content
    ) {
      lastSpokenIdRef.current = lastMessage.id;
      queueMicrotask(() => setPendingAIResponse(lastMessage.content));
    }
  }, [messages, inputMode, chatStatus]);

  // Handle voice transcript - use append() to directly send message
  // FIX: Previously tried to submit a form element that doesn't exist in voice mode,
  // causing silent failure. Using append() bypasses the need for a form element entirely.
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      append({
        role: "user",
        content: text,
      });
    },
    [append],
  );

  // Calculate practice score
  // ROOT CAUSE FIX: Check dynamic mode FIRST before practice questions
  // Bug: Static lesson.practice_questions was being checked even in dynamic mode,
  // causing score=0 because practiceAnswers is empty when using LessonPlayer
  const calculateScore = (completedChunksCount?: number, totalChunksCount?: number): number => {
    if (!totalChunksCount || totalChunksCount === 0) return 0;
    const safeCompleted = completedChunksCount ?? totalChunksCount;
    return Math.round((safeCompleted / totalChunksCount) * MAX_SCORE_WITHOUT_QUIZ);
  };

  const handleComplete = async (completedChunksCount?: number, totalChunksCount?: number) => {
    // ROOT CAUSE FIX: Use server action with proper cache invalidation
    // instead of client-side mutation + timestamp cache-busting workaround
    try {
      const score = calculateScore(completedChunksCount, totalChunksCount);

      clientLogger.debug("[LessonPage] Completing lesson", {
        moduleId,
        topicId,
        score,
        completedChunks: completedChunksCount,
        totalChunks: totalChunksCount,
      });

      // Use atomic server action - handles progress update + cache invalidation
      const result = await completeLessonAndUpdateProgress(moduleId, topicId, score);

      if (result.success) {
        clientLogger.debug("[LessonPage] Progress updated successfully", {
          score: result.masteryScore,
          status: result.status,
          attempts: result.attempts,
        });

        // Award points for lesson completion
        const pointsResult = await awardLessonCompletionPoints(
          moduleId,
          topicId,
          result.masteryScore || score,
        );

        if (pointsResult.success) {
          clientLogger.debug("[LessonPage] Points awarded", {
            points: pointsResult.pointsAwarded,
            newBadges: pointsResult.newBadges?.length || 0,
          });
        }

        // Show personalized completion modal instead of navigating immediately
        setCompletionData({
          score: result.masteryScore || score,
          status: result.status === "mastered" ? "mastered" : "in_progress",
          attempts: result.attempts || 1,
          pointsAwarded: pointsResult?.pointsAwarded || 0,
          newBadges: pointsResult?.newBadges || [],
        });
      } else {
        clientLogger.error("[LessonPage] Failed to update progress", {
          error: result.error,
        });
        // Still show completion modal with the calculated score on failure
        setCompletionData({
          score,
          status: score >= 70 ? "mastered" : "in_progress",
          attempts: 1,
          pointsAwarded: 0,
          newBadges: [],
        });
      }
    } catch (error) {
      clientLogger.error(
        "[LessonPage] Error completing lesson",
        error instanceof Error ? error : { error: String(error) },
      );
      // Navigate on unexpected error as fallback
      router.push(`/app/learn/${moduleId}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="h-8 w-64 bg-slate-100 rounded" />
              <div className="h-4 w-48 bg-slate-100 rounded mt-2" />
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen [background:var(--bento-bg)]">
      <div className="flex">
        {/* Main Content Area */}
        <main
          className={`flex-1 p-4 md:p-6 transition-all ${showAITutor ? "lg:mr-96" : ""}`}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header with Back Link and Language Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href={`/app/learn/${moduleId}`}
                className="inline-flex items-center text-sm text-slate-500 hover:text-primary"
              >
                ← Back to Module
              </Link>
              <LanguageSelector
                onChange={(newLang) => {
                  // Stop any playing TTS before switching language
                  stopTTS();
                  setLanguage(newLang);
                  setLanguageKey(prev => prev + 1); // Force content refetch
                }}
              />
            </div>

            {/* Lesson Header */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                    {activeDynamicLesson ? activeDynamicLesson.title : lesson.title_en}
                    {!isOnline && (
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <WifiOff className="h-4 w-4" />
                        Offline
                      </span>
                    )}
                  </h1>
                  <p className="text-slate-500 mt-1">
                    {activeDynamicLesson ? activeDynamicLesson.description : lesson.title_as}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* AI Tutor Toggle */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAITutor(!showAITutor)}
                    className="text-slate-700 font-black"
                  >
                    🤖 {showAITutor ? "Hide" : "Show"} AI Tutor
                  </Button>
                </div>
              </div>
            </div>

            {/* Dynamic AI Lesson Mode (always active) */}
            <div className="space-y-4">
              {activeDynamicLoading && <LessonPlayerSkeleton />}
              {activeDynamicError && (
                <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-6 text-center">
                  <WifiOff className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                  <p className="text-red-600 mb-2 font-medium">
                    {isOnline ? "Failed to generate AI lesson" : "No Internet Connection"}
                  </p>
                  <p className="text-slate-500 mb-4 text-sm">
                    {activeDynamicError}
                  </p>
                  {!isOnline && (
                    <p className="text-slate-500 text-sm">
                      Please connect to the internet to download the content.
                    </p>
                  )}
                </div>
              )}
              {activeDynamicLesson && !activeDynamicLoading && (
                <LessonPlayer
                  key={`${moduleId}-${topicId}-${language}`}
                  lesson={activeDynamicLesson}
                  language={language}
                  voiceEnabled={inputMode === "voice"}
                  onComplete={handleComplete}
                />
              )}
            </div>
          </div>
        </main>

        {/* AI Tutor - Desktop Sidebar (lg+) */}
        {showAITutor && (
          <aside className="hidden lg:flex fixed right-0 top-0 bottom-0 w-96 bg-background border-l shadow-xl flex-col z-40">
            {/* Header */}
            <div className="p-4 border-b bg-linear-to-r from-primary/10 to-cyan/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-black">AI Tutor</h3>
                    <p className="text-xs text-slate-500">
                      Ask me anything!
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAITutor(false)}
                  className="text-slate-500 hover:text-primary"
                  aria-label="Close AI Tutor"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Input Mode Selection */}
              <div role="tablist" className="flex gap-2 mt-3">
                <LanguageSelector compact />
                <Button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === "text"}
                  size="sm"
                  variant={inputMode === "text" ? "secondary" : "ghost"}
                  onClick={() => setInputMode("text")}
                  className="font-black text-xs"
                >
                  Text
                </Button>
                <Button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === "voice"}
                  size="sm"
                  variant={inputMode === "voice" ? "secondary" : "ghost"}
                  onClick={() => setInputMode("voice")}
                  className="font-black text-xs"
                >
                  Voice
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {chatError && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-xs text-red-600">
                  ⚠️ {chatError.message || "An error occurred. Please try again."}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length <= 1 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-sm mb-3">
                    {inputMode === "voice"
                      ? "Tap the microphone to start!"
                      : "Ask me anything about this lesson!"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((q) => (
                      <Button
                        type="button"
                        key={q}
                        variant="ghost"
                        size="sm"
                        onClick={() => append({ role: "user", content: q })}
                        className="bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl text-xs"
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {hasHiddenMessages && (
                    <div className="text-center mb-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllMessages(true)}
                        className="text-xs bg-slate-100 text-slate-500 hover:bg-slate-200/80 rounded-full"
                      >
                        ↑ Show {hiddenMessageCount} earlier messages
                      </Button>
                    </div>
                  )}
                  {visibleMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[90%] sm:max-w-[80%] p-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-slate-100"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-2xl">
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
                    placeholder={getInputPlaceholder(language)}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[44px]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || isLoading}
                    className="font-black"
                  >
                    Send
                  </Button>
                </form>
              ) : (
                <div className="space-y-2">
                  <ConversationalVoiceChat
                    language={language as Language}
                    onTranscript={handleVoiceTranscript}
                    disabled={isLoading}
                    speakText={pendingAIResponse}
                    onSpokenComplete={() => setPendingAIResponse(null)}
                    autoDetectLanguage
                    onLanguageDetected={(detectedLang) => {
                      clientLogger.debug("[LessonPage] Language detected from voice", { detectedLang });
                    }}
                  />
                </div>
              )}
            </div>
          </aside>
        )}

        {/* AI Tutor - Mobile/Tablet Sheet (<lg) */}
        <Sheet open={showAITutor} onOpenChange={setShowAITutor}>
          <SheetContent side="right" className="w-full sm:w-96 lg:hidden p-0 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-linear-to-r from-primary/10 to-cyan/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <SheetTitle className="text-base font-black">AI Tutor</SheetTitle>
                  <p className="text-xs text-slate-500">
                    Ask me anything!
                  </p>
                </div>
              </div>

              {/* Input Mode Selection */}
              <div role="tablist" className="flex gap-2">
                <LanguageSelector compact />
                <Button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === "text"}
                  size="sm"
                  variant={inputMode === "text" ? "secondary" : "ghost"}
                  onClick={() => setInputMode("text")}
                  className="font-black text-xs"
                >
                  Text
                </Button>
                <Button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === "voice"}
                  size="sm"
                  variant={inputMode === "voice" ? "secondary" : "ghost"}
                  onClick={() => setInputMode("voice")}
                  className="font-black text-xs"
                >
                  Voice
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {chatError && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-xs text-red-600">
                  ⚠️ {chatError.message || "An error occurred. Please try again."}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length <= 1 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-sm mb-3">
                    {inputMode === "voice"
                      ? "Tap the microphone to start!"
                      : "Ask me anything about this lesson!"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((q) => (
                      <Button
                        type="button"
                        key={q}
                        variant="ghost"
                        size="sm"
                        onClick={() => append({ role: "user", content: q })}
                        className="bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl text-xs"
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {hasHiddenMessages && (
                    <div className="text-center mb-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllMessages(true)}
                        className="text-xs bg-slate-100 text-slate-500 hover:bg-slate-200/80 rounded-full"
                      >
                        ↑ Show {hiddenMessageCount} earlier messages
                      </Button>
                    </div>
                  )}
                  {visibleMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[90%] sm:max-w-[80%] p-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-slate-100"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-2xl">
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
            <div className="p-4 border-t safe-bottom">
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
                    placeholder={getInputPlaceholder(language)}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[44px]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || isLoading}
                    className="font-black"
                  >
                    Send
                  </Button>
                </form>
              ) : (
                <div className="space-y-2">
                  <ConversationalVoiceChat
                    language={language as Language}
                    onTranscript={handleVoiceTranscript}
                    disabled={isLoading}
                    speakText={pendingAIResponse}
                    onSpokenComplete={() => setPendingAIResponse(null)}
                    autoDetectLanguage
                    onLanguageDetected={(detectedLang) => {
                      clientLogger.debug("[LessonPage] Language detected from voice", { detectedLang });
                    }}
                  />
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Personalized completion modal */}
      {completionData && (
        <LessonCompletionModal
          data={completionData}
          topicName={activeDynamicLesson?.title || lesson.title_en}
          language={language}
          onContinue={() => router.push(`/app/learn/${moduleId}`)}
          onReviewAgain={() => {
            setCompletionData(null);
            // Reset LessonPlayer state by incrementing languageKey (forces refetch + remount)
            setLanguageKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
