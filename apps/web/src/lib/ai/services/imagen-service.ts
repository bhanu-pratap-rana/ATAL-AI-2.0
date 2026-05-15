/**
 * Imagen 3 Image Generation Service
 *
 * @experimental This service is experimental and requires proper GCP setup.
 * Ensure Vertex AI is enabled and OAuth2 authentication is configured.
 *
 * Uses Google Vertex AI Imagen 3 for educational image generation.
 * Images are pre-generated and cached for instant loading.
 *
 * Imagen 3 Features:
 * - High quality educational diagrams
 * - Culturally appropriate content
 * - Fast generation (~5-10 seconds)
 *
 * IMPORTANT: Imagen 3 requires Vertex AI with OAuth2 authentication.
 * API keys are NOT supported for Imagen models.
 *
 * Required Environment Variables:
 * - GOOGLE_CLOUD_PROJECT: GCP project ID
 * - GOOGLE_CLOUD_REGION: Region (default: us-central1)
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON (or use ADC)
 *
 * Strategy: Pre-generate during build/deployment, cache in Supabase Storage
 */

import { createClient } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import type { SupportedLanguage } from "@/types/common";

export interface ImagenParams {
  prompt: string;
  language: SupportedLanguage;
  imageType: "diagram" | "concept" | "example" | "cultural" | "icon";
  size?: "256x256" | "512x512" | "1024x1024";
  style?: "educational" | "cartoon" | "realistic";
}

export interface ImagenResult {
  imageId: string;
  url: string;
  thumbnailUrl?: string;
  cached: boolean;
}

// Cache key format
function getCacheKey(params: ImagenParams): string {
  const hash = Buffer.from(
    `${params.prompt}-${params.language}-${params.imageType}-${params.size || "512x512"}`
  ).toString("base64url").slice(0, 32);
  return `lesson-images/${params.imageType}/${hash}.png`;
}

/**
 * Check if image already exists in cache.
 * Uses public URL (bucket is public) to avoid signed URL expiry issues.
 * Verifies file existence via .list() before returning URL.
 */
export async function getImageFromCache(
  params: ImagenParams
): Promise<ImagenResult | null> {
  try {
    const supabase = await createClient();
    const cacheKey = getCacheKey(params);

    // Extract folder and filename from cache key (e.g., "lesson-images/concept/hash.png")
    const lastSlash = cacheKey.lastIndexOf("/");
    const folder = cacheKey.substring(0, lastSlash);
    const filename = cacheKey.substring(lastSlash + 1);

    // Verify file actually exists before returning URL
    const { data: files } = await supabase.storage
      .from("lesson-assets")
      .list(folder, { limit: 1, search: filename });

    if (!files || files.length === 0) {
      return null; // File doesn't exist
    }

    // Bucket is public — use public URL (never expires)
    const { data } = supabase.storage
      .from("lesson-assets")
      .getPublicUrl(cacheKey);

    if (data?.publicUrl) {
      return {
        imageId: cacheKey,
        url: data.publicUrl,
        cached: true,
      };
    }
  } catch {
    // Not cached or storage error
  }
  return null;
}

/**
 * Get OAuth2 access token for Vertex AI
 * Uses Application Default Credentials (ADC) or service account
 */
async function getVertexAccessToken(): Promise<string> {
  // Try to import google-auth-library dynamically
  // This allows the service to work even if the library isn't installed
  try {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error("Failed to get access token from GoogleAuth");
    }

    return tokenResponse.token;
  } catch (importError) {
    // google-auth-library not installed - try alternative method
    authLogger.warn(
      "[Imagen] google-auth-library not available, trying metadata server",
      importError instanceof Error ? { error: importError.message } : {}
    );

    // Try GCE metadata server (works when running on Google Cloud)
    try {
      const metadataResponse = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        {
          headers: { "Metadata-Flavor": "Google" },
        }
      );

      if (metadataResponse.ok) {
        const tokenData = await metadataResponse.json();
        return tokenData.access_token;
      }
    } catch {
      // Not running on GCE
    }

    throw new Error(
      "Cannot authenticate with Vertex AI. Install google-auth-library or run on Google Cloud with ADC."
    );
  }
}

