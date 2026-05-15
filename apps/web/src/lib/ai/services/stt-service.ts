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
 *   1. Bhashini ASR (Govt of India)  — FREE for educational use,
 *      NATIVE Hindi + native Assamese, government-aligned with the
 *      Assam Digital Initiative. Activated when BHASHINI_USER_ID +
 *      BHASHINI_ULCA_API_KEY + BHASHINI_INFERENCE_API_KEY are set.
 *
 *   2. OpenAI Whisper API (whisper-1) — paid (~$0.006/min), excellent
 *      quality, multilingual. Activated when OPENAI_API_KEY is set.
 *
 *   3. HuggingFace Inference Whisper-large-v3 — FREE rate-limited,
 *      multilingual. Activated when HUGGINGFACE_API_KEY is set. This
 *      is the cheapest always-available layer.
 *
 * If none of the providers are configured, the route returns 503 with
 * a clear "speech-to-text unavailable" message.
 */

import { authLogger } from "@/lib/auth-logger";

export type STTLanguage = "en" | "hi" | "as";

const HF_WHISPER_ENDPOINT =
  "https://api-inference.huggingface.co/models/openai/whisper-large-v3";
const OPENAI_TRANSCRIPTIONS_ENDPOINT =
  "https://api.openai.com/v1/audio/transcriptions";
const BHASHINI_PIPELINE_ENDPOINT =
  "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";

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

export interface STTResult {
  text: string;
  provider: "bhashini" | "openai" | "huggingface";
  language: STTLanguage;
}

/**
 * Bhashini ASR uses a two-step protocol: first ask which inference
 * endpoint serves the requested language, then post the audio there.
 * Skipped entirely if credentials are not configured.
 */
async function transcribeWithBhashini(
  audioBytes: Buffer,
  language: STTLanguage,
): Promise<STTResult | null> {
  const userId = process.env.BHASHINI_USER_ID;
  const ulcaKey = process.env.BHASHINI_ULCA_API_KEY;
  const inferenceKey = process.env.BHASHINI_INFERENCE_API_KEY;

  if (!userId || !ulcaKey || !inferenceKey) {
    return null;
  }

  const pipelineRes = await fetch(BHASHINI_PIPELINE_ENDPOINT, {
    method: "POST",
    headers: {
      userID: userId,
      ulcaApiKey: ulcaKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pipelineTasks: [
        { taskType: "asr", config: { language: { sourceLanguage: ISO_FOR_LANGUAGE[language] } } },
      ],
      pipelineRequestConfig: { pipelineId: "64392f96daac500b55c543cd" },
    }),
  });

  if (!pipelineRes.ok) {
    throw new Error(`Bhashini pipeline-config ${pipelineRes.status}`);
  }

  const config = (await pipelineRes.json()) as {
    pipelineInferenceAPIEndPoint?: {
      callbackUrl?: string;
      inferenceApiKey?: { name?: string; value?: string };
    };
    pipelineResponseConfig?: Array<{ config?: Array<{ serviceId?: string }> }>;
  };

  const callbackUrl = config.pipelineInferenceAPIEndPoint?.callbackUrl;
  const headerName =
    config.pipelineInferenceAPIEndPoint?.inferenceApiKey?.name ?? "Authorization";
  const headerValue =
    config.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value ?? inferenceKey;
  const serviceId =
    config.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId ?? undefined;

  if (!callbackUrl) {
    throw new Error("Bhashini pipeline returned no callback URL");
  }

  const inferenceRes = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      [headerName]: headerValue,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: "asr",
          config: {
            language: { sourceLanguage: ISO_FOR_LANGUAGE[language] },
            ...(serviceId ? { serviceId } : {}),
            audioFormat: "webm",
            samplingRate: 16000,
          },
        },
      ],
      inputData: {
        audio: [{ audioContent: audioBytes.toString("base64") }],
      },
    }),
  });

  if (!inferenceRes.ok) {
    throw new Error(`Bhashini inference ${inferenceRes.status}`);
  }

  const data = (await inferenceRes.json()) as {
    pipelineResponse?: Array<{ output?: Array<{ source?: string }> }>;
  };
  const text = data.pipelineResponse?.[0]?.output?.[0]?.source ?? "";
  return { text, provider: "bhashini", language };
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
    { name: "bhashini", run: transcribeWithBhashini },
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
        "(set BHASHINI_* keys, OPENAI_API_KEY, or HUGGINGFACE_API_KEY)",
    );
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("all STT providers failed");
}
