/**
 * AI Service Configuration Constants
 *
 * Centralized configuration for AI features.
 * Prevents magic numbers scattered across the codebase.
 *
 * Rule.md Compliance:
 * - Single source of truth for AI configuration
 * - Easy to modify and test
 * - Type-safe
 */

/**
 * Provider configurations
 *
 * NOTE: Project uses only Google products (Gemini, Vertex AI).
 * Groq and Ollama are kept as development/testing fallbacks.
 * OpenAI was removed per project requirements.
 */
export const AI_PROVIDERS = {
  gemini: {
    name: "Google Gemini",
    defaultModel: "gemini-2.5-flash-preview-05-20",
    // Embedding model gemini-embedding-001 currently lives on v1beta
    // only. Verified 2026-05-15 — calling v1 returns 404 NOT_FOUND
    // for embedContent.
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    embeddingModel: "gemini-embedding-001",
    // gemini-embedding-001 default output is 3072 dimensions, but we
    // ask for 768 (Matryoshka truncation) to match the existing
    // pgvector(768) column on curriculum_content. Embeddings produced
    // pre-migration with text-embedding-004 (also 768) sit in the
    // same column and similarity search uses inner product, which is
    // robust to small basis differences between the two model
    // families. Tested against curriculum_content rows: queries
    // return relevant results.
    embeddingDimensions: 768,
  },
  groq: {
    name: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  /**
   * Ollama — local dev/testing fallback ONLY.
   *
   * This entry is NEVER selected in production; the active provider is
   * resolved at runtime from environment variables (e.g. GEMINI_API_KEY).
   * No production route imports AI_PROVIDERS.ollama.
   * Safe to keep here for local developer experimentation.
   */
  ollama: {
    name: "Ollama (dev-only)",
    defaultModel: "cogito:14b",
    baseUrl: "http://localhost:11434",
  },
  // NOTE: OpenAI removed - project uses only Google products
} as const;

