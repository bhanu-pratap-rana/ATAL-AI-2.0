/**
 * @jest-environment jsdom
 */

// Mock environment variables before importing the module
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

// Save original env
const originalEnv = process.env;

// Mock cookies from next/headers
const mockCookieStore = {
  getAll: jest.fn().mockReturnValue([]),
  set: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
  }),
}));

// Mock createServerClient from @supabase/ssr
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn().mockReturnValue(mockSupabaseClient),
}));

// Mock createClient from @supabase/supabase-js
const mockAdminClient = {
  auth: {
    admin: {},
  },
  from: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue(mockAdminClient),
}));

// Mock auth-logger
const mockAuthLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../auth-logger', () => ({
  authLogger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock auth-factory
const mockVerifyRoleAuth = jest.fn();
const mockVerifyProfileAuth = jest.fn();

jest.mock('../auth-factory', () => ({
  verifyRoleAuth: jest.fn(),
  verifyProfileAuth: jest.fn(),
}));

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { authLogger } from '../auth-logger';
import { verifyRoleAuth, verifyProfileAuth } from '../auth-factory';

describe('supabase-server', () => {
  beforeAll(() => {
    // Set environment variables
    process.env = {
      ...originalEnv,
      ...mockEnv,
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = {
      ...originalEnv,
      ...mockEnv,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createClient', () => {
    it('should create a Supabase server client with cookies', async () => {
      const { createClient } = await import('../supabase-server');

      const client = await createClient();

      expect(cookies).toHaveBeenCalled();
      expect(createServerClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(client).toBeDefined();
    });

    it('should handle cookie getAll', async () => {
      const mockCookies = [{ name: 'test', value: 'value' }];
      (cookies as jest.Mock).mockResolvedValueOnce({
        getAll: jest.fn().mockReturnValue(mockCookies),
        set: jest.fn(),
      });

      const { createClient } = await import('../supabase-server');
      await createClient();

      // Get the cookies config passed to createServerClient
      const createServerClientCall = (createServerClient as jest.Mock).mock.calls[0];
      const cookiesConfig = createServerClientCall[2].cookies;

      // Call getAll and verify it returns the mock cookies
      const result = cookiesConfig.getAll();
      expect(result).toEqual(mockCookies);
    });

    it('should handle cookie setAll silently when called from Server Component', async () => {
      const mockSet = jest.fn().mockImplementation(() => {
        throw new Error('Cannot set cookies in Server Component');
      });
      (cookies as jest.Mock).mockResolvedValueOnce({
        getAll: jest.fn().mockReturnValue([]),
        set: mockSet,
      });

      const { createClient } = await import('../supabase-server');
      await createClient();

      // Get the cookies config passed to createServerClient
      const createServerClientCall = (createServerClient as jest.Mock).mock.calls[0];
      const cookiesConfig = createServerClientCall[2].cookies;

      // Call setAll - should not throw
      const cookiesToSet = [{ name: 'test', value: 'value', options: {} }];
      expect(() => cookiesConfig.setAll(cookiesToSet)).not.toThrow();
      expect(authLogger.debug).toHaveBeenCalledWith(
        '[createClient] Cookie setAll called from Server Component',
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should handle cookie setAll with non-Error throw', async () => {
      const mockSet = jest.fn().mockImplementation(() => {
        throw 'String error';
      });
      (cookies as jest.Mock).mockResolvedValueOnce({
        getAll: jest.fn().mockReturnValue([]),
        set: mockSet,
      });

      const { createClient } = await import('../supabase-server');
      await createClient();

      // Get the cookies config passed to createServerClient
      const createServerClientCall = (createServerClient as jest.Mock).mock.calls[0];
      const cookiesConfig = createServerClientCall[2].cookies;

      // Call setAll - should not throw
      const cookiesToSet = [{ name: 'test', value: 'value', options: {} }];
      expect(() => cookiesConfig.setAll(cookiesToSet)).not.toThrow();
      expect(authLogger.debug).toHaveBeenCalledWith(
        '[createClient] Cookie setAll called from Server Component',
        expect.objectContaining({ error: 'String error' })
      );
    });

    it('should successfully set cookies when not in Server Component', async () => {
      const mockSet = jest.fn();
      (cookies as jest.Mock).mockResolvedValueOnce({
        getAll: jest.fn().mockReturnValue([]),
        set: mockSet,
      });

      const { createClient } = await import('../supabase-server');
      await createClient();

      // Get the cookies config passed to createServerClient
      const createServerClientCall = (createServerClient as jest.Mock).mock.calls[0];
      const cookiesConfig = createServerClientCall[2].cookies;

      // Call setAll - should work normally
      const cookiesToSet = [
        { name: 'cookie1', value: 'value1', options: { path: '/' } },
        { name: 'cookie2', value: 'value2', options: {} },
      ];
      cookiesConfig.setAll(cookiesToSet);

      expect(mockSet).toHaveBeenCalledTimes(2);
      expect(mockSet).toHaveBeenNthCalledWith(1, 'cookie1', 'value1', { path: '/' });
      expect(mockSet).toHaveBeenNthCalledWith(2, 'cookie2', 'value2', {});
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { getCurrentUser } = await import('../supabase-server');
      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null when no user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { getCurrentUser } = await import('../supabase-server');
      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null when error occurs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const { getCurrentUser } = await import('../supabase-server');
      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('verifyAdminAuth', () => {
    it('should call verifyRoleAuth with admin and super_admin roles', async () => {
      (verifyRoleAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: { id: 'admin-123' },
      });

      const { verifyAdminAuth } = await import('../supabase-server');
      const result = await verifyAdminAuth('testFunction');

      expect(verifyRoleAuth).toHaveBeenCalledWith({
        functionName: 'testFunction',
        requiredRoles: ['admin', 'super_admin'],
        errorMessage: 'Admin access required',
      });
      expect(result.authorized).toBe(true);
    });

    it('should return unauthorized when user is not admin', async () => {
      (verifyRoleAuth as jest.Mock).mockResolvedValue({
        authorized: false,
        error: { success: false, error: 'Admin access required' },
      });

      const { verifyAdminAuth } = await import('../supabase-server');
      const result = await verifyAdminAuth('testFunction');

      expect(result.authorized).toBe(false);
    });
  });

  describe('verifySuperAdminAuth', () => {
    it('should call verifyRoleAuth with only super_admin role', async () => {
      (verifyRoleAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: { id: 'super-admin-123' },
      });

      const { verifySuperAdminAuth } = await import('../supabase-server');
      const result = await verifySuperAdminAuth('testFunction');

      expect(verifyRoleAuth).toHaveBeenCalledWith({
        functionName: 'testFunction',
        requiredRoles: ['super_admin'],
        errorMessage: 'Only super admins can perform this action',
      });
      expect(result.authorized).toBe(true);
    });
  });

  describe('verifyTeacherAuth', () => {
    it('should call verifyProfileAuth with teacher profile check', async () => {
      (verifyProfileAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: { id: 'teacher-123' },
      });

      const { verifyTeacherAuth } = await import('../supabase-server');
      const result = await verifyTeacherAuth('testFunction');

      expect(verifyProfileAuth).toHaveBeenCalledWith({
        functionName: 'testFunction',
        profileCheckFn: expect.any(Function),
        notFoundMessage: 'Only teachers can perform this action',
        errorMessage: 'Failed to verify teacher status',
      });
      expect(result.authorized).toBe(true);
    });

    it('should verify teacher profile exists via profileCheckFn', async () => {
      let profileCheckFn: ((user: { id: string }) => Promise<boolean>) | null = null;
      (verifyProfileAuth as jest.Mock).mockImplementation((config) => {
        profileCheckFn = config.profileCheckFn;
        return Promise.resolve({ authorized: true, user: { id: 'teacher-123' } });
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { user_id: 'teacher-123' },
          error: null,
        }),
      });

      const { verifyTeacherAuth } = await import('../supabase-server');
      await verifyTeacherAuth('testFunction');

      // Execute the profileCheckFn
      expect(profileCheckFn).toBeDefined();
      const result = await profileCheckFn!({ id: 'teacher-123' });
      expect(result).toBe(true);
    });

    it('should return false when teacher profile does not exist', async () => {
      let profileCheckFn: ((user: { id: string }) => Promise<boolean>) | null = null;
      (verifyProfileAuth as jest.Mock).mockImplementation((config) => {
        profileCheckFn = config.profileCheckFn;
        return Promise.resolve({ authorized: false, error: { success: false, error: 'Not a teacher' } });
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const { verifyTeacherAuth } = await import('../supabase-server');
      await verifyTeacherAuth('testFunction');

      // Execute the profileCheckFn
      const result = await profileCheckFn!({ id: 'non-teacher-123' });
      expect(result).toBe(false);
    });

    it('should throw error when profile query fails', async () => {
      let profileCheckFn: ((user: { id: string }) => Promise<boolean>) | null = null;
      (verifyProfileAuth as jest.Mock).mockImplementation((config) => {
        profileCheckFn = config.profileCheckFn;
        return Promise.resolve({ authorized: true, user: { id: 'teacher-123' } });
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const { verifyTeacherAuth } = await import('../supabase-server');
      await verifyTeacherAuth('testFunction');

      // Execute the profileCheckFn - should throw
      await expect(profileCheckFn!({ id: 'teacher-123' })).rejects.toEqual({
        message: 'Database error',
      });
    });
  });

  describe('verifyStudentAuth', () => {
    it('should return unauthorized when no current user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { verifyStudentAuth } = await import('../supabase-server');
      const result = await verifyStudentAuth('testFunction');

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe('Not authenticated');
      }
      expect(authLogger.warn).toHaveBeenCalledWith(
        '[testFunction] Unauthorized: No authenticated user'
      );
    });

    it('should return authorized when student profile exists', async () => {
      const mockUser = { id: 'student-123', email: 'student@test.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { user_id: 'student-123', name: 'Test Student' },
          error: null,
        }),
      });

      const { verifyStudentAuth } = await import('../supabase-server');
      const result = await verifyStudentAuth('testFunction');

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.user).toEqual(mockUser);
        expect(result.studentProfile).toEqual({ user_id: 'student-123', name: 'Test Student' });
      }
    });

    it('should return unauthorized when student profile does not exist', async () => {
      const mockUser = { id: 'user-123', email: 'user@test.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const { verifyStudentAuth } = await import('../supabase-server');
      const result = await verifyStudentAuth('testFunction');

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe('Only students can perform this action');
      }
      expect(authLogger.warn).toHaveBeenCalledWith(
        '[testFunction] Forbidden: User is not a student',
        { userId: 'user-123' }
      );
    });

    it('should return error when profile query fails', async () => {
      const mockUser = { id: 'user-123', email: 'user@test.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      });

      const { verifyStudentAuth } = await import('../supabase-server');
      const result = await verifyStudentAuth('testFunction');

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe('Failed to verify student status');
      }
      expect(authLogger.error).toHaveBeenCalledWith(
        '[testFunction] Failed to verify student status',
        { message: 'Database connection failed' }
      );
    });
  });

  describe('verifyClassOwnership', () => {
    it('should return unauthorized when teacher auth fails', async () => {
      (verifyProfileAuth as jest.Mock).mockResolvedValue({
        authorized: false,
        error: { success: false, error: 'Not a teacher' },
      });

      const { verifyClassOwnership } = await import('../supabase-server');
      const result = await verifyClassOwnership('testFunction', 'class-123');

      expect(result.authorized).toBe(false);
    });

    it('should return authorized when teacher owns the class', async () => {
      const mockUser = { id: 'teacher-123', email: 'teacher@test.com' };
      (verifyProfileAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: mockUser,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'class-123', teacher_id: 'teacher-123', name: 'Math Class' },
          error: null,
        }),
      });

      const { verifyClassOwnership } = await import('../supabase-server');
      const result = await verifyClassOwnership('testFunction', 'class-123');

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.user).toEqual(mockUser);
        expect(result.classData).toEqual({ id: 'class-123', teacher_id: 'teacher-123', name: 'Math Class' });
      }
    });

    it('should return unauthorized when teacher does not own the class', async () => {
      const mockUser = { id: 'teacher-123', email: 'teacher@test.com' };
      (verifyProfileAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: mockUser,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const { verifyClassOwnership } = await import('../supabase-server');
      const result = await verifyClassOwnership('testFunction', 'other-class');

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe('You do not own this class');
      }
      expect(authLogger.warn).toHaveBeenCalledWith(
        '[testFunction] Forbidden: User does not own this class',
        { userId: 'teacher-123', classId: 'other-class' }
      );
    });

    it('should return error when class query fails', async () => {
      const mockUser = { id: 'teacher-123', email: 'teacher@test.com' };
      (verifyProfileAuth as jest.Mock).mockResolvedValue({
        authorized: true,
        user: mockUser,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const { verifyClassOwnership } = await import('../supabase-server');
      const result = await verifyClassOwnership('testFunction', 'class-123');

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.error.error).toBe('Failed to verify class ownership');
      }
      expect(authLogger.error).toHaveBeenCalledWith(
        '[testFunction] Failed to verify class ownership',
        { message: 'Database error' }
      );
    });
  });

  describe('createAdminClient', () => {
    it('should create admin client with service role key', async () => {
      const { createAdminClient } = await import('../supabase-server');
      const client = await createAdminClient();

      expect(createSupabaseClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      expect(client).toBeDefined();
    });

    it('should throw error when service role key is missing', async () => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        // No SUPABASE_SERVICE_ROLE_KEY
      };

      const { createAdminClient } = await import('../supabase-server');

      await expect(createAdminClient()).rejects.toThrow(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
      );
    });

    it('should throw error when supabase URL is missing for admin client', async () => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: mockEnv.SUPABASE_SERVICE_ROLE_KEY,
        // No NEXT_PUBLIC_SUPABASE_URL
      };

      // This will throw during module load due to validatePublicVariables
      await expect(import('../supabase-server')).rejects.toThrow(
        'Missing required environment variables'
      );
    });
  });

  describe('validatePublicVariables', () => {
    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        // No NEXT_PUBLIC_SUPABASE_URL
      };

      await expect(import('../supabase-server')).rejects.toThrow(
        'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL'
      );
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        // No NEXT_PUBLIC_SUPABASE_ANON_KEY
      };

      await expect(import('../supabase-server')).rejects.toThrow(
        'Missing required environment variables: NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    });

    it('should throw error when both public variables are missing', async () => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        // No Supabase variables
      };

      await expect(import('../supabase-server')).rejects.toThrow(
        'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    });
  });
});
