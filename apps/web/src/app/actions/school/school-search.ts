"use server";

import { createClient, getCurrentUser } from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import { checkRateLimit } from "@/lib/rate-limiter-distributed";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import { SearchQuerySchema } from "@/lib/validation-schemas";

/**
 * Search schools by code or name (for dropdown/search)
 */
export async function searchSchools(query: string) {
  try {
    const validatedQuery = SearchQuerySchema.parse(query);

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized", data: [] };
    }

    const isAllowed = await checkRateLimit(
      `search-schools:${user.id}`,
      RATE_LIMITS.schoolSearch,
    );
    if (!isAllowed) {
      return {
        success: false,
        error:
          "Too many search requests. Please wait a moment before trying again.",
        data: [],
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("schools")
      .select("id, school_code, school_name, district")
      .or(
        `school_code.ilike.%${validatedQuery}%,school_name.ilike.%${validatedQuery}%`,
      )
      .limit(20);

    if (error) {
      authLogger.error("[searchSchools] Failed to search schools", error);
      return { success: false, error: "Failed to search schools", data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    authLogger.error("[searchSchools] Unexpected error", error);
    return { success: false, error: "An unexpected error occurred", data: [] };
  }
}
