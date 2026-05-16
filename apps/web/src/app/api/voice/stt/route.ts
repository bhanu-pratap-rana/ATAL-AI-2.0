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

// MediaRecorder on Chrome/Edge/Firefox produces webm/ogg/mp4/wav; iOS Safari
// uses mp4/m4a. Restrict to this audio-only allow-list so the route can't be
// abused as a generic upload sink. Container-level check only — providers do
// their own decoding, so a malformed body still fails downstream.
const ALLOWED_AUDIO_MIME_PREFIXES = ["audio/"];
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/aac",
]);

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

    // STT expects multipart/form-data. If the client sends JSON or any
    // other Content-Type, `request.formData()` throws a TypeError that
    // would otherwise bubble up as a 500 leaking framework error text.
    // Catch it and return a clean 400 instead.
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 },
      );
    }
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

    // Browser-reported MIME — trivially spoofable but still rejects the
    // accidental/lazy case (image, archive, executable). Bytes are also
    // bounded by MAX_AUDIO_BYTES and the downstream STT provider will
    // refuse anything it can't decode.
    const mime = audio.type.toLowerCase();
    const mimeAllowed =
      ALLOWED_AUDIO_MIME_TYPES.has(mime) ||
      ALLOWED_AUDIO_MIME_PREFIXES.some((p) => mime.startsWith(p));
    if (!mimeAllowed) {
      authLogger.warn("[/api/voice/stt] rejected non-audio upload", {
        userId: user.id,
        mime: mime || "(empty)",
        size: audio.size,
      });
      return NextResponse.json(
        { error: "audio file required (got non-audio content type)" },
        { status: 415 },
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
