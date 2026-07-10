/**
 * RPC Response Validators
 *
 * Runtime validation schemas for all RPC function responses.
 * Ensures responses from database RPC calls match expected types before accessing properties.
 * Prevents runtime errors from mismatched RPC response structures.
 *
 * Each validator:
 * 1. Validates the response structure using Zod
 * 2. Provides type-safe access to response properties
 * 3. Handles both success and error cases
 */

import { z } from "zod";
import type {
  SubmitAssessmentRPCResponse,
  UpdateKnowledgeStateRPCResponse,
} from "@/types/auth";

// ============================================================================
// RPC Response Validators
// ============================================================================

/**
 * Validator for submit_assessment RPC response
 * Ensures response has required success field and optional fields
 */
export const SubmitAssessmentResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  alreadySubmitted: z.boolean().optional(),
  score: z.number().optional(),
  totalQuestions: z.number().optional(),
  correctAnswers: z.number().optional(),
  moduleBreakdown: z.record(z.unknown()).optional(),
}) satisfies z.ZodType<SubmitAssessmentRPCResponse>;

/**
 * Validator for update_knowledge_state RPC response
 * Ensures response matches BKT-based learning state structure
 */
export const UpdateKnowledgeStateResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  mastery_score: z.number().min(0).max(1).optional(),
  confidence_level: z.enum(["low", "medium", "high"]).optional(),
  attempts: z.number().int().nonnegative().optional(),
  status: z
    .enum(["not_started", "in_progress", "mastered"]) // Migration 155: removed "completed"
    .optional(),
  time_spent_seconds: z.number().int().nonnegative().optional(),
}) satisfies z.ZodType<UpdateKnowledgeStateRPCResponse>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate submit_assessment RPC response
 * @param response - Raw response from RPC call
 * @returns Validated response or validation error
 */
export function validateSubmitAssessmentResponse(
  response: unknown,
):
  | { success: true; data: SubmitAssessmentRPCResponse }
  | { success: false; error: string } {
  try {
    const validated = SubmitAssessmentResponseSchema.parse(response);
    return { success: true, data: validated };
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors[0]?.message
        : "Invalid response";
    return { success: false, error: `RPC validation failed: ${message}` };
  }
}

/**
 * Validate update_knowledge_state RPC response
 * @param response - Raw response from RPC call
 * @returns Validated response or validation error
 */
export function validateUpdateKnowledgeStateResponse(
  response: unknown,
):
  | { success: true; data: UpdateKnowledgeStateRPCResponse }
  | { success: false; error: string } {
  try {
    const validated = UpdateKnowledgeStateResponseSchema.parse(response);
    return { success: true, data: validated };
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors[0]?.message
        : "Invalid response";
    return { success: false, error: `RPC validation failed: ${message}` };
  }
}

