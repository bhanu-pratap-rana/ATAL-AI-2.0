'use client';

/**
 * Voice Chat Component
 *
 * Implements voice I/O for the AI Tutor:
 * - Input: Web Speech API (FREE, browser-native, supports Assamese)
 * - Output: AI4Bharat TTS (FREE, Assamese emotion support)
 *
 * Language codes:
 * - en-IN: English (India)
 * - hi-IN: Hindi
 * - as-IN: Assamese
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { clientLogger } from '@/lib/client-logger';

// Language codes for Web Speech API
const SPEECH_LANG_CODES = {
  en: 'en-IN',
  hi: 'hi-IN',
  as: 'as-IN', // Assamese supported!
} as const;

type Language = 'en' | 'hi' | 'as';

interface VoiceChatProps {
  language: Language;
  onTranscript: (text: string) => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  disabled?: boolean;
}

// Check for browser support
const isSpeechSupported = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export function VoiceChat({
  language,
  onTranscript,
  onSpeakStart,
  onSpeakEnd,
  disabled = false,
}: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Start listening with Web Speech API
  const startListening = useCallback(() => {
    if (!isSpeechSupported) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    setError(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = SPEECH_LANG_CODES[language];
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        onTranscript(final);
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      clientLogger.error('[VoiceChat] Speech recognition error:', { errorCode: event.error });

      switch (event.error) {
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setError('Microphone not found. Please check your device.');
          break;
        case 'not-allowed':
          setError('Microphone access denied. Please enable in browser settings.');
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [language, onTranscript]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Browser TTS fallback using Web Speech Synthesis
  const speakWithBrowser = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('Browser TTS not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Map language to browser TTS language codes
    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      as: 'as-IN', // May fall back to Hindi if Assamese not available
    };
    utterance.lang = langMap[language] || 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeakEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      onSpeakEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, [language, onSpeakEnd]);

  // Speak text using AI4Bharat TTS with browser fallback
  const speakText = useCallback(
    async (text: string) => {
      if (!text || isSpeaking) return;

      setIsSpeaking(true);
      onSpeakStart?.();

      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language }),
        });

        if (!response.ok) {
          // Use browser TTS as fallback
          clientLogger.warn('[VoiceChat] TTS API failed, using browser fallback');
          speakWithBrowser(text);
          return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          onSpeakEnd?.();
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          // Fallback to browser TTS on playback error
          clientLogger.warn('[VoiceChat] Audio playback failed, using browser fallback');
          URL.revokeObjectURL(audioUrl);
          speakWithBrowser(text);
        };

        await audio.play();
      } catch (err) {
        clientLogger.error('[VoiceChat] TTS error:', err instanceof Error ? err : undefined);
        // Fallback to browser TTS
        speakWithBrowser(text);
      }
    },
    [language, isSpeaking, onSpeakStart, onSpeakEnd, speakWithBrowser]
  );

  // Stop speaking (handles both audio element and browser TTS)
  const stopSpeaking = useCallback(() => {
    // Stop audio element if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Stop browser speech synthesis if active
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    onSpeakEnd?.();
  }, [onSpeakEnd]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mic Button */}
      <Button
        size="lg"
        variant={isListening ? 'destructive' : 'default'}
        className={`w-20 h-20 rounded-full transition-all ${
          isListening ? 'animate-pulse scale-110' : ''
        }`}
        onClick={toggleListening}
        disabled={disabled || isSpeaking}
      >
        {isListening ? (
          <MicOffIcon className="w-8 h-8" />
        ) : (
          <MicIcon className="w-8 h-8" />
        )}
      </Button>

      {/* Status */}
      <div className="text-center">
        {isListening && (
          <p className="text-sm text-primary font-medium animate-pulse">
            Listening...
          </p>
        )}
        {isSpeaking && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-primary font-medium">Speaking...</p>
            <Button variant="outline" size="sm" onClick={stopSpeaking}>
              <VolumeOffIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
        {!isListening && !isSpeaking && (
          <p className="text-sm text-muted-foreground">Tap to speak</p>
        )}
      </div>

      {/* Interim transcript */}
      {interimTranscript && (
        <p className="text-sm text-muted-foreground italic max-w-xs text-center">
          "{interimTranscript}"
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-error max-w-xs text-center">{error}</p>
      )}

      {/* Browser support warning */}
      {!isSpeechSupported && (
        <p className="text-sm text-warning max-w-xs text-center">
          Voice input not supported. Please use Chrome, Edge, or Safari.
        </p>
      )}
    </div>
  );
}

// Expose speakText for external use
export function useTTS(language: Language) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(
    async (text: string) => {
      if (!text || isSpeaking) return;

      setIsSpeaking(true);

      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language }),
        });

        if (!response.ok) throw new Error('TTS failed');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (err) {
        clientLogger.error('[useTTS] TTS error:', err instanceof Error ? err : undefined);
        setIsSpeaking(false);
      }
    },
    [language, isSpeaking]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}

// Simple icons
function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function VolumeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" x2="16" y1="9" y2="15" />
      <line x1="16" x2="22" y1="9" y2="15" />
    </svg>
  );
}

// Web Speech API Type Declarations
// These are not included in TypeScript's lib.dom.d.ts by default
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;

  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;

  abort(): void;
  start(): void;
  stop(): void;
}

interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
