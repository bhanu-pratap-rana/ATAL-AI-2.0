/**
 * Admin Management Server Actions Tests
 *
 * Tests for admin account CRUD operations.
 * Coverage: ~35 tests for 8 exported functions
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;
type MockFn = ReturnType<typeof jest.fn<AnyFunction>>;

// Mock modules before importing the module under test
const mockCreateAdminClient: MockFn = jest.fn<AnyFunction>();
const mockVerifySuperAdminAuth: MockFn = jest.fn<AnyFunction>();
const mockVerifyAdminAuth: MockFn = jest.fn<AnyFunction>();
const mockGetCurrentUser: MockFn = jest.fn<AnyFunction>();
const mockCheckRateLimit: MockFn = jest.fn<AnyFunction>();
const mockValidateSupabaseAuthUsers: MockFn = jest.fn<AnyFunction>();
const mockHandleZodError: MockFn = jest.fn<AnyFunction>();
const mockAuthLoggerInfo: MockFn = jest.fn<AnyFunction>();
const mockAuthLoggerError: MockFn = jest.fn<AnyFunction>();
const mockAuthLoggerWarn: MockFn = jest.fn<AnyFunction>();
const mockAuthLoggerSuccess: MockFn = jest.fn<AnyFunction>();
const mockIsSuperAdmin: MockFn = jest.fn<AnyFunction>();
const mockIsAdmin: MockFn = jest.fn<AnyFunction>();

jest.mock('@/lib/supabase-server', () => ({
  createAdminClient: mockCreateAdminClient,
  verifySuperAdminAuth: mockVerifySuperAdminAuth,
  verifyAdminAuth: mockVerifyAdminAuth,
  getCurrentUser: mockGetCurrentUser,
}));

jest.mock('@/lib/auth-logger', () => ({
  authLogger: {
    info: mockAuthLoggerInfo,
    error: mockAuthLoggerError,
    warn: mockAuthLoggerWarn,
    success: mockAuthLoggerSuccess,
  },
}));

jest.mock('@/lib/rate-limiter-distributed', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

jest.mock('@/lib/auth/role-utils', () => ({
  isSuperAdmin: mockIsSuperAdmin,
  isAdmin: mockIsAdmin,
}));

jest.mock('@/lib/validation/rpc-schemas', () => ({
  validateSupabaseAuthUsers: mockValidateSupabaseAuthUsers,
}));

jest.mock('@/lib/action-error-handler', () => ({
  handleZodError: mockHandleZodError,
}));

// Import after mocks are set up
import {
  isCurrentUserSuperAdmin,
  getCurrentAdminRole,
  createAdminAccount,
  listAdminAccounts,
  deleteAdminAccount,
  resetAdminPassword,
  isSuperAdminEmail,
  getAdminById,
} from '@/app/actions/admin-management';

// Test data factories
const createMockAuthUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'user@test.com',
  app_metadata: { role: 'teacher' },
  user_metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Helper to setup super admin auth success
const setupSuperAdminAuthSuccess = () => {
  mockVerifySuperAdminAuth.mockResolvedValue({
    authorized: true,
    user: {
      id: 'super-admin-123',
      email: 'super@test.com',
      app_metadata: { role: 'super_admin' },
    },
  });
};

// Helper to setup admin auth success
const _setupAdminAuthSuccess = () => {
  mockVerifyAdminAuth.mockResolvedValue({
    authorized: true,
    user: {
      id: 'admin-123',
      email: 'admin@test.com',
      app_metadata: { role: 'admin' },
    },
  });
};

// Helper to setup auth failure
const setupAuthFailure = (errorMessage = 'Unauthorized') => {
  const errorResult = {
    authorized: false,
    error: { success: false, error: errorMessage },
  };
  mockVerifySuperAdminAuth.mockResolvedValue(errorResult);
  mockVerifyAdminAuth.mockResolvedValue(errorResult);
};

describe('admin-management', () => {
  let mockSupabase: Record<string, MockFn | Record<string, MockFn | Record<string, MockFn>>>;
  let mockAdminAuth: Record<string, MockFn>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock admin auth methods
    mockAdminAuth = {
      listUsers: jest.fn<AnyFunction>().mockResolvedValue({
        data: { users: [] },
        error: null,
      }),
      getUserById: jest.fn<AnyFunction>().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      createUser: jest.fn<AnyFunction>().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      updateUserById: jest.fn<AnyFunction>().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      deleteUser: jest.fn<AnyFunction>().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    // Setup default mock Supabase client
    mockSupabase = {
      auth: {
        admin: mockAdminAuth,
      },
      from: jest.fn<AnyFunction>().mockReturnValue({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({ data: null, error: null }),
      }),
    };
    mockCreateAdminClient.mockResolvedValue(mockSupabase);

    // Default rate limit to allow
    mockCheckRateLimit.mockResolvedValue(true);

    // Default validation to pass through
    mockValidateSupabaseAuthUsers.mockImplementation((users: unknown[]) => users);

    // Default error handler
    mockHandleZodError.mockReturnValue({ error: 'Invalid input' });

    // Default role checks
    mockIsSuperAdmin.mockReturnValue(false);
    mockIsAdmin.mockImplementation((role: string) => role === 'admin' || role === 'super_admin');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =====================================================
  // isCurrentUserSuperAdmin Tests
  // =====================================================
  describe('isCurrentUserSuperAdmin', () => {
    it('should return true for super admin users', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        app_metadata: { role: 'super_admin' },
      });
      mockIsSuperAdmin.mockReturnValue(true);

      const result = await isCurrentUserSuperAdmin();

      expect(result).toBe(true);
    });

    it('should return false for non-super admin users', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        app_metadata: { role: 'admin' },
      });
      mockIsSuperAdmin.mockReturnValue(false);

      const result = await isCurrentUserSuperAdmin();

      expect(result).toBe(false);
    });

    it('should return false when no user is logged in', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await isCurrentUserSuperAdmin();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Auth error'));

      const result = await isCurrentUserSuperAdmin();

      expect(result).toBe(false);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });
  });

  // =====================================================
  // getCurrentAdminRole Tests
  // =====================================================
  describe('getCurrentAdminRole', () => {
    it('should return super_admin for super admin users', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        app_metadata: { role: 'super_admin' },
      });
      mockIsAdmin.mockReturnValue(true);

      const result = await getCurrentAdminRole();

      expect(result).toBe('super_admin');
    });

    it('should return admin for admin users', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        app_metadata: { role: 'admin' },
      });
      mockIsAdmin.mockReturnValue(true);

      const result = await getCurrentAdminRole();

      expect(result).toBe('admin');
    });

    it('should return null for non-admin users', async () => {
      mockGetCurrentUser.mockResolvedValue({
        id: 'user-123',
        app_metadata: { role: 'teacher' },
      });
      mockIsAdmin.mockReturnValue(false);

      const result = await getCurrentAdminRole();

      expect(result).toBe(null);
    });

    it('should return null when no user is logged in', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await getCurrentAdminRole();

      expect(result).toBe(null);
    });

    it('should return null on error', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Auth error'));

      const result = await getCurrentAdminRole();

      expect(result).toBe(null);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });
  });

  // =====================================================
  // createAdminAccount Tests
  // =====================================================
  describe('createAdminAccount', () => {
    describe('Authorization', () => {
      it('should reject non-super-admin users', async () => {
        setupAuthFailure();

        const result = await createAdminAccount('newadmin@test.com', 'Pass123!', 'admin');

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should reject invalid email format', async () => {
        const result = await createAdminAccount('invalid-email', 'Pass123!');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject empty password', async () => {
        const result = await createAdminAccount('valid@test.com', '');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Rate Limiting', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should reject rate-limited requests', async () => {
        mockCheckRateLimit.mockResolvedValue(false);

        const result = await createAdminAccount('newadmin@test.com', 'Pass123!');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Too many requests');
      });
    });

    describe('Creating New Admin', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [] },
          error: null,
        });
      });

      it('should create new admin user successfully', async () => {
        mockAdminAuth.createUser.mockResolvedValue({
          data: { user: { id: 'new-admin-123' } },
          error: null,
        });
        mockAdminAuth.updateUserById.mockResolvedValue({
          data: { user: { id: 'new-admin-123' } },
          error: null,
        });

        const result = await createAdminAccount('newadmin@test.com', 'Pass123!', 'admin');

        expect(result.success).toBe(true);
        expect(result.message).toContain('Admin account created');
      });

      it('should rollback on role assignment failure', async () => {
        mockAdminAuth.createUser.mockResolvedValue({
          data: { user: { id: 'new-admin-123' } },
          error: null,
        });
        mockAdminAuth.updateUserById.mockResolvedValue({
          data: null,
          error: { message: 'Role assignment failed' },
        });
        mockAdminAuth.deleteUser.mockResolvedValue({
          error: null,
        });

        const result = await createAdminAccount('newadmin@test.com', 'Pass123!');

        expect(result.success).toBe(false);
        expect(result.error).toContain('rolled back');
      });
    });

    describe('Promoting Existing User', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should reject if user is already admin', async () => {
        const existingAdmin = createMockAuthUser({
          id: 'existing-admin-123',
          email: 'existing@test.com',
          app_metadata: { role: 'admin' },
        });
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [existingAdmin] },
          error: null,
        });
        mockValidateSupabaseAuthUsers.mockReturnValue([existingAdmin]);

        const result = await createAdminAccount('existing@test.com', 'Pass123!');

        expect(result.success).toBe(false);
        expect(result.error).toContain('already an Admin');
      });

      it('should block promotion of student accounts', async () => {
        const studentUser = createMockAuthUser({
          id: 'student-123',
          email: 'student@test.com',
          app_metadata: { role: 'student' },
        });
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [studentUser] },
          error: null,
        });
        mockValidateSupabaseAuthUsers.mockReturnValue([studentUser]);

        // Mock that user has student profile but no teacher profile
        (mockSupabase.from as jest.Mock).mockImplementation((_table: string) => ({
          select: jest.fn<AnyFunction>().mockReturnThis(),
          eq: jest.fn<AnyFunction>().mockReturnThis(),
          maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({
            data: table === 'student_profiles' ? { user_id: 'student-123' } : null,
            error: null,
          }),
        }));

        const result = await createAdminAccount('student@test.com', 'Pass123!');

        expect(result.success).toBe(false);
        expect(result.error).toContain('student account');
      });
    });
  });

  // =====================================================
  // listAdminAccounts Tests
  // =====================================================
  describe('listAdminAccounts', () => {
    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAuthFailure();

        const result = await listAdminAccounts();

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should return empty array when no admins exist', async () => {
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [] },
          error: null,
        });

        const result = await listAdminAccounts();

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should return only admin users', async () => {
        const users = [
          createMockAuthUser({ id: 'admin-1', email: 'admin1@test.com', app_metadata: { role: 'admin' } }),
          createMockAuthUser({ id: 'teacher-1', email: 'teacher@test.com', app_metadata: { role: 'teacher' } }),
          createMockAuthUser({ id: 'super-1', email: 'super@test.com', app_metadata: { role: 'super_admin' } }),
        ];
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users },
          error: null,
        });
        mockValidateSupabaseAuthUsers.mockReturnValue(users);

        const result = await listAdminAccounts();

        expect(result.success).toBe(true);
        expect((result.data as Array<{ id: string }>).length).toBe(2); // Only admin and super_admin
      });
    });
  });

  // =====================================================
  // deleteAdminAccount Tests
  // =====================================================
  describe('deleteAdminAccount', () => {
    // Use valid UUIDs for tests since validation runs before auth
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    const superAdminUUID = '550e8400-e29b-41d4-a716-446655440001';
    const otherSuperAdminUUID = '550e8400-e29b-41d4-a716-446655440002';
    const adminToDeleteUUID = '550e8400-e29b-41d4-a716-446655440003';

    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAuthFailure();

        const result = await deleteAdminAccount(validUUID);

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Validation', () => {
      it('should reject invalid admin ID', async () => {
        setupSuperAdminAuthSuccess();

        const result = await deleteAdminAccount('');

        expect(result.success).toBe(false);
      });
    });

    describe('Security Rules', () => {
      beforeEach(() => {
        // Override with UUID-based super admin
        mockVerifySuperAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: superAdminUUID,
            email: 'super@test.com',
            app_metadata: { role: 'super_admin' },
          },
        });
      });

      it('should prevent self-deletion', async () => {
        // The auth returns user id superAdminUUID
        const result = await deleteAdminAccount(superAdminUUID);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot delete your own account');
      });

      it('should prevent deletion of super admins', async () => {
        const superAdmin = createMockAuthUser({
          id: otherSuperAdminUUID,
          email: 'other@test.com',
          app_metadata: { role: 'super_admin' },
        });
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [superAdmin] },
          error: null,
        });
        mockValidateSupabaseAuthUsers.mockReturnValue([superAdmin]);
        mockIsSuperAdmin.mockReturnValue(true);

        const result = await deleteAdminAccount(otherSuperAdminUUID);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot delete super admin');
      });
    });

    describe('Deletion', () => {
      beforeEach(() => {
        // Override with UUID-based super admin
        mockVerifySuperAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: superAdminUUID,
            email: 'super@test.com',
            app_metadata: { role: 'super_admin' },
          },
        });
      });

      it('should delete admin account successfully', async () => {
        const adminToDelete = createMockAuthUser({
          id: adminToDeleteUUID,
          email: 'delete@test.com',
          app_metadata: { role: 'admin' },
        });
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [adminToDelete] },
          error: null,
        });
        mockValidateSupabaseAuthUsers.mockReturnValue([adminToDelete]);
        mockIsSuperAdmin.mockReturnValue(false);

        const result = await deleteAdminAccount(adminToDeleteUUID);

        expect(result.success).toBe(true);
        expect(mockAdminAuth.deleteUser).toHaveBeenCalledWith(adminToDeleteUUID);
      });

      it('should return error if admin not found', async () => {
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [] },
          error: null,
        });

        const result = await deleteAdminAccount(validUUID);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });
  });

  // =====================================================
  // resetAdminPassword Tests
  // =====================================================
  describe('resetAdminPassword', () => {
    // Use valid UUIDs for tests since validation runs before auth
    const adminUUID = '550e8400-e29b-41d4-a716-446655440010';
    const otherAdminUUID = '550e8400-e29b-41d4-a716-446655440011';
    const superAdminUUID = '550e8400-e29b-41d4-a716-446655440012';

    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAuthFailure();

        const result = await resetAdminPassword(adminUUID, 'NewPass123!');

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Permission Rules', () => {
      it('should allow regular admin to reset own password', async () => {
        mockVerifyAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: adminUUID,
            email: 'admin@test.com',
            app_metadata: { role: 'admin' },
          },
        });
        mockAdminAuth.updateUserById.mockResolvedValue({
          data: { user: { id: adminUUID } },
          error: null,
        });

        const result = await resetAdminPassword(adminUUID, 'NewPass123!');

        expect(result.success).toBe(true);
      });

      it('should reject regular admin resetting other passwords', async () => {
        mockVerifyAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: adminUUID,
            email: 'admin@test.com',
            app_metadata: { role: 'admin' },
          },
        });

        const result = await resetAdminPassword(otherAdminUUID, 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toContain('only reset your own password');
      });

      it('should allow super admin to reset any password', async () => {
        mockVerifyAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: superAdminUUID,
            email: 'super@test.com',
            app_metadata: { role: 'super_admin' },
          },
        });
        mockAdminAuth.updateUserById.mockResolvedValue({
          data: { user: { id: otherAdminUUID } },
          error: null,
        });

        const result = await resetAdminPassword(otherAdminUUID, 'NewPass123!');

        expect(result.success).toBe(true);
      });
    });

    describe('Password Update', () => {
      beforeEach(() => {
        mockVerifyAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: adminUUID,
            email: 'admin@test.com',
            app_metadata: { role: 'admin' },
          },
        });
      });

      it('should update password successfully', async () => {
        mockAdminAuth.updateUserById.mockResolvedValue({
          data: { user: { id: adminUUID } },
          error: null,
        });

        const result = await resetAdminPassword(adminUUID, 'NewPass123!');

        expect(result.success).toBe(true);
        expect(result.message).toContain('Password reset successfully');
      });

      it('should handle password update errors', async () => {
        mockAdminAuth.updateUserById.mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        });

        const result = await resetAdminPassword(adminUUID, 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Update failed');
      });
    });
  });

  // =====================================================
  // isSuperAdminEmail Tests
  // =====================================================
  describe('isSuperAdminEmail', () => {
    it('should return true for super admin email', async () => {
      const superAdmin = createMockAuthUser({
        id: 'super-123',
        email: 'super@test.com',
        app_metadata: { role: 'super_admin' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [superAdmin] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([superAdmin]);
      mockIsSuperAdmin.mockReturnValue(true);

      const result = await isSuperAdminEmail('super@test.com');

      expect(result).toBe(true);
    });

    it('should return false for non-super admin email', async () => {
      const admin = createMockAuthUser({
        id: 'admin-123',
        email: 'admin@test.com',
        app_metadata: { role: 'admin' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [admin] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([admin]);
      mockIsSuperAdmin.mockReturnValue(false);

      const result = await isSuperAdminEmail('admin@test.com');

      expect(result).toBe(false);
    });

    it('should return false for unknown email', async () => {
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      const result = await isSuperAdminEmail('unknown@test.com');

      expect(result).toBe(false);
    });

    it('should return false for invalid email format', async () => {
      const result = await isSuperAdminEmail('invalid-email');

      expect(result).toBe(false);
    });
  });

  // =====================================================
  // getAdminById Tests
  // =====================================================
  describe('getAdminById', () => {
    // Use valid UUIDs for tests since validation runs before auth
    const adminUUID = '550e8400-e29b-41d4-a716-446655440020';
    const nonexistentUUID = '550e8400-e29b-41d4-a716-446655440021';

    describe('Authorization', () => {
      it('should reject unauthorized users', async () => {
        setupAuthFailure();

        const result = await getAdminById(adminUUID);

        expect(result).toEqual({ success: false, error: 'Unauthorized' });
      });
    });

    describe('Data Retrieval', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should return admin details successfully', async () => {
        const admin = createMockAuthUser({
          id: adminUUID,
          email: 'admin@test.com',
          app_metadata: { role: 'admin' },
        });
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [admin] },
          error: null,
        });
        mockValidateSupabaseAuthUsers.mockReturnValue([admin]);

        const result = await getAdminById(adminUUID);

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          id: adminUUID,
          email: 'admin@test.com',
          role: 'admin',
        });
      });

      it('should return error if admin not found', async () => {
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [] },
          error: null,
        });

        const result = await getAdminById(nonexistentUUID);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Admin not found');
      });
    });
  });

  // =====================================================
  // fetchAllAdminUsers Edge Cases (via indirect testing)
  // =====================================================
  describe('fetchAllAdminUsers Edge Cases', () => {
    beforeEach(() => {
      setupSuperAdminAuthSuccess();
    });

    it('should handle listUsers API error gracefully', async () => {
      mockAdminAuth.listUsers.mockResolvedValue({
        data: null,
        error: { message: 'API rate limited' },
      });

      const result = await listAdminAccounts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockAuthLoggerError).toHaveBeenCalledWith(
        '[fetchAllAdminUsers] Error fetching users page',
        expect.objectContaining({ page: 1, error: 'API rate limited' })
      );
    });

    it('should handle null data.users gracefully', async () => {
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: null },
        error: null,
      });

      const result = await listAdminAccounts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle validation failure in user data', async () => {
      const users = [
        createMockAuthUser({ id: 'admin-1', email: 'admin@test.com', app_metadata: { role: 'admin' } }),
      ];
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockImplementation(() => {
        throw new Error('Validation failed: invalid user schema');
      });

      const result = await listAdminAccounts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockAuthLoggerError).toHaveBeenCalledWith(
        '[fetchAllAuthUsers] Failed to validate users',
        expect.objectContaining({ error: 'Validation failed: invalid user schema' })
      );
    });

    it('should handle non-Error validation failure', async () => {
      const users = [
        createMockAuthUser({ id: 'admin-1', email: 'admin@test.com', app_metadata: { role: 'admin' } }),
      ];
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockImplementation(() => {
        throw 'String validation error';
      });

      const result = await listAdminAccounts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should paginate through multiple pages of users', async () => {
      // First call returns full page (1000 users)
      const fullPage = Array(1000).fill(null).map((_, i) =>
        createMockAuthUser({ id: `user-${i}`, email: `user${i}@test.com`, app_metadata: { role: 'teacher' } })
      );
      // Second call returns partial page (indicating end)
      const partialPage = [
        createMockAuthUser({ id: 'admin-final', email: 'admin@test.com', app_metadata: { role: 'admin' } }),
      ];

      mockAdminAuth.listUsers
        .mockResolvedValueOnce({ data: { users: fullPage }, error: null })
        .mockResolvedValueOnce({ data: { users: partialPage }, error: null });

      mockValidateSupabaseAuthUsers
        .mockReturnValueOnce(fullPage)
        .mockReturnValueOnce(partialPage);

      const result = await listAdminAccounts();

      expect(result.success).toBe(true);
      expect(mockAdminAuth.listUsers).toHaveBeenCalledTimes(2);
      expect(mockAdminAuth.listUsers).toHaveBeenNthCalledWith(1, { perPage: 1000, page: 1 });
      expect(mockAdminAuth.listUsers).toHaveBeenNthCalledWith(2, { perPage: 1000, page: 2 });
    });

    it('should stop pagination when page returns fewer than perPage users', async () => {
      const partialPage = Array(500).fill(null).map((_, i) =>
        createMockAuthUser({ id: `user-${i}`, email: `user${i}@test.com`, app_metadata: { role: 'teacher' } })
      );

      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: partialPage },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue(partialPage);

      const result = await listAdminAccounts();

      expect(result.success).toBe(true);
      expect(mockAdminAuth.listUsers).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================================
  // promoteExistingUserToAdmin Edge Cases
  // =====================================================
  describe('promoteExistingUserToAdmin Edge Cases', () => {
    beforeEach(() => {
      setupSuperAdminAuthSuccess();
    });

    it('should handle user disappearing during promotion', async () => {
      const existingUser = createMockAuthUser({
        id: 'disappearing-user',
        email: 'disappear@test.com',
        app_metadata: { role: 'teacher' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [existingUser] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([existingUser]);

      // Allow promotion check (user has teacher profile)
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({ data: { user_id: 'disappearing-user' }, error: null }),
      }));

      // User disappears when we try to re-fetch
      mockAdminAuth.getUserById.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await createAdminAccount('disappear@test.com', 'Pass123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User no longer exists');
      expect(mockAuthLoggerWarn).toHaveBeenCalledWith(
        '[createAdminAccount] User disappeared during operation',
        expect.objectContaining({ userId: 'disappearing-user' })
      );
    });

    it('should handle getUserById error during promotion', async () => {
      const existingUser = createMockAuthUser({
        id: 'error-user',
        email: 'error@test.com',
        app_metadata: { role: 'teacher' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [existingUser] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([existingUser]);

      // Allow promotion check
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({ data: { user_id: 'error-user' }, error: null }),
      }));

      // getUserById returns error
      mockAdminAuth.getUserById.mockResolvedValue({
        data: null,
        error: { message: 'Database connection lost' },
      });

      const result = await createAdminAccount('error@test.com', 'Pass123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User no longer exists');
    });

    it('should handle concurrent promotion by another admin', async () => {
      const existingUser = createMockAuthUser({
        id: 'concurrent-user',
        email: 'concurrent@test.com',
        app_metadata: { role: 'teacher' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [existingUser] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([existingUser]);

      // Allow promotion check
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({ data: { user_id: 'concurrent-user' }, error: null }),
      }));

      // Re-fetch shows user was already promoted to admin by concurrent request
      mockAdminAuth.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'concurrent-user',
            email: 'concurrent@test.com',
            app_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      const result = await createAdminAccount('concurrent@test.com', 'Pass123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('already an Admin');
      expect(result.data).toMatchObject({ userId: 'concurrent-user', promoted: false });
      expect(mockAuthLoggerWarn).toHaveBeenCalledWith(
        '[createAdminAccount] User already promoted by concurrent request',
        expect.objectContaining({ email: 'concurrent@test.com', role: 'admin' })
      );
    });

    it('should handle concurrent promotion to super_admin', async () => {
      const existingUser = createMockAuthUser({
        id: 'concurrent-super',
        email: 'concurrentsuper@test.com',
        app_metadata: { role: 'teacher' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [existingUser] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([existingUser]);

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({ data: { user_id: 'concurrent-super' }, error: null }),
      }));

      // Re-fetch shows user was already promoted to super_admin
      mockAdminAuth.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'concurrent-super',
            email: 'concurrentsuper@test.com',
            app_metadata: { role: 'super_admin' },
          },
        },
        error: null,
      });

      const result = await createAdminAccount('concurrentsuper@test.com', 'Pass123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('already an Super Admin');
    });

    it('should handle updateUserById error during promotion', async () => {
      const existingUser = createMockAuthUser({
        id: 'update-fail-user',
        email: 'updatefail@test.com',
        app_metadata: { role: 'teacher' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [existingUser] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([existingUser]);

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({ data: { user_id: 'update-fail-user' }, error: null }),
      }));

      // Re-fetch succeeds
      mockAdminAuth.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'update-fail-user',
            email: 'updatefail@test.com',
            app_metadata: { role: 'teacher' },
          },
        },
        error: null,
      });

      // Update fails
      mockAdminAuth.updateUserById.mockResolvedValue({
        data: null,
        error: { message: 'Permission denied' },
      });

      const result = await createAdminAccount('updatefail@test.com', 'Pass123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to promote user to admin');
      expect(mockAuthLoggerError).toHaveBeenCalledWith(
        '[createAdminAccount] Failed to promote user to admin',
        expect.objectContaining({ message: 'Permission denied' })
      );
    });

    it('should successfully promote existing teacher to admin', async () => {
      const existingUser = createMockAuthUser({
        id: 'teacher-to-admin',
        email: 'teacher@test.com',
        app_metadata: { role: 'teacher' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [existingUser] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([existingUser]);

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({ data: { user_id: 'teacher-to-admin' }, error: null }),
      }));

      mockAdminAuth.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'teacher-to-admin',
            email: 'teacher@test.com',
            app_metadata: { role: 'teacher' },
          },
        },
        error: null,
      });

      mockAdminAuth.updateUserById.mockResolvedValue({
        data: { user: { id: 'teacher-to-admin' } },
        error: null,
      });

      const result = await createAdminAccount('teacher@test.com', 'Pass123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('has been promoted to Admin');
      expect(result.data).toMatchObject({ userId: 'teacher-to-admin', promoted: true });
      expect(mockAuthLoggerSuccess).toHaveBeenCalledWith(
        '[createAdminAccount] User promoted to admin',
        expect.objectContaining({ email: 'teacher@test.com', role: 'admin', previousRole: 'teacher' })
      );
    });
  });

  // =====================================================
  // createNewAdminUser Edge Cases (Rollback Scenarios)
  // =====================================================
  describe('createNewAdminUser Edge Cases', () => {
    beforeEach(() => {
      setupSuperAdminAuthSuccess();
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
    });

    it('should handle createUser error', async () => {
      mockAdminAuth.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already in use' },
      });

      const result = await createAdminAccount('existing@elsewhere.com', 'Pass123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already in use');
      expect(mockAuthLoggerError).toHaveBeenCalledWith(
        '[createAdminAccount] Failed to create user',
        expect.objectContaining({ message: 'Email already in use' })
      );
    });

    it('should handle createUser returning null user', async () => {
      mockAdminAuth.createUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await createAdminAccount('newuser@test.com', 'Pass123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create user account');
    });

    it('should rollback successfully when role assignment fails', async () => {
      mockAdminAuth.createUser.mockResolvedValue({
        data: { user: { id: 'new-user-rollback' } },
        error: null,
      });
      mockAdminAuth.updateUserById.mockResolvedValue({
        data: null,
        error: { message: 'Metadata update failed' },
      });
      mockAdminAuth.deleteUser.mockResolvedValue({
        error: null,
      });

      const result = await createAdminAccount('rollback@test.com', 'Pass123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account creation rolled back');
      expect(mockAdminAuth.deleteUser).toHaveBeenCalledWith('new-user-rollback');
      expect(mockAuthLoggerWarn).toHaveBeenCalledWith(
        '[createAdminAccount] Rollback successful, user deleted',
        expect.objectContaining({ userId: 'new-user-rollback' })
      );
    });

    it('should handle CRITICAL rollback failure (orphaned user)', async () => {
      mockAdminAuth.createUser.mockResolvedValue({
        data: { user: { id: 'orphaned-user' } },
        error: null,
      });
      mockAdminAuth.updateUserById.mockResolvedValue({
        data: null,
        error: { message: 'Role assignment failed' },
      });
      mockAdminAuth.deleteUser.mockResolvedValue({
        error: { message: 'Delete permission denied' },
      });

      const result = await createAdminAccount('orphaned@test.com', 'Pass123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('rollback failed');
      expect(result.error).toContain('Manual intervention required');
      expect(mockAuthLoggerError).toHaveBeenCalledWith(
        '[createAdminAccount] CRITICAL: Rollback failed, orphaned user created',
        expect.objectContaining({
          userId: 'orphaned-user',
          email: 'orphaned@test.com',
          deleteError: 'Delete permission denied',
        })
      );
    });
  });

  // =====================================================
  // canPromoteToAdmin Edge Cases
  // =====================================================
  describe('canPromoteToAdmin Edge Cases', () => {
    beforeEach(() => {
      setupSuperAdminAuthSuccess();
    });

    it('should allow promotion when user has both student and teacher profiles', async () => {
      const existingUser = createMockAuthUser({
        id: 'dual-profile-user',
        email: 'dual@test.com',
        app_metadata: { role: 'teacher' },
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [existingUser] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([existingUser]);

      // User has both student and teacher profiles
      (mockSupabase.from as jest.Mock).mockImplementation((_table: string) => ({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({
          data: { user_id: 'dual-profile-user' }, // Both profiles exist
          error: null,
        }),
      }));

      mockAdminAuth.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'dual-profile-user',
            email: 'dual@test.com',
            app_metadata: { role: 'teacher' },
          },
        },
        error: null,
      });

      mockAdminAuth.updateUserById.mockResolvedValue({
        data: { user: { id: 'dual-profile-user' } },
        error: null,
      });

      const result = await createAdminAccount('dual@test.com', 'Pass123!');

      // Should allow because teacher profile exists (not student-only)
      expect(result.success).toBe(true);
    });

    it('should allow promotion when user has no profiles at all', async () => {
      const existingUser = createMockAuthUser({
        id: 'no-profile-user',
        email: 'noprofile@test.com',
        app_metadata: {},
      });
      mockAdminAuth.listUsers.mockResolvedValue({
        data: { users: [existingUser] },
        error: null,
      });
      mockValidateSupabaseAuthUsers.mockReturnValue([existingUser]);

      // User has no profiles
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn<AnyFunction>().mockReturnThis(),
        eq: jest.fn<AnyFunction>().mockReturnThis(),
        maybeSingle: jest.fn<AnyFunction>().mockResolvedValue({ data: null, error: null }),
      }));

      mockAdminAuth.getUserById.mockResolvedValue({
        data: {
          user: {
            id: 'no-profile-user',
            email: 'noprofile@test.com',
            app_metadata: {},
          },
        },
        error: null,
      });

      mockAdminAuth.updateUserById.mockResolvedValue({
        data: { user: { id: 'no-profile-user' } },
        error: null,
      });

      const result = await createAdminAccount('noprofile@test.com', 'Pass123!');

      expect(result.success).toBe(true);
    });
  });

  // =====================================================
  // Additional Error Path Coverage
  // =====================================================
  describe('Additional Error Paths', () => {
    describe('deleteAdminAccount error handling', () => {
      const adminUUID = '550e8400-e29b-41d4-a716-446655440040';

      beforeEach(() => {
        mockVerifySuperAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: '550e8400-e29b-41d4-a716-446655440099',
            email: 'super@test.com',
            app_metadata: { role: 'super_admin' },
          },
        });
      });

      it('should handle deleteUser error', async () => {
        const adminToDelete = createMockAuthUser({
          id: adminUUID,
          email: 'todelete@test.com',
          app_metadata: { role: 'admin' },
        });
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [adminToDelete] },
          error: null,
        });
        mockValidateSupabaseAuthUsers.mockReturnValue([adminToDelete]);
        mockIsSuperAdmin.mockReturnValue(false);

        mockAdminAuth.deleteUser.mockResolvedValue({
          error: { message: 'Cannot delete user with active sessions' },
        });

        const result = await deleteAdminAccount(adminUUID);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot delete user with active sessions');
        expect(mockAuthLoggerError).toHaveBeenCalledWith(
          '[deleteAdminAccount] Failed to delete user',
          expect.objectContaining({ message: 'Cannot delete user with active sessions' })
        );
      });

      it('should handle unexpected exception', async () => {
        mockCreateAdminClient.mockRejectedValue(new Error('Connection refused'));

        const result = await deleteAdminAccount(adminUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred');
        expect(mockAuthLoggerError).toHaveBeenCalledWith(
          '[deleteAdminAccount] Unexpected error',
          expect.any(Error)
        );
      });
    });

    describe('isSuperAdminEmail error handling', () => {
      it('should return false when no users returned', async () => {
        mockAdminAuth.listUsers.mockResolvedValue({
          data: { users: [] },
          error: null,
        });

        const result = await isSuperAdminEmail('nonexistent@test.com');

        expect(result).toBe(false);
      });

      it('should handle unexpected exception', async () => {
        mockCreateAdminClient.mockRejectedValue(new Error('Service unavailable'));

        const result = await isSuperAdminEmail('test@test.com');

        expect(result).toBe(false);
        expect(mockAuthLoggerError).toHaveBeenCalledWith(
          '[isSuperAdminEmail] Error checking super admin email',
          expect.any(Error)
        );
      });
    });

    describe('getAdminById error handling', () => {
      const adminUUID = '550e8400-e29b-41d4-a716-446655440050';

      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should handle unexpected exception', async () => {
        mockCreateAdminClient.mockRejectedValue(new Error('Database timeout'));

        const result = await getAdminById(adminUUID);

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred');
        expect(mockAuthLoggerError).toHaveBeenCalledWith(
          '[getAdminById] Unexpected error',
          expect.any(Error)
        );
      });
    });

    describe('listAdminAccounts error handling', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should handle unexpected exception', async () => {
        mockCreateAdminClient.mockRejectedValue(new Error('Network error'));

        const result = await listAdminAccounts();

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred');
        expect(mockAuthLoggerError).toHaveBeenCalledWith(
          '[listAdminAccounts] Unexpected error',
          expect.any(Error)
        );
      });
    });

    describe('createAdminAccount error handling', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should handle unexpected exception', async () => {
        mockCheckRateLimit.mockRejectedValue(new Error('Redis connection failed'));

        const result = await createAdminAccount('new@test.com', 'Pass123!');

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred');
        expect(mockAuthLoggerError).toHaveBeenCalledWith(
          '[createAdminAccount] Unexpected error',
          expect.any(Error)
        );
      });
    });

    describe('resetAdminPassword error handling', () => {
      const adminUUID = '550e8400-e29b-41d4-a716-446655440060';

      beforeEach(() => {
        mockVerifyAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: adminUUID,
            email: 'admin@test.com',
            app_metadata: { role: 'admin' },
          },
        });
      });

      it('should handle unexpected exception', async () => {
        mockCheckRateLimit.mockRejectedValue(new Error('Service down'));

        const result = await resetAdminPassword(adminUUID, 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred');
        expect(mockAuthLoggerError).toHaveBeenCalledWith(
          '[resetAdminPassword] Unexpected error',
          expect.any(Error)
        );
      });
    });
  });

  // =====================================================
  // Cross-cutting Concerns
  // =====================================================
  describe('Cross-cutting Concerns', () => {
    // Use valid UUIDs for tests
    const deleteUUID = '550e8400-e29b-41d4-a716-446655440030';
    const resetUUID = '550e8400-e29b-41d4-a716-446655440031';

    describe('Error Handling', () => {
      beforeEach(() => {
        setupSuperAdminAuthSuccess();
      });

      it('should handle user fetch errors gracefully with empty data', async () => {
        // fetchAllAdminUsers catches errors and returns empty array (graceful degradation)
        mockAdminAuth.listUsers.mockRejectedValue(new Error('Database error'));

        const result = await listAdminAccounts();

        // Function returns success with empty data when fetch fails (by design)
        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
        expect(mockAuthLoggerError).toHaveBeenCalled();
      });
    });

    describe('Rate Limiting', () => {
      beforeEach(() => {
        // Use UUID-based super admin
        mockVerifySuperAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: '550e8400-e29b-41d4-a716-446655440099',
            email: 'super@test.com',
            app_metadata: { role: 'super_admin' },
          },
        });
      });

      it('should enforce rate limits on delete operations', async () => {
        mockCheckRateLimit.mockResolvedValue(false);

        const result = await deleteAdminAccount(deleteUUID);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Too many requests');
      });

      it('should enforce rate limits on password reset', async () => {
        mockVerifyAdminAuth.mockResolvedValue({
          authorized: true,
          user: {
            id: resetUUID,
            email: 'admin@test.com',
            app_metadata: { role: 'admin' },
          },
        });
        mockCheckRateLimit.mockResolvedValue(false);

        const result = await resetAdminPassword(resetUUID, 'NewPass123!');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Too many');
      });
    });
  });
});
