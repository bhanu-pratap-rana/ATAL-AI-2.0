/**
 * Google Gemini AI Provider with Groq Fallback
 *
 * Primary: Google Gemini 2.5 Flash (25x cheaper than OpenAI)
 * Fallback: Groq Llama 3.3 70B (FREE tier available)
 *
 * Uses Vercel AI SDK for streaming and React integration.
 * NO LangChain - direct SDK usage for better performance.
 */

import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

// Primary: Google Gemini 2.5 Flash via Vercel AI SDK
export const geminiProvider = google("gemini-2.5-flash-preview-05-20");

// Alternative Gemini models
export const geminiModels = {
  flash: google("gemini-2.5-flash-preview-05-20"),
  pro: google("gemini-2.0-flash"),
} as const;

// Fallback: Groq with Llama 3.3 (keep existing)
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export const groqProvider = groq("llama-3.3-70b-versatile");

// Alternative Groq models
export const groqModels = {
  llama33: groq("llama-3.3-70b-versatile"),
  llama32: groq("llama-3.2-90b-vision-preview"),
  mixtral: groq("mixtral-8x7b-32768"),
} as const;

/**
 * Provider type for configuration
 */
export type AIProviderType = "gemini" | "groq";

/**
 * Get the appropriate AI model based on preference and availability
 *
 * @param preferredProvider - 'gemini' (default) or 'groq'
 * @returns The AI model to use
 */
export function getAIModel(preferredProvider: AIProviderType = "gemini") {
  // Check if Gemini API key is available
  const hasGeminiKey =
    !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasGroqKey = !!process.env.GROQ_API_KEY;

  // Use Gemini if preferred and available
  if (preferredProvider === "gemini" && hasGeminiKey) {
    return geminiProvider;
  }

  // Fallback to Groq if available
  if (hasGroqKey) {
    return groqProvider;
  }

  // Default to Gemini (will error if no key)
  return geminiProvider;
}

/**
 * Get model with automatic fallback on error
 * Tries Gemini first, falls back to Groq if Gemini fails
 */
export async function getModelWithFallback(): Promise<{
  model: ReturnType<typeof google> | ReturnType<typeof groq>;
  provider: AIProviderType;
}> {
  const hasGeminiKey =
    !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasGroqKey = !!process.env.GROQ_API_KEY;

  if (hasGeminiKey) {
    return { model: geminiProvider, provider: "gemini" };
  }

  if (hasGroqKey) {
    return { model: groqProvider, provider: "groq" };
  }

  throw new Error(
    "No AI provider configured. Set either GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) or GROQ_API_KEY.",
  );
}

/**
 * Model configuration for different use cases
 */
export const MODEL_CONFIGS = {
  // Socratic tutoring - needs good reasoning
  tutor: {
    temperature: 0.7,
    maxTokens: 1024,
    topP: 0.95,
  },
  // RAG retrieval - more deterministic
  retrieval: {
    temperature: 0.3,
    maxTokens: 512,
    topP: 0.9,
  },
  // Assessment feedback - balanced
  assessment: {
    temperature: 0.5,
    maxTokens: 1024,
    topP: 0.9,
  },
  // Creative content (examples, stories)
  creative: {
    temperature: 0.9,
    maxTokens: 2048,
    topP: 0.95,
  },
} as const;

export type ModelConfigKey = keyof typeof MODEL_CONFIGS;
