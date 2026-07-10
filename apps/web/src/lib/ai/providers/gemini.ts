/**
 * Tiered AI Provider System
 *
 * Priority Order:
 * 1. PRIMARY: Google Gemini 2.0 Flash (paid credits - best quality)
 * 2. SECONDARY: HuggingFace PRO (Mistral/Llama - $9/month)
 * 3. TERTIARY: Groq (FREE tier - rate limited)
 *
 * Uses Vercel AI SDK for streaming and React integration.
 * Automatic fallback on provider errors.
 */

import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// ===== PRIMARY: Google Gemini =====
// Using Gemini 2.5 Flash (stable) - best balance of speed, quality, and cost
export const geminiProvider = google("gemini-2.5-flash");

export const geminiModels = {
  // Recommended for AI Tutor (1M context, thinking mode)
  flash25: google("gemini-2.5-flash"),
  // High quality for complex tasks
  pro25: google("gemini-2.5-pro"),
  // Faster, cheaper alternative
  flash20: google("gemini-2.0-flash"),
  // Legacy stable
  flash15: google("gemini-1.5-flash"),
  pro15: google("gemini-1.5-pro"),
} as const;

// ===== SECONDARY: HuggingFace PRO =====
// Using OpenAI-compatible endpoint for HuggingFace Inference API
const huggingface = createOpenAICompatible({
  name: "huggingface",
  baseURL: "https://api-inference.huggingface.co/models",
  apiKey: process.env.HUGGINGFACE_API_KEY || "",
});

// HuggingFace models via Inference API
export const huggingfaceModels = {
  mistral7b: huggingface("mistralai/Mistral-7B-Instruct-v0.3"),
  llama8b: huggingface("meta-llama/Meta-Llama-3.1-8B-Instruct"),
  llama70b: huggingface("meta-llama/Meta-Llama-3.1-70B-Instruct"),
} as const;

export const huggingfaceProvider = huggingfaceModels.mistral7b;

// ===== TERTIARY: Groq (FREE) =====
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export const groqProvider = groq("llama-3.3-70b-versatile");

export const groqModels = {
  llama33: groq("llama-3.3-70b-versatile"),
  llama32: groq("llama-3.2-90b-vision-preview"),
  mixtral: groq("mixtral-8x7b-32768"),
} as const;

// ===== QUATERNARY: Cerebras (FREE) =====
// 30 RPM / 1M tokens-per-day free tier, llama-3.3-70b at ~2000 tok/sec.
// OpenAI-compatible API so it slots in via createOpenAICompatible like
// HuggingFace. Independent infrastructure from Groq, so a Groq outage
// doesn't take down this layer too — useful when you really don't
// want chat to stop.
const cerebras = createOpenAICompatible({
  name: "cerebras",
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY || "",
});

export const cerebrasProvider = cerebras("llama-3.3-70b");

/**
 * Provider type for configuration
 */
export type AIProviderType = "gemini" | "huggingface" | "groq" | "cerebras";

/**
 * TYPE SAFETY: Helper to cast provider to LanguageModel with validation
 * The AI SDK providers implement LanguageModel but have varying type definitions.
 * This helper provides a single point for the cast with runtime validation.
 *
 * @param provider - Any AI provider that implements LanguageModel interface
 * @returns Properly typed LanguageModel
 */
function asLanguageModel(provider: {
  doGenerate?: unknown;
  doStream?: unknown;
  specificationVersion?: unknown;
}): LanguageModel {
  // Runtime check: LanguageModel must have these methods
  if (
    typeof provider !== "object" ||
    provider === null ||
    !("specificationVersion" in provider)
  ) {
    throw new Error("Invalid AI provider: does not implement LanguageModel");
  }
  // The provider implements the interface - safe to cast
  return provider as LanguageModel;
}

/**
 * Check which API keys are configured
 */
