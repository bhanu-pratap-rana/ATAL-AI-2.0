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

const DEFAULT_CHAIN: AIProviderType[] = [
  "gemini",
  "huggingface",
  "groq",
  "cerebras",
];

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
 * Starts a streaming completion against the first provider in the
 * chain. If that provider errors before any tokens are produced
 * (auth, rate limit, 4xx), the next provider in the chain is tried.
 * Mid-stream errors are surfaced to the caller as normal — we cannot
 * recover from a partial response.
 */
export async function streamTextWithFallback(
  opts: StreamTextOptions,
): Promise<StreamTextResult<Record<string, never>, unknown>> {
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
      const result = sdkStreamText({ ...rest, model }) as StreamTextResult<
        Record<string, never>,
        unknown
      >;
      // Probe the stream by awaiting the first usage event. If the
      // provider rejects (auth/rate-limit), this throws synchronously
      // inside the await and we move to the next provider. Once the
      // first chunk arrives, we hand the StreamTextResult to the caller.
      await Promise.race([
        result.warnings,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("stream probe timeout")), 8_000),
        ),
      ]);
      if (provider !== chain[0]) {
        authLogger.info("[ai/fallback] streamText recovered on fallback", {
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
