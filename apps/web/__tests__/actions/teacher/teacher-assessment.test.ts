/**
 * Teacher Assessment Server Actions Tests
 *
 * Tests for teacher assessment results and overview functionality.
 * Coverage: ~35 tests for 2 main exported functions
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock modules before importing
const mockCreateClient = jest.fn();
const mockVerifyTeacherAuth = jest.fn();
const mockVerifyClassOwnership = jest.fn();
const mockQueryCacheGetOrFetch = jest.fn();
const mockAuthLoggerInfo = jest.fn();
const mockAuthLoggerError = jest.fn();
const mockAuthLoggerWarn = jest.fn();
const mockHandleZodError = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createClient: mockCreateClient,
  verifyTeacherAuth: mockVerifyTeacherAuth,
  verifyClassOwnership: mockVerifyClassOwnership,
}));

jest.mock('@/lib/cache/query-cache', () => ({
  queryCache: {
    getOrFetch: mockQueryCacheGetOrFetch,
  },
}));

jest.mock('@/lib/auth-logger', () => ({
  authLogger: {
    info: mockAuthLoggerInfo,
    error: mockAuthLoggerError,
    warn: mockAuthLoggerWarn,
  },
}));

jest.mock('@/lib/action-error-handler', () => ({
  handleZodError: mockHandleZodError,
}));

// Import after mocks are set up
import {
  getClassAssessmentResults,
  getTeacherAssessmentOverview,
} from '@/app/actions/teacher/teacher-assessment';

// Test data factories
const createMockEnrollment = (overrides = {}) => ({
  student_id: 'student-123',
  student_profiles: {
    name: 'Test Student',
    roll_number: '01',
  },
  ...overrides,
});

const createMockSession = (overrides = {}) => ({
  id: 'session-123',
  user_id: 'student-123',
  class_id: 'class-123',
  submitted_at: '2024-01-01T10:00:00Z',
  ...overrides,
});

const createMockResponse = (overrides = {}) => ({
  session_id: 'session-123',
  is_correct: true,
  ...overrides,
});

const createMockClass = (overrides = {}) => ({
  id: 'class-123',
  name: 'Mathematics Class',
  subject: 'Mathematics',
  teacher_id: 'teacher-123',
  ...overrides,
});

// Helper to create mock Supabase query builder
const createMockQueryBuilder = (data: unknown[] = [], error: Error | null = null) => {
  const builder: Record<string, jest.Mock> = {};

  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'not', 'gte', 'lte', 'order', 'limit'];

  methods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });

  // Terminal methods
  builder.single = jest.fn().mockResolvedValue({ data: data[0] || null, error });
  builder.maybeSingle = jest.fn().mockResolvedValue({ data: data[0] || null, error });

  // Make thenable
  builder.then = jest.fn().mockImplementation((resolve) =>
    resolve({ data, error, count: data.length })
  );

  return builder;
};

// Helper to setup teacher auth success
const setupTeacherAuthSuccess = () => {
  mockVerifyTeacherAuth.mockResolvedValue({
    authorized: true,
    user: {
      id: 'teacher-123',
      email: 'teacher@test.com',
    },
    teacherProfile: {
      user_id: 'teacher-123',
      school_id: 'school-123',
    },
  });
};

// Helper to setup class ownership success
const setupClassOwnershipSuccess = () => {
  mockVerifyClassOwnership.mockResolvedValue({
    authorized: true,
    user: {
      id: 'teacher-123',
      email: 'teacher@test.com',
    },
    classData: {
      id: 'class-123',
      name: 'Mathematics Class',
      teacher_id: 'teacher-123',
    },
  });
};

// Helper to setup auth failure
const setupAuthFailure = (errorMessage = 'Unauthorized') => {
  const errorResult = {
    authorized: false,
    error: { success: false, error: errorMessage },
  };
  mockVerifyTeacherAuth.mockResolvedValue(errorResult);
  mockVerifyClassOwnership.mockResolvedValue(errorResult);
};

describe('teacher-assessment', () => {
  let mockSupabase: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnValue(createMockQueryBuilder()),
    };
    mockCreateClient.mockResolvedValue(mockSupabase);

    // Default error handler
    mockHandleZodError.mockReturnValue({ success: false, error: 'Invalid input' });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =====================================================
  // getClassAssessmentResults Tests
  // =====================================================
  describe('getClassAssessmentResults', () => {
    // Use valid UUID for class ID
    const validClassId = '550e8400-e29b-41d4-a716-446655440000';

    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAuthFailure();

        const result = await getClassAssessmentResults(validClassId);

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });

      it('should reject users who do not own the class', async () => {
        mockVerifyClassOwnership.mockResolvedValue({
          authorized: false,
          error: { success: false, error: 'You do not own this class' },
        });

        const result = await getClassAssessmentResults(validClassId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not own');
      });
    });

    describe('Input Validation', () => {
      it('should reject invalid class ID format', async () => {
        setupClassOwnershipSuccess();

        const result = await getClassAssessmentResults('invalid-id');

        expect(result.success).toBe(false);
      });

      it('should reject empty class ID', async () => {
        setupClassOwnershipSuccess();

        const result = await getClassAssessmentResults('');

        expect(result.success).toBe(false);
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupClassOwnershipSuccess();
      });

      it('should return assessment results for a class', async () => {
        const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
        const mockEnrollments = [
          createMockEnrollment({ student_id: 'student-1' }),
          createMockEnrollment({ student_id: 'student-2', student_profiles: { name: 'Student 2', roll_number: '02' } }),
        ];
        const mockSessions = [
          createMockSession({ id: 'sess-1', user_id: 'student-1', class_id: validClassId }),
          createMockSession({ id: 'sess-2', user_id: 'student-2', class_id: validClassId }),
        ];
        const mockResponses = [
          createMockResponse({ session_id: 'sess-1', is_correct: true }),
          createMockResponse({ session_id: 'sess-1', is_correct: true }),
          createMockResponse({ session_id: 'sess-2', is_correct: false }),
          createMockResponse({ session_id: 'sess-2', is_correct: true }),
        ];

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = createMockQueryBuilder();

          if (table === 'classes') {
            builder.maybeSingle = jest.fn().mockResolvedValue({
              data: mockClassData,
              error: null,
            });
          } else if (table === 'enrollments') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockEnrollments, error: null })
            );
          } else if (table === 'assessment_sessions') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSessions, error: null })
            );
          } else if (table === 'assessment_responses') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockResponses, error: null })
            );
          }

          return builder;
        });

        const result = await getClassAssessmentResults(validClassId);

        expect(result.success).toBe(true);
        expect(result.data?.totalStudents).toBe(2);
      });

      it('should return empty results when no students enrolled', async () => {
        const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = createMockQueryBuilder();

          if (table === 'classes') {
            builder.maybeSingle = jest.fn().mockResolvedValue({
              data: mockClassData,
              error: null,
            });
          } else if (table === 'enrollments') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: [], error: null })
            );
          } else {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: [], error: null })
            );
          }

          return builder;
        });

        const result = await getClassAssessmentResults(validClassId);

        expect(result.success).toBe(true);
        expect(result.data?.totalStudents).toBe(0);
        expect(result.data?.results).toEqual([]);
      });

      it('should calculate class average score correctly', async () => {
        const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
        const mockEnrollments = [
          createMockEnrollment({ student_id: 'student-1' }),
        ];
        const mockSessions = [
          createMockSession({ id: 'sess-1', user_id: 'student-1', class_id: validClassId }),
        ];
        // 8 correct out of 10 = 80%
        const mockResponses = Array.from({ length: 10 }, (_, i) => ({
          session_id: 'sess-1',
          is_correct: i < 8,
        }));

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = createMockQueryBuilder();

          if (table === 'classes') {
            builder.maybeSingle = jest.fn().mockResolvedValue({
              data: mockClassData,
              error: null,
            });
          } else if (table === 'enrollments') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockEnrollments, error: null })
            );
          } else if (table === 'assessment_sessions') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSessions, error: null })
            );
          } else if (table === 'assessment_responses') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockResponses, error: null })
            );
          }

          return builder;
        });

        const result = await getClassAssessmentResults(validClassId);

        expect(result.success).toBe(true);
        expect(result.data?.classAverageScore).toBe(80);
      });

      it('should handle enrollment query errors', async () => {
        const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = createMockQueryBuilder();

          if (table === 'classes') {
            builder.maybeSingle = jest.fn().mockResolvedValue({
              data: mockClassData,
              error: null,
            });
          } else if (table === 'enrollments') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: null, error: { message: 'Database error' } })
            );
          }

          return builder;
        });

        const result = await getClassAssessmentResults(validClassId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to fetch');
      });
    });

    describe('Security', () => {
      it('should re-verify class ownership before returning data', async () => {
        setupClassOwnershipSuccess();

        // Class was transferred to another teacher after initial check
        const mockClassData = createMockClass({
          id: validClassId,
          teacher_id: 'another-teacher', // Different teacher
        });

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = createMockQueryBuilder();

          if (table === 'classes') {
            builder.maybeSingle = jest.fn().mockResolvedValue({
              data: mockClassData,
              error: null,
            });
          }

          return builder;
        });

        const result = await getClassAssessmentResults(validClassId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not own');
      });
    });

    describe('Sorting', () => {
      beforeEach(() => {
        setupClassOwnershipSuccess();
      });

      it('should sort results by roll number when available', async () => {
        const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
        const mockEnrollments = [
          createMockEnrollment({ student_id: 'student-1', student_profiles: { name: 'Alice', roll_number: '03' } }),
          createMockEnrollment({ student_id: 'student-2', student_profiles: { name: 'Bob', roll_number: '01' } }),
          createMockEnrollment({ student_id: 'student-3', student_profiles: { name: 'Charlie', roll_number: '02' } }),
        ];

        mockSupabase.from.mockImplementation((table: string) => {
          const builder = createMockQueryBuilder();

          if (table === 'classes') {
            builder.maybeSingle = jest.fn().mockResolvedValue({
              data: mockClassData,
              error: null,
            });
          } else if (table === 'enrollments') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockEnrollments, error: null })
            );
          } else {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: [], error: null })
            );
          }

          return builder;
        });

        const result = await getClassAssessmentResults(validClassId);

        expect(result.success).toBe(true);
        // Should be sorted by roll number: 01 (Bob), 02 (Charlie), 03 (Alice)
        expect(result.data?.results[0].rollNumber).toBe('01');
        expect(result.data?.results[1].rollNumber).toBe('02');
        expect(result.data?.results[2].rollNumber).toBe('03');
      });
    });
  });

  // =====================================================
  // getTeacherAssessmentOverview Tests
  // =====================================================
  describe('getTeacherAssessmentOverview', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAuthFailure();

        const result = await getTeacherAssessmentOverview();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupTeacherAuthSuccess();
      });

      it('should return assessment overview from cache', async () => {
        const mockOverview = {
          classes: [
            {
              classId: 'class-1',
              className: 'Math Class',
              subject: 'Mathematics',
              studentCount: 25,
              assessmentsTaken: 50,
              averageScore: 75,
            },
          ],
          totalAssessments: 50,
          overallAverageScore: 75,
        };
        mockQueryCacheGetOrFetch.mockResolvedValue(mockOverview);

        const result = await getTeacherAssessmentOverview();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockOverview);
      });

      it('should use 3-minute cache TTL', async () => {
        mockQueryCacheGetOrFetch.mockResolvedValue({
          classes: [],
          totalAssessments: 0,
          overallAverageScore: null,
        });

        await getTeacherAssessmentOverview();

        expect(mockQueryCacheGetOrFetch).toHaveBeenCalledWith(
          expect.stringContaining('teacher:'),
          expect.any(Function),
          3 * 60 * 1000 // 3 minutes
        );
      });

      it('should return empty classes when teacher has no classes', async () => {
        mockQueryCacheGetOrFetch.mockResolvedValue({
          classes: [],
          totalAssessments: 0,
          overallAverageScore: null,
        });

        const result = await getTeacherAssessmentOverview();

        expect(result.success).toBe(true);
        expect(result.data?.classes).toEqual([]);
        expect(result.data?.totalAssessments).toBe(0);
        expect(result.data?.overallAverageScore).toBe(null);
      });

      it('should aggregate assessments across all classes', async () => {
        const mockOverview = {
          classes: [
            { classId: 'class-1', className: 'Math', subject: 'Math', studentCount: 20, assessmentsTaken: 30, averageScore: 80 },
            { classId: 'class-2', className: 'Science', subject: 'Science', studentCount: 25, assessmentsTaken: 40, averageScore: 70 },
          ],
          totalAssessments: 70,
          overallAverageScore: 75,
        };
        mockQueryCacheGetOrFetch.mockResolvedValue(mockOverview);

        const result = await getTeacherAssessmentOverview();

        expect(result.success).toBe(true);
        expect(result.data?.totalAssessments).toBe(70);
        expect(result.data?.overallAverageScore).toBe(75);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        setupTeacherAuthSuccess();
      });

      it('should handle cache fetch errors', async () => {
        mockQueryCacheGetOrFetch.mockRejectedValue(new Error('Cache error'));

        const result = await getTeacherAssessmentOverview();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Cache error');
      });

      it('should handle unexpected errors', async () => {
        mockQueryCacheGetOrFetch.mockRejectedValue(new Error('Unexpected error'));

        const result = await getTeacherAssessmentOverview();

        expect(result.success).toBe(false);
        expect(mockAuthLoggerError).toHaveBeenCalled();
      });
    });

    describe('Cache Key', () => {
      beforeEach(() => {
        setupTeacherAuthSuccess();
      });

      it('should use teacher-specific cache key', async () => {
        mockQueryCacheGetOrFetch.mockResolvedValue({
          classes: [],
          totalAssessments: 0,
          overallAverageScore: null,
        });

        await getTeacherAssessmentOverview();

        expect(mockQueryCacheGetOrFetch).toHaveBeenCalledWith(
          'teacher:teacher-123:assessment:overview',
          expect.any(Function),
          expect.any(Number)
        );
      });
    });
  });

  // =====================================================
  // Score Calculation Tests
  // =====================================================
  describe('Score Calculations', () => {
    beforeEach(() => {
      setupClassOwnershipSuccess();
    });

    const validClassId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return null average when no assessments completed', async () => {
      const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
      const mockEnrollments = [
        createMockEnrollment({ student_id: 'student-1' }),
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({
            data: mockClassData,
            error: null,
          });
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else {
          // No sessions or responses
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: [], error: null })
          );
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(true);
      expect(result.data?.classAverageScore).toBeNull();
      expect(result.data?.results[0].averageScore).toBeNull();
    });

    it('should calculate 100% for all correct answers', async () => {
      const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
      const mockEnrollments = [createMockEnrollment({ student_id: 'student-1' })];
      const mockSessions = [createMockSession({ id: 'sess-1', user_id: 'student-1', class_id: validClassId })];
      const mockResponses = [
        { session_id: 'sess-1', is_correct: true },
        { session_id: 'sess-1', is_correct: true },
        { session_id: 'sess-1', is_correct: true },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({ data: mockClassData, error: null });
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else if (table === 'assessment_sessions') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockSessions, error: null })
          );
        } else if (table === 'assessment_responses') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockResponses, error: null })
          );
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(true);
      expect(result.data?.results[0].averageScore).toBe(100);
      expect(result.data?.results[0].correctAnswers).toBe(3);
      expect(result.data?.results[0].totalQuestions).toBe(3);
    });

    it('should calculate 0% for all incorrect answers', async () => {
      const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
      const mockEnrollments = [createMockEnrollment({ student_id: 'student-1' })];
      const mockSessions = [createMockSession({ id: 'sess-1', user_id: 'student-1', class_id: validClassId })];
      const mockResponses = [
        { session_id: 'sess-1', is_correct: false },
        { session_id: 'sess-1', is_correct: false },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({ data: mockClassData, error: null });
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else if (table === 'assessment_sessions') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockSessions, error: null })
          );
        } else if (table === 'assessment_responses') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockResponses, error: null })
          );
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(true);
      expect(result.data?.results[0].averageScore).toBe(0);
    });
  });

  // =====================================================
  // Invalid Student Profile Tests
  // =====================================================
  describe('Invalid Student Profiles', () => {
    beforeEach(() => {
      setupClassOwnershipSuccess();
    });

    const validClassId = '550e8400-e29b-41d4-a716-446655440000';

    it('should skip enrollments with invalid student profiles', async () => {
      const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
      const mockEnrollments = [
        createMockEnrollment({ student_id: 'student-1' }), // Valid
        { student_id: 'student-2', student_profiles: null }, // Invalid - null profile
        { student_id: 'student-3', student_profiles: { name: 123 } }, // Invalid - wrong type
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({ data: mockClassData, error: null });
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: [], error: null })
          );
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(true);
      // Only valid enrollment should be included
      expect(result.data?.results.length).toBe(1);
      expect(mockAuthLoggerWarn).toHaveBeenCalled();
    });
  });

  // =====================================================
  // fetchTeacherAssessmentOverviewFromDB Tests (via cache callback)
  // =====================================================
  describe('fetchTeacherAssessmentOverviewFromDB', () => {
    beforeEach(() => {
      setupTeacherAuthSuccess();
    });

    it('should fetch data from database when cache calls the callback', async () => {
      const mockClasses = [
        { id: 'class-1', name: 'Math Class', subject: 'Math' },
        { id: 'class-2', name: 'Science Class', subject: 'Science' },
      ];
      const mockEnrollments = [
        { class_id: 'class-1' },
        { class_id: 'class-1' },
        { class_id: 'class-2' },
      ];
      const mockSessions = [
        { id: 'sess-1', class_id: 'class-1' },
        { id: 'sess-2', class_id: 'class-2' },
      ];
      const mockResponses = [
        { session_id: 'sess-1', is_correct: true },
        { session_id: 'sess-1', is_correct: true },
        { session_id: 'sess-2', is_correct: false },
        { session_id: 'sess-2', is_correct: true },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockClasses, error: null })
          );
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else if (table === 'assessment_sessions') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockSessions, error: null })
          );
        } else if (table === 'assessment_responses') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockResponses, error: null })
          );
        }

        return builder;
      });

      // Execute the callback passed to getOrFetch
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      const result = await getTeacherAssessmentOverview();

      expect(result.success).toBe(true);
      expect(result.data?.classes).toHaveLength(2);
      expect(result.data?.totalAssessments).toBe(2);
    });

    it('should handle database error when fetching classes', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: null, error: { message: 'Database error' } })
          );
        }

        return builder;
      });

      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      const result = await getTeacherAssessmentOverview();

      expect(result.success).toBe(false);
    });

    it('should calculate overall average score across classes', async () => {
      const mockClasses = [
        { id: 'class-1', name: 'Class A', subject: null },
        { id: 'class-2', name: 'Class B', subject: null },
      ];
      const mockEnrollments = [
        { class_id: 'class-1' },
        { class_id: 'class-2' },
      ];
      const mockSessions = [
        { id: 'sess-1', class_id: 'class-1' },
        { id: 'sess-2', class_id: 'class-2' },
      ];
      // Class 1: 2/2 = 100%, Class 2: 1/2 = 50% => overall = 75%
      const mockResponses = [
        { session_id: 'sess-1', is_correct: true },
        { session_id: 'sess-1', is_correct: true },
        { session_id: 'sess-2', is_correct: true },
        { session_id: 'sess-2', is_correct: false },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockClasses, error: null })
          );
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else if (table === 'assessment_sessions') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockSessions, error: null })
          );
        } else if (table === 'assessment_responses') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockResponses, error: null })
          );
        }

        return builder;
      });

      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      const result = await getTeacherAssessmentOverview();

      expect(result.success).toBe(true);
      expect(result.data?.overallAverageScore).toBe(75);
    });

    it('should return null overall average when no assessments have responses', async () => {
      const mockClasses = [{ id: 'class-1', name: 'Empty Class', subject: null }];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockClasses, error: null })
          );
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: [], error: null })
          );
        }

        return builder;
      });

      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      const result = await getTeacherAssessmentOverview();

      expect(result.success).toBe(true);
      expect(result.data?.overallAverageScore).toBeNull();
    });
  });

  // =====================================================
  // Session Sorting Tests (line 141 coverage)
  // =====================================================
  describe('Session Sorting', () => {
    beforeEach(() => {
      setupClassOwnershipSuccess();
    });

    const validClassId = '550e8400-e29b-41d4-a716-446655440000';

    it('should use most recent session date as lastAssessmentDate', async () => {
      const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
      const mockEnrollments = [createMockEnrollment({ student_id: 'student-1' })];

      // Multiple sessions with different dates
      const mockSessions = [
        createMockSession({ id: 'sess-1', user_id: 'student-1', class_id: validClassId, submitted_at: '2024-01-01T10:00:00Z' }),
        createMockSession({ id: 'sess-2', user_id: 'student-1', class_id: validClassId, submitted_at: '2024-06-15T10:00:00Z' }), // Most recent
        createMockSession({ id: 'sess-3', user_id: 'student-1', class_id: validClassId, submitted_at: '2024-03-01T10:00:00Z' }),
      ];
      const mockResponses = [
        { session_id: 'sess-1', is_correct: true },
        { session_id: 'sess-2', is_correct: true },
        { session_id: 'sess-3', is_correct: true },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({ data: mockClassData, error: null });
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else if (table === 'assessment_sessions') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockSessions, error: null })
          );
        } else if (table === 'assessment_responses') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockResponses, error: null })
          );
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(true);
      // Should have the most recent date
      expect(result.data?.results[0].lastAssessmentDate).toBe('2024-06-15T10:00:00Z');
      expect(result.data?.results[0].sessionsCompleted).toBe(3);
    });
  });

  // =====================================================
  // Missing classData Edge Case (lines 328-332)
  // =====================================================
  describe('Missing classData Edge Case', () => {
    const validClassId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return error when classData is missing in auth response', async () => {
      // Setup class ownership without classData
      mockVerifyClassOwnership.mockResolvedValue({
        authorized: true,
        user: {
          id: 'teacher-123',
          email: 'teacher@test.com',
        },
        classData: null, // Missing classData
      });

      const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
      const mockEnrollments = [createMockEnrollment({ student_id: 'student-1' })];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({ data: mockClassData, error: null });
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: [], error: null })
          );
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Class data not found');
    });
  });

  // =====================================================
  // Name-based Sorting Tests
  // =====================================================
  describe('Name-based Sorting', () => {
    beforeEach(() => {
      setupClassOwnershipSuccess();
    });

    const validClassId = '550e8400-e29b-41d4-a716-446655440000';

    it('should sort by name when roll numbers are not available', async () => {
      const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
      const mockEnrollments = [
        createMockEnrollment({ student_id: 'student-1', student_profiles: { name: 'Zara', roll_number: null } }),
        createMockEnrollment({ student_id: 'student-2', student_profiles: { name: 'Alice', roll_number: null } }),
        createMockEnrollment({ student_id: 'student-3', student_profiles: { name: 'Mike', roll_number: null } }),
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({ data: mockClassData, error: null });
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: [], error: null })
          );
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(true);
      // Should be sorted by name: Alice, Mike, Zara
      expect(result.data?.results[0].studentName).toBe('Alice');
      expect(result.data?.results[1].studentName).toBe('Mike');
      expect(result.data?.results[2].studentName).toBe('Zara');
    });

    it('should handle mixed roll numbers and names in sorting', async () => {
      const mockClassData = createMockClass({ id: validClassId, teacher_id: 'teacher-123' });
      const mockEnrollments = [
        createMockEnrollment({ student_id: 'student-1', student_profiles: { name: 'Zara', roll_number: '01' } }),
        createMockEnrollment({ student_id: 'student-2', student_profiles: { name: 'Alice', roll_number: null } }),
        createMockEnrollment({ student_id: 'student-3', student_profiles: { name: 'Mike', roll_number: '02' } }),
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({ data: mockClassData, error: null });
        } else if (table === 'enrollments') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockEnrollments, error: null })
          );
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: [], error: null })
          );
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(true);
      // Students with roll numbers come first (sorted by roll), then by name
      expect(result.data?.results).toHaveLength(3);
    });
  });

  // =====================================================
  // ZodError Handling Tests
  // =====================================================
  describe('ZodError Handling', () => {
    beforeEach(() => {
      setupClassOwnershipSuccess();
    });

    it('should handle ZodError with proper message', async () => {
      // Mock handleZodError to return a proper error
      mockHandleZodError.mockReturnValue({ success: false, error: 'Class ID must be a valid UUID' });

      const result = await getClassAssessmentResults('not-a-uuid');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // =====================================================
  // Class Data Query Error Tests
  // =====================================================
  describe('Class Data Query Errors', () => {
    const validClassId = '550e8400-e29b-41d4-a716-446655440000';

    beforeEach(() => {
      setupClassOwnershipSuccess();
    });

    it('should return error when class data query fails', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          });
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not own');
    });

    it('should return error when class not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'classes') {
          builder.maybeSingle = jest.fn().mockResolvedValue({
            data: null,
            error: null,
          });
        }

        return builder;
      });

      const result = await getClassAssessmentResults(validClassId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not own');
    });
  });
});
