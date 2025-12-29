/**
 * TTS API Route - AI4Bharat Text-to-Speech
 *
 * Converts text to speech with Assamese support.
 * Primary: HuggingFace Inference API
 * Fallback: Self-hosted on Render.com
 *
 * Supported Languages:
 * - English (en)
 * - Hindi (hi)
 * - Assamese (as) - Critical for ATAL AI
 */

import { ttsService, type TTSLanguage } from '@/lib/ai/services/tts-service';
import { getCurrentUser } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limiter-distributed';
import { RATE_LIMITS } from '@/lib/constants/rate-limits';
import { AI_CONTENT_LIMITS } from '@/lib/constants/validation-limits';
import { authLogger } from '@/lib/auth-logger';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limit check
    const isAllowed = await checkRateLimit(`tts:${user.id}`, RATE_LIMITS.tts);
    if (!isAllowed) {
      return new Response('Rate limit exceeded. Please wait before making another TTS request.', {
        status: 429,
      });
    }

    // Parse request body
    const body = await request.json();
    const { text, language = 'en', emotion } = body as {
      text: string;
      language?: TTSLanguage;
      emotion?: 'neutral' | 'friendly' | 'encouraging' | 'calm';
    };

    // Validate input
    if (!text || typeof text !== 'string') {
      return new Response('Text is required', { status: 400 });
    }

    if (text.length > AI_CONTENT_LIMITS.ttsMaxLength) {
      return new Response(`Text is too long (max ${AI_CONTENT_LIMITS.ttsMaxLength} characters)`, { status: 400 });
    }

    // Validate language
    const supportedLanguages: TTSLanguage[] = ['en', 'hi', 'as'];
    if (!supportedLanguages.includes(language)) {
      return new Response(`Unsupported language. Supported: ${supportedLanguages.join(', ')}`, {
        status: 400,
      });
    }

    // Synthesize speech
    const audioBuffer = await ttsService.synthesize(text, language, { emotion });

    // Return audio as WAV
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Length': String(audioBuffer.byteLength),
      },
    });
  } catch (error) {
    authLogger.error('[TTS API] Error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('model is loading')) {
        return new Response('TTS model is loading. Please try again in a few seconds.', {
          status: 503,
        });
      }
    }

    return new Response('TTS generation failed', { status: 500 });
  }
}

/**
 * Health check for TTS service
 */
export async function GET() {
  try {
    const status = await ttsService.isAvailable();

    return Response.json({
      available: status.available,
      provider: status.provider,
      supportedLanguages: ttsService.getSupportedLanguages(),
      error: status.error,
    });
  } catch (error) {
    authLogger.error('[TTS API] Health check error:', error);
    return Response.json(
      {
        available: false,
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}
