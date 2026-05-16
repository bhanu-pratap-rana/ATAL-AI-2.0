"use server";

import { revalidatePath } from "next/cache";
import {
  createAdminClient,
  createClient,
  getCurrentUser,
  verifyStudentAuth,
} from "@/lib/supabase-server";
import { authLogger } from "@/lib/auth-logger";
import {
  checkRateLimit,
  checkStudentMutationRateLimit,
} from "@/lib/rate-limiter-distributed";
import { queryCache } from "@/lib/cache/query-cache";
import { RATE_LIMITS } from "@/lib/constants/rate-limits";
import {
  JoinClassSchema,
  StudentProfileSchema,
  ClassIdSchema,
} from "@/lib/validation-schemas";
import type { UpsertStudentProfileRPCResponse } from "@/types/auth";
import { handleZodError } from "@/lib/action-error-handler";
import { RATE_LIMIT_ERRORS } from "@/lib/constants/error-messages";

interface StudentProfileParams {
  name: string;
  gender: "male" | "female";
  phone?: string;
  rollNumber?: string;
  schoolName?: string;
  className?: string;
  village?: string;
}

/**
 * Save student profile after signup
 * Creates a new record in student_profiles table
 */
export async function saveStudentProfile(params: StudentProfileParams) {
  try {
    // Validate inputs
    let validatedInput;
    try {
      validatedInput = StudentProfileSchema.parse(params);
    } catch (error) {
      return handleZodError(error);
    }
    authLogger.debug("[saveStudentProfile] Validated input", {
      name: validatedInput.name,
      gender: validatedInput.gender,
    });

    // SECURITY: Verify caller is authenticated
    // NOTE: We use getCurrentUser() here instead of verifyStudentAuth() because
    // this function creates the student profile — the profile doesn't exist yet
    // for first-time users, so verifyStudentAuth() (which checks for an existing
    // profile) would always reject new students.
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    authLogger.debug("[saveStudentProfile] User authenticated", {
      userId: user.id,
      email: user.email,
      isAnonymous: user.is_anonymous,
    });

    // SECURITY: Rate limit student mutations to prevent abuse
    const saveAllowed = await checkStudentMutationRateLimit(user.id);
    if (!saveAllowed) {
      authLogger.warn("[saveStudentProfile] Rate limit exceeded", {
        userId: user.id,
      });
      return {
        success: false,
        error: RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS,
      };
    }

    const supabase = await createClient();

    // SECURITY FIX #2: Use atomic UPSERT RPC to eliminate race condition
    // Single database operation ensures concurrent requests are serialized atomically
    // No check-then-insert pattern window for concurrent requests to exploit
    authLogger.debug(
      "[saveStudentProfile] Calling atomic upsert_student_profile RPC...",
      {
        userId: user.id,
        name: validatedInput.name,
      },
    );

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "upsert_student_profile",
      {
        p_user_id: user.id,
        p_name: validatedInput.name,
        p_gender: validatedInput.gender,
        p_phone: validatedInput.phone || null,
        p_roll_number: validatedInput.rollNumber || null,
        p_school_name: validatedInput.schoolName || null,
        p_village: validatedInput.village || null,
        p_class_name: validatedInput.className || null,
      },
    );

    if (rpcError) {
      authLogger.error(
        "[saveStudentProfile] RPC upsert_student_profile failed",
        {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
          userId: user.id,
        },
      );
      return {
        success: false,
        error: "Failed to save profile. Please try again.",
      };
    }

    // RPC returns JSON object with success/error
    const rpcResponse = rpcResult as UpsertStudentProfileRPCResponse;
    if (rpcResponse && typeof rpcResponse === "object") {
      if (!rpcResponse.success) {
        authLogger.error("[saveStudentProfile] RPC returned error", {
          error: rpcResponse.error,
          code: rpcResponse.code,
        });
        return {
          success: false,
          error: "Failed to save profile. Please try again.",
        };
      }
    }

    authLogger.success(
      "[saveStudentProfile] Profile saved successfully (UPSERT)",
      {
        userId: user.id,
        result: rpcResult,
      },
    );
    revalidatePath("/app/student/dashboard");
    return { success: true };
  } catch (error) {
    authLogger.error("[saveStudentProfile] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Internal function to fetch student profile from database
 * This is wrapped by getStudentProfile() with query caching
 */
async function fetchStudentProfileFromDB(userId: string) {
  const supabase = await createClient();

  // Use maybeSingle to avoid 406 error when profile doesn't exist
  // OPTIMIZATION: Select only needed columns instead of *
  const { data: profile, error } = await supabase
    .from("student_profiles")
    .select(
      "user_id, name, gender, phone, roll_number, school_id, school_name, class_name, village, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile;
}

/**
 * Get current user's student profile
 * PERFORMANCE: Results cached for 2 minutes to reduce database load
 */
export async function getStudentProfile() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Not authenticated", profile: null };
    }

    // PERFORMANCE: Use query cache - 2 minute TTL for student profiles
    // Student profiles change less frequently and benefit from caching
    const profile = await queryCache.getOrFetch(
      `student:${user.id}:profile`,
      () => fetchStudentProfileFromDB(user.id),
      2 * 60 * 1000, // 2 minutes
    );

    return { success: true, profile };
  } catch (error) {
    authLogger.error("[getStudentProfile] Unexpected error", error);
    return {
      success: false,
      error: "Failed to load profile",
      profile: null,
    };
  }
}

