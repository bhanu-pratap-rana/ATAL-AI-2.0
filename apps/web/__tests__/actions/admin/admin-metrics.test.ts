/**
 * Admin Metrics Server Actions Tests
 *
 * Tests for admin dashboard metrics, school statistics, and data aggregation.
 * Coverage: ~40 tests for 9 exported functions
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock modules before importing the module under test
const mockCreateAdminClient = jest.fn();
const mockVerifyAdminAuthAndRateLimit = jest.fn();
const mockFetchAllAuthUsers = jest.fn();
const mockQueryCacheGetOrFetch = jest.fn();
const mockAuthLoggerInfo = jest.fn();
const mockAuthLoggerError = jest.fn();
const mockAuthLoggerWarn = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createAdminClient: mockCreateAdminClient,
}));

jest.mock('@/lib/admin-utils', () => ({
  verifyAdminAuthAndRateLimit: mockVerifyAdminAuthAndRateLimit,
  fetchAllAuthUsers: mockFetchAllAuthUsers,
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

// Import after mocks are set up
import {
  getDashboardMetrics,
  getSchoolStatsByDistrict,
  getSchoolsWithActivePINs,
  getRecentActivityCount,
  getAllSchools,
  getAllTeachers,
  getAllStudents,
  getSchoolsWithoutPINs,
} from '@/app/actions/admin-metrics';

// Test data factories
const createMockSchool = (overrides = {}) => ({
  id: 'school-123',
  school_name: 'Test School',
  school_code: 'SCH001',
  district: 'Test District',
  block: 'Test Block',
  ...overrides,
});

const createMockTeacherProfile = (overrides = {}) => ({
  user_id: 'teacher-123',
  name: 'Test Teacher',
  phone: '+919876543210',
  school_code: 'SCH001',
  created_at: '2024-01-01T00:00:00Z',
  schools: [{ school_name: 'Test School' }],
  ...overrides,
});

const createMockStudentProfile = (overrides = {}) => ({
  user_id: 'student-123',
  name: 'Test Student',
  phone: '+919876543211',
  class_name: 'Class 10',
  school_name: 'Test School',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockAuthUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'user@test.com',
  app_metadata: { role: 'teacher' },
  user_metadata: {},
  last_sign_in_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockPIN = (overrides = {}) => ({
  id: 'pin-123',
  school_id: 'school-123',
  rotated_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...overrides,
});

// Helper to create mock Supabase query builder
const createMockQueryBuilder = () => {
  const builder: Record<string, jest.Mock> = {};

  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'is', 'not', 'gte', 'lte', 'order', 'limit'];

  methods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });

  // Terminal methods
  builder.single = jest.fn().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

  // Make thenable
  builder.then = jest.fn().mockImplementation((resolve) => resolve({ data: [], error: null }));

  return builder as unknown as ReturnType<typeof jest.fn>;
};

// Helper to setup admin auth success
const setupAdminAuthSuccess = () => {
  mockVerifyAdminAuthAndRateLimit.mockResolvedValue({
    authorized: true,
    user: { id: 'admin-123', email: 'admin@test.com', role: 'admin' },
  });
};

// Helper to setup admin auth failure
const setupAdminAuthFailure = (errorMessage = 'Unauthorized') => {
  mockVerifyAdminAuthAndRateLimit.mockResolvedValue({
    authorized: false,
    error: { success: false, error: errorMessage },
  });
};

describe('admin-metrics', () => {
  let mockSupabase: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnValue(createMockQueryBuilder()),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockCreateAdminClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =====================================================
  // getDashboardMetrics Tests
  // =====================================================
  describe('getDashboardMetrics', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAdminAuthFailure('Unauthorized');

        const result = await getDashboardMetrics();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });

      it('should reject rate-limited users', async () => {
        setupAdminAuthFailure('Rate limit exceeded');

        const result = await getDashboardMetrics();

        expect(result).toEqual({ success: false, error: 'Rate limit exceeded' });
      });

      it('should allow admin users', async () => {
        setupAdminAuthSuccess();
        mockQueryCacheGetOrFetch.mockResolvedValue({
          totalSchools: 5,
          totalTeachers: 10,
          totalStudents: 100,
          activePins: 5,
          inactivePins: 2,
          totalAdmins: 3,
        });

        const result = await getDashboardMetrics();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return dashboard metrics from cache', async () => {
        const mockMetrics = {
          totalSchools: 10,
          totalTeachers: 25,
          totalStudents: 500,
          activePins: 8,
          inactivePins: 2,
          totalAdmins: 5,
        };
        mockQueryCacheGetOrFetch.mockResolvedValue(mockMetrics);

        const result = await getDashboardMetrics();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockMetrics);
        expect(mockQueryCacheGetOrFetch).toHaveBeenCalledWith(
          'admin:dashboard:metrics',
          expect.any(Function),
          5 * 60 * 1000 // 5 minute TTL
        );
      });

      it('should use 5-minute cache TTL', async () => {
        mockQueryCacheGetOrFetch.mockResolvedValue({});

        await getDashboardMetrics();

        expect(mockQueryCacheGetOrFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Function),
          300000 // 5 minutes in ms
        );
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should handle cache fetch errors', async () => {
        mockQueryCacheGetOrFetch.mockRejectedValue(new Error('Cache error'));

        const result = await getDashboardMetrics();

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred');
      });
    });
  });

  // =====================================================
  // getSchoolStatsByDistrict Tests
  // =====================================================
  describe('getSchoolStatsByDistrict', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAdminAuthFailure();

        const result = await getSchoolStatsByDistrict();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return empty array when no schools exist', async () => {
        const schoolQueryBuilder = createMockQueryBuilder();
        schoolQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        );
        mockSupabase.from.mockReturnValue(schoolQueryBuilder);

        const result = await getSchoolStatsByDistrict();

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should return school statistics with metrics', async () => {
        const mockSchools = [
          createMockSchool({ id: 'school-1', school_name: 'School A', district: 'District A' }),
          createMockSchool({ id: 'school-2', school_name: 'School B', district: 'District B' }),
        ];

        const mockMetrics = [
          { school_id: 'school-1', school_name: 'School A', teacher_count: 5, student_count: 50, active_pin_count: 1, total_classes: 3 },
          { school_id: 'school-2', school_name: 'School B', teacher_count: 8, student_count: 80, active_pin_count: 2, total_classes: 5 },
        ];

        // Setup school query
        const schoolQueryBuilder = createMockQueryBuilder();
        schoolQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: mockSchools, error: null })
        );

        mockSupabase.from.mockReturnValue(schoolQueryBuilder);
        mockSupabase.rpc.mockResolvedValue({ data: mockMetrics, error: null });

        const result = await getSchoolStatsByDistrict();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
        expect(result.data?.[0]).toMatchObject({
          schoolId: 'school-1',
          schoolName: 'School A',
          districtName: 'District A',
          teacherCount: 5,
          studentCount: 50,
        });
      });

      it('should handle school query errors', async () => {
        const schoolQueryBuilder = createMockQueryBuilder();
        schoolQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: null, error: { message: 'Database error' } })
        );
        mockSupabase.from.mockReturnValue(schoolQueryBuilder);

        const result = await getSchoolStatsByDistrict();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch school statistics');
      });

      it('should handle RPC metrics errors', async () => {
        const mockSchools = [createMockSchool()];
        const schoolQueryBuilder = createMockQueryBuilder();
        schoolQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: mockSchools, error: null })
        );

        mockSupabase.from.mockReturnValue(schoolQueryBuilder);
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

        const result = await getSchoolStatsByDistrict();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch school statistics');
      });
    });
  });

  // =====================================================
  // getSchoolsWithActivePINs Tests
  // =====================================================
  describe('getSchoolsWithActivePINs', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAdminAuthFailure();

        const result = await getSchoolsWithActivePINs();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return empty array when no PINs exist', async () => {
        const pinQueryBuilder = createMockQueryBuilder();
        pinQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        );
        mockSupabase.from.mockReturnValue(pinQueryBuilder);

        const result = await getSchoolsWithActivePINs();

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should return schools with active PINs', async () => {
        const mockPINs = [
          createMockPIN({ school_id: 'school-1', rotated_at: '2024-06-01T00:00:00Z' }),
          createMockPIN({ school_id: 'school-2', rotated_at: null, created_at: '2024-01-01T00:00:00Z' }),
        ];

        const mockSchools = [
          createMockSchool({ id: 'school-1', school_name: 'School A', school_code: 'SCH001', district: 'District A' }),
          createMockSchool({ id: 'school-2', school_name: 'School B', school_code: 'SCH002', district: 'District B' }),
        ];

        // Mock different queries
        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          } else if (tableName === 'schools') {
            builder.in = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          }
          return builder;
        });

        const result = await getSchoolsWithActivePINs();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
        expect(result.data?.[0]).toMatchObject({
          schoolId: 'school-1',
          schoolName: 'School A',
          schoolCode: 'SCH001',
          districtName: 'District A',
          lastRotatedAt: '2024-06-01T00:00:00Z',
        });
      });

      it('should handle PIN query errors', async () => {
        const pinQueryBuilder = createMockQueryBuilder();
        pinQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: null, error: { message: 'PIN query error' } })
        );
        mockSupabase.from.mockReturnValue(pinQueryBuilder);

        const result = await getSchoolsWithActivePINs();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch PIN data');
      });
    });
  });

  // =====================================================
  // getRecentActivityCount Tests
  // =====================================================
  describe('getRecentActivityCount', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAdminAuthFailure();

        const result = await getRecentActivityCount();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return activity counts for default 7 days', async () => {
        const mockProfiles = [
          { created_at: new Date().toISOString() },
          { created_at: new Date(Date.now() - 86400000).toISOString() }, // Yesterday
        ];

        const activityQueryBuilder = createMockQueryBuilder();
        activityQueryBuilder.gte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.lte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: mockProfiles, error: null })
        );
        mockSupabase.from.mockReturnValue(activityQueryBuilder);

        const result = await getRecentActivityCount();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(7);
      });

      it('should return activity counts for custom days', async () => {
        const activityQueryBuilder = createMockQueryBuilder();
        activityQueryBuilder.gte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.lte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        );
        mockSupabase.from.mockReturnValue(activityQueryBuilder);

        const result = await getRecentActivityCount(14);

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(14);
      });

      it('should validate days parameter (min 1, max 365)', async () => {
        const activityQueryBuilder = createMockQueryBuilder();
        activityQueryBuilder.gte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.lte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        );
        mockSupabase.from.mockReturnValue(activityQueryBuilder);

        // Test with excessive days (should be capped at 365)
        const result = await getRecentActivityCount(1000);

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(365);
      });

      it('should aggregate counts by date', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const mockProfiles = [
          { created_at: `${todayStr}T10:00:00Z` },
          { created_at: `${todayStr}T11:00:00Z` },
          { created_at: `${todayStr}T12:00:00Z` },
        ];

        const activityQueryBuilder = createMockQueryBuilder();
        activityQueryBuilder.gte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.lte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: mockProfiles, error: null })
        );
        mockSupabase.from.mockReturnValue(activityQueryBuilder);

        const result = await getRecentActivityCount(1);

        expect(result.success).toBe(true);
        expect(result.data?.find(d => d.date === todayStr)?.count).toBe(3);
      });

      it('should handle profile query errors', async () => {
        const activityQueryBuilder = createMockQueryBuilder();
        activityQueryBuilder.gte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.lte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: null, error: { message: 'Query error' } })
        );
        mockSupabase.from.mockReturnValue(activityQueryBuilder);

        const result = await getRecentActivityCount();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch activity data');
      });
    });
  });

  // =====================================================
  // getAllSchools Tests
  // =====================================================
  describe('getAllSchools', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAdminAuthFailure();

        const result = await getAllSchools();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return all schools with PIN status', async () => {
        const mockSchools = [
          createMockSchool({ id: 'school-1', school_name: 'School A' }),
          createMockSchool({ id: 'school-2', school_name: 'School B' }),
        ];

        const mockPINs = [{ school_id: 'school-1' }];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'schools') {
            builder.order = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          } else if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          }
          return builder;
        });

        const result = await getAllSchools();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
        expect(result.data?.find(s => s.id === 'school-1')?.hasPIN).toBe(true);
        expect(result.data?.find(s => s.id === 'school-2')?.hasPIN).toBe(false);
      });

      it('should handle empty schools list', async () => {
        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: [], error: null })
          );
          return builder;
        });

        const result = await getAllSchools();

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should handle school query errors', async () => {
        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: null, error: { message: 'Query error' } })
          );
          return builder;
        });

        const result = await getAllSchools();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch schools');
      });
    });
  });

  // =====================================================
  // getAllTeachers Tests
  // =====================================================
  describe('getAllTeachers', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAdminAuthFailure();

        const result = await getAllTeachers();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return all teachers with school info', async () => {
        const mockProfiles = [
          createMockTeacherProfile({ user_id: 'teacher-1', name: 'Teacher A' }),
          createMockTeacherProfile({ user_id: 'teacher-2', name: 'Teacher B' }),
        ];

        const mockAuthUsers = [
          createMockAuthUser({ id: 'teacher-1', email: 'teacher1@test.com' }),
          createMockAuthUser({ id: 'teacher-2', email: 'teacher2@test.com' }),
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue(mockAuthUsers);

        const result = await getAllTeachers();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
        expect(result.data?.[0]).toMatchObject({
          id: 'teacher-1',
          name: 'Teacher A',
          email: 'teacher1@test.com',
        });
      });

      it('should skip profiles with missing school data', async () => {
        const mockProfiles = [
          createMockTeacherProfile({ user_id: 'teacher-1', schools: [] }), // No school
          createMockTeacherProfile({ user_id: 'teacher-2', name: 'Teacher B' }), // Valid
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue([
          createMockAuthUser({ id: 'teacher-2', email: 'teacher2@test.com' }),
        ]);

        const result = await getAllTeachers();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(mockAuthLoggerWarn).toHaveBeenCalled();
      });

      it('should handle profile query errors', async () => {
        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: null, error: { message: 'Profile error' } })
          );
          return builder;
        });

        const result = await getAllTeachers();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch teacher profiles');
      });
    });
  });

  // =====================================================
  // getAllStudents Tests
  // =====================================================
  describe('getAllStudents', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAdminAuthFailure();

        const result = await getAllStudents();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return all students with class info', async () => {
        const mockProfiles = [
          createMockStudentProfile({ user_id: 'student-1', name: 'Student A' }),
          createMockStudentProfile({ user_id: 'student-2', name: 'Student B' }),
        ];

        const mockAuthUsers = [
          createMockAuthUser({ id: 'student-1', email: 'student1@test.com', app_metadata: { role: 'student' } }),
          createMockAuthUser({ id: 'student-2', email: 'student2@test.com', app_metadata: { role: 'student' } }),
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue(mockAuthUsers);

        const result = await getAllStudents();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
        expect(result.data?.[0]).toMatchObject({
          id: 'student-1',
          name: 'Student A',
          email: 'student1@test.com',
        });
      });

      it('should hide email for username auth type students', async () => {
        const mockProfiles = [
          createMockStudentProfile({ user_id: 'student-1', name: 'Student A' }),
        ];

        const mockAuthUsers = [
          createMockAuthUser({
            id: 'student-1',
            email: 'student1_internal@generated.com',
            user_metadata: { auth_type: 'username', username: 'student1' },
          }),
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue(mockAuthUsers);

        const result = await getAllStudents();

        expect(result.success).toBe(true);
        expect(result.data?.[0].email).toBe('');
        expect(result.data?.[0].username).toBe('student1');
      });

      it('should skip profiles with missing required fields', async () => {
        const mockProfiles = [
          { user_id: null, name: 'Invalid', created_at: null }, // Missing required fields
          createMockStudentProfile({ user_id: 'student-2', name: 'Student B' }), // Valid
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue([
          createMockAuthUser({ id: 'student-2', email: 'student2@test.com' }),
        ]);

        const result = await getAllStudents();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(mockAuthLoggerWarn).toHaveBeenCalled();
      });

      it('should handle profile query errors', async () => {
        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: null, error: { message: 'Profile error' } })
          );
          return builder;
        });

        const result = await getAllStudents();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch student profiles');
      });
    });
  });

  // =====================================================
  // getSchoolsWithoutPINs Tests
  // =====================================================
  describe('getSchoolsWithoutPINs', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAdminAuthFailure();

        const result = await getSchoolsWithoutPINs();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return schools without PINs', async () => {
        const mockSchools = [
          createMockSchool({ id: 'school-1', school_name: 'School A' }),
          createMockSchool({ id: 'school-2', school_name: 'School B' }),
          createMockSchool({ id: 'school-3', school_name: 'School C' }),
        ];

        const mockPINs = [
          { school_id: 'school-1' }, // Only school-1 has PIN
        ];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'schools') {
            builder.order = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          } else if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          }
          return builder;
        });

        const result = await getSchoolsWithoutPINs();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2); // school-2 and school-3
        expect(result.data?.map(s => s.id)).toEqual(['school-2', 'school-3']);
      });

      it('should return all schools when no PINs exist', async () => {
        const mockSchools = [
          createMockSchool({ id: 'school-1', school_name: 'School A' }),
          createMockSchool({ id: 'school-2', school_name: 'School B' }),
        ];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'schools') {
            builder.order = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          } else if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: [], error: null })
            );
          }
          return builder;
        });

        const result = await getSchoolsWithoutPINs();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
      });

      it('should return empty when all schools have PINs', async () => {
        const mockSchools = [
          createMockSchool({ id: 'school-1', school_name: 'School A' }),
        ];

        const mockPINs = [{ school_id: 'school-1' }];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'schools') {
            builder.order = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          } else if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          }
          return builder;
        });

        const result = await getSchoolsWithoutPINs();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(0);
      });

      it('should handle school query errors', async () => {
        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: null, error: { message: 'Query error' } })
          );
          return builder;
        });

        const result = await getSchoolsWithoutPINs();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch schools');
      });
    });
  });

  // =====================================================
  // fetchDashboardMetricsFromDB Tests (via cache callback)
  // =====================================================
  describe('fetchDashboardMetricsFromDB', () => {
    beforeEach(() => {
      setupAdminAuthSuccess();
    });

    it('should fetch all metrics from database when cache calls callback', async () => {
      // Make cache call the actual function
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      // Mock parallel query results
      const credentialsCalls: number[] = [];
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'schools') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 10, error: null })
          );
        } else if (table === 'teacher_profiles') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 25, error: null })
          );
        } else if (table === 'student_profiles') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 500, error: null })
          );
        } else if (table === 'school_staff_credentials') {
          // Track calls for active/inactive PINs
          credentialsCalls.push(1);
          if (credentialsCalls.length === 1) {
            // First call - active PINs (is null)
            builder.is = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 8, error: null }),
            });
          } else {
            // Second call - inactive PINs (not null)
            builder.not = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 2, error: null }),
            });
          }
        }

        return builder;
      });

      mockFetchAllAuthUsers.mockResolvedValue([
        createMockAuthUser({ id: 'admin-1', app_metadata: { role: 'admin' } }),
        createMockAuthUser({ id: 'admin-2', app_metadata: { role: 'super_admin' } }),
        createMockAuthUser({ id: 'teacher-1', app_metadata: { role: 'teacher' } }),
      ]);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.totalSchools).toBeDefined();
    });

    it('should throw error when school query fails', async () => {
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();
        if (table === 'schools') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: null, error: { message: 'School query failed' } })
          );
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 0, error: null })
          );
          builder.is = jest.fn().mockReturnValue({
            then: (resolve: (val: unknown) => void) => resolve({ count: 0, error: null }),
          });
          builder.not = jest.fn().mockReturnValue({
            then: (resolve: (val: unknown) => void) => resolve({ count: 0, error: null }),
          });
        }
        return builder;
      });

      mockFetchAllAuthUsers.mockResolvedValue([]);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(false);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should throw error when fetchAllAuthUsers fails', async () => {
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      mockSupabase.from.mockImplementation((_table: string) => {
        const builder = createMockQueryBuilder();
        builder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ count: 5, error: null })
        );
        builder.is = jest.fn().mockReturnValue({
          then: (resolve: (val: unknown) => void) => resolve({ count: 0, error: null }),
        });
        builder.not = jest.fn().mockReturnValue({
          then: (resolve: (val: unknown) => void) => resolve({ count: 0, error: null }),
        });
        return builder;
      });

      mockFetchAllAuthUsers.mockRejectedValue(new Error('Auth users fetch failed'));

      const result = await getDashboardMetrics();

      expect(result.success).toBe(false);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should handle teacher profile query error gracefully and continue', async () => {
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'schools') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 10, error: null })
          );
        } else if (table === 'teacher_profiles') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: null, error: { message: 'Teacher query failed' } })
          );
        } else if (table === 'student_profiles') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 100, error: null })
          );
        } else if (table === 'school_staff_credentials') {
          callCount++;
          if (callCount === 1) {
            builder.is = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 5, error: null }),
            });
          } else {
            builder.not = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 2, error: null }),
            });
          }
        }

        return builder;
      });

      mockFetchAllAuthUsers.mockResolvedValue([
        createMockAuthUser({ id: 'teacher-1', app_metadata: { role: 'teacher' } }),
      ]);

      const result = await getDashboardMetrics();

      // Should succeed despite teacher profile error
      expect(result.success).toBe(true);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should use higher count between profile and auth users for teachers', async () => {
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      let credCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'schools') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 5, error: null })
          );
        } else if (table === 'teacher_profiles') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 10, error: null }) // 10 from profiles
          );
        } else if (table === 'student_profiles') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 100, error: null })
          );
        } else if (table === 'school_staff_credentials') {
          credCallCount++;
          if (credCallCount === 1) {
            builder.is = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 5, error: null }),
            });
          } else {
            builder.not = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 2, error: null }),
            });
          }
        }

        return builder;
      });

      // 15 teachers from auth users (more than 10 from profiles)
      mockFetchAllAuthUsers.mockResolvedValue([
        ...Array(15).fill(null).map((_, i) =>
          createMockAuthUser({ id: `teacher-${i}`, app_metadata: { role: 'teacher' } })
        ),
        createMockAuthUser({ id: 'admin-1', app_metadata: { role: 'admin' } }),
      ]);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(true);
      // Should use max(10 from profiles, 15 from auth) = 15
      expect(result.data?.totalTeachers).toBe(15);
      expect(result.data?.totalAdmins).toBe(1);
    });

    it('should handle student profile query error gracefully', async () => {
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      let credCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'schools') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 5, error: null })
          );
        } else if (table === 'teacher_profiles') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 10, error: null })
          );
        } else if (table === 'student_profiles') {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: null, error: { message: 'Student query failed' } })
          );
        } else if (table === 'school_staff_credentials') {
          credCallCount++;
          if (credCallCount === 1) {
            builder.is = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 3, error: null }),
            });
          } else {
            builder.not = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 1, error: null }),
            });
          }
        }

        return builder;
      });

      mockFetchAllAuthUsers.mockResolvedValue([]);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.totalStudents).toBe(0);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should handle active PIN query error gracefully', async () => {
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      let credCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'school_staff_credentials') {
          credCallCount++;
          if (credCallCount === 1) {
            // Active PINs query error
            builder.is = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: null, error: { message: 'PIN error' } }),
            });
          } else {
            builder.not = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 2, error: null }),
            });
          }
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 5, error: null })
          );
        }

        return builder;
      });

      mockFetchAllAuthUsers.mockResolvedValue([]);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.activePins).toBe(0);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should handle inactive PIN query error gracefully', async () => {
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      let credCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'school_staff_credentials') {
          credCallCount++;
          if (credCallCount === 1) {
            builder.is = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 5, error: null }),
            });
          } else {
            // Inactive PINs query error
            builder.not = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: null, error: { message: 'Inactive PIN error' } }),
            });
          }
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 5, error: null })
          );
        }

        return builder;
      });

      mockFetchAllAuthUsers.mockResolvedValue([]);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.inactivePins).toBe(0);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should handle empty auth users array', async () => {
      mockQueryCacheGetOrFetch.mockImplementation(async (_key: string, fetchFn: () => Promise<unknown>) => {
        return fetchFn();
      });

      let credCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = createMockQueryBuilder();

        if (table === 'school_staff_credentials') {
          credCallCount++;
          if (credCallCount === 1) {
            builder.is = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 3, error: null }),
            });
          } else {
            builder.not = jest.fn().mockReturnValue({
              then: (resolve: (val: unknown) => void) => resolve({ count: 1, error: null }),
            });
          }
        } else {
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ count: 5, error: null })
          );
        }

        return builder;
      });

      mockFetchAllAuthUsers.mockResolvedValue([]);

      const result = await getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.totalAdmins).toBe(0);
    });
  });

  // =====================================================
  // Additional Edge Case Tests
  // =====================================================
  describe('Additional Edge Cases', () => {
    beforeEach(() => {
      setupAdminAuthSuccess();
    });

    describe('getSchoolsWithActivePINs edge cases', () => {
      it('should handle missing school_code with N/A fallback', async () => {
        const mockPINs = [createMockPIN({ school_id: 'school-1' })];
        const mockSchools = [createMockSchool({ id: 'school-1', school_code: null })];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          } else if (tableName === 'schools') {
            builder.in = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          }
          return builder;
        });

        const result = await getSchoolsWithActivePINs();

        expect(result.success).toBe(true);
        expect(result.data?.[0].schoolCode).toBe('N/A');
      });

      it('should handle missing district with Unknown fallback', async () => {
        const mockPINs = [createMockPIN({ school_id: 'school-1' })];
        const mockSchools = [createMockSchool({ id: 'school-1', district: null })];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          } else if (tableName === 'schools') {
            builder.in = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          }
          return builder;
        });

        const result = await getSchoolsWithActivePINs();

        expect(result.success).toBe(true);
        expect(result.data?.[0].districtName).toBe('Unknown');
      });

      it('should use created_at when rotated_at is null', async () => {
        const mockPINs = [createMockPIN({ school_id: 'school-1', rotated_at: null, created_at: '2024-01-15T00:00:00Z' })];
        const mockSchools = [createMockSchool({ id: 'school-1' })];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          } else if (tableName === 'schools') {
            builder.in = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          }
          return builder;
        });

        const result = await getSchoolsWithActivePINs();

        expect(result.success).toBe(true);
        expect(result.data?.[0].lastRotatedAt).toBe('2024-01-15T00:00:00Z');
      });

      it('should handle school query errors', async () => {
        const mockPINs = [createMockPIN({ school_id: 'school-1' })];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          } else if (tableName === 'schools') {
            builder.in = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: null, error: { message: 'School query error' } })
            );
          }
          return builder;
        });

        const result = await getSchoolsWithActivePINs();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch school data');
      });
    });

    describe('getRecentActivityCount edge cases', () => {
      it('should handle minimum days parameter (less than 1)', async () => {
        const activityQueryBuilder = createMockQueryBuilder();
        activityQueryBuilder.gte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.lte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        );
        mockSupabase.from.mockReturnValue(activityQueryBuilder);

        const result = await getRecentActivityCount(-5); // Invalid, should be capped to 1

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
      });

      it('should handle float days parameter', async () => {
        const activityQueryBuilder = createMockQueryBuilder();
        activityQueryBuilder.gte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.lte = jest.fn().mockReturnValue(activityQueryBuilder);
        activityQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: [], error: null })
        );
        mockSupabase.from.mockReturnValue(activityQueryBuilder);

        const result = await getRecentActivityCount(3.7); // Should floor to 3

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(3);
      });
    });

    describe('getSchoolStatsByDistrict edge cases', () => {
      it('should handle unknown district fallback', async () => {
        const mockSchools = [
          createMockSchool({ id: 'school-1', school_name: 'School A', district: null }),
        ];

        const mockMetrics = [
          { school_id: 'school-1', school_name: 'School A', teacher_count: 5, student_count: 50, active_pin_count: 1, total_classes: 3 },
        ];

        const schoolQueryBuilder = createMockQueryBuilder();
        schoolQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: mockSchools, error: null })
        );

        mockSupabase.from.mockReturnValue(schoolQueryBuilder);
        mockSupabase.rpc.mockResolvedValue({ data: mockMetrics, error: null });

        const result = await getSchoolStatsByDistrict();

        expect(result.success).toBe(true);
        expect(result.data?.[0].districtName).toBe('Unknown');
      });

      it('should filter metrics to only include known schools', async () => {
        const mockSchools = [
          createMockSchool({ id: 'school-1', school_name: 'School A', district: 'District A' }),
        ];

        // RPC returns metrics for schools not in our list (school-2)
        const mockMetrics = [
          { school_id: 'school-1', school_name: 'School A', teacher_count: 5, student_count: 50, active_pin_count: 1, total_classes: 3 },
          { school_id: 'school-2', school_name: 'School B', teacher_count: 10, student_count: 100, active_pin_count: 2, total_classes: 5 },
        ];

        const schoolQueryBuilder = createMockQueryBuilder();
        schoolQueryBuilder.then = jest.fn().mockImplementation((resolve) =>
          resolve({ data: mockSchools, error: null })
        );

        mockSupabase.from.mockReturnValue(schoolQueryBuilder);
        mockSupabase.rpc.mockResolvedValue({ data: mockMetrics, error: null });

        const result = await getSchoolStatsByDistrict();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1); // Only school-1
        expect(result.data?.[0].schoolId).toBe('school-1');
      });
    });

    describe('getAllSchools edge cases', () => {
      it('should handle missing school_code with N/A fallback', async () => {
        const mockSchools = [createMockSchool({ id: 'school-1', school_code: null })];
        const mockPINs: unknown[] = [];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'schools') {
            builder.order = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          } else if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockPINs, error: null })
            );
          }
          return builder;
        });

        const result = await getAllSchools();

        expect(result.success).toBe(true);
        expect(result.data?.[0].schoolCode).toBe('N/A');
      });

      it('should handle missing district with Unknown fallback', async () => {
        const mockSchools = [createMockSchool({ id: 'school-1', district: null })];

        mockSupabase.from.mockImplementation((tableName: string) => {
          const builder = createMockQueryBuilder();
          if (tableName === 'schools') {
            builder.order = jest.fn().mockReturnValue(builder);
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: mockSchools, error: null })
            );
          } else if (tableName === 'school_staff_credentials') {
            builder.then = jest.fn().mockImplementation((resolve) =>
              resolve({ data: [], error: null })
            );
          }
          return builder;
        });

        const result = await getAllSchools();

        expect(result.success).toBe(true);
        expect(result.data?.[0].district).toBe('Unknown');
      });
    });

    describe('getAllTeachers edge cases', () => {
      it('should handle empty profiles list', async () => {
        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: [], error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue([]);

        const result = await getAllTeachers();

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should handle missing auth user for profile', async () => {
        const mockProfiles = [
          createMockTeacherProfile({ user_id: 'teacher-1', name: 'Teacher A' }),
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        // No matching auth user
        mockFetchAllAuthUsers.mockResolvedValue([]);

        const result = await getAllTeachers();

        expect(result.success).toBe(true);
        expect(result.data?.[0].email).toBe(''); // Empty email when no auth user
      });

      it('should handle null name with Unknown fallback', async () => {
        const mockProfiles = [
          createMockTeacherProfile({ user_id: 'teacher-1', name: null }),
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue([]);

        const result = await getAllTeachers();

        expect(result.success).toBe(true);
        expect(result.data?.[0].name).toBe('Unknown');
      });

      it('should handle null school_code with N/A fallback', async () => {
        const mockProfiles = [
          createMockTeacherProfile({ user_id: 'teacher-1', school_code: null }),
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue([]);

        const result = await getAllTeachers();

        expect(result.success).toBe(true);
        expect(result.data?.[0].schoolCode).toBe('N/A');
      });
    });

    describe('getAllStudents edge cases', () => {
      it('should handle null name with Unknown fallback', async () => {
        const mockProfiles = [
          createMockStudentProfile({ user_id: 'student-1', name: null }),
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue([]);

        const result = await getAllStudents();

        expect(result.success).toBe(true);
        expect(result.data?.[0].name).toBe('Unknown');
      });

      it('should handle null lastSignIn from auth user', async () => {
        const mockProfiles = [
          createMockStudentProfile({ user_id: 'student-1', name: 'Student A' }),
        ];

        mockSupabase.from.mockImplementation(() => {
          const builder = createMockQueryBuilder();
          builder.order = jest.fn().mockReturnValue(builder);
          builder.then = jest.fn().mockImplementation((resolve) =>
            resolve({ data: mockProfiles, error: null })
          );
          return builder;
        });

        mockFetchAllAuthUsers.mockResolvedValue([
          createMockAuthUser({ id: 'student-1', last_sign_in_at: null }),
        ]);

        const result = await getAllStudents();

        expect(result.success).toBe(true);
        expect(result.data?.[0].lastSignIn).toBeNull();
      });
    });
  });

  // =====================================================
  // Cross-cutting Concerns
  // =====================================================
  describe('Cross-cutting Concerns', () => {
    describe('Logging', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should log errors on database failures', async () => {
        mockQueryCacheGetOrFetch.mockRejectedValue(new Error('Cache error'));

        await getDashboardMetrics();

        expect(mockAuthLoggerError).toHaveBeenCalled();
      });

      it('should log successful operations', async () => {
        mockQueryCacheGetOrFetch.mockResolvedValue({
          totalSchools: 5,
          totalTeachers: 10,
          totalStudents: 100,
          activePins: 5,
          inactivePins: 2,
          totalAdmins: 3,
        });

        await getDashboardMetrics();

        expect(mockAuthLoggerInfo).toHaveBeenCalled();
      });
    });

    describe('Unexpected Errors', () => {
      beforeEach(() => {
        setupAdminAuthSuccess();
      });

      it('should return generic error message for unexpected errors', async () => {
        mockQueryCacheGetOrFetch.mockRejectedValue(new Error('Unexpected'));

        const result = await getDashboardMetrics();

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred');
      });
    });
  });
});
