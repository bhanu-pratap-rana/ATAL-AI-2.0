/**
 * Runtime auto-failover wrappers around the Vercel AI SDK.
 *
 * Why this exists: `getAIModel()` and `getModelWithFallback()` in
 * providers/gemini.ts are *static* — they pick the highest-priority
 * configured provider at call time and return it. If that provider
 * then errors during the actual request (rate limit, 5xx, quota, IO,
 * regional outage), the error propagates to the user. No second
 * provider is tried.
 *
 * These wrappers retry across the configured provider chain
 * (Gemini → Groq → Cerebras by default) so a single provider
 * outage doesn't take down chat / lesson generation.
 *
 * `generateText` failover is straightforward: catch, log, try next.
 *
 * `streamText` failover is partial: a provider only counts as
 * "failed" if `sdkStreamText()` construction itself throws (bad
 * model spec, invalid API key shape, unsupported option). Once the
 * stream starts, the response is committed and we can't switch
 * mid-flight — falling back there would mean dropping a partial
 * answer in front of the student. Mid-stream errors fall through to
 * the route handler's try/catch.
 *
 * SDK 6 note: `LanguageModelV1` → `LanguageModel`, `CoreMessage` →
 * `ModelMessage`, and `messages` is now a required field on the
 * options bag. Our wrapper signature accepts the same shape but
 * keeps it required.
 */

import {
  generateText as sdkGenerateText,
  streamText as sdkStreamText,
  type ModelMessage,
  type StreamTextResult,
} from "ai";
import {
  getAIModel,
  getProviderStatus,
  type AIProviderType,
} from "./providers/gemini";
import { authLogger } from "@/lib/auth-logger";

// HuggingFace skipped here because the @ai-sdk/openai-compatible adapter
// against HF's Inference router currently reports as a non-v1 spec model.
// Note: HF Inference IS used directly (without the AI SDK adapter) by
// services like Whisper STT and FLUX image generation — those paths
// are unaffected.
const DEFAULT_CHAIN: AIProviderType[] = ["gemini", "groq", "cerebras"];

function activeChain(preferred?: AIProviderType): AIProviderType[] {
  const available = getProviderStatus();
  const chain = preferred
    ? [preferred, ...DEFAULT_CHAIN.filter((p) => p !== preferred)]
    : DEFAULT_CHAIN;
  return chain.filter((p) => available[p]);
}

// We accept a narrow subset of the SDK options — the actual subset our
// callers use. SDK 6 requires either `messages` or `prompt`; we accept
// either as a discriminated optional pair and forward the bag verbatim.
type CallSettings = {
  messages?: ModelMessage[];
  prompt?: string;
  system?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
  // SDK 6 stream hooks the chat route relies on.
  onFinish?: Parameters<typeof sdkStreamText>[0]["onFinish"];
};

interface GenerateTextOptions extends CallSettings {
  preferredProvider?: AIProviderType;
}

export async function generateTextWithFallback(
  opts: GenerateTextOptions,
): Promise<Awaited<ReturnType<typeof sdkGenerateText>>> {
  const { preferredProvider, ...rest } = opts;
  const chain = activeChain(preferredProvider);

  if (chain.length === 0) {
    throw new Error(
      "No AI provider configured. Set GEMINI_API_KEY, GROQ_API_KEY, or CEREBRAS_API_KEY.",
    );
  }

  let lastError: unknown;
  for (const provider of chain) {
    try {
      const model = getAIModel(provider);
      // Caller passes one of { messages } | { prompt }; SDK validates at
      // call time. Cast to the SDK's overload union here so TS doesn't
      // try to satisfy both branches.
      const result = await sdkGenerateText({ ...rest, model } as Parameters<typeof sdkGenerateText>[0]);
      if (provider !== chain[0]) {
        authLogger.info("[ai/fallback] generateText recovered on fallback", {
          provider,
        });
      }
      return result;
    } catch (err) {
      lastError = err;
      authLogger.warn("[ai/fallback] generateText provider failed", {
        provider,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All AI providers failed for generateText");
}

interface StreamTextOptions extends CallSettings {
  preferredProvider?: AIProviderType;
}

/**
 * Starts a streaming completion against the first available provider.
 * Construction-time errors retry on the next provider; mid-stream errors
 * fall through to the route handler.
 */
export async function streamTextWithFallback(
  opts: StreamTextOptions,
): Promise<StreamTextResult<never, never>> {
  const { preferredProvider, ...rest } = opts;
  const chain = activeChain(preferredProvider);

  if (chain.length === 0) {
    throw new Error(
      "No AI provider configured. Set GEMINI_API_KEY, GROQ_API_KEY, or CEREBRAS_API_KEY.",
    );
  }

  let lastError: unknown;
  for (const provider of chain) {
    try {
      const model = getAIModel(provider);
      const result = sdkStreamText({ ...rest, model } as Parameters<typeof sdkStreamText>[0]);
      if (provider !== chain[0]) {
        authLogger.info("[ai/fallback] streamText switched to fallback provider", {
          provider,
        });
      }
      return result as unknown as StreamTextResult<never, never>;
    } catch (err) {
      lastError = err;
      authLogger.warn("[ai/fallback] streamText provider failed", {
        provider,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All AI providers failed for streamText");
}
