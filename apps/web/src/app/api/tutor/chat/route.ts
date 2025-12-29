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

import { streamText, CoreMessage } from 'ai';
import { getCurrentUser, createClient } from '@/lib/supabase-server';
import { getAIModel, MODEL_CONFIGS } from '@/lib/ai/providers';
import { ragService } from '@/lib/ai/services/rag-service';
import { adaptiveService } from '@/lib/ai/services/adaptive-service';
import { buildSystemPrompt } from '@/lib/ai/prompts/socratic-tutor';
import { checkRateLimit } from '@/lib/rate-limiter-distributed';
import { RATE_LIMITS } from '@/lib/constants/rate-limits';
import { authLogger } from '@/lib/auth-logger';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limit check
    const isAllowed = await checkRateLimit(`ai:chat:${user.id}`, RATE_LIMITS.aiTutorChat);
    if (!isAllowed) {
      return new Response('Rate limit exceeded. Please wait before sending another message.', {
        status: 429,
      });
    }

    // Parse request body
    const body = await request.json();
    const {
      messages,
      language = 'en',
      topicId,
      moduleId,
      sessionId,
      inputMode = 'text',
    } = body as {
      messages: CoreMessage[];
      language?: 'en' | 'hi' | 'as';
      topicId?: string;
      moduleId?: string;
      sessionId?: string;
      inputMode?: 'text' | 'voice';
    };

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    // Get the latest user message for RAG
    const latestMessage = messages[messages.length - 1];
    const userQuery = typeof latestMessage.content === 'string'
      ? latestMessage.content
      : '';

    // Get curriculum context via RAG (direct pgvector - NO LangChain)
    // Uses multilingual context to prioritize same-language content
    const context = await ragService.getMultilingualContext(userQuery, language, {
      filterTopic: topicId || null,
      matchCount: topicId ? 3 : 5,
    });

    // Get student's learning style for personalization
    const learningProfile = await adaptiveService.getAdaptedContent(
      user.id,
      topicId || 'general'
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
    const model = getAIModel('gemini');

    // Track start time for logging
    const startTime = Date.now();

    // Log user message
    await logInteraction({
      studentId: user.id,
      sessionId: sessionId || crypto.randomUUID(),
      topicId,
      messageRole: 'user',
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
        // Log assistant response
        await logInteraction({
          studentId: user.id,
          sessionId: sessionId || crypto.randomUUID(),
          topicId,
          messageRole: 'assistant',
          messageContent: text,
          inputMode,
          language,
          tokensUsed: usage?.totalTokens || 0,
          responseTimeMs: Date.now() - startTime,
        });
      },
    });

    // Return streaming response compatible with useChat
    return result.toDataStreamResponse();
  } catch (error) {
    authLogger.error('[Tutor API] Error:', error);
    return new Response(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
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
  messageRole: 'user' | 'assistant' | 'system';
  messageContent: string;
  inputMode: 'text' | 'voice';
  language: 'en' | 'hi' | 'as';
  tokensUsed: number;
  responseTimeMs: number;
}): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('ai_tutor_interactions').insert({
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
    authLogger.error('[Tutor API] Error logging interaction:', error);
  }
}
