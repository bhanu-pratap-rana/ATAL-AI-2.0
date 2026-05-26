/**
 * AI Tutor Chat API Route
 *
 * Streaming chat endpoint using Vercel AI SDK.
 * Supports the useChat hook from @ai-sdk/react.
 *
 * Features:
 * - Real-time streaming responses
 * - RAG context retrieval (direct pgvector)
 * - Socratic tutoring method
 * - Trilingual support (EN/HI/AS)
 * - Learning style adaptation
 */

export const maxDuration = 60;

import { z } from "zod";
import { convertToModelMessages, type UIMessage } from "ai";
import { getCurrentUser, createClient } from "@/lib/supabase-server";
import { MODEL_CONFIGS } from "@/lib/ai/providers";
import { streamTextWithFallback } from "@/lib/ai/with-fallback";
import { ragService } from "@/lib/ai/services/rag-service";
import { adaptiveService } from "@/lib/ai/services/adaptive-service";
import { buildSystemPrompt } from "@/lib/ai/prompts/socratic-tutor";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { authLogger } from "@/lib/auth-logger";
import { gamificationService } from "@/lib/services/gamification-service";
import type {
  TutorLanguage,
  TutorMessageRole,
  TutorInputMode,
} from "@/lib/ai/services/tutor-service";

/**
 * Request body schema for tutor chat API.
 *
 * SDK 6 wire-shape: messages are UIMessages with `parts: [{ type, text, ... }]`
 * instead of the v4 `content: string`. We validate the part shapes we care
 * about (text), then `convertToModelMessages` translates UIMessage → ModelMessage
 * before forwarding to streamText. Pre-PR-63 the schema still expected
 * `content: string` and rejected every request with HTTP 400 — fixed here.
 *
 * SECURITY: per-part text length cap + max-parts cap keep payload size bounded.
 */
const TextPartSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .min(1, "Text part cannot be empty")
    .max(5000, "Text part must be less than 5000 characters"),
});

// Accept and ignore non-text parts (tool calls, files, reasoning, etc.) so the
// schema doesn't reject a legitimate UIMessage with mixed parts. Only text
// parts get extracted for the prompt.
const NonTextPartSchema = z
  .object({ type: z.string() })
  .passthrough()
  .transform((p) => p as Record<string, unknown>);

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().optional(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z
          .array(z.union([TextPartSchema, NonTextPartSchema]))
          .min(1, "Message must have at least one part")
          .max(20, "Message must not exceed 20 parts"),
      }),
    )
    .min(1, "At least one message is required")
    .max(100, "Conversation history must not exceed 100 messages"),
  language: z.enum(["en", "hi", "as"]).default("en"),
  topicId: z.string().optional(),
  moduleId: z.string().optional(),
  sessionId: z.string().optional(),
  inputMode: z.enum(["text", "voice"]).default("text"),
});

/**
 * Extract the concatenated text from a UIMessage's parts. Mirrors the
 * client-side `messageText()` helper in tutor + lesson topic pages.
 */
function uiMessageText(m: { parts: ReadonlyArray<Record<string, unknown>> }): string {
  let out = "";
  for (const p of m.parts) {
    if (p.type === "text" && typeof p.text === "string") out += p.text;
  }
  return out;
}

