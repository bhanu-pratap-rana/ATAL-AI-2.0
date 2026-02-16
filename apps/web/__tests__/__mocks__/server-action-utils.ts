/**
 * Server Action Test Utilities
 *
 * Provides comprehensive mocking utilities for testing Next.js server actions
 * that use Supabase, rate limiting, and cache revalidation.
 */

import { jest } from '@jest/globals';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockUser,
  createMockSession as _createMockSession,
} from './supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;
type MockFn = ReturnType<typeof jest.fn<AnyFunction>>;

// Types for auth verification results
export interface AuthVerificationResult {
  authorized: boolean;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  error?: {
    success: false;
    error: string;
  };
}

export interface StudentAuthResult extends AuthVerificationResult {
  studentProfile?: {
    user_id: string;
    name: string;
    school_id?: string;
    class_name?: string;
  };
}

export interface TeacherAuthResult extends AuthVerificationResult {
  teacherProfile?: {
    user_id: string;
    name: string;
    school_id: string;
    school_code: string;
  };
}

// Mock Next.js cache functions
export const mockRevalidatePath = jest.fn<AnyFunction>();
export const mockRevalidateTag = jest.fn<AnyFunction>();

// Mock rate limiter functions
export const mockCheckRateLimit = jest.fn<AnyFunction>().mockReturnValue(true);
export const mockCheckStudentMutationRateLimit = jest.fn<AnyFunction>().mockReturnValue(true);
export const mockCheckTeacherMutationRateLimit = jest.fn<AnyFunction>().mockReturnValue(true);
export const mockCheckAdminRateLimit = jest.fn<AnyFunction>().mockReturnValue(true);

// Mock auth verification functions
export const mockVerifyStudentAuth: MockFn = jest.fn<AnyFunction>();
export const mockVerifyTeacherAuth: MockFn = jest.fn<AnyFunction>();
export const mockVerifyAdminAuth: MockFn = jest.fn<AnyFunction>();
export const mockVerifySuperAdminAuth: MockFn = jest.fn<AnyFunction>();
export const mockGetCurrentUser: MockFn = jest.fn<AnyFunction>();

/**
 * Setup default successful auth responses
 */
export function setupSuccessfulAuth(role: 'student' | 'teacher' | 'admin' | 'super_admin' = 'student') {
  const user = createMockUser({ id: `${role}-123`, email: `${role}@test.com` });

  mockGetCurrentUser.mockResolvedValue(user);

  if (role === 'student') {
    mockVerifyStudentAuth.mockResolvedValue({
      authorized: true,
      user: { id: user.id, email: user.email },
      studentProfile: {
        user_id: user.id,
        name: 'Test Student',
        school_id: 'school-123',
        class_name: 'Class 10',
      },
    });
  }

  if (role === 'teacher') {
    mockVerifyTeacherAuth.mockResolvedValue({
      authorized: true,
      user: { id: user.id, email: user.email },
      teacherProfile: {
        user_id: user.id,
        name: 'Test Teacher',
        school_id: 'school-123',
        school_code: 'SCH001',
      },
    });
  }

  if (role === 'admin') {
    mockVerifyAdminAuth.mockResolvedValue({
      authorized: true,
      user: { id: user.id, email: user.email, role: 'admin' },
    });
  }

  if (role === 'super_admin') {
    mockVerifySuperAdminAuth.mockResolvedValue({
      authorized: true,
      user: { id: user.id, email: user.email, role: 'super_admin' },
    });
    mockVerifyAdminAuth.mockResolvedValue({
      authorized: true,
      user: { id: user.id, email: user.email, role: 'super_admin' },
    });
  }

  return user;
}

/**
 * Setup unauthorized auth response
 */
export function setupUnauthorizedAuth() {
  const errorResponse = {
    authorized: false,
    error: { success: false as const, error: 'Unauthorized' },
  };

  mockVerifyStudentAuth.mockResolvedValue(errorResponse);
  mockVerifyTeacherAuth.mockResolvedValue(errorResponse);
  mockVerifyAdminAuth.mockResolvedValue(errorResponse);
  mockVerifySuperAdminAuth.mockResolvedValue(errorResponse);
  mockGetCurrentUser.mockResolvedValue(null);
}

/**
 * Setup rate limit exceeded
 */
export function setupRateLimitExceeded() {
  mockCheckRateLimit.mockReturnValue(false);
  mockCheckStudentMutationRateLimit.mockReturnValue(false);
  mockCheckTeacherMutationRateLimit.mockReturnValue(false);
  mockCheckAdminRateLimit.mockReturnValue(false);
}

/**
 * Reset rate limits to allow all
 */
export function resetRateLimits() {
  mockCheckRateLimit.mockReturnValue(true);
  mockCheckStudentMutationRateLimit.mockReturnValue(true);
  mockCheckTeacherMutationRateLimit.mockReturnValue(true);
  mockCheckAdminRateLimit.mockReturnValue(true);
}

/**
 * Create a mock Supabase client with pre-configured table responses
 */
