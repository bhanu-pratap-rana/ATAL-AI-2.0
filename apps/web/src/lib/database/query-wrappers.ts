/**
 * Database query wrappers
 * Consolidates common database operation patterns to reduce duplication
 */

import { createClient, createAdminClient } from "../supabase-server";
import { authLogger } from "../auth-logger";

export type ActionResponse<T = {}> = (
  | {
      success: true;
      data?: T;
    }
  | {
      success: false;
      error: string;
    }
) & {};

/**
 * Fetch a school record by ID
 * Handles error logging and error responses consistently
 */
export async function fetchSchoolRecord(
  schoolId: string,
  functionName: string,
) {
  try {
    const supabase = await createClient();

    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .select("id, school_name, school_code, district")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolError) {
      authLogger.error(
        `[${functionName}] Error fetching school`,
        schoolError,
      );
      return {
        success: false,
        error: "Failed to fetch school",
      } as ActionResponse;
    }

    if (!schoolData) {
      return {
        success: false,
        error: "School not found",
      } as ActionResponse;
    }

    return {
      success: true,
      data: schoolData,
    } as ActionResponse<typeof schoolData>;
  } catch (error) {
    authLogger.error(
      `[${functionName}] Unexpected error fetching school`,
      error instanceof Error ? error : { error: String(error) },
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    } as ActionResponse;
  }
}

/**
 * Fetch PIN credentials for a school
 * Handles RLS bypass using admin client
 */
export async function fetchSchoolPINCredentials(
  schoolId: string,
  functionName: string,
) {
  try {
    const adminClient = await createAdminClient();

    const { data: pinData, error: pinError } = await adminClient
      .from("school_staff_credentials")
      .select("created_at, rotated_at, updated_at")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (pinError) {
      authLogger.error(
        `[${functionName}] Error fetching PIN credentials`,
        pinError,
      );
      // Don't fail - just means no PIN exists yet
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: pinData,
    };
  } catch (error) {
    authLogger.error(
      `[${functionName}] Unexpected error fetching PIN credentials`,
      error instanceof Error ? error : { error: String(error) },
    );
    return {
      success: false,
      error: "Failed to fetch PIN credentials",
    };
  }
}

/**
 * Fetch all schools with basic information
 */
export async function fetchAllSchools(functionName: string) {
  try {
    const supabase = await createClient();

    const { data: schools, error: schoolError } = await supabase
      .from("schools")
      .select("id, school_name, school_code, district")
      .order("school_name");

    if (schoolError) {
      authLogger.error(
        `[${functionName}] Error fetching schools`,
        schoolError,
      );
      return {
        success: false,
        error: "Failed to fetch schools",
      } as ActionResponse;
    }

    return {
      success: true,
      data: schools || [],
    } as ActionResponse<typeof schools>;
  } catch (error) {
    authLogger.error(
      `[${functionName}] Unexpected error fetching schools`,
      error instanceof Error ? error : { error: String(error) },
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    } as ActionResponse;
  }
}

/**
 * Count schools total
 */
export async function countSchools(functionName: string) {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("schools")
      .select("*", { count: "exact", head: true });

    if (error) {
      authLogger.error(
        `[${functionName}] Error counting schools`,
        error,
      );
      return {
        success: false,
        error: "Failed to count schools",
        count: 0,
      };
    }

    return {
      success: true,
      count: count || 0,
    };
  } catch (error) {
    authLogger.error(
      `[${functionName}] Unexpected error counting schools`,
      error instanceof Error ? error : { error: String(error) },
    );
    return {
      success: false,
      error: "An unexpected error occurred",
      count: 0,
    };
  }
}

/**
 * Count PIN credentials (requires admin/service role)
 */
export async function countSchoolsWithPINs(functionName: string) {
  try {
    const adminClient = await createAdminClient();

    const { count, error } = await adminClient
      .from("school_staff_credentials")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    if (error) {
      authLogger.error(
        `[${functionName}] Error counting schools with PINs`,
        error,
      );
      return {
        success: false,
        error: "Failed to count PIN credentials",
        count: 0,
      };
    }

    return {
      success: true,
      count: count || 0,
    };
  } catch (error) {
    authLogger.error(
      `[${functionName}] Unexpected error counting PIN credentials`,
      error instanceof Error ? error : { error: String(error) },
    );
    return {
      success: false,
      error: "An unexpected error occurred",
      count: 0,
    };
  }
}

/**
 * Fetch all PIN credentials mapped by school_id
 */
export async function fetchAllSchoolPINs(functionName: string) {
  try {
    const adminClient = await createAdminClient();

    const { data: pins, error } = await adminClient
      .from("school_staff_credentials")
      .select("school_id, created_at, rotated_at");

    if (error) {
      authLogger.error(
        `[${functionName}] Error fetching all PIN credentials`,
        error,
      );
      return {
        success: false,
        error: "Failed to fetch PIN credentials",
        pins: [],
      };
    }

    return {
      success: true,
      pins: pins || [],
    };
  } catch (error) {
    authLogger.error(
      `[${functionName}] Unexpected error fetching PIN credentials`,
      error instanceof Error ? error : { error: String(error) },
    );
    return {
      success: false,
      error: "An unexpected error occurred",
      pins: [],
    };
  }
}
