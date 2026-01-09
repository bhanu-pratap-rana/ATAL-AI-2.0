/**
 * AI Service - Multi-Provider Support
 *
 * Development: Groq (llama-3.3-70b-versatile) or Ollama (cogito:14b)
 * Production: OpenAI (to be configured)
 *
 * Features:
 * - AI Tutor for personalized learning assistance
 * - Essay feedback and writing analysis
 * - Practice problem generation
 * - Study material summarization
 */

import { authLogger } from "./auth-logger";
import { AI_DEFAULTS, AI_FEATURES, AI_PROVIDERS } from "./constants/ai-config";
import type { AIProviderKey } from "./constants/ai-config";
import { getLanguageLabelForAI } from "./form-utils";

type AIProvider = AIProviderKey;

interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
}

interface TutorContext {
  subject?: string;
  topic?: string;
  studentLevel?: "beginner" | "intermediate" | "advanced";
  language?: "en" | "hi" | "as";
  previousMessages?: ChatMessage[];
}

interface EssayFeedback {
  overallScore: number;
  grammar: { score: number; issues: string[] };
  clarity: { score: number; suggestions: string[] };
  structure: { score: number; feedback: string };
  content: { score: number; feedback: string };
  improvements: string[];
}

interface PracticeQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
}

/**
 * Get AI configuration from environment
 * Uses centralized provider configurations from constants/ai-config.ts
 */
function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || "groq") as AIProvider;

  switch (provider) {
    case "groq":
      return {
        provider: "groq",
        apiKey: process.env.GROQ_API_KEY,
        baseUrl: AI_PROVIDERS.groq.baseUrl,
        model: process.env.GROQ_MODEL || AI_PROVIDERS.groq.defaultModel,
      };
    case "ollama":
      return {
        provider: "ollama",
        baseUrl: process.env.OLLAMA_BASE_URL || AI_PROVIDERS.ollama.baseUrl,
        model: process.env.OLLAMA_MODEL || AI_PROVIDERS.ollama.defaultModel,
      };
    case "openai":
      return {
        provider: "openai",
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: AI_PROVIDERS.openai.baseUrl,
        model: process.env.OPENAI_MODEL || AI_PROVIDERS.openai.defaultModel,
      };
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Make API call to AI provider
 */
async function callAI(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<AIResponse> {
  const config = getAIConfig();
  const {
    temperature = AI_DEFAULTS.temperature,
    maxTokens = AI_DEFAULTS.maxTokens,
  } = options || {};

  try {
    if (config.provider === "ollama") {
      // Ollama uses different API format
      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          options: { temperature, num_predict: maxTokens },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.message?.content || "",
        provider: config.provider,
        model: config.model,
      };
    }

    // Groq and OpenAI use OpenAI-compatible API
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || response.statusText);
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || "",
      provider: config.provider,
      model: config.model,
      tokensUsed: data.usage?.total_tokens,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    authLogger.error(
      `[AIService] Error with provider ${config.provider}`,
      error,
      { provider: config.provider },
    );
    return {
      success: false,
      error: errorMessage,
      provider: config.provider,
      model: config.model,
    };
  }
}

/**
 * AI Tutor - Get help with learning topics
 */
