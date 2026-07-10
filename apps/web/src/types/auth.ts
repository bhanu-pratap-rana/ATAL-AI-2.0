/**
 * Type definitions for authentication flows
 * Centralized types to replace `any` and provide proper type safety
 */

import { User } from "@supabase/supabase-js";

/**
 * Result type for sign-in operations
 * Includes user data if successful, error message if failed
 */
export type SignInResult =
  | {
      success: true;
      user: User;
    }
  | {
      success: false;
      error: string;
      requiresProfileCheck?: boolean;
    };

/**
 * Enhanced User type with app metadata
 * Extends Supabase User with custom application metadata
 */
export interface AuthenticatedUser extends User {
  app_metadata: {
    role?: "student" | "teacher" | "admin";
    onboarded?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Teacher profile during onboarding
 */
export interface TeacherProfile {
  userId: string;
  schoolId: string;
  schoolCode: string;
  name: string;
  phone?: string;
  subject?: string;
  email: string;
}

/**
 * Student profile during enrollment
 */
export interface StudentProfile {
  userId: string;
  classId: string;
  name: string;
  email: string;
}

/**
 * Authentication state for UI components
 */
export interface AuthState {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role?: "student" | "teacher" | "admin";
  error?: string;
}

/**
 * Parameters for teacher verification during onboarding
 */
export interface VerifyTeacherParams {
  schoolCode: string;
  staffPin: string;
  teacherName: string;
  phone?: string;
  subject?: string;
}

/**
 * Result type for teacher verification
 */
export type VerifyTeacherResult =
  | {
      success: true;
      schoolId: string;
      schoolName: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * School details
 */
export interface School {
  id: string;
  schoolCode: string;
  schoolName: string;
  district?: string;
}

// ============================================================================
// RPC FUNCTION RESPONSE TYPES
// ============================================================================

/**
 * Response type for submit_assessment RPC function
 * Ensures type safety when calling the atomic assessment submission function
 */
export interface SubmitAssessmentRPCResponse {
  success: boolean;
  error?: string;
  alreadySubmitted?: boolean;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  moduleBreakdown?: Record<string, unknown>;
}

/**
 * Supabase Auth User type with app metadata for roles
 * Used for type-safe role checking throughout the application
 */
export interface SupabaseAuthUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: {
    role?: "student" | "teacher" | "admin" | "super_admin";
    [key: string]: unknown;
  };
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
  [key: string]: unknown;
}

/**
 * Response type for update_knowledge_state RPC function
 * Returns updated mastery score and learning state with BKT-based metrics
 * Maps to: apps/db/migrations/053_add_update_knowledge_state_rpc.sql
 */
export interface UpdateKnowledgeStateRPCResponse {
  success: boolean;
  error?: string;
  mastery_score?: number;
  confidence_level?: "low" | "medium" | "high";
  attempts?: number;
  status?: "not_started" | "in_progress" | "mastered"; // Migration 155: removed "completed"
  time_spent_seconds?: number;
}

/**
 * Response type for upsert_student_profile RPC function
 * Creates or updates student profile with validation
 * Maps to: apps/db/migrations/051_add_upsert_student_profile.sql
 */
export interface UpsertStudentProfileRPCResponse {
  success: boolean;
  error?: string;
  code?: string;
}

