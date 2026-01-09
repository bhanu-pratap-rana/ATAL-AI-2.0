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

import { streamText } from "ai";
import { z } from "zod";
import { getCurrentUser, createClient } from "@/lib/supabase-server";
import { getAIModel, MODEL_CONFIGS } from "@/lib/ai/providers";
import { ragService } from "@/lib/ai/services/rag-service";
import { adaptiveService } from "@/lib/ai/services/adaptive-service";
import { buildSystemPrompt } from "@/lib/ai/prompts/socratic-tutor";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { authLogger } from "@/lib/auth-logger";

/**
 * Request body schema for tutor chat API
 * SECURITY: Includes bounds validation to prevent DoS attacks via large payloads
 */
const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z
          .string()
          .min(1, "Message content cannot be empty")
          .max(5000, "Message content must be less than 5000 characters"),
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

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;

  try {
    // Authenticate user
    user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // At this point, user is guaranteed to be non-null due to the guard above
    const authenticatedUser = user;

    // Rate limit check
    const isAllowed = await checkRateLimit(
      `ai:chat:${authenticatedUser.id}`,
      RATE_LIMITS.aiTutorChat,
    );
    if (!isAllowed) {
      return new Response(
        "Rate limit exceeded. Please wait before sending another message.",
        {
          status: 429,
        },
      );
    }

    // Parse and validate request body
    const body = await request.json();

    let validatedData: z.infer<typeof ChatRequestSchema>;
    try {
      validatedData = ChatRequestSchema.parse(body);
    } catch (validationError) {
      const errorMessage =
        validationError instanceof z.ZodError
          ? validationError.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join("; ")
          : "Invalid request body";

      authLogger.error("[TutorChat] Request validation failed", {
        error: errorMessage,
        userId: authenticatedUser.id,
      });

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, language, topicId, moduleId, sessionId, inputMode } =
      validatedData;

    // Get the latest user message for RAG
    const latestMessage = messages[messages.length - 1];
    const userQuery = latestMessage.content;

    // Get curriculum context via RAG (direct pgvector - NO LangChain)
    // Uses multilingual context to prioritize same-language content
    const context = await ragService.getMultilingualContext(
      userQuery,
      language,
      {
        filterTopic: topicId || null,
        matchCount: topicId ? 3 : 5,
      },
    );

    // Get student's learning style for personalization
    const learningProfile = await adaptiveService.getAdaptedContent(
      authenticatedUser.id,
      topicId || "general",
    );

    // Build personalized Socratic system prompt
    const systemPrompt = buildSystemPrompt({
      language,
      context,
      learningStyle: learningProfile.preferredStyle,
      showImages: learningProfile.showImages,
      topic: topicId,
      module: moduleId,
    });

    // Get AI model (Gemini primary, Groq fallback)
    const model = getAIModel("gemini");

    // Track start time for logging
    const startTime = Date.now();

    // Log user message
    await logInteraction({
      studentId: authenticatedUser.id,
      sessionId: sessionId || crypto.randomUUID(),
      topicId,
      messageRole: "user",
      messageContent: userQuery,
      inputMode,
      language,
      tokensUsed: 0,
      responseTimeMs: 0,
    });

    // Stream response using Vercel AI SDK
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      ...MODEL_CONFIGS.tutor,
      onFinish: async ({ text, usage }) => {
        // Log assistant response - with proper error handling for async operation
        // SECURITY: Errors in logging should not break the response
        try {
          await logInteraction({
            studentId: authenticatedUser.id,
            sessionId: sessionId || crypto.randomUUID(),
            topicId,
            messageRole: "assistant",
            messageContent: text,
            inputMode,
            language,
            tokensUsed: usage?.totalTokens || 0,
            responseTimeMs: Date.now() - startTime,
          });
        } catch (loggingError) {
          // Log the error but don't throw - user's response is already sent
          authLogger.error(
            "[TutorChat] Failed to log interaction in onFinish callback",
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

    // Return streaming response compatible with useChat
    return result.toDataStreamResponse();
  } catch (error) {
    // Log detailed error for debugging (server-side only)
    authLogger.error("[Tutor API] Unexpected error in chat handler", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: user?.id || "unknown",
    });

    // Return generic message to client (avoid exposing sensitive error details)
    return new Response(
      JSON.stringify({
        error:
          "An error occurred while processing your message. Please try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
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
  messageRole: "user" | "assistant" | "system";
  messageContent: string;
  inputMode: "text" | "voice";
  language: "en" | "hi" | "as";
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