function getAvailableProviders() {
  return {
    gemini:
      Boolean(process.env.GEMINI_API_KEY) ||
      Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    huggingface: Boolean(process.env.HUGGINGFACE_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    cerebras: Boolean(process.env.CEREBRAS_API_KEY),
  };
}

/**
 * Get the appropriate AI model based on preference and availability
 *
 * Priority: Gemini (paid) → HuggingFace (PRO) → Groq (free) → Cerebras (free)
 *
 * @param preferredProvider - Override the default priority
 * @returns The AI model to use (typed as LanguageModel for AI SDK compatibility)
 */
export function getAIModel(preferredProvider?: AIProviderType): LanguageModel {
  const available = getAvailableProviders();

  // If specific provider requested and available, use it
  if (preferredProvider) {
    if (preferredProvider === "gemini" && available.gemini) {
      return asLanguageModel(geminiProvider);
    }
    if (preferredProvider === "huggingface" && available.huggingface) {
      return asLanguageModel(huggingfaceProvider);
    }
    if (preferredProvider === "groq" && available.groq) {
      return asLanguageModel(groqProvider);
    }
    if (preferredProvider === "cerebras" && available.cerebras) {
      return asLanguageModel(cerebrasProvider);
    }
  }

  // Default priority: Gemini → HuggingFace → Groq → Cerebras
  if (available.gemini) {
    return asLanguageModel(geminiProvider);
  }
  if (available.huggingface) {
    return asLanguageModel(huggingfaceProvider);
  }
  if (available.groq) {
    return asLanguageModel(groqProvider);
  }
  if (available.cerebras) {
    return asLanguageModel(cerebrasProvider);
  }

  // No provider available - return Gemini (will error with helpful message)
  return asLanguageModel(geminiProvider);
}

/**
 * Get model with automatic fallback chain
 * Priority: Gemini → HuggingFace → Groq → Cerebras
 *
 * @returns Model and provider info
 */
export async function getModelWithFallback(): Promise<{
  model: LanguageModel;
  provider: AIProviderType;
}> {
  const available = getAvailableProviders();

  // Priority 1: Gemini (best quality, paid)
  if (available.gemini) {
    return { model: asLanguageModel(geminiProvider), provider: "gemini" };
  }

  // Priority 2: HuggingFace PRO (good quality, $9/month)
  if (available.huggingface) {
    return { model: asLanguageModel(huggingfaceProvider), provider: "huggingface" };
  }

  // Priority 3: Groq (free tier, 14,400 RPM, llama-3.3-70b)
  if (available.groq) {
    return { model: asLanguageModel(groqProvider), provider: "groq" };
  }

  // Priority 4: Cerebras (free tier, 30 RPM, llama-3.3-70b @ ~2000 tok/sec)
  if (available.cerebras) {
    return { model: asLanguageModel(cerebrasProvider), provider: "cerebras" };
  }

  throw new Error(
    "No AI provider configured. Set one of: GEMINI_API_KEY, HUGGINGFACE_API_KEY, GROQ_API_KEY, or CEREBRAS_API_KEY",
  );
}

/**
 * Get all available providers for display/debugging
 */
export function getProviderStatus(): Record<AIProviderType, boolean> {
  return getAvailableProviders();
}

/**
 * Model configuration for different use cases
 */
export const MODEL_CONFIGS = {
  // Socratic tutoring - needs good reasoning (uses thinking mode)
  tutor: {
    temperature: 0.7,
    maxOutputTokens: 1024,
    topP: 0.95,
  },
  // Study/Learning with RAG - faster, cheaper (context already retrieved)
  study: {
    temperature: 0.5,
    maxOutputTokens: 768,
    topP: 0.9,
  },
  // RAG retrieval - more deterministic
  retrieval: {
    temperature: 0.3,
    maxOutputTokens: 512,
    topP: 0.9,
  },
  // Assessment feedback - balanced
  assessment: {
    temperature: 0.5,
    maxOutputTokens: 1024,
    topP: 0.9,
  },
  // Creative content (examples, stories)
  creative: {
    temperature: 0.9,
    maxOutputTokens: 2048,
    topP: 0.95,
  },
} as const;

export type ModelConfigKey = keyof typeof MODEL_CONFIGS;
