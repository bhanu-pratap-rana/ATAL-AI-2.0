"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
// NOSONAR S1874: useChat is marked deprecated but still functional in AI SDK 4.x
// Migration to AI SDK 5.0+ would require a major refactor - keeping for now
import { useChat } from "ai/react"; // NOSONAR
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Lightbulb,
  Mic,
  Pencil,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { VoiceChat } from "@/components/voice/VoiceChat";
import { ConversationalVoiceChat } from "@/components/voice/ConversationalVoiceChat";
import { RateLimitCountdown } from "@/components/ui/RateLimitCountdown";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

type TutorLanguage = "en" | "hi" | "as";

/**
 * Helper: Get language display name
 */
function getLanguageName(lang: TutorLanguage): string {
  switch (lang) {
    case "en":
      return "English";
    case "hi":
      return "हिंदी";
    case "as":
      return "অসমীয়া";
  }
}


function getSuggestedQuestions(language: TutorLanguage): string[] {
  if (language === "hi") {
    return ["कंप्यूटर क्या है?", "इंटरनेट कैसे काम करता है?", "ईमेल क्या है?", "ऑनलाइन सुरक्षित कैसे रहें?"];
  }
  if (language === "as") {
    return ["কম্পিউটাৰ কি?", "ইণ্টাৰনেট কেনেকৈ কাম কৰে?", "ইমেইল কি?", "অনলাইনত কেনেকৈ সুৰক্ষিত থাকিব?"];
  }
  return ["What is a computer?", "How does the internet work?", "What is email?", "How to stay safe online?"];
}

function getTextInputPlaceholder(language: TutorLanguage): string {
  if (language === "hi") return "एक प्रश्न पूछें...";
  if (language === "as") return "এটা প্ৰশ্ন সোধক...";
  return "Ask a question...";
}

type Message = { role: string; id: string; content: string };

function shouldSpeakMessage(
  last: Message | undefined,
  lastSpokenId: string | null,
  autoTTS: boolean,
  inputMode: string,
  voiceMode: string,
): boolean {
  return !!(
    last?.role === "assistant" &&
    last.id !== lastSpokenId &&
    autoTTS &&
    inputMode === "voice" &&
    voiceMode === "conversational" &&
    last.content
  );
}

