/**
 * Speech-to-Text service with provider auto-failover.
 *
 * Why this exists: Web Speech API works on Chromium/Safari only.
 * Firefox and in-app browsers (WhatsApp, Instagram) have no client-side
 * STT, so the voice-input branch in those environments needs a server
 * route. This service is the implementation behind /api/voice/stt.
 *
 * Failover chain (in order):
 *
 *   1. Sarvam AI (Saarika v2.5)      — Indian-language-first, NATIVE
 *      Hindi + Assamese, single API key, ₹1,000 free credits.
 *      Activated when SARVAM_API_KEY is set. Top of the chain because
 *      it's purpose-built for the Indic languages this app targets.
 *
 *   2. OpenAI Whisper API (whisper-1) — paid (~$0.006/min), excellent
 *      multilingual quality. Activated when OPENAI_API_KEY is set.
 *
 *   3. HuggingFace Inference Whisper-large-v3 — FREE rate-limited,
 *      multilingual. Activated when HUGGINGFACE_API_KEY is set. The
 *      always-on free safety net.
 *
 * If none of the providers are configured, the route returns 503 with
 * a clear "speech-to-text unavailable" message.
 *
 * Note: Bhashini (Govt of India ULCA) was previously the slot 2
 * provider. Removed in PR-57 because the two-step pipeline-config
 * protocol + manual integrator approval flow was hostile to set up;
 * Sarvam covers the same native Indic languages with a single key
 * and ₹1,000 free credits on signup.
 */

import { authLogger } from "@/lib/auth-logger";

export type STTLanguage = "en" | "hi" | "as";

const HF_WHISPER_ENDPOINT =
  "https://api-inference.huggingface.co/models/openai/whisper-large-v3";
const OPENAI_TRANSCRIPTIONS_ENDPOINT =
  "https://api.openai.com/v1/audio/transcriptions";
const SARVAM_STT_ENDPOINT = "https://api.sarvam.ai/speech-to-text";

const LANGUAGE_HINT: Record<STTLanguage, string> = {
  en: "english",
  hi: "hindi",
  as: "assamese",
};

const ISO_FOR_LANGUAGE: Record<STTLanguage, string> = {
  en: "en",
  hi: "hi",
  as: "as",
};

// Sarvam expects language codes in `xx-IN` form (BCP-47-ish).
const SARVAM_LANGUAGE: Record<STTLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  as: "as-IN",
};

export interface STTResult {
  text: string;
  provider: "sarvam" | "openai" | "huggingface";
  language: STTLanguage;
}

/**
 * Sarvam AI — Indian-language-first ASR. Single API key, simple
 * multipart endpoint, native Hindi + Assamese coverage. This is the
 * recommended primary for any deployment targeting Indic users.
 *
 * Returns null when SARVAM_API_KEY is not set so the failover loop
 * can move on to the next provider.
 */
async function transcribeWithSarvam(
  audioBytes: Buffer,
  language: STTLanguage,
): Promise<STTResult | null> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return null;

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(audioBytes)], { type: "audio/webm" }),
    "audio.webm",
  );
  form.append("language_code", SARVAM_LANGUAGE[language]);
  // saarika v2.5 is the GA model; saaras v3 supports translate / codemix
  // but defaults to translation-into-English which we do not want here.
  form.append("model", "saarika:v2.5");

  const response = await fetch(SARVAM_STT_ENDPOINT, {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Sarvam STT ${response.status}: ${text.slice(0, 200)}`);
  }

  // Sarvam returns { request_id, transcript, language_code, diarized_transcript? }
  const data = (await response.json()) as { transcript?: string };
  return {
    text: data.transcript ?? "",
    provider: "sarvam",
    language,
  };
}

async function transcribeWithOpenAI(
  audioBytes: Buffer,
  language: STTLanguage,
): Promise<STTResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("language", ISO_FOR_LANGUAGE[language]);
  form.append("response_format", "json");
  form.append(
    "file",
    new Blob([new Uint8Array(audioBytes)], { type: "audio/webm" }),
    "audio.webm",
  );

  const response = await fetch(OPENAI_TRANSCRIPTIONS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`OpenAI Whisper ${response.status}`);
  }

  const data = (await response.json()) as { text?: string };
  return { text: data.text ?? "", provider: "openai", language };
}

async function transcribeWithHuggingFace(
  audioBytes: Buffer,
  language: STTLanguage,
): Promise<STTResult | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(HF_WHISPER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "audio/webm",
      "x-wait-for-model": "true",
    },
    body: new Uint8Array(audioBytes),
  });

  if (!response.ok) {
    throw new Error(`HuggingFace Whisper ${response.status}`);
  }

  const data = (await response.json()) as { text?: string };
  return {
    text: data.text ?? "",
    provider: "huggingface",
    language,
  };
}

/**
 * Transcribe an audio clip with provider auto-failover.
 * Returns the first non-null result; throws only when all configured
 * providers fail or none is configured.
 */
export async function transcribeAudio(
  audioBytes: Buffer,
  language: STTLanguage,
): Promise<STTResult> {
  const attempts: Array<{
    name: string;
    run: (
      buf: Buffer,
      lang: STTLanguage,
    ) => Promise<STTResult | null>;
  }> = [
    { name: "sarvam", run: transcribeWithSarvam },
    { name: "openai", run: transcribeWithOpenAI },
    { name: "huggingface", run: transcribeWithHuggingFace },
  ];

  let lastError: unknown;
  let triedAny = false;
  for (const { name, run } of attempts) {
    try {
      const result = await run(audioBytes, language);
      if (result === null) continue; // provider not configured
      triedAny = true;
      authLogger.info("[stt] transcribed", {
        provider: result.provider,
        language: LANGUAGE_HINT[language],
        textLength: result.text.length,
      });
      return result;
    } catch (err) {
      triedAny = true;
      lastError = err;
      authLogger.warn("[stt] provider failed, trying next", {
        provider: name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!triedAny) {
    throw new Error(
      "speech-to-text unavailable — no STT provider configured " +
        "(set SARVAM_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY)",
    );
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("all STT providers failed");
}
