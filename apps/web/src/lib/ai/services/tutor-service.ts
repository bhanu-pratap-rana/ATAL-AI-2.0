/**
 * AI Tutor shared types
 *
 * The tutor implementation lives in the chat route
 * (src/app/api/tutor/chat/route.ts) using Vercel AI SDK streaming with
 * direct-pgvector RAG. This module holds the trilingual (EN/HI/AS) types
 * shared by the route and its consumers.
 */

/**
 * Supported languages
 */
export type TutorLanguage = "en" | "hi" | "as";

/**
 * Message role in a chat conversation
 */
export type TutorMessageRole = "user" | "assistant" | "system";

/**
 * Input mode for chat messages
 */
export type TutorInputMode = "text" | "voice";
