"use server";

import { revalidatePath } from "next/cache";
import { createClient, verifyTeacherAuth } from "@/lib/supabase-server";
import { checkTeacherMutationRateLimit } from "@/lib/rate-limiter-distributed";
import { CreateClassSchema } from "@/lib/validation-schemas";
import { authLogger } from "@/lib/auth-logger";
import { handleZodError } from "@/lib/action-error-handler";
import { RATE_LIMIT_ERRORS } from "@/lib/constants/error-messages";

/**
 * Class creation for teachers
 */

export async function createClass(name: string, subject?: string) {
  try {
    // Validate input
    let validatedInput;
    try {
      validatedInput = CreateClassSchema.parse({ name, subject });
    } catch (error) {
      return handleZodError(error);
    }
    name = validatedInput.name;
    subject = validatedInput.subject;

    // SECURITY: Verify caller is authenticated and is a teacher
    const auth = await verifyTeacherAuth("createClass");
    if (!auth.authorized) {
      return auth.error;
    }

    // SECURITY: Rate limit teacher mutations to prevent abuse
    const rateLimitAllowed = await checkTeacherMutationRateLimit(auth.user.id);
    if (!rateLimitAllowed) {
      return {
        success: false,
        error: RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS,
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("classes")
      .insert({
        name,
        subject: subject || null,
        teacher_id: auth.user.id,
      })
      .select()
      .maybeSingle();

    if (error) {
      authLogger.error("[createClass] Database error", { error: error.message });
      return { success: false, error: "Failed to create class. Please try again." };
    }

    revalidatePath("/app/teacher/classes");
    revalidatePath("/app/teacher/dashboard");
    return { success: true, data };
  } catch (error) {
    authLogger.error("[createClass] Unexpected error", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