/**
 * Generate image using Vertex AI Imagen 3
 *
 * IMPORTANT: Imagen 3 requires Vertex AI with OAuth2 authentication.
 * API keys are NOT supported - this is documented by Google.
 *
 * Required setup:
 * 1. Set GOOGLE_CLOUD_PROJECT environment variable
 * 2. Set GOOGLE_CLOUD_REGION (default: us-central1)
 * 3. Configure authentication via one of:
 *    - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
 *    - Application Default Credentials (ADC) via `gcloud auth application-default login`
 *    - Running on GCP with appropriate service account attached
 */
export async function generateImage(
  params: ImagenParams
): Promise<ImagenResult> {
  // Check cache first
  const cached = await getImageFromCache(params);
  if (cached) {
    return cached;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const region = process.env.GOOGLE_CLOUD_REGION || "us-central1";

  if (!projectId) {
    authLogger.error("[Imagen] GOOGLE_CLOUD_PROJECT environment variable is required");
    throw new Error(
      "GOOGLE_CLOUD_PROJECT is required for Vertex AI Imagen. " +
      "API keys are not supported for Imagen models."
    );
  }

  try {
    // Get OAuth2 access token
    const accessToken = await getVertexAccessToken();

    // Build enhanced prompt
    const enhancedPrompt = buildImagePrompt(params);

    // Call Vertex AI Imagen 3 API
    // Endpoint format: https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:predict
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagen-3.0-generate-001:predict`;

    authLogger.debug("[Imagen] Calling Vertex AI", {
      endpoint,
      promptLength: enhancedPrompt.length,
    });

    const MAX_RETRIES = 2;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: enhancedPrompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: params.size === "256x256" ? "1:1" : "16:9",
            safetyFilterLevel: "block_some",
            personGeneration: "dont_allow",
          },
        }),
      });

      // Retry on 429 (rate limit) with exponential backoff
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const backoffMs = 1000 * Math.pow(2, attempt); // 1s, 2s
        authLogger.warn("[Imagen] Rate limited (429), retrying", {
          attempt: attempt + 1,
          backoffMs,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      break;
    }

    if (!response!.ok) {
      const errorBody = await response!.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.error?.message || errorBody;
      } catch {
        errorMessage = errorBody;
      }

      authLogger.error("[Imagen] Vertex AI error", {
        status: response!.status,
        statusText: response!.statusText,
        error: errorMessage,
      });

      throw new Error(`Vertex AI Imagen error (${response!.status}): ${errorMessage}`);
    }

    const result = await response!.json();

    // Vertex AI response format: predictions[0].bytesBase64Encoded
    const imageData = result.predictions?.[0]?.bytesBase64Encoded;

    if (!imageData) {
      // Distinguish safety filter (empty/null predictions) from unexpected errors
      const isPredictionsEmpty = Array.isArray(result.predictions) && result.predictions.length === 0;
      const isPredictionsNull = result.predictions === null || result.predictions === undefined;
      const filteredReason = result.filteredReason || result.blockReason;

      if (filteredReason || isPredictionsEmpty || isPredictionsNull) {
        authLogger.warn("[Imagen] Image blocked by safety filter", {
          reason: filteredReason || "empty_predictions",
          responseKeys: Object.keys(result),
        });
        throw new Error(`Image blocked by safety filter: ${filteredReason || "content policy"}`);
      }

      authLogger.error("[Imagen] Unexpected response structure", {
        hasResult: !!result,
        hasPredictions: !!result.predictions,
        predictionKeys: result.predictions?.[0] ? Object.keys(result.predictions[0]) : [],
        responseKeys: Object.keys(result),
      });
      throw new Error("No image data in Vertex AI response");
    }

    // Create base64 data URL as fallback
    const base64Url = `data:image/png;base64,${imageData}`;
    const cacheKey = getCacheKey(params);

    // Try to save to Supabase Storage (optional - may fail if bucket doesn't exist)
    let publicUrl: string | null = null;
    try {
      const supabase = await createClient();
      const imageBuffer = Buffer.from(imageData, "base64");

      // SEC-13 FIX: Reject images over 10MB to prevent storage abuse
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
      if (imageBuffer.length > MAX_IMAGE_SIZE) {
        authLogger.warn("[Imagen] Image exceeds size limit", {
          size: imageBuffer.length,
          maxSize: MAX_IMAGE_SIZE,
        });
        throw new Error("Generated image exceeds maximum allowed size");
      }

      const { error: uploadError } = await supabase.storage
        .from("lesson-assets")
        .upload(cacheKey, imageBuffer, {
          contentType: "image/png",
          cacheControl: "31536000", // 1 year cache
          upsert: true,
        });

      if (uploadError) {
        authLogger.warn("[Imagen] Upload failed (using base64 fallback)", {
          error: uploadError.message,
        });
      } else {
        // Bucket is public — use public URL (never expires)
        const { data: urlData } = supabase.storage
          .from("lesson-assets")
          .getPublicUrl(cacheKey);
        publicUrl = urlData?.publicUrl || null;
      }
    } catch (storageError) {
      // Storage completely unavailable - use base64 fallback
      authLogger.warn("[Imagen] Storage unavailable, using base64 data URL", {
        error: storageError instanceof Error ? storageError.message : String(storageError),
      });
    }

    authLogger.success("[Imagen] Image generated successfully", {
      cacheKey,
      cached: false,
      usingBase64Fallback: !publicUrl,
    });

    return {
      imageId: cacheKey,
      url: publicUrl || base64Url,
      cached: false,
    };
  } catch (error) {
    authLogger.error(
      "[Imagen] Generation failed",
      error instanceof Error ? error : { error: String(error) }
    );
    throw error;
  }
}

/**
 * Translate Hindi/Assamese prompt concepts to English for Imagen
 * Imagen works best with English prompts
 */
function translatePromptToEnglish(prompt: string, language: SupportedLanguage): string {
  // If already English or mostly English, return as-is
  if (language === "en") {
    return prompt;
  }

  // Common Hindi/Assamese terms to English mappings for computer/tech concepts
  const translations: Record<string, string> = {
    // Hindi terms
    "कंप्यूटर": "computer",
    "इनपुट": "input",
    "आउटपुट": "output",
    "प्रोसेसिंग": "processing",
    "स्टोरेज": "storage",
    "कीबोर्ड": "keyboard",
    "माउस": "mouse",
    "मॉनिटर": "monitor",
    "स्क्रीन": "screen",
    "फ़ाइल": "file",
    "फ़ोल्डर": "folder",
    "सेव": "save",
    "डिलीट": "delete",
    "कॉपी": "copy",
    "पेस्ट": "paste",
    "इंटरनेट": "internet",
    "वेबसाइट": "website",
    "ब्राउज़र": "browser",
    "ईमेल": "email",
    "पासवर्ड": "password",
    "चित्र": "image",
    "तीर": "arrow",
    "ढाँचा": "structure",
    "आइकन": "icon",
    "दिमाग": "brain",
    "अलमारी": "cabinet/cupboard",
    // Assamese terms
    "কম্পিউটাৰ": "computer",
    "ইনপুট": "input",
    "আউটপুট": "output",
    "প্ৰচেছিং": "processing",
    "ষ্ট'ৰেজ": "storage",
  };

  let englishPrompt = prompt;

  // Replace known terms
  for (const [term, translation] of Object.entries(translations)) {
    englishPrompt = englishPrompt.replaceAll(term, translation);
  }

  // If prompt is still mostly non-English, create a generic educational prompt
  // based on the context
  const hasNonLatinChars = /[^\x00-\x7F]/.test(englishPrompt);
  if (hasNonLatinChars) {
    // Extract any English words that might be in the prompt
    const englishWords = englishPrompt.match(/[a-zA-Z]+/g) || [];

    // Build a basic educational diagram prompt
    const contextKeywords = ["computer", "input", "output", "processing", "storage", "keyboard", "monitor", "mouse"];
    const relevantKeywords = contextKeywords.filter(k =>
      englishWords.some(w => w.toLowerCase().includes(k)) || prompt.toLowerCase().includes(k)
    );

    if (relevantKeywords.length > 0) {
      return `Educational diagram showing ${relevantKeywords.join(", ")} concepts. Simple illustration with clear visual elements. Indian village setting context. Warm, friendly illustration style.`;
    }

    // Fallback generic educational prompt
    return `Simple educational illustration about computers and digital technology. Clear, clean diagram suitable for first-time learners. Indian cultural context. No text in image.`;
  }

  return englishPrompt;
}

/**
 * Build culturally appropriate educational prompt
 */
function buildImagePrompt(params: ImagenParams): string {
  const styleGuide: Record<string, string> = {
    educational: "Clean, simple, educational illustration style. Clear labels. High contrast colors.",
    cartoon: "Friendly cartoon style, suitable for children, bright colors, simple shapes.",
    realistic: "Realistic digital illustration, detailed but not photorealistic.",
  };

  const typeGuide: Record<string, string> = {
    diagram: "Technical diagram with labeled parts. White background. Clear arrows and annotations.",
    concept: "Visual metaphor or concept illustration. Abstract but understandable.",
    example: "Real-world example illustration. Practical, relatable context.",
    cultural: "Illustration featuring Assamese/Indian cultural elements. Respectful, authentic.",
    icon: "Simple icon or symbol. Minimalist. Clear meaning.",
  };

  // CRITICAL: Translate non-English prompts to English for Imagen
  const translatedPrompt = translatePromptToEnglish(params.prompt, params.language);

  const culturalContext = params.language === "as" || params.language === "hi"
    ? "Include Indian/Assamese cultural elements where appropriate (traditional patterns, local context, familiar objects like chai, rice fields, village scenes)."
    : "";

  return `${translatedPrompt}

Style: ${styleGuide[params.style || "educational"]}
Type: ${typeGuide[params.imageType]}
${culturalContext}

Requirements:
- No text in the image (text will be added separately)
- Safe for educational use
- Clear, unambiguous visual communication
- Suitable for digital literacy learners in rural India`;
}

/**
 * Pre-defined image prompts for topics
 */
export const TOPIC_IMAGE_PROMPTS: Record<string, ImagenParams> = {
  // M1: Computer Basics
  "T1.1": {
    prompt: "Four connected boxes showing Input (keyboard), Process (CPU chip with gears), Storage (hard drive), Output (monitor with display). Arrows connecting them in sequence.",
    language: "en",
    imageType: "diagram",
  },
  "T1.2": {
    prompt: "Labeled diagram of desktop computer parts: monitor screen, keyboard, mouse, CPU tower, speakers. Each part clearly labeled with lines pointing to it.",
    language: "en",
    imageType: "diagram",
  },
  "T2.1": {
    prompt: "Split comparison: Left side shows RAM as a desk workspace (temporary, fast), Right side shows Storage as a filing cabinet (permanent, slower). Visual metaphor.",
    language: "en",
    imageType: "concept",
  },
  "T2.2": {
    prompt: "Illustration of Ctrl+S keyboard shortcut with glowing save icon. Clock showing regular intervals. Lightning bolt representing power cut protection.",
    language: "en",
    imageType: "concept",
  },
  "T2.3": {
    prompt: "3-2-1 backup rule visualization: 3 copies shown as documents, 2 different media types (USB drive and cloud), 1 offsite location (different building).",
    language: "en",
    imageType: "diagram",
  },
  // M3: Internet Basics
  "T9.1": {
    prompt: "Global network visualization: Multiple computers and phones connected by glowing lines across a stylized world map. Simple, not overwhelming.",
    language: "en",
    imageType: "concept",
  },
  "T10.1": {
    prompt: "Browser address bar showing HTTPS with green padlock. Arrow pointing to padlock with checkmark. Comparison with unsafe HTTP (no padlock, red X).",
    language: "en",
    imageType: "diagram",
  },
  "T10.2": {
    prompt: "Warning signs of online scam: Too-good-to-be-true offer, urgent pressure, spelling errors, suspicious sender. Red warning flags on each.",
    language: "en",
    imageType: "concept",
  },
};

/**
 * Get or generate image for a topic
 */
export async function getTopicImage(
  topicId: string,
  language: SupportedLanguage = "en"
): Promise<ImagenResult | null> {
  const basePrompt = TOPIC_IMAGE_PROMPTS[topicId];
  if (!basePrompt) {
    return null;
  }

  const params: ImagenParams = {
    ...basePrompt,
    language,
  };

  return generateImageWithFallback(params);
}

// ===========================================================================
// FALLBACK CHAIN — runtime auto-switch when Vertex AI Imagen 3 errors out.
//
//   Tier 1: Vertex AI Imagen 3                  (paid, current primary)
//   Tier 2: FLUX.1-schnell on HuggingFace        (FREE rate-limited, needs HF key)
//   Tier 3: Pollinations.ai                      (FREE, no key, last resort)
//
// Result of each fallback is uploaded to Supabase Storage with the same
// cache key as the primary, so subsequent calls for the same prompt hit
// the cache regardless of which provider originally rendered it.
// ===========================================================================

const HF_FLUX_ENDPOINT =
  "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";
const POLLINATIONS_ENDPOINT = "https://image.pollinations.ai/prompt";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB upload guard (matches Vertex path)

/**
 * Upload image bytes to Supabase Storage under the cache key and return
 * the public URL. Falls back to base64 inline if storage is unavailable.
 */
async function persistImageBuffer(
  buffer: Buffer,
  params: ImagenParams,
  source: "flux" | "pollinations",
): Promise<ImagenResult> {
  const cacheKey = getCacheKey(params);
  const base64Url = `data:image/png;base64,${buffer.toString("base64")}`;

  if (buffer.length > MAX_IMAGE_SIZE) {
    authLogger.warn("[Imagen/fallback] Image exceeds size limit, returning base64", {
      source,
      size: buffer.length,
    });
    return { imageId: cacheKey, url: base64Url, cached: false };
  }

  try {
    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from("lesson-assets")
      .upload(cacheKey, buffer, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      authLogger.warn("[Imagen/fallback] Upload failed, using base64", {
        source,
        error: uploadError.message,
      });
      return { imageId: cacheKey, url: base64Url, cached: false };
    }

    const { data: urlData } = supabase.storage
      .from("lesson-assets")
      .getPublicUrl(cacheKey);
    return {
      imageId: cacheKey,
      url: urlData?.publicUrl || base64Url,
      cached: false,
    };
  } catch (storageErr) {
    authLogger.warn("[Imagen/fallback] Storage unavailable, using base64", {
      source,
      error: storageErr instanceof Error ? storageErr.message : String(storageErr),
    });
    return { imageId: cacheKey, url: base64Url, cached: false };
  }
}

/**
 * FLUX.1-schnell via HuggingFace Inference. FREE tier, rate-limited
 * (~30 RPM, ~300 images/day). Requires HUGGINGFACE_API_KEY in env.
 */
async function generateImageWithFlux(
  params: ImagenParams,
): Promise<ImagenResult> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY not configured");
  }

  const enhancedPrompt = buildImagePrompt(params);
  const response = await fetch(HF_FLUX_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: enhancedPrompt,
      parameters: { width: 512, height: 512 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HF FLUX returned ${response.status}: ${text.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  authLogger.info("[Imagen/fallback] FLUX rendered image", { bytes: buffer.length });
  return persistImageBuffer(buffer, params, "flux");
}

/**
 * Pollinations.ai — fully free, no API key. Serves images on-demand
 * from a public URL. We still proxy the bytes through our cache so the
 * lesson keeps working if Pollinations later goes dark.
 */
async function generateImageWithPollinations(
  params: ImagenParams,
): Promise<ImagenResult> {
  const enhancedPrompt = buildImagePrompt(params);
  const encoded = encodeURIComponent(enhancedPrompt);
  const url = `${POLLINATIONS_ENDPOINT}/${encoded}?width=512&height=512&nologo=true&safe=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations returned ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  authLogger.info("[Imagen/fallback] Pollinations rendered image", { bytes: buffer.length });
  return persistImageBuffer(buffer, params, "pollinations");
}

/**
 * Public entry point — try Vertex AI Imagen 3 first, fall back through
 * the free providers on error. Always returns an ImagenResult unless
 * every layer (including Pollinations) fails, in which case throws.
 *
 * Called by the /api/imagen/generate route and by getTopicImage.
 */
export async function generateImageWithFallback(
  params: ImagenParams,
): Promise<ImagenResult> {
  // The primary generateImage() already short-circuits on cache hits
  // for the same prompt+language+type, so we don't duplicate the check.
  try {
    return await generateImage(params);
  } catch (primaryErr) {
    authLogger.warn(
      "[Imagen/fallback] Vertex AI failed, trying FLUX via HuggingFace",
      {
        error:
          primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
      },
    );
  }

  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      return await generateImageWithFlux(params);
    } catch (fluxErr) {
      authLogger.warn(
        "[Imagen/fallback] FLUX failed, trying Pollinations.ai",
        { error: fluxErr instanceof Error ? fluxErr.message : String(fluxErr) },
      );
    }
  }

  // Pollinations needs no auth — always try it last.
  return generateImageWithPollinations(params);
}
