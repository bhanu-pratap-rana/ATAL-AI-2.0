/**
 * Sarvam AI TTS — Indian-language-first synthesis with NATIVE Assamese.
 *
 * Why this exists: Google Cloud TTS has no Assamese voice — we were
 * routing `as` requests to the Bengali (`bn-IN`) voice, which is
 * phonetically close but mispronounces several Assamese-specific
 * phonemes. Sarvam's Bulbul v2 model has native Assamese (`as-IN`)
 * voices, so Assamese now sounds Assamese.
 *
 * Sarvam is also the primary for Hindi when configured — quality is
 * comparable to Google Cloud Neural2 and credits ride on the same
 * subscription. English stays on Google by default (its `en-IN`
 * Neural2 voice is excellent and free quota is generous).
 */

import { authLogger } from "@/lib/auth-logger";

const SARVAM_TTS_ENDPOINT = "https://api.sarvam.ai/text-to-speech";

export type SarvamLanguage = "en" | "hi" | "as";

const TARGET_LANGUAGE: Record<SarvamLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  as: "as-IN",
};

// Default speakers per language — Bulbul v3 voices, picked for
// clarity in classroom playback. Sarvam voices are language-agnostic
// (the same speaker can voice any of the 11 supported languages),
// so we pick `priya` (clear female narrator) as the default across
// all three. Override via opts.speaker. Other Bulbul v3 voices:
// shubh, aditya, ritu, priya, neha, rahul, pooja, rohan, simran,
// kavya, amit, dev, ishita, shreya, ratan, varun, manan, sumit,
// roopa, kabir, aayan, ashutosh, advait, amelia, sophia, anand,
// tanya, tarun, sunny, mani, gokul, vijay, shruti, suhani, mohit,
// kavitha, rehan, soham, rupali.
const DEFAULT_SPEAKER: Record<SarvamLanguage, string> = {
  en: "priya",
  hi: "priya",
  as: "priya",
};

export interface SarvamTTSOptions {
  /** Override the default speaker. See DEFAULT_SPEAKER comment for the v3 voice list. */
  speaker?: string;
  /** 0.5–2.0. Default 1 (natural pace). */
  pace?: number;
  /** 0.5–2.0. Default 1 (no pitch shift). */
  pitch?: number;
  /** 0.5–3.0. Default 1.5 (clearer in noisy classroom audio). */
  loudness?: number;
  /** Default "bulbul:v3". v3 is required for Assamese and supports 2500-char input chunks. */
  model?: string;
}

export const sarvamTTS = {
  isConfigured(): boolean {
    return Boolean(process.env.SARVAM_API_KEY);
  },

  /**
   * Synthesize speech via Sarvam TTS REST API. Returns the raw audio
   * bytes (WAV) so the route handler can stream them back identically
   * to Google Cloud TTS output.
   */
  async synthesize(
    text: string,
    language: SarvamLanguage,
    options: SarvamTTSOptions = {},
  ): Promise<ArrayBuffer> {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      throw new Error("Sarvam TTS not configured (SARVAM_API_KEY missing)");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Text is required for TTS synthesis");
    }
    // Bulbul v3 caps each input chunk at 2500 characters. The caller
    // is expected to split longer text upstream; we surface the limit
    // clearly rather than truncating silently.
    if (text.length > 2500) {
      throw new Error(
        "Sarvam TTS input exceeds 2500 character limit per chunk — split upstream",
      );
    }

    const body = {
      inputs: [text],
      target_language_code: TARGET_LANGUAGE[language],
      speaker: options.speaker ?? DEFAULT_SPEAKER[language],
      pitch: options.pitch ?? 1,
      pace: options.pace ?? 1,
      loudness: options.loudness ?? 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: options.model ?? "bulbul:v3",
    };

    const response = await fetch(SARVAM_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Sarvam TTS ${response.status}: ${text.slice(0, 200)}`);
    }

    // Sarvam returns { request_id, audios: [base64_wav, ...] } — one
    // base64-encoded WAV per input chunk. We send a single chunk so
    // we take audios[0].
    const data = (await response.json()) as { audios?: string[] };
    const base64 = data.audios?.[0];
    if (!base64) {
      throw new Error("Sarvam TTS returned no audio payload");
    }

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      // codePointAt is the modern replacement for charCodeAt; for the
      // ASCII byte stream produced by atob() the values are identical.
      bytes[i] = binaryString.codePointAt(i) ?? 0;
    }

    authLogger.debug("[Sarvam TTS] synthesis successful", {
      language,
      textLength: text.length,
      audioBytes: bytes.length,
    });
    return bytes.buffer;
  },
};
