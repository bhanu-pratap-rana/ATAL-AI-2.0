/**
 * Speech-to-Text API route.
 *
 * Used as a fallback when the browser does not support the Web Speech
 * API (Firefox, older Safari, in-app WebViews). The client records
 * audio via MediaRecorder, POSTs the blob here, and we return text.
 *
 * Auth + rate-limit gated like every other AI surface. The actual
 * provider failover (Sarvam → OpenAI → HuggingFace) lives in the
 * stt-service module so it's testable independently.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { authLogger } from "@/lib/auth-logger";
import { transcribeAudio, type STTLanguage } from "@/lib/ai/services/stt-service";

export const maxDuration = 30;

const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8 MB hard cap on a clip
const ALLOWED_LANGUAGES = new Set<STTLanguage>(["en", "hi", "as"]);

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 },
      );
    }

    const allowed = await checkRateLimit(`stt:${user.id}`, RATE_LIMITS.stt);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many voice requests. Wait a moment and try again." },
        { status: 429 },
      );
    }

    const form = await request.formData();
    const audio = form.get("audio");
    const languageRaw = form.get("language");

    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json(
        { error: "audio file is required (form field 'audio')" },
        { status: 400 },
      );
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "audio clip too large (max 8 MB)" },
        { status: 413 },
      );
    }

    const language: STTLanguage =
      typeof languageRaw === "string" && ALLOWED_LANGUAGES.has(languageRaw as STTLanguage)
        ? (languageRaw as STTLanguage)
        : "en";

    const buffer = Buffer.from(await audio.arrayBuffer());

    const result = await transcribeAudio(buffer, language);
    return NextResponse.json(result);
  } catch (err) {
    authLogger.error(
      "[/api/voice/stt] transcription failed",
      err instanceof Error ? err : { error: String(err) },
    );
    const message = err instanceof Error ? err.message : "transcription failed";
    const isUnavailable = message.toLowerCase().includes("unavailable");
    return NextResponse.json(
      { error: message },
      { status: isUnavailable ? 503 : 500 },
    );
  }
}