export default function AITutorPage() {
  const { user: _user, loading: isAuthChecking } = useRequireAuth("/student/start");
  const [language, setLanguage] = useState<TutorLanguage>("en");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [voiceMode, setVoiceMode] = useState<"one-shot" | "conversational">("conversational");
  const [autoTTS, setAutoTTS] = useState(true); // Enable by default for voice mode
  // NOTE: Auto-detect is NOT used for voice input
  // Reason: Voice produces Romanized text (e.g., "mujhe batao" instead of "मुझे बताओ")
  // Unicode/keyword detection doesn't work reliably for Romanized voice transcripts
  // Users should use the UI language selector above to set their preferred response language
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const [textToSpeak, setTextToSpeak] = useState<string | null>(null);
  // PERF-007 FIX: Limit rendered messages for performance
  const [showAllMessages, setShowAllMessages] = useState(false);
  const VISIBLE_MESSAGE_LIMIT = 20;

  // Use Vercel AI SDK's useChat hook for streaming (NOSONAR S1874 - deprecated but functional)
  const { messages, input, handleInputChange, handleSubmit, status, error, append } =
    useChat({ // NOSONAR
      api: "/api/tutor/chat",
      body: {
        language,
        sessionId,
        inputMode,
      },
    });

  // Derive loading state from status
  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-TTS for conversational voice mode
  // Checks for new AI messages and triggers speech when streaming completes
  useEffect(() => {
    if (messages.length === 0 || status === "streaming") return;
    const last = messages.at(-1) as Message | undefined;
    if (shouldSpeakMessage(last, lastSpokenIdRef.current, autoTTS, inputMode, voiceMode)) {
      lastSpokenIdRef.current = last!.id;
      const content = last!.content;
      queueMicrotask(() => setTextToSpeak(content));
    }
  }, [messages, status, autoTTS, inputMode, voiceMode]);

  // Clear text to speak after it's been processed
  const handleSpokenComplete = useCallback(() => {
    setTextToSpeak(null);
  }, []);

  // PERF-007 FIX: Memoize visible messages to avoid rendering all messages
  const visibleMessages = useMemo(() => {
    if (showAllMessages || messages.length <= VISIBLE_MESSAGE_LIMIT) {
      return messages;
    }
    // Show only the last N messages
    return messages.slice(-VISIBLE_MESSAGE_LIMIT);
  }, [messages, showAllMessages, VISIBLE_MESSAGE_LIMIT]);

  const hasHiddenMessages = messages.length > VISIBLE_MESSAGE_LIMIT && !showAllMessages;
  const hiddenMessageCount = messages.length - VISIBLE_MESSAGE_LIMIT;

  const suggestedQuestions = useMemo(() => getSuggestedQuestions(language), [language]);

  const handleSuggestedQuestion = useCallback((q: string) => {
    if (inputMode === "voice") {
      append({ role: "user", content: q });
    } else {
      handleInputChange({ target: { value: q } } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [inputMode, append, handleInputChange]);

  // Show loading while checking auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen [background:var(--bento-bg)] flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen [background:var(--bento-bg)] p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Banner */}
        <div
          className="rounded-[32px] border-4 border-white p-6 text-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Link
            href="/app/ai-tools"
            className="inline-flex items-center gap-1.5 text-white/85 text-xs font-black uppercase tracking-widest mb-4 hover:text-white"
          >
            <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
            AI Tools
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0 text-white">
              <Bot className="w-7 h-7" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black mb-0.5 leading-tight">AI Tutor</h1>
              <p className="text-white/85 text-sm font-bold">Ask questions about digital literacy and get personalized help</p>
            </div>
          </div>
        </div>

        {/* Language & Input Mode Selectors */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4 flex flex-wrap gap-3 items-center">
          {/* Language Selector */}
          <div role="tablist" className="flex gap-2">
            {(["en", "hi", "as"] as const).map((lang) => (
              <Button
                type="button"
                role="tab"
                aria-selected={language === lang}
                key={lang}
                size="sm"
                variant={language === lang ? "default" : "secondary"}
                onClick={() => setLanguage(lang)}
                className="font-black text-sm"
              >
                {getLanguageName(lang)}
              </Button>
            ))}
          </div>

          {/* Input Mode Toggle */}
          <div role="tablist" className="flex gap-2 ml-auto">
            <Button
              type="button"
              role="tab"
              aria-selected={inputMode === "text"}
              size="sm"
              variant={inputMode === "text" ? "default" : "secondary"}
              onClick={() => setInputMode("text")}
              className="font-black text-sm gap-1.5"
            >
              <Pencil size={14} strokeWidth={2.5} aria-hidden="true" />
              Text
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={inputMode === "voice"}
              size="sm"
              variant={inputMode === "voice" ? "default" : "secondary"}
              onClick={() => setInputMode("voice")}
              className="font-black text-sm gap-1.5"
            >
              <Mic size={14} strokeWidth={2.5} aria-hidden="true" />
              Voice
            </Button>
          </div>
        </div>

        {/* Voice Mode Options - Only show when voice mode is active */}
        {inputMode === "voice" && (
          <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4 flex flex-wrap items-center gap-4">
            {/* Voice Mode Selector */}
            <div role="tablist" className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Mode:</span>
              <Button
                type="button"
                role="tab"
                aria-selected={voiceMode === "one-shot"}
                size="sm"
                variant={voiceMode === "one-shot" ? "default" : "secondary"}
                onClick={() => setVoiceMode("one-shot")}
                className="font-black text-sm"
              >
                One-shot
              </Button>
              <Button
                type="button"
                role="tab"
                aria-selected={voiceMode === "conversational"}
                size="sm"
                variant={voiceMode === "conversational" ? "default" : "secondary"}
                onClick={() => setVoiceMode("conversational")}
                className="font-black text-sm"
              >
                Conversational
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                Response: <strong className="text-orange-500">{getLanguageName(language)}</strong>
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <Mic size={12} strokeWidth={2.5} aria-hidden="true" />
                Speak any language
              </span>
            </div>

            {/* Auto-TTS Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Auto-speak:</span>
              <Button
                type="button"
                role="switch"
                aria-checked={autoTTS}
                aria-label={autoTTS ? "Disable auto-TTS" : "Enable auto-TTS"}
                variant="ghost"
                onClick={() => setAutoTTS(!autoTTS)}
                className={`relative w-10 h-5 p-0 rounded-full border-0 hover:bg-current ${autoTTS ? "bg-orange-400 hover:bg-orange-400" : "bg-slate-200 hover:bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoTTS ? "translate-x-5" : "translate-x-0"}`} />
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (() => {
          // Parse retryAfter from the AI SDK error message JSON, if present
          const match = (error.message ?? "").match(/"retryAfter"\s*:\s*(\d+)/);
          const retryAfter = match ? Number(match[1]) : null;
          if (retryAfter && retryAfter > 0) {
            return (
              <RateLimitCountdown
                seconds={retryAfter}
                message="You're sending messages too quickly."
              />
            );
          }
          return (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-4">
              <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                <AlertCircle size={16} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
                {error.message || "An error occurred. Please try again."}
              </p>
            </div>
          );
        })()}

        {/* Chat Area */}
        <div className="bg-white rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4">
          {/* Messages Display */}
          <div className="h-[calc(100vh-360px)] sm:h-[400px] lg:h-[500px] overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 font-bold mb-4">
                  {inputMode === "voice" ? "Tap the microphone to start a voice conversation!" : "Start a conversation with your AI tutor!"}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedQuestions.map((q) => (
                    <Button
                      type="button"
                      key={q}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSuggestedQuestion(q)}
                      className="bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl text-sm font-bold"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* PERF-007 FIX: Show "Load more" button when there are hidden messages */}
                {hasHiddenMessages && (
                  <div className="text-center mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllMessages(true)}
                      className="text-xs font-black bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full"
                    >
                      ↑ Show {hiddenMessageCount} earlier message{hiddenMessageCount === 1 ? "" : "s"}
                    </Button>
                  </div>
                )}
                {visibleMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-3 ${message.role === "user" ? "text-white rounded-br-md" : "bg-slate-50 border border-slate-100 rounded-bl-md"}`}
                      style={message.role === "user" ? { background: "var(--gradient-primary)" } : {}}
                    >
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm font-medium">{message.content}</p>
                      ) : (
                        <div className="text-sm font-medium prose prose-sm max-w-none prose-p:my-1 prose-strong:font-black prose-em:italic prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                          <MarkdownRenderer content={message.content} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form - Conditional based on mode */}
          {inputMode === "voice" && voiceMode === "conversational" && (
            <ConversationalVoiceChat
              language={language}
              onTranscript={(transcript) => {
                // Send transcript to AI - response language is controlled by UI selector
                // Voice auto-detect is disabled because Romanized text detection is unreliable
                if (transcript.trim()) {
                  append({ role: "user", content: transcript });
                }
              }}
              disabled={isLoading}
              speakText={autoTTS ? textToSpeak : null}
              onSpokenComplete={handleSpokenComplete}
              // Auto-detect disabled - unreliable for voice (Romanized text)
              autoDetectLanguage={false}
            />
          )}
          {inputMode === "voice" && voiceMode !== "conversational" && (
            <VoiceChat
              language={language}
              onTranscript={(transcript) => {
                if (transcript.trim()) {
                  append({ role: "user", content: transcript });
                }
              }}
              disabled={isLoading}
            />
          )}
          {inputMode !== "voice" && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={getTextInputPlaceholder(language)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent font-medium text-sm"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="font-black"
              >
                {isLoading ? "..." : "Send"}
              </Button>
            </form>
          )}
        </div>

        {/* Tips - Only show in text mode */}
        {inputMode === "text" && (
          <div className="bg-(--bento-tint-orange) rounded-3xl border-4 border-white shadow-[0_6px_0_rgba(0,0,0,0.06),0_14px_28px_-10px_rgba(0,0,0,0.12)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border-2 border-white shadow-sm flex items-center justify-center shrink-0 text-(--bento-orange-d)">
                <Lightbulb className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black text-(--bento-orange-d) mb-2">Tips for better answers</p>
                <ul className="text-xs font-bold text-slate-700 space-y-1">
                  <li>• Ask specific questions about digital literacy topics</li>
                  <li>• Include context about what you&apos;re trying to learn</li>
                  <li>• Feel free to ask follow-up questions</li>
                  <li>• Watch responses appear in real-time with streaming</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
