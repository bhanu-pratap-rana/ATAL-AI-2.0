/**
 * Assessment "Explain this question" endpoint.
 *
 * Closes F-PROD-AS01: previously the "I don't understand this question"
 * button silently advanced to the next item with no help. Now it calls
 * this endpoint, which asks an LLM to rephrase the question in the
 * student's language WITHOUT revealing the answer.
 *
 * Rate-limited per user. Lightweight prompt — uses generateText, not
 * streamText, because the response is short and rendered all at once.
 */

import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { getAIModel, MODEL_CONFIGS } from "@/lib/ai/providers";
import { verifyStudentAuth } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { authLogger } from "@/lib/auth-logger";

export const runtime = "nodejs";

const ExplainRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  options: z.array(z.string().max(500)).min(2).max(6).optional(),
  language: z.enum(["en", "hi", "as"]).default("en"),
  module: z.string().max(80).optional(),
});

const LANGUAGE_LABELS = {
  en: "English",
  hi: "Hindi (हिंदी)",
  as: "Assamese (অসমীয়া)",
} as const;

function buildSystemPrompt(language: "en" | "hi" | "as", module?: string): string {
  const label = LANGUAGE_LABELS[language];
  const moduleHint = module
    ? `The question is from the "${module}" module of digital literacy.`
    : "The question is from a digital literacy assessment.";
  return `You are a kind teacher helping a rural Indian school student understand an assessment question. ${moduleHint}

Rules:
1. Respond ONLY in ${label}. Match the script.
2. NEVER reveal the answer or hint at which option is correct.
3. NEVER solve the question. Just rephrase it in simpler words.
4. Explain any jargon or unfamiliar terms briefly.
5. Keep it under 80 words.
6. Tone: warm, encouraging, age-10-14 friendly.
7. End by inviting the student to try again ("Try once more!").

Return plain text only. No markdown, no headings.`;
}

function buildUserPrompt(question: string, options?: string[]): string {
  const optionsBlock = options?.length
    ? `\n\nOptions:\n${options.map((o, i) => `${String.fromCodePoint(65 + i)}. ${o}`).join("\n")}`
    : "";
  return `Question: ${question}${optionsBlock}`;
}

export async function POST(req: Request) {
  try {
    const auth = await verifyStudentAuth("explainQuestion");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const rateLimitKey = `assessment-explain:${auth.user.id}`;
    const allowed = await checkRateLimit(rateLimitKey, RATE_LIMITS.aiTutorChat);
    if (!allowed) {
      return NextResponse.json(
        { error: "Slow down — please wait before asking for another explanation." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = ExplainRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 },
      );
    }

    const { question, options, language, module } = parsed.data;

    const { text } = await generateText({
      model: getAIModel(),
      system: buildSystemPrompt(language, module),
      prompt: buildUserPrompt(question, options),
      maxOutputTokens: MODEL_CONFIGS.tutor?.maxOutputTokens ?? 256,
      temperature: 0.4,
    });

    return NextResponse.json({ explanation: text.trim() });
  } catch (error) {
    authLogger.error("[assessment/explain] failed", error);
    return NextResponse.json(
      { error: "Couldn't generate an explanation right now. Please try skipping or answering anyway." },
      { status: 500 },
    );
  }
}
