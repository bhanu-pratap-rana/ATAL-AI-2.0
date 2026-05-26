/**
 * TTS Service — Multi-Provider Text-to-Speech with language-aware
 * provider routing.
 *
 * Priority order:
 *   For Assamese (`as`):  Sarvam (NATIVE) → Google Cloud (bn-IN proxy) → browser
 *   For Hindi    (`hi`):  Google Cloud Neural2 → Sarvam → browser
 *   For English  (`en`):  Google Cloud Neural2 → Sarvam → browser
 *
 * Sarvam is the Assamese primary because it has a real `as-IN` voice
 * (Bulbul v2). Google's Bengali fallback was readable but mispronounced
 * Assamese-specific phonemes. For Hindi and English, Google's Neural2
 * voices are already excellent and free quota is generous, so they
 * stay primary and Sarvam acts as a quality-preserving fallback when
 * Google's quota runs out.
 *
 * Setup:
 *   Sarvam:    SARVAM_API_KEY
 *   Google:    GOOGLE_CLOUD_TTS_API_KEY or GOOGLE_APPLICATION_CREDENTIALS
 */

import { authLogger } from "@/lib/auth-logger";
import { googleCloudTTS, type GoogleTTSOptions } from "./google-cloud-tts";
import { sarvamTTS } from "./sarvam-tts";

// Sarvam takes pace/pitch directly (not Google's pitch-in-semitones model).
// Map our friendly/encouraging/calm presets to Sarvam-native values so
// Assamese narration carries the same emotional shading.
function emotionToSarvamPace(
  emotion: TTSOptions["emotion"],
  speed?: number,
): number {
  if (typeof speed === "number") return speed;
  if (emotion === "friendly") return 1.05;
  if (emotion === "encouraging") return 1.1;
  if (emotion === "calm") return 0.95;
  return 1;
}

function emotionToSarvamPitch(emotion: TTSOptions["emotion"]): number {
  if (emotion === "friendly") return 1.05;
  if (emotion === "encouraging") return 1.1;
  if (emotion === "calm") return 0.95;
  return 1;
}

/**
 * Supported TTS languages with Assamese priority
 */
export type TTSLanguage = "en" | "hi" | "as";

/**
 * Voice configuration for each language
 */
export interface VoiceConfig {
  voice: string;
  emotion?: "neutral" | "friendly" | "encouraging" | "calm";
  speed?: number;
}

/**
 * TTS synthesis options
 */
export interface TTSOptions {
  emotion?: "neutral" | "friendly" | "encouraging" | "calm";
  speed?: number;
}

/**
 * TTS Service
 * Uses Google Cloud TTS with browser Speech Synthesis as fallback
 */
