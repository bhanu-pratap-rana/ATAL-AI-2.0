/**
 * Rate Limiting Configuration Constants
 *
 * Centralized rate limit configurations for all features.
 * Uses token bucket algorithm with refill rates.
 *
 * Rule.md Compliance:
 * - Single source of truth for rate limiting
 * - Easy to modify and test
 * - Type-safe
 *
 * Token Bucket Algorithm:
 * - maxTokens: Maximum requests allowed in bucket
 * - refillRate: Tokens added per second (e.g., 30/3600 = 30 per hour)
 * - refillInterval: How often to check refill (milliseconds)
 */

/**
 * Rate limit configuration type
 */
export interface RateLimitConfig {
  /** Maximum tokens in bucket */
  maxTokens: number;
  /** Tokens per second (e.g., 30/3600 = 30 per hour) */
  refillRate: number;
  /** Refill check interval in milliseconds */
  refillInterval: number;
  /**
   * Behaviour when the distributed backend (Redis) is unavailable.
   *  - "closed": reject the request (secure default for auth/PIN/OTP).
   *  - "open-local": fall back to the per-instance in-memory bucket.
   * Default: "open-local" — keeps non-security endpoints serving traffic.
   */
  failMode?: "closed" | "open-local";
}

/**
 * Time constants for readability
 */
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/**
 * Search rate limits
 */
export const RATE_LIMITS = {
  /** School search - 30 requests per hour */
  schoolSearch: {
    maxTokens: 30,
    refillRate: 30 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Student search - 30 requests per hour */
  studentSearch: {
    maxTokens: 30,
    refillRate: 30 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Teacher verification - 5 attempts per hour (stricter for security) */
  teacherVerification: {
    maxTokens: 5,
    refillRate: 5 / SECONDS_PER_HOUR,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /** OTP requests - 5 per hour */
  otpRequest: {
    maxTokens: 5,
    refillRate: 5 / SECONDS_PER_HOUR,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /** Password reset - 3 per hour (very strict for security) */
  passwordReset: {
    maxTokens: 3,
    refillRate: 3 / SECONDS_PER_HOUR,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /** IP-based limiting - 10 per minute */
  ipBased: {
    maxTokens: 10,
    refillRate: 10 / SECONDS_PER_MINUTE,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /** Admin operations - 10 per minute */
  adminOperations: {
    maxTokens: 10,
    refillRate: 10 / SECONDS_PER_MINUTE,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /** Class join PIN attempts - 5 per hour (strict to prevent brute force) */
  classJoinAttempts: {
    maxTokens: 5,
    refillRate: 5 / SECONDS_PER_HOUR,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /** AI tutor chat - 30 requests per hour */
  aiTutorChat: {
    maxTokens: 30,
    refillRate: 30 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Text-to-Speech - 50 requests per hour */
  tts: {
    maxTokens: 50,
    refillRate: 50 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Speech-to-Text - 60 requests per hour (a 30s clip per request is plenty for tutor dialogue) */
  stt: {
    maxTokens: 60,
    refillRate: 60 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** TTS Health Check - 30 per minute (less strict than synthesis) */
  ttsHealth: {
    maxTokens: 30,
    refillRate: 30 / SECONDS_PER_MINUTE,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** PIN rotation - 10 per hour (prevent abuse of PIN generation) */
  pinRotation: {
    maxTokens: 10,
    refillRate: 10 / SECONDS_PER_HOUR,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /** Assessment submission - 20 per hour (prevent rapid retakes) */
  assessmentSubmission: {
    maxTokens: 20,
    refillRate: 20 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Dashboard stats - 60 per hour (generous for normal usage) */
  dashboardStats: {
    maxTokens: 60,
    refillRate: 60 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Admin metrics - 30 per hour (prevent resource abuse) */
  adminMetrics: {
    maxTokens: 30,
    refillRate: 30 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Module units - 60 per hour (generous for normal browsing) */
  moduleUnits: {
    maxTokens: 60,
    refillRate: 60 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Email enumeration - 20 per hour (prevent email discovery attacks) */
  emailEnumeration: {
    maxTokens: 20,
    refillRate: 20 / SECONDS_PER_HOUR,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /** Lesson generation - 20 per 10 minutes (prevent Gemini API cost exploitation) */
  lessonGeneration: {
    maxTokens: 20,
    refillRate: 20 / (10 * SECONDS_PER_MINUTE),
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Image generation - 10 per hour (prevent Imagen API cost explosion) */
  imageGeneration: {
    maxTokens: 10,
    refillRate: 10 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Gamification actions - 30 per hour (prevent point farming) */
  gamification: {
    maxTokens: 30,
    refillRate: 30 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Lesson completion - 20 per hour (prevent rapid replays) */
  lessonCompletion: {
    maxTokens: 20,
    refillRate: 20 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Progress sync - 60 per hour (generous for normal offline sync) */
  progressSync: {
    maxTokens: 60,
    refillRate: 60 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,

  /** Account deletion - 3 per hour (very strict, destructive operation) */
  accountDeletion: {
    maxTokens: 3,
    refillRate: 3 / SECONDS_PER_HOUR,
    refillInterval: 1000,
    failMode: "closed",
  } as RateLimitConfig,

  /**
   * Adaptive-question fetch — 6 per hour per student. The handler pulls up
   * to 500 IRT items including correct_answer + question_text via service
   * role; without a cap a logged-in student could mass-extract the item
   * bank by calling the action repeatedly. A real assessment session
   * fetches this once at start, so 6/hour gives generous headroom for
   * legitimate retries across languages.
   */
  adaptiveAssessmentFetch: {
    maxTokens: 6,
    refillRate: 6 / SECONDS_PER_HOUR,
    refillInterval: 1000,
  } as RateLimitConfig,
} as const;