export async function POST(request: Request): Promise<Response> {
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;

  try {
    // Authenticate user
    user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { error: "Please sign in to continue.", errorKey: "errors.signInRequired" },
        { status: 401 },
      );
    }

    // At this point, user is guaranteed to be non-null due to the guard above
    const authenticatedUser = user;

    // Rate limit check
    const isAllowed = await checkRateLimit(
      `ai:chat:${authenticatedUser.id}`,
      RATE_LIMITS.aiTutorChat,
    );
    if (!isAllowed) {
      return Response.json(
        {
          error: "You're sending messages too quickly. Please wait a moment and try again.",
          errorKey: "errors.rateLimitWait",
          retryAfter: 60,
        },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    // Parse and validate request body
    const body = await request.json();

    let validatedData: z.infer<typeof ChatRequestSchema>;
    try {
      validatedData = ChatRequestSchema.parse(body);
    } catch (validationError) {
      // SEC-007 FIX: Log detailed errors server-side, return generic message to client
      const detailedError =
        validationError instanceof z.ZodError
          ? validationError.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join("; ")
          : "Invalid request body";

      authLogger.error("[TutorChat] Request validation failed", {
        error: detailedError,
        userId: authenticatedUser.id,
      });

      // SEC-007 FIX: Return generic error to client to prevent information disclosure
      return Response.json(
        { error: "Invalid request format. Please try again." },
        { status: 400 },
      );
    }

    const { messages, language, topicId, moduleId, sessionId, inputMode } =
      validatedData;

    // Get the latest user message for RAG. v6 UIMessages carry text in
    // parts[].text — extract via the helper.
    const latestMessage = messages.at(-1);
    // SEC-2 FIX: Truncate user query to limit prompt injection surface
    const userQuery = (latestMessage ? uiMessageText(latestMessage) : "").slice(0, 4000);

    // Curriculum context (RAG) and learning profile are independent; fetch in parallel.
    const [context, learningProfile] = await Promise.all([
      ragService.getMultilingualContext(userQuery, language, {
        filterTopic: topicId || null,
        matchCount: topicId ? 3 : 5,
      }),
      adaptiveService.getAdaptedContent(
        authenticatedUser.id,
        topicId || "general",
      ),
    ]);

    // Build personalized Socratic system prompt
    const systemPrompt = buildSystemPrompt({
      language,
      context,
      learningStyle: learningProfile.preferredStyle,
      showImages: learningProfile.showImages,
      topic: topicId,
      module: moduleId,
    });

    // Track start time for logging
    const startTime = Date.now();

    // PR-66: stable per-request sessionId. Previously two separate
    // `sessionId || crypto.randomUUID()` calls (one here, one in
    // onFinish for the assistant log) generated DIFFERENT UUIDs when
    // the client didn't pass a sessionId, splitting the conversation
    // into two distinct rows in AIInteractionsLog. Generate once,
    // reuse for both logs.
    const logSessionId = sessionId || crypto.randomUUID();

    // PR-66: log the user message fire-and-forget. Was previously
    // awaited before streamText — if the DB insert threw (RLS edge
    // case, transient network), the user saw a 500 even though the
    // chat itself would have worked.
    void logInteraction({
      studentId: authenticatedUser.id,
      sessionId: logSessionId,
      topicId,
      messageRole: "user",
      // SEC-10: truncate user content in logs to limit PII exposure
      messageContent: userQuery.slice(0, 500),
      inputMode,
      language,
      tokensUsed: 0,
      responseTimeMs: 0,
    }).catch((err) => {
      authLogger.warn("[TutorChat] user logInteraction failed (non-blocking)", {
        error: err instanceof Error ? err.message : String(err),
        userId: authenticatedUser.id,
      });
    });

    // Stream response with runtime auto-failover across configured
    // providers (Gemini → HuggingFace → Groq). If the primary provider
    // errors before the first token (auth / rate-limit / 5xx), the
    // wrapper transparently retries on the next provider.
    //
    // SDK 6: convertToModelMessages translates UIMessages (parts-shaped,
    // sent by useChat / DefaultChatTransport) into the ModelMessage[]
    // format streamText expects. The cast through `unknown as UIMessage[]`
    // is safe because Zod has already validated the parts shape above.
    const modelMessages = await convertToModelMessages(messages as unknown as UIMessage[]);
    const result = await streamTextWithFallback({
      system: systemPrompt,
      messages: modelMessages,
      ...MODEL_CONFIGS.tutor,
      onFinish: async ({ text, totalUsage }) => {
        // Log assistant response - with proper error handling for async operation
        // SECURITY: Errors in logging should not break the response
        // SDK 6 renamed `usage` (per-step) to `totalUsage` (rolled up) on
        // streamText's onFinish payload — same numeric shape.
        try {
          await logInteraction({
            studentId: authenticatedUser.id,
            sessionId: logSessionId,
            topicId,
            messageRole: "assistant",
            messageContent: text,
            inputMode,
            language,
            tokensUsed: totalUsage?.totalTokens || 0,
            responseTimeMs: Date.now() - startTime,
          });

          // Award points and check badges after successful interaction
          // Uses "voice" for voice input, "question" for text input
          const activityType = inputMode === "voice" ? "voice" : "question";
          await gamificationService.triggerActivityCheck(
            authenticatedUser.id,
            activityType,
          );
        } catch (loggingError) {
          // Log the error but don't throw - user's response is already sent
          authLogger.error(
            "[TutorChat] Failed to log interaction or award points in onFinish callback",
            {
              error:
                loggingError instanceof Error
                  ? loggingError.message
                  : String(loggingError),
              userId: authenticatedUser.id,
              sessionId,
            },
          );
          // Note: Response already streamed, so we can't return error to client
          // This ensures failed logging doesn't break the user's chat experience
        }
      },
    });

    // Return streaming response compatible with useChat. SDK 6 renamed
    // toDataStreamResponse → toUIMessageStreamResponse and changed the
    // wire format to the new UIMessage protocol. The client transport
    // (DefaultChatTransport in @ai-sdk/react v3) speaks the new format
    // out of the box, so the only code change needed is here.
    return result.toUIMessageStreamResponse({
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    // Log detailed error for debugging (server-side only)
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Only include stack trace in development to prevent info disclosure
    const isDev = process.env.NODE_ENV === "development";

    authLogger.error("[Tutor API] Unexpected error in chat handler", {
      error: errorMessage,
      stack: isDev && error instanceof Error ? error.stack : undefined,
      userId: user?.id || "unknown",
    });

    // Log additional details for debugging - only in development
    if (isDev) {
      authLogger.debug("[Tutor API] Error details:", {
        message: errorMessage,
        name: error instanceof Error ? error.name : "Unknown",
        cause: error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined,
      });
    }

    // Never expose internal error details to clients - only generic message
    // Detailed errors are logged server-side above for debugging
    return Response.json(
      { error: "An error occurred while processing your message. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * Log AI tutor interaction for teacher visibility
 */
async function logInteraction(params: {
  studentId: string;
  sessionId: string;
  topicId?: string;
  messageRole: TutorMessageRole;
  messageContent: string;
  inputMode: TutorInputMode;
  language: TutorLanguage;
  tokensUsed: number;
  responseTimeMs: number;
}): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("ai_tutor_interactions").insert({
      student_id: params.studentId,
      session_id: params.sessionId,
      topic_id: params.topicId,
      message_role: params.messageRole,
      message_content: params.messageContent,
      input_mode: params.inputMode,
      language: params.language,
      tokens_used: params.tokensUsed,
      response_time_ms: params.responseTimeMs,
    });
  } catch (error) {
    authLogger.error("[Tutor API] Error logging interaction:", error);
  }
}
