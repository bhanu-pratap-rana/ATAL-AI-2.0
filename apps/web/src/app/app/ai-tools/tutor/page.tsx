"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useChat } from "ai/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { VoiceChat } from "@/components/voice/VoiceChat";


export default function AITutorPage() {
  const { user: _user, loading: isAuthChecking } = useRequireAuth("/student/start");
  const [language, setLanguage] = useState<"en" | "hi" | "as">("en");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use Vercel AI SDK's useChat hook for streaming
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/tutor/chat",
      body: {
        language,
        sessionId,
        inputMode: "text",
      },
    });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestedQuestions = [
    "What is a computer?",
    "How does the internet work?",
    "What is email?",
    "How to stay safe online?",
  ];

  // Show loading while checking auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream page-layout">
      <div className="container-responsive max-w-4xl">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/app/ai-tools"
            className="text-primary hover:text-primary-dark mb-4 inline-flex items-center gap-1 text-sm touch-target"
          >
            ← Back to AI Tools
          </Link>
          <h1 className="heading-2 text-primary mb-1">💬 AI Tutor</h1>
          <p className="text-text-secondary text-sm">
            Ask questions about digital literacy and get personalized help
          </p>
        </div>

        {/* Language & Input Mode Selectors */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Language Selector */}
          <div className="flex gap-2">
            {(["en", "hi", "as"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  language === lang
                    ? "bg-primary text-white"
                    : "bg-white text-text-secondary hover:bg-primary-light"
                }`}
              >
                {lang === "en"
                  ? "English"
                  : lang === "hi"
                    ? "हिंदी"
                    : "অসমীয়া"}
              </button>
            ))}
          </div>

          {/* Input Mode Toggle */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setInputMode("text")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                inputMode === "text"
                  ? "bg-primary text-white"
                  : "bg-white text-text-secondary hover:bg-primary-light"
              }`}
            >
              📝 Text
            </button>
            <button
              onClick={() => setInputMode("voice")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                inputMode === "voice"
                  ? "bg-primary text-white"
                  : "bg-white text-text-secondary hover:bg-primary-light"
              }`}
            >
              🎤 Voice
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-4 border-error bg-error/10">
            <CardContent className="p-4">
              <p className="text-sm text-error">
                ⚠️ {error.message || "An error occurred. Please try again."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Chat Area */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="h-[400px] overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">
                    Start a conversation with your AI tutor!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() =>
                          handleInputChange({
                            target: { value: q },
                          } as React.ChangeEvent<HTMLInputElement>)
                        }
                        className="px-3 py-2 bg-primary-light text-primary rounded-lg text-sm hover:bg-primary-lighter transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-white"
                          : "bg-white border border-border"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border rounded-lg p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form - Conditional based on mode */}
            {inputMode === "voice" ? (
              <VoiceChat
                language={language}
                onTranscript={(transcript) => {
                  handleInputChange({
                    target: { value: transcript },
                  } as React.ChangeEvent<HTMLInputElement>);
                  // Auto-submit after voice input
                  setTimeout(() => {
                    const form = document.querySelector(
                      "form",
                    ) as HTMLFormElement;
                    if (form) {
                      form.requestSubmit();
                    }
                  }, 100);
                }}
                disabled={isLoading}
              />
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? "Sending..." : "Send"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-primary-light border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">
              💡 Tips for better answers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-xs text-text-secondary space-y-1">
              <li>• Ask specific questions about digital literacy topics</li>
              <li>• Include context about what you&apos;re trying to learn</li>
              <li>• Feel free to ask follow-up questions</li>
              <li>• Watch responses appear in real-time with streaming! ⚡</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
