"use server";

import {
  createClient,
  verifyClassOwnership,
  verifyTeacherAuth,
} from "@/lib/supabase-server";
import { queryCache } from "@/lib/cache/query-cache";
import { ClassIdSchema } from "@/lib/validation-schemas";
import { authLogger } from "@/lib/auth-logger";
import { handleZodError } from "@/lib/action-error-handler";

/**
 * Type definitions for Supabase responses
 *
 * Note: Some interfaces include `[key: string]: unknown` to allow for additional fields
 * from Supabase responses. This is necessary because:
 * 1. Supabase may include extra metadata fields depending on the select() clause
 * 2. User-defined custom fields may be present in raw_user_meta_data
 * 3. Future schema extensions may add new fields
 *
 * When accessing these interfaces, always validate known required fields first.
 */

/**
 * User object from auth.users joined queries
 *
 * Guaranteed fields: id
 * Optional fields: email, raw_user_meta_data
 * Note: Not all fields are always available depending on the select clause used
 */
interface AuthUser {
  id: string;
  email?: string;
  raw_user_meta_data?: {
    full_name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Get assessment results for students in a teacher's class
 * Teachers can view aggregate and individual student results
 */
export interface StudentAssessmentResult {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  sessionsCompleted: number;
  averageScore: number | null;
  lastAssessmentDate: string | null;
  totalQuestions: number;
  correctAnswers: number;
}

export interface ClassAssessmentResults {
  classId: string;
  className: string;
  totalStudents: number;
  studentsWithAssessments: number;
  classAverageScore: number | null;
  results: StudentAssessmentResult[];
}

/**
 * Type guard to safely validate student profile structure from Supabase
 */
function isValidStudentProfile(
  data: unknown,
): data is { name: string; roll_number: string | null } {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.name === "string" &&
    (obj.roll_number === null || typeof obj.roll_number === "string")
  );
}

/**
 * Helper: Build lookup maps for sessions and responses
 */
function buildLookupMaps(
  allSessions: Array<{
    id: string;
    user_id: string;
    submitted_at: string;
  }> | null,
  allResponses: Array<{ session_id: string; is_correct: boolean }> | null,
): {
  sessionsByStudent: Map<string, Array<{ id: string; submitted_at: string }>>;
  responsesBySession: Map<string, Array<{ is_correct: boolean }>>;
} {
  const sessionsByStudent = new Map<
    string,
    Array<{ id: string; submitted_at: string }>
  >();
  const responsesBySession = new Map<string, Array<{ is_correct: boolean }>>();

  allSessions?.forEach((session) => {
    if (!sessionsByStudent.has(session.user_id)) {
      sessionsByStudent.set(session.user_id, []);
    }
    const studentSessions = sessionsByStudent.get(session.user_id);
    if (studentSessions) {
      studentSessions.push({
        id: session.id,
        submitted_at: session.submitted_at,
      });
    }
  });

  allResponses?.forEach((response) => {
    if (!responsesBySession.has(response.session_id)) {
      responsesBySession.set(response.session_id, []);
    }
    const sessionResponses = responsesBySession.get(response.session_id);
    if (sessionResponses) {
      sessionResponses.push({
        is_correct: response.is_correct,
      });
    }
  });

  return { sessionsByStudent, responsesBySession };
}

/**
 * Helper: Calculate student assessment statistics
 */
function calculateStudentStats(
  sessions: Array<{ id: string; submitted_at: string }>,
  responsesBySession: Map<string, Array<{ is_correct: boolean }>>,
): {
  sessionsCompleted: number;
  averageScore: number | null;
  lastAssessmentDate: string | null;
  totalQuestions: number;
  correctAnswers: number;
} {
  const sessionsCompleted = sessions.length;

  if (sessions.length === 0) {
    return {
      sessionsCompleted: 0,
      averageScore: null,
      lastAssessmentDate: null,
      totalQuestions: 0,
      correctAnswers: 0,
    };
  }

  sessions.sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
  );
  const lastAssessmentDate = sessions[0].submitted_at;

  let totalQuestions = 0;
  let correctAnswers = 0;

  for (const session of sessions) {
    const responses = responsesBySession.get(session.id) || [];
    totalQuestions += responses.length;
    correctAnswers += responses.filter((r) => r.is_correct).length;
  }

  const averageScore =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : null;

  return {
    sessionsCompleted,
    averageScore,
    lastAssessmentDate,
    totalQuestions,
    correctAnswers,
  };
}

/**
 * Helper: Process student results from enrollments
 */
