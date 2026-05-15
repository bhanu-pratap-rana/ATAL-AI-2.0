/**
 * Tutor visualization API route.
 *
 * Generates a study-aid image for a concept the student is exploring
 * with the AI tutor. The image renders in EN diagram style by default;
 * for HI/AS we ask Imagen to include the concept word as a label in
 * the target script so the image and the tutor's text share a
 * language. Imagen 3 handles Devanagari reasonably; Assamese script
 * is hit-or-miss but the diagram itself is still useful.
 *
 * Failover chain (Vertex Imagen 3 → FLUX → Pollinations) is inherited
 * from generateImageWithFallback() so this endpoint keeps working
 * even if the primary image provider goes dark.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImageWithFallback, type ImagenParams } from "@/lib/ai/services/imagen-service";
import { getCurrentUser } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { authLogger } from "@/lib/auth-logger";

export const maxDuration = 30;

const VisualizeRequestSchema = z.object({
  // The concept the student is asking about. We extract from the user
  // query rather than from the AI's full response — keeps the prompt
  // small and avoids leaking Socratic-method dialog into the image.
  concept: z.string().min(2).max(200),
  language: z.enum(["en", "hi", "as"]).default("en"),
});

// Language labels we ask Imagen to include in the image. EN stays in
// English; HI uses Devanagari; AS uses Assamese script. These are
// woven into the image prompt rather than overlaid as a separate layer
// because Imagen 3 produces more coherent diagrams when the label is
// part of the original prompt.
function scriptHintForLanguage(language: "en" | "hi" | "as"): string {
  switch (language) {
    case "hi":
      return "Label the diagram in Hindi (Devanagari script).";
    case "as":
      return "Label the diagram in Assamese script. If Assamese is not available, use Bengali script.";
    default:
      return "Label the diagram in clear English.";
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 },
      );
    }

    const allowed = await checkRateLimit(
      `tutor-visualize:${user.id}`,
      RATE_LIMITS.imageGeneration,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many image requests. Wait a moment and try again." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = VisualizeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const { concept, language } = parsed.data;

    // Compose a study-aid prompt. We always render the diagram itself
    // in English because Imagen 3 produces clearer compositions that
    // way; the LABEL is in the target language so the image speaks the
    // student's language. For Assamese we ask explicitly for Assamese
    // script with a Bengali-script fallback (Imagen has stronger
    // Bengali than Assamese support).
    const imagenParams: ImagenParams = {
      prompt: `Educational diagram for a 6th-8th grade student in rural India learning about: ${concept}. Style: clean, friendly, cartoon-illustrated, bright primary colors, simple shapes, no clutter. Avoid photorealism. ${scriptHintForLanguage(language)} The diagram should help a child understand the concept visually.`,
      language,
      imageType: "concept",
      size: "512x512",
      style: "educational",
    };

    const result = await generateImageWithFallback(imagenParams);

    authLogger.info("[tutor/visualize] image generated", {
      concept: concept.slice(0, 60),
      language,
      cached: result.cached,
    });

    return NextResponse.json({
      imageUrl: result.url,
      cached: result.cached,
      language,
    });
  } catch (err) {
    authLogger.error(
      "[tutor/visualize] generation failed",
      err instanceof Error ? err : { error: String(err) },
    );
    return NextResponse.json(
      { error: "Image generation unavailable. The text answer above is complete." },
      { status: 503 },
    );
  }
}
