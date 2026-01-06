/**
 * TTS Service - AI4Bharat Indic-Parler-TTS
 *
 * FREE text-to-speech with native Assamese support!
 * Primary: HuggingFace Inference API
 * Fallback: Self-hosted on Render.com
 *
 * Supported Languages:
 * - English (en-IN)
 * - Hindi (hi-IN)
 * - Assamese (as-IN) - Critical for ATAL AI
 *
 * Model: ai4bharat/indic-parler-tts
 * Features: Emotion control, multiple voices
 */

import { authLogger } from "@/lib/auth-logger";

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
 * Language codes mapping for TTS
 */
const LANGUAGE_VOICE_MAP: Record<TTSLanguage, VoiceConfig> = {
  en: {
    voice: "en-IN-female",
    emotion: "friendly",
    speed: 1.0,
  },
  hi: {
    voice: "hi-IN-female",
    emotion: "friendly",
    speed: 1.0,
  },
  as: {
    voice: "as-IN-female",
    emotion: "friendly",
    speed: 0.95, // Slightly slower for clarity
  },
};

/**
 * AI4Bharat TTS Service
 * Uses HuggingFace Inference API with Render.com fallback
 */
export class TTSService {
  private huggingFaceApiUrl =
    process.env.HUGGINGFACE_TTS_URL ||
    "https://api-inference.huggingface.co/models/ai4bharat/indic-parler-tts";
  private renderFallbackUrl = process.env.TTS_FALLBACK_URL || "";

  /**
   * Synthesize speech from text
   *
   * @param text - Text to convert to speech
   * @param language - Target language (en, hi, as)
   * @param options - Optional TTS settings
   * @returns Audio buffer (WAV format)
   */
  async synthesize(
    text: string,
    language: TTSLanguage,
    options: TTSOptions = {},
  ): Promise<ArrayBuffer> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for TTS synthesis");
    }

    const voiceConfig = this.getVoiceConfig(language, options);
    authLogger.info("[TTS] Starting synthesis", {
      language,
      textLength: text.length,
      voiceConfig,
    });

    try {
      // Primary: HuggingFace Inference API
      const result = await this.callHuggingFace(text, voiceConfig);
      authLogger.info("[TTS] Successfully synthesized via HuggingFace", {
        language,
        textLength: text.length,
      });
      return result;
    } catch (error) {
      authLogger.warn("[TTS] HuggingFace failed, trying fallback", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback: Self-hosted on Render.com
      if (this.renderFallbackUrl) {
        try {
          const result = await this.callRenderFallback(text, voiceConfig);
          authLogger.info(
            "[TTS] Successfully synthesized via Render fallback",
            { language, textLength: text.length },
          );
          return result;
        } catch (fallbackError) {
          authLogger.error(
            "[TTS] Fallback failed, no alternative available",
            fallbackError instanceof Error
              ? { message: fallbackError.message }
              : { error: String(fallbackError) },
          );
          throw fallbackError;
        }
      }

      authLogger.error("[TTS] No TTS provider available", {
        language,
        renderFallbackUrl: this.renderFallbackUrl,
      });
      throw new Error("TTS synthesis failed: No fallback available");
    }
  }

  /**
   * Call HuggingFace Inference API
   */
  private async callHuggingFace(
    text: string,
    config: VoiceConfig,
  ): Promise<ArrayBuffer> {
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      authLogger.error(
        "[TTS/HF] Missing HUGGINGFACE_API_KEY configuration",
        {},
      );
      throw new Error("HUGGINGFACE_API_KEY is required for TTS");
    }

    authLogger.debug("[TTS/HF] Calling HuggingFace API", {
      url: this.huggingFaceApiUrl,
      voice: config.voice,
      textLength: text.length,
    });

    const response = await fetch(this.huggingFaceApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          voice: config.voice,
          emotion: config.emotion || "neutral",
          speed: config.speed || 1.0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      authLogger.error("[TTS/HF] API error response", {
        status: response.status,
        error: errorText,
      });

      // Handle model loading state (common on HuggingFace)
      if (response.status === 503) {
        authLogger.warn("[TTS/HF] Model loading (503), retry needed", {});
        throw new Error("TTS model is loading, please retry");
      }

      throw new Error(
        `HuggingFace TTS error: ${response.status} - ${errorText}`,
      );
    }

    authLogger.debug("[TTS/HF] API call successful, returning audio buffer", {
      status: response.status,
    });
    return response.arrayBuffer();
  }

  /**
   * Call Render.com fallback API
   */
  private async callRenderFallback(
    text: string,
    config: VoiceConfig,
  ): Promise<ArrayBuffer> {
    if (!this.renderFallbackUrl) {
      throw new Error("No TTS fallback URL configured");
    }

    const response = await fetch(this.renderFallbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: config.voice,
        emotion: config.emotion || "neutral",
        speed: config.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Render TTS error: ${response.status} - ${errorText}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Get voice configuration for language
   */
  private getVoiceConfig(
    language: TTSLanguage,
    options: TTSOptions = {},
  ): VoiceConfig {
    const baseConfig = LANGUAGE_VOICE_MAP[language] || LANGUAGE_VOICE_MAP.en;

    return {
      ...baseConfig,
      emotion: options.emotion || baseConfig.emotion,
      speed: options.speed || baseConfig.speed,
    };
  }

  /**
   * Check if TTS service is available and determine active provider
   * Checks: HuggingFace → Render fallback → Browser fallback
   */
  async isAvailable(): Promise<{
    available: boolean;
    provider: "huggingface" | "render" | "browser" | "none";
    error?: string;
  }> {
    // Check HuggingFace
    if (process.env.HUGGINGFACE_API_KEY) {
      authLogger.info("[TTS] Checking HuggingFace API availability", {
        url: this.huggingFaceApiUrl,
      });
      try {
        // Test with short text
        await this.callHuggingFace("test", LANGUAGE_VOICE_MAP.en);
        authLogger.info(
          "[TTS] HuggingFace API is AVAILABLE and responding",
          {},
        );
        return { available: true, provider: "huggingface" };
      } catch (error) {
        authLogger.warn("[TTS] HuggingFace API check failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      authLogger.warn("[TTS] HUGGINGFACE_API_KEY not configured", {});
    }

    // Check Render fallback
    if (this.renderFallbackUrl) {
      authLogger.info("[TTS] Checking Render fallback availability", {
        url: this.renderFallbackUrl,
      });
      try {
        const response = await fetch(`${this.renderFallbackUrl}/health`);
        if (response.ok) {
          authLogger.info("[TTS] Render fallback is AVAILABLE", {});
          return { available: true, provider: "render" };
        }
      } catch (error) {
        authLogger.warn("[TTS] Render fallback check failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      authLogger.debug(
        "[TTS] No Render fallback configured (TTS_FALLBACK_URL not set)",
        {},
      );
    }

    // Browser fallback is always available (handled client-side)
    authLogger.info("[TTS] Falling back to browser Speech Synthesis", {});
    return {
      available: true,
      provider: "browser",
      error:
        "Using browser Speech Synthesis fallback (no API providers available)",
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
