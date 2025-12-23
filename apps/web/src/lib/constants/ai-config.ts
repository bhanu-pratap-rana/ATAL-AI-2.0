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
 * Default AI parameters
 */
export const AI_DEFAULTS = {
  /** Default temperature for balanced creativity */
  temperature: 0.7,
  /** Default max tokens for general responses */
  maxTokens: 2048,
} as const

/**
 * Feature-specific AI configurations
 */
export const AI_FEATURES = {
  /** AI Tutor - conversational, moderate creativity */
  tutor: {
    temperature: 0.7,
    maxTokens: 1024,
  },
  /** Essay Feedback - analytical, low creativity for consistency */
  essayFeedback: {
    temperature: 0.3,
    maxTokens: 1024,
  },
  /** Practice Questions - balanced creativity for variety */
  practiceQuestions: {
    temperature: 0.5,
    maxTokens: 2048,
  },
  /** Content Summarization - analytical, low creativity */
  summarization: {
    temperature: 0.3,
    maxTokens: 1024,
  },
} as const

/**
 * Provider configurations
 */
export const AI_PROVIDERS = {
  groq: {
    name: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
  },
  ollama: {
    name: 'Ollama',
    defaultModel: 'cogito:14b',
    baseUrl: 'http://localhost:11434',
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
  },
} as const

/**
 * Supported languages for AI responses
 */
export const AI_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  as: 'Assamese',
} as const

/**
 * Type definitions
 */
export type AIProviderKey = keyof typeof AI_PROVIDERS
export type AILanguageKey = keyof typeof AI_LANGUAGES
export type AIFeatureKey = keyof typeof AI_FEATURES