function processStudentResults(
  enrollments: Array<{
    student_id: string;
    student_profiles: { name: string; roll_number: string | null } | null;
  }> | null,
  sessionsByStudent: Map<string, Array<{ id: string; submitted_at: string }>>,
  responsesBySession: Map<string, Array<{ is_correct: boolean }>>,
): StudentAssessmentResult[] {
  const studentResults: StudentAssessmentResult[] = [];

  for (const enrollment of enrollments || []) {
    if (!isValidStudentProfile(enrollment.student_profiles)) {
      authLogger.warn(
        "[getClassAssessmentResults] Invalid student profile structure",
        {
          enrollment_id: enrollment.student_id,
        },
      );
      continue;
    }

    // isValidStudentProfile already ensures student_profiles is not null
    const studentProfile = enrollment.student_profiles;
    const sessions = sessionsByStudent.get(enrollment.student_id) || [];
    const stats = calculateStudentStats(sessions, responsesBySession);

    studentResults.push({
      studentId: enrollment.student_id,
      studentName: studentProfile.name,
      rollNumber: studentProfile.roll_number || null,
      sessionsCompleted: stats.sessionsCompleted,
      averageScore: stats.averageScore,
      lastAssessmentDate: stats.lastAssessmentDate,
      totalQuestions: stats.totalQuestions,
      correctAnswers: stats.correctAnswers,
    });
  }

  return studentResults;
}

/**
 * Get class assessment results (refactored to reduce cognitive complexity)
 * CRITICAL FIX: Reduced complexity from 21 to <15 by extracting helper functions
 */