/**
 * Preview class details before joining
 * Returns class name, teacher name, and subject without requiring PIN
 * This allows students to verify they're joining the right class
 */
export async function previewClass(classCode: string): Promise<{
  success: boolean;
  data?: {
    className: string;
    teacherName: string;
    subject: string | null;
    studentCount: number;
  };
  error?: string;
}> {
  try {
    // SECURITY: Require authentication for class preview
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    // Validate input using schema (consistent with other functions)
    let validatedClassCode;
    try {
      validatedClassCode = JoinClassSchema.pick({ classCode: true }).parse({
        classCode: classCode.toUpperCase().replaceAll(/[^A-Z0-9]/g, ""),
      }).classCode;
    } catch (error) {
      const zodError = handleZodError(error);
      return { success: zodError.success, error: zodError.error };
    }

    // PR-64 lockdown: classes_select no longer permits "any class with a
    // class_code" — that disjunct used to leak every row's plaintext
    // join_pin to any logged-in user. Now we route the preview through
    // the SECURITY DEFINER `preview_class_by_code` RPC which returns
    // only the safe subset (id, name, subject, teacher_name, count) and
    // never exposes the PIN.
    const supabase = await createClient();
    const { data: previewRows, error: previewError } = await supabase.rpc(
      "preview_class_by_code",
      { p_class_code: validatedClassCode },
    );

    if (previewError) {
      authLogger.error("[previewClass] preview RPC failed", previewError);
      return { success: false, error: "Failed to lookup class" };
    }

    const preview = (previewRows as Array<{
      class_id: string;
      class_name: string;
      subject: string | null;
      teacher_name: string;
      student_count: number;
    }> | null)?.[0];

    if (!preview) {
      return {
        success: false,
        error: "Class not found. Please check the code.",
      };
    }

    return {
      success: true,
      data: {
        className: preview.class_name,
        teacherName: preview.teacher_name,
        subject: preview.subject,
        studentCount: preview.student_count,
      },
    };
  } catch (error) {
    authLogger.error("[previewClass] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

interface JoinClassParams {
  classCode: string;
  pin: string;
}

/**
 * Helper: Verify class PIN server-side via SECURITY DEFINER RPC.
 *
 * PR-64 lockdown: the previous flow fetched `join_pin` over the wire
 * (RLS-bound) and compared with timingSafeEqual client-side. That worked
 * but required `classes.join_pin` to be readable by the caller, and
 * combined with the broad `class_code IS NOT NULL` RLS clause, exposed
 * every plaintext PIN to every authenticated user. We now hand both the
 * code and PIN to `verify_class_join_pin`, which does the equality
 * compare inside the database and returns only {success, class_id,
 * class_name} — never the PIN itself.
 */
async function verifyClassJoinPin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classCode: string,
  pin: string,
): Promise<
  | { success: true; classData: { id: string; name: string; class_code: string } }
  | { success: false; error: string }
> {
  const { data, error } = await supabase.rpc("verify_class_join_pin", {
    p_class_code: classCode,
    p_pin: pin,
  });

  if (error) {
    authLogger.error("[joinClass] verify_class_join_pin RPC failed", error);
    return { success: false, error: "Failed to verify class" };
  }

  const row = (data as Array<{
    success: boolean;
    class_id: string | null;
    class_name: string | null;
  }> | null)?.[0];

  if (!row || !row.success || !row.class_id || !row.class_name) {
    return { success: false, error: "Invalid class code or PIN" };
  }

  return {
    success: true,
    classData: {
      id: row.class_id,
      name: row.class_name,
      class_code: classCode,
    },
  };
}

/**
 * Helper: Check if student is already enrolled
 */
async function checkExistingEnrollment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  studentId: string,
): Promise<{ enrolled: true } | { enrolled: false; error?: string }> {
  const { data: existingEnrollment, error: enrollmentCheckError } =
    await supabase
      .from("enrollments")
      .select("id")
      .eq("class_id", classId)
      .eq("student_id", studentId)
      .maybeSingle();

  if (enrollmentCheckError) {
    authLogger.error(
      "[joinClass] Error checking existing enrollment",
      enrollmentCheckError,
    );
    return { enrolled: false, error: "Failed to check enrollment status" };
  }

  if (existingEnrollment) {
    return { enrolled: true };
  }

  return { enrolled: false };
}

/**
 * Helper: Create enrollment
 */
async function createEnrollment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  studentId: string,
  className: string,
): Promise<
  | { success: true; data: { className: string; [key: string]: unknown } }
  | { success: false; error: string }
