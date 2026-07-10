/**
 * Zod Schemas for RPC Response Validation
 *
 * Provides runtime validation for all Supabase RPC function responses
 * and unsafe type assertions throughout the codebase
 */

import { z } from "zod";

/**
 * Supabase Auth User Schema
 * Validates users from admin.auth.admin.listUsers()
 */
export const SupabaseAuthUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().nullable().optional(),
    app_metadata: z.record(z.unknown()).optional(),
    user_metadata: z.record(z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    confirmed_at: z.string().nullable().optional(),
    last_sign_in_at: z.string().nullable().optional(),
  })
  .passthrough(); // Allow additional fields from Supabase

export type SupabaseAuthUser = z.infer<typeof SupabaseAuthUserSchema>;

/**
 * Array of Supabase Auth Users
 */
export const SupabaseAuthUserArraySchema = z.array(SupabaseAuthUserSchema);

/**
 * Validate and parse Supabase Auth Users
 *
 * @param users - Raw users array from Supabase
 * @returns Validated users array or throws ZodError
 */
export function validateSupabaseAuthUsers(users: unknown): SupabaseAuthUser[] {
  return SupabaseAuthUserArraySchema.parse(users);
}