export async function askTutor(
  question: string,
  context?: TutorContext,
): Promise<AIResponse> {
  const languageInstructions = {
    en: "Respond in English.",
    hi: "Respond in Hindi (हिंदी में जवाब दें).",
    as: "Respond in Assamese (অসমীয়াত উত্তৰ দিয়ক).",
  };

  const levelInstructions = {
    beginner: "Use simple language and basic explanations. Avoid jargon.",
    intermediate: "Use moderate complexity. Explain technical terms when used.",
    advanced: "Use technical language and provide in-depth explanations.",
  };

  const systemPrompt = `You are ATAL AI Tutor, a helpful and patient educational assistant for students in rural Northeast India.

Your role:
- Help students understand digital literacy concepts
- Provide clear, step-by-step explanations
- Use real-world examples relevant to rural India
- Be encouraging and supportive
- Adapt to the student's level

${context?.subject ? `Subject focus: ${context.subject}` : ""}
${context?.topic ? `Current topic: ${context.topic}` : ""}
${levelInstructions[context?.studentLevel || "beginner"]}
${languageInstructions[context?.language || "en"]}

Keep responses concise but helpful. Use bullet points for lists. Include practical examples when possible.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(context?.previousMessages || []),
    { role: "user", content: question },
  ];

  return callAI(messages, AI_FEATURES.tutor);
}

/**
 * Essay Feedback - Analyze and provide feedback on student writing
 */
export async function getEssayFeedback(
  essay: string,
  topic?: string,
  language: "en" | "hi" | "as" = "en",
): Promise<AIResponse & { feedback?: EssayFeedback }> {
  const systemPrompt = `You are an essay reviewer for students learning digital literacy.

Analyze the essay and provide feedback in JSON format:
{
  "overallScore": <1-10>,
  "grammar": { "score": <1-10>, "issues": ["issue1", "issue2"] },
  "clarity": { "score": <1-10>, "suggestions": ["suggestion1"] },
  "structure": { "score": <1-10>, "feedback": "feedback text" },
  "content": { "score": <1-10>, "feedback": "feedback text" },
  "improvements": ["improvement1", "improvement2", "improvement3"]
}

Be constructive and encouraging. Focus on how to improve, not just what's wrong.
${topic ? `Essay topic: ${topic}` : ""}
Essay language: ${getLanguageLabelForAI(language)}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Please review this essay:\n\n${essay}` },
  ];

  const response = await callAI(messages, AI_FEATURES.essayFeedback);

  if (response?.success && response?.content) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch =
        response.content.match(/```json\n?([\s\S]*?)\n?```/) ||
        response.content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch
        ? jsonMatch[1] || jsonMatch[0]
        : response.content;
      const feedback = JSON.parse(jsonStr) as EssayFeedback;
      return { ...response, feedback };
    } catch {
      // Return response without parsed feedback if JSON parsing fails
      return response;
    }
  }

  return response;
}

/**
 * Practice Generator - Generate practice questions on a topic
 */
export async function generatePracticeQuestions(
  topic: string,
  count: number = 5,
  difficulty: "easy" | "medium" | "hard" = "medium",
  language: "en" | "hi" | "as" = "en",
): Promise<AIResponse & { questions?: PracticeQuestion[] }> {
  const languageNames = { en: "English", hi: "Hindi", as: "Assamese" };

  const systemPrompt = `You are a quiz generator for digital literacy education in rural India.

Generate ${count} multiple-choice questions about "${topic}" at ${difficulty} difficulty level.

Output ONLY valid JSON array:
[
  {
    "id": "q1",
    "question": "Question text in ${languageNames[language]}",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "A",
    "explanation": "Brief explanation why this is correct",
    "difficulty": "${difficulty}"
  }
]

Requirements:
- Questions should be practical and relevant to rural Indian context
- Include real-world examples (farming apps, government services, local business)
- Make options plausible but distinguishable
- Explanations should be educational`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Generate ${count} ${difficulty} questions about: ${topic}`,
    },
  ];

  const response = await callAI(messages, AI_FEATURES.practiceQuestions);

  if (response?.success && response?.content) {
    try {
      const jsonMatch =
        response.content.match(/```json\n?([\s\S]*?)\n?```/) ||
        response.content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch
        ? jsonMatch[1] || jsonMatch[0]
        : response.content;
      const questions = JSON.parse(jsonStr) as PracticeQuestion[];
      return { ...response, questions };
    } catch {
      return response;
    }
  }

  return response;
}

/**
 * Study Summarizer - Create study notes from content
 */
export async function summarizeContent(
  content: string,
  format: "notes" | "flashcards" | "outline" = "notes",
  language: "en" | "hi" | "as" = "en",
): Promise<AIResponse> {
  const formatInstructions = {
    notes:
      "Create concise study notes with key points and important definitions.",
    flashcards:
      'Create flashcard pairs in format: "Q: question | A: answer" (one per line)',
    outline: "Create a hierarchical outline with main topics and subtopics.",
  };

  const languageNames = { en: "English", hi: "Hindi", as: "Assamese" };

  const systemPrompt = `You are a study assistant helping students in rural India.

${formatInstructions[format]}

Respond in ${languageNames[language]}.
Keep it simple and easy to understand.
Focus on practical applications relevant to rural contexts.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Summarize this content:\n\n${content}` },
  ];

  return callAI(messages, AI_FEATURES.summarization);
}

/**
 * Check AI service availability
 */
export async function checkAIService(): Promise<{
  available: boolean;
  provider: AIProvider;
  model: string;
  error?: string;
}> {
  const config = getAIConfig();

  try {
    const response = await callAI(
      [{ role: "user", content: 'Hello, respond with just "OK"' }],
      { maxTokens: 10 },
    );

    return {
      available: response.success,
      provider: config.provider,
      model: config.model,
      error: response.error,
    };
  } catch (error) {
    return {
      available: false,
      provider: config.provider,
      model: config.model,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export type {
  AIProvider,
  AIConfig,
  ChatMessage,
  AIResponse,
  TutorContext,
  EssayFeedback,
  PracticeQuestion,
};
