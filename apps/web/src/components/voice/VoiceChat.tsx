"use client";

/**
 * Voice Chat Component
 *
 * Provides voice input using Web Speech API with support for:
 * - English (en-IN)
 * - Hindi (hi-IN)
 * - Assamese (as-IN)
 *
 * Features:
 * - Real-time speech recognition
 * - Visual feedback during listening
 * - Error handling and browser compatibility checks
 * - Automatic transcript callback
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/client-logger";

// Speech Recognition types (Web Speech API)
interface SpeechRecognitionEvent extends Event {
  readonly results: {
    readonly length: number;
    [index: number]: {
      readonly length: number;
      [index: number]: {
        readonly transcript: string;
        readonly confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface VoiceChatProps {
  readonly language: "en" | "hi" | "as";
  readonly onTranscript: (transcript: string) => void;
  readonly disabled?: boolean;
}

export function VoiceChat({
  language,
  onTranscript,
  disabled = false,
}: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null,
  );
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof globalThis === "undefined") return;

    // Check browser support
    const global = globalThis as typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SpeechRecognitionConstructor = (global.SpeechRecognition ||
      global.webkitSpeechRecognition) as new () =>
      | SpeechRecognition
      | undefined;

    if (!SpeechRecognitionConstructor) {
      setIsSupported(false);
      clientLogger.warn(
        "[VoiceChat] Speech recognition not supported in this browser",
      );
      return;
    }

    // Create recognition instance
    const rec = new SpeechRecognitionConstructor!() as SpeechRecognition;

    // Configure recognition
    rec.continuous = false; // Stop after one result
    rec.interimResults = false; // Only final results
    rec.maxAlternatives = 1; // Single best result

    // Set language based on prop
    const langMap = {
      en: "en-IN",
      hi: "hi-IN",
      as: "as-IN",
    };
    rec.lang = langMap[language];

    // Handle results
    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      clientLogger.debug("[VoiceChat] Transcript received:", {
        transcript,
        language,
      });
      onTranscript(transcript);
      setIsListening(false);
      setError(null);
    };

    // Handle errors
    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      clientLogger.error("[VoiceChat] Recognition error:", {
        error: event.error,
      });
      setIsListening(false);

      // User-friendly error messages
      switch (event.error) {
        case "no-speech":
          setError("No speech detected. Please try again.");
          break;
        case "audio-capture":
          setError("Microphone not accessible. Please check permissions.");
          break;
        case "not-allowed":
          setError(
            "Microphone permission denied. Please enable it in browser settings.",
          );
          break;
        case "network":
          setError("Network error. Please check your connection.");
          break;
        default:
          setError("Speech recognition error. Please try again.");
      }
    };

    // Handle end of recognition
    rec.onend = () => {
      setIsListening(false);
    };

    setRecognition(rec);

    // Cleanup
    return () => {
      if (rec) {
        rec.stop();
      }
    };
  }, [language, onTranscript]);

  const startListening = useCallback(() => {
    if (!recognition || disabled) return;

    try {
      setError(null);
      recognition.start();
      setIsListening(true);
      clientLogger.debug("[VoiceChat] Started listening", { language });
    } catch (err) {
      clientLogger.error(
        "[VoiceChat] Error starting recognition:",
        err instanceof Error ? err : undefined,
      );
      setError("Failed to start voice recognition.");
    }
  }, [recognition, disabled, language]);

  const stopListening = useCallback(() => {
    if (!recognition) return;

    try {
      recognition.stop();
      setIsListening(false);
      clientLogger.debug("[VoiceChat] Stopped listening");
    } catch (err) {
      clientLogger.error(
        "[VoiceChat] Error stopping recognition:",
        err instanceof Error ? err : undefined,
      );
    }
  }, [recognition]);

  // Browser not supported
  if (!isSupported) {
    return (
      <div className="text-center p-4 bg-warning/10 border border-warning/30 rounded-lg">
        <p className="text-sm text-warning-dark">
          Voice input is not supported in this browser.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Please use Chrome, Edge, or Safari for voice features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Voice Button */}
      <div className="flex items-center justify-center">
        <Button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={disabled || !recognition}
          className={`relative ${
            isListening
              ? "bg-error hover:bg-error-dark animate-pulse"
              : "bg-primary hover:bg-primary-dark"
          }`}
          size="lg"
        >
          {isListening ? (
            <>
              <span className="mr-2">⏹️</span>
              Stop Listening
            </>
          ) : (
            <>
              <span className="mr-2">🎤</span>
              Speak
            </>
          )}
        </Button>
      </div>

      {/* Status Message */}
      {isListening && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-primary font-medium">
              Listening... Speak now
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-center p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error-dark">{error}</p>
        </div>
      )}

      {/* Language Indicator */}
      <div className="text-center text-xs text-muted-foreground">
        Language:{" "}
        {language === "en"
          ? "English"
          : language === "hi"
            ? "हिंदी"
            : "অসমীয়া"}
      </div>
    </div>
  );
}