export class TTSService {
  /**
   * Synthesize speech from text
   *
   * Uses Google Cloud TTS if configured, otherwise signals browser TTS fallback.
   *
   * @param text - Text to convert to speech
   * @param language - Target language (en, hi, as)
   * @param options - Optional TTS settings
   * @returns Audio as ArrayBuffer (WAV format) or throws for browser fallback
   */
  async synthesize(
    text: string,
    language: TTSLanguage,
    options: TTSOptions = {},
  ): Promise<ArrayBuffer> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for TTS synthesis");
    }

    // Assamese: prefer Sarvam (native voice) over Google's Bengali
    // proxy *if* the deployment has been granted Sarvam's beta access
    // for `as-IN`. Sarvam Bulbul v3 requires manually-granted beta
    // access for Assamese (request via support@sarvam.ai); until that
    // lands, every as request would 400 with "beta access required"
    // and waste a round-trip. Gate it on SARVAM_ENABLE_ASSAMESE=true
    // so the cost only kicks in once Sarvam has approved the account.
    const sarvamAsEnabled =
      process.env.SARVAM_ENABLE_ASSAMESE === "true";
    if (
      language === "as" &&
      sarvamAsEnabled &&
      sarvamTTS.isConfigured()
    ) {
      try {
        authLogger.info("[TTS] Using Sarvam TTS (native Assamese)", {
          language,
          textLength: text.length,
        });
        return await sarvamTTS.synthesize(text, "as", {
          pace: emotionToSarvamPace(options.emotion, options.speed),
          pitch: emotionToSarvamPitch(options.emotion),
        });
      } catch (sarvamError) {
        authLogger.warn(
          "[TTS] Sarvam Assamese failed, falling through to Google bn-IN proxy",
          {
            error:
              sarvamError instanceof Error
                ? sarvamError.message
                : String(sarvamError),
          },
        );
      }
    }

    // Try Google Cloud TTS first (high quality)
    if (googleCloudTTS.isConfigured()) {
      try {
        authLogger.info("[TTS] Using Google Cloud TTS", {
          language,
          textLength: text.length,
        });

        const googleOptions: GoogleTTSOptions = {
          speakingRate: options.speed || 1.0,
          useWaveNet: true, // Use high-quality voices
        };

        // Map emotion to speaking rate/pitch adjustments
        if (options.emotion === "friendly") {
          googleOptions.pitch = 1.0; // Slightly higher pitch
          googleOptions.speakingRate = 1.05;
        } else if (options.emotion === "encouraging") {
          googleOptions.pitch = 2.0;
          googleOptions.speakingRate = 1.1;
        } else if (options.emotion === "calm") {
          googleOptions.pitch = -1.0; // Slightly lower pitch
          googleOptions.speakingRate = 0.95;
        }

        return await googleCloudTTS.synthesize(text, language, googleOptions);
      } catch (error) {
        authLogger.warn("[TTS] Google Cloud TTS failed, falling back to browser TTS", {
          error: error instanceof Error ? error.message : String(error),
          language,
        });

        // If it's a quota error, still try browser fallback
        if (error instanceof Error && error.message.includes("quota")) {
          throw new Error("USE_BROWSER_TTS: Google Cloud TTS quota exceeded. Please use browser Speech Synthesis.");
        }

        // For other errors, also fall back to browser TTS
        throw new Error("USE_BROWSER_TTS: Server TTS failed. Please use browser Speech Synthesis.");
      }
    }

    // No server TTS configured, signal browser fallback
    authLogger.info("[TTS] No server TTS configured, using browser TTS", {
      language,
      textLength: text.length,
    });

    throw new Error("USE_BROWSER_TTS: Server-side TTS is not configured. Please use browser Speech Synthesis.");
  }

  /**
   * Check if TTS service is available
   * Checks Google Cloud TTS first, falls back to browser TTS.
   */
  async isAvailable(): Promise<{
    available: boolean;
    provider: "google-cloud" | "browser";
    error?: string;
  }> {
    // Check Google Cloud TTS first
    if (googleCloudTTS.isConfigured()) {
      try {
        const status = await googleCloudTTS.isAvailable();
        if (status.available) {
          authLogger.info("[TTS] Google Cloud TTS is available", {});
          return {
            available: true,
            provider: "google-cloud",
          };
        }
      } catch (error) {
        authLogger.warn("[TTS] Google Cloud TTS check failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Fall back to browser TTS (always available client-side)
    authLogger.info("[TTS] Using browser Speech Synthesis as fallback", {});
    return {
      available: true,
      provider: "browser",
      error: "Server TTS not configured, using browser Speech Synthesis",
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): TTSLanguage[] {
    return ["en", "hi", "as"];
  }

  /**
   * Get language display name
   */
  getLanguageName(language: TTSLanguage): string {
    const names: Record<TTSLanguage, string> = {
      en: "English",
      hi: "Hindi",
      as: "Assamese",
    };
    return names[language] || "Unknown";
  }

  /**
   * Estimate audio duration based on text length
   * Useful for UI timing
   */
  estimateDuration(text: string, language: TTSLanguage): number {
    // Average speaking rate: ~150 words per minute
    // Adjust for language complexity
    const wordsPerSecond = {
      en: 2.5,
      hi: 2.3,
      as: 2.2, // Slightly slower for Assamese
    };

    const wordCount = text.split(/\s+/).length;
    const rate = wordsPerSecond[language] || 2.5;

    return Math.ceil(wordCount / rate);
  }
}

// Export singleton instance
export const ttsService = new TTSService();