export function createMockSupabaseWithData(tableData: Record<string, unknown[]>) {
  const mockClient = createMockSupabaseClient();

  mockClient.from = jest.fn<AnyFunction>((tableName: string) => {
    const data = tableData[tableName] || [];
    const builder = createMockQueryBuilder();

    // Override terminal methods to return the configured data
    builder.single = jest.fn<AnyFunction>().mockResolvedValue({
      data: data[0] || null,
      error: data.length === 0 ? { message: 'No rows found' } : null,
    });

    builder.maybeSingle = jest.fn<AnyFunction>().mockResolvedValue({
      data: data[0] || null,
      error: null,
    });

    // Make the builder thenable with the full data array
    builder.then = jest.fn<AnyFunction>().mockImplementation((resolve: AnyFunction) =>
      resolve({ data, error: null })
    );

    return builder;
  });

  return mockClient;
}

/**
 * Setup RPC mock responses
 */
export function setupRpcMock(
  mockClient: ReturnType<typeof createMockSupabaseClient>,
  rpcResponses: Record<string, { data: unknown; error: null } | { data: null; error: Error }>
) {
  mockClient.rpc = jest.fn<AnyFunction>((_fnName: string, _params?: Record<string, unknown>) => {
    const response = rpcResponses[_fnName];
    if (response) {
      return Promise.resolve(response);
    }
    return Promise.resolve({ data: null, error: null });
  });
}

/**
 * Get module mock configuration for jest.mock()
 */
export function getSupabaseServerMockConfig(mockClient: ReturnType<typeof createMockSupabaseClient>) {
  return {
    createClient: jest.fn<AnyFunction>(() => mockClient),
    createAdminClient: jest.fn<AnyFunction>(() => mockClient),
    getCurrentUser: mockGetCurrentUser,
    verifyStudentAuth: mockVerifyStudentAuth,
    verifyTeacherAuth: mockVerifyTeacherAuth,
    verifyAdminAuth: mockVerifyAdminAuth,
    verifySuperAdminAuth: mockVerifySuperAdminAuth,
  };
}

/**
 * Get Next.js cache mock configuration
 */
export function getNextCacheMockConfig() {
  return {
    revalidatePath: mockRevalidatePath,
    revalidateTag: mockRevalidateTag,
  };
}

/**
 * Get rate limiter mock configuration
 */
export function getRateLimiterMockConfig() {
  return {
    checkRateLimit: mockCheckRateLimit,
    checkStudentMutationRateLimit: mockCheckStudentMutationRateLimit,
    checkTeacherMutationRateLimit: mockCheckTeacherMutationRateLimit,
    checkAdminRateLimit: mockCheckAdminRateLimit,
  };
}

/**
 * Reset all server action mocks
 */
export function resetAllServerActionMocks() {
  // Reset Next.js cache mocks
  mockRevalidatePath.mockClear();
  mockRevalidateTag.mockClear();

  // Reset rate limiter mocks and restore defaults
  resetRateLimits();
  mockCheckRateLimit.mockClear();
  mockCheckStudentMutationRateLimit.mockClear();
  mockCheckTeacherMutationRateLimit.mockClear();
  mockCheckAdminRateLimit.mockClear();

  // Reset auth mocks
  mockVerifyStudentAuth.mockClear();
  mockVerifyTeacherAuth.mockClear();
  mockVerifyAdminAuth.mockClear();
  mockVerifySuperAdminAuth.mockClear();
  mockGetCurrentUser.mockClear();
}

/**
 * Create test data factories
 */
export const testDataFactories = {
  createStudent: (overrides = {}) => ({
    user_id: 'student-123',
    name: 'Test Student',
    gender: 'male',
    school_id: 'school-123',
    school_name: 'Test School',
    class_name: 'Class 10',
    roll_number: '01',
    phone: '+919876543210',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createTeacher: (overrides = {}) => ({
    user_id: 'teacher-123',
    name: 'Test Teacher',
    gender: 'female',
    school_id: 'school-123',
    school_code: 'SCH001',
    phone: '+919876543211',
    subject: 'Mathematics',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createSchool: (overrides = {}) => ({
    id: 'school-123',
    school_name: 'Test School',
    school_code: 'SCH001',
    district: 'Test District',
    block: 'Test Block',
    address: '123 Test Street',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  createClass: (overrides = {}) => ({
    id: 'class-123',
    name: 'Class 10A',
    teacher_id: 'teacher-123',
    class_code: 'CLS001',
    join_pin: '123456',
    subject: 'Mathematics',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  createAssessmentSession: (overrides = {}) => ({
    id: 'session-123',
    user_id: 'student-123',
    class_id: 'class-123',
    started_at: new Date().toISOString(),
    submitted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createAssessmentResponse: (overrides = {}) => ({
    id: 'response-123',
    session_id: 'session-123',
    item_id: 'item-123',
    user_id: 'student-123',
    module: 'math',
    chosen_option: '0',
    is_correct: true,
    rt_ms: 5000,
    focus_blur_count: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  createBadge: (overrides = {}) => ({
    id: 'badge-123',
    name_en: 'First Step',
    name_hi: 'पहला कदम',
    name_as: 'প্ৰথম খোজ',
    description: 'Complete your first lesson',
    icon: 'star',
    points_value: 10,
    rarity: 'common',
    unlock_criteria: { type: 'first_lesson' },
    cultural_note: null,
    ...overrides,
  }),

  createPointsHistory: (overrides = {}) => ({
    id: 'points-123',
    student_id: 'student-123',
    points: 10,
    source: 'lesson_complete',
    description: 'Completed lesson',
    created_at: new Date().toISOString(),
    ...overrides,
  }),
};

// Re-export Supabase utilities for convenience
export {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockUser,
  createMockSession,
  createMockAuth,
} from './supabase';
