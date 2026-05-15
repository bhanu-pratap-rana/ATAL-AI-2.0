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
 * (Gemini → HuggingFace → Groq by default) so a single provider
 * outage doesn't take down chat / lesson generation.
 *
 * `generateText` failover is straightforward: catch, log, try next.
 *
 * `streamText` failover is partial: a provider only counts as
 * "failed" if it errors before the first token is yielded. Once the
 * stream starts, the response is committed and we can't switch
 * mid-flight — falling back there would mean dropping a partial
 * answer in front of the student. So we use `consumeStream`-style
 * preflight: start the stream, await the first chunk; if that
 * throws, retry on the next provider. This buys us coverage for
 * authn / rate-limit errors (which fail fast) without compromising
 * mid-stream output.
 */

import {
  generateText as sdkGenerateText,
  streamText as sdkStreamText,
} from "ai";
import type { StreamTextResult } from "ai";
import {
  getAIModel,
  getProviderStatus,
  type AIProviderType,
} from "./providers/gemini";
import { authLogger } from "@/lib/auth-logger";

// HuggingFace skipped here because the @ai-sdk/openai-compatible adapter
// against HF's Inference router currently reports as a non-v1 spec model,
// which the installed AI SDK 4 rejects with "Unsupported model version".
// Once the project upgrades to AI SDK 5 it can be re-added to the chain.
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

type GenerateTextOptions = Omit<
  Parameters<typeof sdkGenerateText>[0],
  "model"
> & {
  /** Optional preferred provider; chain still tries others on failure. */
  preferredProvider?: AIProviderType;
};

export async function generateTextWithFallback(
  opts: GenerateTextOptions,
): Promise<Awaited<ReturnType<typeof sdkGenerateText>>> {
  const { preferredProvider, ...rest } = opts;
  const chain = activeChain(preferredProvider);

  if (chain.length === 0) {
    throw new Error(
      "No AI provider configured. Set GEMINI_API_KEY, HUGGINGFACE_API_KEY, GROQ_API_KEY, or CEREBRAS_API_KEY.",
    );
  }

  let lastError: unknown;
  for (const provider of chain) {
    try {
      const model = getAIModel(provider);
      const result = await sdkGenerateText({ ...rest, model });
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

type StreamTextOptions = Omit<Parameters<typeof sdkStreamText>[0], "model"> & {
  preferredProvider?: AIProviderType;
};

/**
 * Starts a streaming completion against the first available provider.
 *
 * Failover semantics: `sdkStreamText` returns a result object
 * synchronously. Construction-time errors (model incompatible with the
 * installed AI SDK, invalid API key shape, unsupported options) throw
 * inside the call and we catch them to try the next provider.
 * Network / auth / rate-limit errors emerge later when the stream is
 * consumed by the caller (Next.js `toDataStreamResponse()`), and we
 * cannot retry there without dropping a partial response in front of
 * the student. So mid-stream errors fall through to the route handler's
 * try/catch and the user sees an error toast — same UX as before
 * fallback was introduced.
 *
 * Previous probe pattern (awaiting `result.warnings` with a timeout)
 * was wrong: that promise only settles after the full response
 * completes, so an 8s timeout false-positived on every provider and
 * killed tutor chat (caught by PR-59 live-test). Removed.
 */
export async function streamTextWithFallback(
  opts: StreamTextOptions,
): Promise<StreamTextResult<Record<string, never>, unknown>> {
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
      const result = sdkStreamText({ ...rest, model }) as StreamTextResult<
        Record<string, never>,
        unknown
      >;
      if (provider !== chain[0]) {
        authLogger.info("[ai/fallback] streamText switched to fallback provider", {
          provider,
        });
      }
      return result;
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