export async function getClassAssessmentResults(classId: string): Promise<{
  success: boolean;
  data?: ClassAssessmentResults;
  error?: string;
}> {
  try {
    // Validate input
    let validatedClassId;
    try {
      validatedClassId = ClassIdSchema.parse(classId);
    } catch (error) {
      const zodError = handleZodError(error);
      return { success: zodError.success, error: zodError.error };
    }

    // SECURITY: Verify caller is authenticated and owns this class
    const auth = await verifyClassOwnership(
      "getClassAssessmentResults",
      validatedClassId,
    );
    if (!auth.authorized) {
      return auth.error;
    }

    const supabase = await createClient();

    // SECURITY FIX #4 EXTENSION: Re-verify class ownership before analytics queries
    // Prevents TOCTOU vulnerability if class is deleted/transferred after initial check
    const { data: classData, error: classDataError } = await supabase
      .from("classes")
      .select("id, teacher_id, name")
      .eq("id", validatedClassId)
      .maybeSingle();

    if (classDataError || !classData || classData.teacher_id !== auth.user.id) {
      authLogger.warn(
        "[getClassAssessmentResults] Access denied: Class no longer owned by user",
        {
          userId: auth.user.id,
          classId: validatedClassId,
        },
      );
      return { success: false, error: "You do not own this class" };
    }

    // Get all enrolled students
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select(
        `
        student_id,
        student_profiles!inner (
          name,
          roll_number
        )
      `,
      )
      .eq("class_id", validatedClassId);

    if (enrollmentError) {
      return { success: false, error: "Failed to fetch enrolled students" };
    }

    // OPTIMIZATION: Batch fetch all assessment data instead of looping (prevents N+1 queries)
    const studentIds = (enrollments || []).map((e) => e.student_id);

    // Get all assessment sessions for all students in this class in one query
    const { data: allSessions } = await supabase
      .from("assessment_sessions")
      .select("id, user_id, submitted_at")
      .in("user_id", studentIds)
      .eq("class_id", validatedClassId)
      .not("submitted_at", "is", null);

    // Get all assessment session IDs for bulk response fetch
    const sessionIds = allSessions?.map((s) => s.id) || [];

    // Get all responses for all sessions in one query (instead of per-student queries)
    const { data: allResponses } = await supabase
      .from("assessment_responses")
      .select("is_correct, session_id")
      .in("session_id", sessionIds);

    const { sessionsByStudent, responsesBySession } = buildLookupMaps(
      allSessions,
      allResponses,
    );

    const studentResults = processStudentResults(
      enrollments as unknown as Array<{
        student_id: string;
        student_profiles: { name: string; roll_number: string | null } | null;
      }>,
      sessionsByStudent,
      responsesBySession,
    );

    const studentsWithScores = studentResults.filter(
      (r) => r.averageScore !== null,
    );
    const classAverageScore =
      studentsWithScores.length > 0
        ? Math.round(
            studentsWithScores.reduce(
              (sum, r) => sum + (r.averageScore || 0),
              0,
            ) / studentsWithScores.length,
          )
        : null;

    // Verify classData exists before accessing it
    if (!auth.classData) {
      authLogger.error(
        "[getClassAssessmentResults] Missing classData in auth after authorization",
        new Error("classData undefined"),
      );
      return { success: false, error: "Class data not found" };
    }

    return {
      success: true,
      data: {
        classId: validatedClassId,
        className: auth.classData.name,
        totalStudents: enrollments?.length || 0,
        studentsWithAssessments: studentsWithScores.length,
        classAverageScore,
        results: studentResults.sort((a, b) => {
          // Sort by roll number if available, otherwise by name
          if (a.rollNumber && b.rollNumber) {
            return a.rollNumber.localeCompare(b.rollNumber);
          }
          return a.studentName.localeCompare(b.studentName);
        }),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return { success: false, error: firstError?.message || "Invalid input" };
    }
    authLogger.error("[getClassAssessmentResults] Unexpected error", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Internal function to fetch teacher assessment overview from database
 * This is wrapped by getTeacherAssessmentOverview() with query caching
 */
async function fetchTeacherAssessmentOverviewFromDB(
  teacherId: string,
): Promise<{
  classes: Array<{
    classId: string;
    className: string;
    subject: string | null;
    studentCount: number;
    assessmentsTaken: number;
    averageScore: number | null;
  }>;
  totalAssessments: number;
  overallAverageScore: number | null;
}> {
  const supabase = await createClient();

  // Get all classes for this teacher
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, subject")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (classesError) {
    throw classesError;
  }

  const classResults = [];
  let totalAssessments = 0;
  let totalScore = 0;
  let scoredAssessments = 0;

  // OPTIMIZATION: Batch fetch all data for all classes (prevents N+1 queries)
  const classIds = (classes || []).map((c) => c.id);

  // Get enrollment counts for all classes in one query
  const { data: allEnrollments } = await supabase
    .from("enrollments")
    .select("class_id")
    .in("class_id", classIds);

  // Get all assessment sessions for all classes in one query
  const { data: allSessions } = await supabase
    .from("assessment_sessions")
    .select("id, class_id")
    .in("class_id", classIds)
    .not("submitted_at", "is", null);

  // Get all responses for all sessions in one query
  const sessionIds = allSessions?.map((s) => s.id) || [];
  const { data: allResponses } = await supabase
    .from("assessment_responses")
    .select("is_correct, session_id")
    .in("session_id", sessionIds);

  // Build lookup maps for efficient data association
  const enrollmentCountByClass = new Map<string, number>();
  const sessionsByClass = new Map<string, string[]>();
  const responseCountBySession = new Map<
    string,
    { correct: number; total: number }
  >();

  // Count enrollments by class
  allEnrollments?.forEach((enrollment) => {
    const count = (enrollmentCountByClass.get(enrollment.class_id) || 0) + 1;
    enrollmentCountByClass.set(enrollment.class_id, count);
  });

  // Index sessions by class_id
  allSessions?.forEach((session) => {
    if (!sessionsByClass.has(session.class_id)) {
      sessionsByClass.set(session.class_id, []);
    }
    const classSessions = sessionsByClass.get(session.class_id);
    if (classSessions) {
      classSessions.push(session.id);
    }
  });

  // Count responses per session (both correct and total) in single pass
  allResponses?.forEach((response) => {
    const current = responseCountBySession.get(response.session_id) || {
      correct: 0,
      total: 0,
    };
    current.total += 1;
    if (response.is_correct) {
      current.correct += 1;
    }
    responseCountBySession.set(response.session_id, current);
  });

  // Process class results using pre-fetched data (no queries in loop)
  for (const cls of classes || []) {
    const studentCount = enrollmentCountByClass.get(cls.id) || 0;
    const sessions = sessionsByClass.get(cls.id) || [];
    const assessmentsTaken = sessions.length;
    totalAssessments += assessmentsTaken;

    // Calculate average score from pre-fetched responses
    let averageScore: number | null = null;
    if (sessions.length > 0) {
      let totalCorrect = 0;
      let totalQuestions = 0;

      for (const sessionId of sessions) {
        const counts = responseCountBySession.get(sessionId);
        if (counts) {
          totalCorrect += counts.correct;
          totalQuestions += counts.total;
        }
      }

      if (totalQuestions > 0) {
        averageScore = Math.round((totalCorrect / totalQuestions) * 100);
        totalScore += averageScore;
        scoredAssessments++;
      }
    }

    classResults.push({
      classId: cls.id,
      className: cls.name,
      subject: cls.subject,
      studentCount,
      assessmentsTaken,
      averageScore,
    });
  }

  const overallAverageScore =
    scoredAssessments > 0 ? Math.round(totalScore / scoredAssessments) : null;

  return {
    classes: classResults,
    totalAssessments,
    overallAverageScore,
  };
}

export async function getTeacherAssessmentOverview(): Promise<{
  success: boolean;
  data?: {
    classes: Array<{
      classId: string;
      className: string;
      subject: string | null;
      studentCount: number;
      assessmentsTaken: number;
      averageScore: number | null;
    }>;
    totalAssessments: number;
    overallAverageScore: number | null;
  };
  error?: string;
}> {
  try {
    // SECURITY: Verify caller is authenticated and is a teacher
    const auth = await verifyTeacherAuth("getTeacherAssessmentOverview");
    if (!auth.authorized) {
      return auth.error;
    }

    // PERFORMANCE: Use query cache - 3 minute TTL for teacher dashboard
    // Teacher dashboards change more frequently than admin, so shorter TTL
    const data = await queryCache.getOrFetch(
      `teacher:${auth.user.id}:assessment:overview`,
      () => fetchTeacherAssessmentOverviewFromDB(auth.user.id),
      3 * 60 * 1000, // 3 minutes
    );

    return {
      success: true,
      data,
    };
  } catch (error) {
    authLogger.error("[getTeacherAssessmentOverview] Unexpected error", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