> {
  const { data, error } = await supabase
    .from("enrollments")
    .insert({
      class_id: classId,
      student_id: studentId,
    })
    .select()
    .maybeSingle();

  if (error) {
    authLogger.error("[joinClass] Failed to create enrollment", {
      code: error.code,
      message: error.message,
      details: error.details,
      classId,
      studentId,
    });

    if (error.code === "23505") {
      return { success: false, error: "Already enrolled in this class" };
    }

    return {
      success: false,
      error: "Failed to enroll in class. Please try again.",
    };
  }

  return {
    success: true,
    data: {
      ...data,
      className,
    },
  };
}

/**
 * Join a class using class code and PIN (refactored to reduce cognitive complexity)
 * CRITICAL FIX: Reduced complexity from 16 to <15 by extracting helper functions
 */
export async function joinClass({ classCode, pin }: JoinClassParams) {
  try {
    let validatedInput;
    try {
      validatedInput = JoinClassSchema.parse({ classCode, pin });
    } catch (error) {
      return handleZodError(error);
    }
    const validatedClassCode = validatedInput.classCode;
    const validatedPin = validatedInput.pin;

    const auth = await verifyStudentAuth("joinClass");
    if (!auth.authorized) {
      return auth.error;
    }

    const isAllowed = await checkRateLimit(
      `join-class:${auth.user.id}:${validatedClassCode}`,
      RATE_LIMITS.classJoinAttempts,
    );
    if (!isAllowed) {
      authLogger.warn("[joinClass] Rate limit exceeded", {
        userId: auth.user.id,
        classCode: validatedClassCode,
      });
      return {
        success: false,
        error: "Too many join attempts. Please wait before trying again.",
      };
    }

    const supabase = await createClient();
    // PR-64 lockdown: verify class + PIN server-side via SECURITY DEFINER
    // RPC. The previous client-side compare required the PIN to be
    // readable over the wire.
    const classLookup = await verifyClassJoinPin(
      supabase,
      validatedClassCode,
      validatedPin,
    );
    if (!classLookup.success) {
      authLogger.warn("[joinClass] Invalid PIN attempt", {
        classCode: validatedClassCode,
        userId: auth.user.id,
      });
      return { success: false, error: classLookup.error };
    }

    const enrollmentCheck = await checkExistingEnrollment(
      supabase,
      classLookup.classData.id,
      auth.user.id,
    );
    if (enrollmentCheck.enrolled) {
      return { success: false, error: "Already enrolled in this class" };
    }
    if (enrollmentCheck.error) {
      return { success: false, error: enrollmentCheck.error };
    }

    const enrollmentResult = await createEnrollment(
      supabase,
      classLookup.classData.id,
      auth.user.id,
      classLookup.classData.name,
    );

    if (enrollmentResult.success) {
      revalidatePath("/app/student/classes");
    }

    return enrollmentResult;
  } catch (error) {
    authLogger.error("[joinClass] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

interface JoinClassAsAnonymousParams {
  name: string;
  gender: "male" | "female";
  classCode: string;
  pin: string;
  rollNumber?: string;
}

/**
 * First-contact join for rural students who have no email or phone.
 *
 * Flow: client calls supabase.auth.signInAnonymously() first (gets an
 * anon UID + session), then calls this action with a username + class
 * details. We:
 *   1. Validate input
 *   2. Confirm caller is authenticated (anonymous is fine)
 *   3. Refuse if a student_profiles row already exists for this user —
 *      this action is strictly first-contact, not a renaming tool
 *   4. Verify class code + PIN
 *   5. Upsert the student_profiles row via the existing RPC
 *   6. Insert the enrollment
 *
 * RLS: the existing student_profiles INSERT policy permits an
 * authenticated user to insert a row with `user_id = auth.uid()`. The
 * enrollments INSERT policy permits an authenticated user to insert
 * with `student_id = auth.uid()`. Anonymous users have a real
 * `auth.uid()` so both checks pass.
 */
export async function joinClassAsAnonymous(
  params: JoinClassAsAnonymousParams,
) {
  try {
    let validatedInput;
    try {
      validatedInput = StudentProfileSchema.partial({
        phone: true,
        schoolName: true,
        className: true,
        village: true,
      }).parse({
        name: params.name,
        gender: params.gender,
        rollNumber: params.rollNumber,
      });
      JoinClassSchema.parse({ classCode: params.classCode, pin: params.pin });
    } catch (error) {
      return handleZodError(error);
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    authLogger.debug("[joinClassAsAnonymous] Caller authenticated", {
      userId: user.id,
      isAnonymous: user.is_anonymous,
    });

    const supabase = await createClient();

    const { data: existingProfile } = await supabase
      .from("student_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfile) {
      authLogger.warn(
        "[joinClassAsAnonymous] Profile already exists; this entry point is first-contact only",
        { userId: user.id },
      );
      return {
        success: false,
        error: "You already have a profile. Use the regular join flow.",
      };
    }

    const rateAllowed = await checkRateLimit(
      `join-class-anon:${user.id}:${params.classCode}`,
      RATE_LIMITS.classJoinAttempts,
    );
    if (!rateAllowed) {
      return {
        success: false,
        error: "Too many join attempts. Please wait before trying again.",
      };
    }

    const upperClassCode = params.classCode.toUpperCase().trim();
    const classLookup = await verifyClassJoinPin(
      supabase,
      upperClassCode,
      params.pin.trim(),
    );
    if (!classLookup.success) {
      authLogger.warn("[joinClassAsAnonymous] Invalid PIN attempt", {
        classCode: upperClassCode,
        userId: user.id,
      });
      return { success: false, error: classLookup.error };
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "upsert_student_profile",
      {
        p_user_id: user.id,
        p_name: validatedInput.name,
        p_gender: validatedInput.gender,
        p_phone: null,
        p_roll_number: validatedInput.rollNumber || null,
        p_school_name: null,
        p_village: null,
        p_class_name: classLookup.classData.name,
      },
    );

    if (rpcError) {
      authLogger.error(
        "[joinClassAsAnonymous] RPC upsert_student_profile failed",
        {
          code: rpcError.code,
          message: rpcError.message,
          userId: user.id,
        },
      );
      return { success: false, error: "Failed to create profile. Please try again." };
    }

    const rpcResponse = rpcResult as UpsertStudentProfileRPCResponse;
    if (rpcResponse && typeof rpcResponse === "object" && !rpcResponse.success) {
      authLogger.error("[joinClassAsAnonymous] RPC returned error", {
        error: rpcResponse.error,
        userId: user.id,
      });
      return { success: false, error: "Failed to create profile. Please try again." };
    }

    // SECURITY: use the admin client for the enrollment insert ONLY.
    // The enrollments SELECT RLS policy calls get_teacher_class_ids(),
    // which recurses on enrollments when the caller is anonymous — the
    // post-insert .select() roundtrip then throws
    // "infinite recursion detected in policy for relation enrollments".
    // All the gating checks (auth, profile-doesn't-exist, rate limit,
    // class+PIN match) ran above with the user's regular RLS-bound
    // client, so writing the enrollment row server-side here is safe.
    const adminSupabase = await createAdminClient();
    const enrollmentResult = await createEnrollment(
      adminSupabase,
      classLookup.classData.id,
      user.id,
      classLookup.classData.name,
    );

    if (enrollmentResult.success) {
      revalidatePath("/app/student/classes");
      revalidatePath("/app/student/dashboard");
    }

    return enrollmentResult;
  } catch (error) {
    authLogger.error("[joinClassAsAnonymous] Unexpected error", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function leaveClass(classId: string) {
  try {
    // Validate class ID
    let validatedClassId;
    try {
      validatedClassId = ClassIdSchema.parse(classId);
    } catch (error) {
      return handleZodError(error);
    }

    // SECURITY: Verify caller is authenticated and is a student
    const auth = await verifyStudentAuth("leaveClass");
    if (!auth.authorized) {
      return auth.error;
    }

    // SECURITY: Rate limit student mutations to prevent abuse
    const leaveAllowed = await checkStudentMutationRateLimit(auth.user.id);
    if (!leaveAllowed) {
      authLogger.warn("[leaveClass] Rate limit exceeded", {
        userId: auth.user.id,
      });
      return {
        success: false,
        error: RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS,
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("class_id", validatedClassId)
      .eq("student_id", auth.user.id);

    if (error) {
      authLogger.error("[leaveClass] Database error", { error: error.message });
      return { success: false, error: "Failed to leave class. Please try again." };
    }

    revalidatePath("/app/student/classes");
    return { success: true };
  } catch (error) {
    authLogger.error("[leaveClass] Unexpected error", error instanceof Error ? error : { error: String(error) });
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
