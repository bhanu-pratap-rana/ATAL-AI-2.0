/**
 * RPC Response Type Definitions
 *
 * Type definitions for all Supabase RPC (Remote Procedure Call) function responses
 * These match the RETURNS TABLE definitions in the database migrations
 */

/**
 * Response from batch_check_and_award_badges RPC
 * Migration: 156_fix_badge_id_ambiguity.sql (latest)
 * Returns only the fields defined in RETURNS TABLE
 */
export interface BatchCheckAwardBadgesResponse {
  badge_id: string;
  badge_name_en: string;
  badge_name_hi: string;
  badge_name_as: string;
  points_awarded: number;
}
