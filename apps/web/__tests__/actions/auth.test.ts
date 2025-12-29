/**
 * Auth Actions Tests
 *
 * Tests for the server-side authentication actions including:
 * - Email/phone OTP flows
 * - Username-based authentication
 * - Password reset functionality
 * - Role verification
 */

// Mock Next.js modules first
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

// Mock Supabase server
const mockSupabaseClient = {
  auth: {
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    updateUser: jest.fn(),
    signOut: jest.fn(),
    signInWithPassword: jest.fn(),
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    insert: jest.fn(),
  }),
}

const mockAdminClient = {
  auth: {
    admin: {
      listUsers: jest.fn(),
      getUserById: jest.fn(),
      createUser: jest.fn(),
      deleteUser: jest.fn(),
    },
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    insert: jest.fn(),
  }),
}

jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
  createAdminClient: jest.fn(() => Promise.resolve(mockAdminClient)),
  getCurrentUser: jest.fn(),
}))

// Mock rate limiter
jest.mock('@/lib/rate-limiter-distributed', () => ({
  checkOtpRateLimit: jest.fn().mockResolvedValue(true),
  checkPasswordResetRateLimit: jest.fn().mockResolvedValue(true),
}))

// Mock auth logger
jest.mock('@/lib/auth-logger', () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}))

// Mock email validation
jest.mock('@/lib/email-validation', () => ({
  isValidEmailDomain: jest.fn().mockReturnValue(true),
}))

import {
  checkEmailExistsInAuth,
  requestOtp,
  verifyOtp,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
  checkUserIsTeacher,
  signOutUser,
  checkUsernameAvailable,
  registerWithUsername,
  signInWithUsername,
} from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/supabase-server'
import { checkOtpRateLimit, checkPasswordResetRateLimit } from '@/lib/rate-limiter-distributed'
import { isValidEmailDomain } from '@/lib/email-validation'

describe('Auth Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkEmailExistsInAuth', () => {
    it('should return false for non-existent email', async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      })

      const result = await checkEmailExistsInAuth('new@example.com')

      expect(result.exists).toBe(false)
    })

    it('should return true with role for existing email', async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: 'user-123',
              email: 'teacher@example.com',
              app_metadata: { role: 'teacher' },
            },
          ],
        },
        error: null,
      })

      // Mock profile checks
      const mockFrom = mockAdminClient.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValueOnce({ data: null, error: null }) // student_profiles
          .mockResolvedValueOnce({ data: { user_id: 'user-123' }, error: null }), // teacher_profiles
      })

      const result = await checkEmailExistsInAuth('teacher@example.com')

      expect(result.exists).toBe(true)
      expect(result.role).toBe('teacher')
      expect(result.hasTeacherProfile).toBe(true)
    })

    it('should identify student role', async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: 'student-123',
              email: 'student@example.com',
              app_metadata: {},
            },
          ],
        },
        error: null,
      })

      const mockFrom = mockAdminClient.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValueOnce({ data: { user_id: 'student-123' }, error: null }) // student_profiles
          .mockResolvedValueOnce({ data: null, error: null }), // teacher_profiles
      })

      const result = await checkEmailExistsInAuth('student@example.com')

      expect(result.exists).toBe(true)
      expect(result.role).toBe('student')
      expect(result.hasStudentProfile).toBe(true)
    })

    it('should identify super_admin role', async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: 'admin-123',
              email: 'admin@atal.ai',
              app_metadata: { role: 'super_admin' },
            },
          ],
        },
        error: null,
      })

      const mockFrom = mockAdminClient.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await checkEmailExistsInAuth('admin@atal.ai')

      expect(result.exists).toBe(true)
      expect(result.role).toBe('super_admin')
    })

    it('should handle listUsers error', async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await checkEmailExistsInAuth('test@example.com')

      expect(result.exists).toBe(false)
    })

    it('should normalize email to lowercase', async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [{ id: 'user-1', email: 'user@example.com', app_metadata: {} }],
        },
        error: null,
      })

      const mockFrom = mockAdminClient.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })

      await checkEmailExistsInAuth('USER@EXAMPLE.COM')

      // Should find the user despite case difference
      expect(mockAdminClient.auth.admin.listUsers).toHaveBeenCalled()
    })
  })

  describe('requestOtp', () => {
    beforeEach(() => {
      ;(checkOtpRateLimit as jest.Mock).mockResolvedValue(true)
      ;(isValidEmailDomain as jest.Mock).mockReturnValue(true)
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      })
    })

    it('should reject empty email', async () => {
      const result = await requestOtp('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Email is required')
    })

    it('should reject invalid email format', async () => {
      const result = await requestOtp('invalid-email')

      expect(result.success).toBe(false)
      expect(result.error).toContain('valid email')
    })

    it('should reject invalid email domain', async () => {
      ;(isValidEmailDomain as jest.Mock).mockReturnValue(false)

      const result = await requestOtp('test@fakeprovider.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('recognized email provider')
    })

    it('should reject when rate limited', async () => {
      ;(checkOtpRateLimit as jest.Mock).mockResolvedValue(false)

      const result = await requestOtp('test@gmail.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Too many OTP requests')
    })

    it('should reject existing email with role-specific message', async () => {
      mockAdminClient.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: 'teacher-1',
              email: 'teacher@school.com',
              app_metadata: { role: 'teacher' },
            },
          ],
        },
        error: null,
      })

      const mockFrom = mockAdminClient.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await requestOtp('teacher@school.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('teacher login page')
    })

    it('should reject blocked email domains', async () => {
      const result = await requestOtp('test@mailinator.com')

      expect(result.success).toBe(false)
    })

    it('should reject suspicious email patterns', async () => {
      const result = await requestOtp('test@gmail.com')

      expect(result.success).toBe(false)
    })

    it('should send OTP successfully', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await requestOtp('newuser@gmail.com')

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'newuser@gmail.com',
        options: {
          shouldCreateUser: true,
        },
      })
    })

    it('should handle Supabase errors', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: 'rate limit exceeded' },
      })

      const result = await requestOtp('user@gmail.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Too many requests')
    })
  })

  describe('verifyOtp', () => {
    it('should verify OTP successfully and redirect student', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: {
          user: { id: 'user-1', app_metadata: {} },
          session: {},
        },
        error: null,
      })

      await expect(verifyOtp('student@example.com', '123456')).rejects.toThrow('NEXT_REDIRECT')
    })

    it('should redirect teacher to teacher classes', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: {
          user: { id: 'user-1', app_metadata: { role: 'teacher' } },
          session: {},
        },
        error: null,
      })

      await expect(verifyOtp('teacher@example.com', '123456')).rejects.toThrow('NEXT_REDIRECT')
    })

    it('should handle verification errors', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid token' },
      })

      // Token must be digits only - 'wrong' is invalid format
      const result = await verifyOtp('test@example.com', '000000')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid token')
    })
  })

  describe('sendForgotPasswordOtp', () => {
    beforeEach(() => {
      ;(checkPasswordResetRateLimit as jest.Mock).mockResolvedValue(true)
    })

    it('should reject empty email', async () => {
      const result = await sendForgotPasswordOtp('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Email is required')
    })

    it('should reject invalid email format', async () => {
      const result = await sendForgotPasswordOtp('invalid')

      expect(result.success).toBe(false)
      expect(result.error).toContain('valid email')
    })

    it('should reject when rate limited', async () => {
      ;(checkPasswordResetRateLimit as jest.Mock).mockResolvedValue(false)

      const result = await sendForgotPasswordOtp('test@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Too many password reset requests')
    })

    it('should send recovery OTP successfully', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await sendForgotPasswordOtp('user@example.com')

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: {
          shouldCreateUser: false,
        },
      })
    })

    it('should handle non-existent user', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      })

      const result = await sendForgotPasswordOtp('nonexistent@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No account found')
    })
  })

  describe('resetPasswordWithOtp', () => {
    it('should reject short password', async () => {
      const result = await resetPasswordWithOtp('test@example.com', '123456', 'short')

      expect(result.success).toBe(false)
      expect(result.error).toContain('8 characters')
    })

    it('should reset password successfully', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: {} },
        error: null,
      })
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      const result = await resetPasswordWithOtp('test@example.com', '123456', 'newPassword123')

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123',
      })
    })

    it('should handle OTP verification failure', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Token expired' },
      })

      // Use valid digit format for token to test Supabase error handling
      const result = await resetPasswordWithOtp('test@example.com', '123456', 'newPassword123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid or expired')
    })

    it('should handle password update failure', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: {} },
        error: null,
      })
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password too weak' },
      })

      const result = await resetPasswordWithOtp('test@example.com', '123456', 'newPassword123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Password too weak')
    })

    it('should revoke other sessions after password reset', async () => {
      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: {} },
        error: null,
      })
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      await resetPasswordWithOtp('test@example.com', '123456', 'newPassword123')

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledWith({ scope: 'others' })
    })
  })

  describe('checkUserIsTeacher', () => {
    it('should return false when not authenticated', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

      const result = await checkUserIsTeacher()

      expect(result.isTeacher).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('should return true for user with teacher profile', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue({ id: 'teacher-1' })

      const mockFrom = mockSupabaseClient.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { user_id: 'teacher-1' },
          error: null,
        }),
      })

      const result = await checkUserIsTeacher()

      expect(result.isTeacher).toBe(true)
      expect(result.userId).toBe('teacher-1')
    })

    it('should return false for user without teacher profile', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue({ id: 'student-1' })

      const mockFrom = mockSupabaseClient.from as jest.Mock
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const result = await checkUserIsTeacher()

      expect(result.isTeacher).toBe(false)
      expect(result.userId).toBe('student-1')
    })
  })

  describe('signOutUser', () => {
    it('should sign out successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      const result = await signOutUser()

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should handle sign out errors', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Session expired' },
      })

      const result = await signOutUser()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Session expired')
    })
  })

  describe('Username Authentication', () => {
    describe('checkUsernameAvailable', () => {
      it('should reject invalid username format', async () => {
        const result = await checkUsernameAvailable('ab') // Too short

        expect(result.available).toBe(false)
        expect(result.error).toContain('at least 3 characters')
      })

      it('should reject username starting with number', async () => {
        const result = await checkUsernameAvailable('123user')

        expect(result.available).toBe(false)
        expect(result.error).toContain('start with a letter')
      })

      it('should reject username with special characters', async () => {
        const result = await checkUsernameAvailable('user@name')

        expect(result.available).toBe(false)
        expect(result.error).toContain('letters, numbers, and underscores')
      })

      it('should return available for new username', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })

        const result = await checkUsernameAvailable('newuser')

        expect(result.available).toBe(true)
      })

      it('should return unavailable for taken username', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { username: 'takenuser' },
            error: null,
          }),
        })

        const result = await checkUsernameAvailable('takenuser')

        expect(result.available).toBe(false)
      })
    })

    describe('registerWithUsername', () => {
      beforeEach(() => {
        ;(checkOtpRateLimit as jest.Mock).mockResolvedValue(true)
      })

      it('should reject invalid username', async () => {
        const result = await registerWithUsername('ab', 'password123')

        expect(result.success).toBe(false)
        expect(result.error).toContain('at least 3 characters')
      })

      it('should reject short password', async () => {
        const result = await registerWithUsername('validuser', 'short')

        expect(result.success).toBe(false)
        expect(result.error).toContain('8 characters')
      })

      it('should reject when rate limited', async () => {
        ;(checkOtpRateLimit as jest.Mock).mockResolvedValue(false)

        const result = await registerWithUsername('newuser', 'password123')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Too many registration attempts')
      })

      it('should reject taken username', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { username: 'takenuser' },
            error: null,
          }),
        })

        const result = await registerWithUsername('takenuser', 'password123')

        expect(result.success).toBe(false)
        expect(result.error).toContain('already taken')
      })

      it('should register user successfully', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        })

        mockAdminClient.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'new-user-id' } },
          error: null,
        })

        const result = await registerWithUsername('newuser', 'password123')

        expect(result.success).toBe(true)
        expect(result.userId).toBe('new-user-id')
      })

      it('should rollback on username insert failure', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
        })

        mockAdminClient.auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'temp-user-id' } },
          error: null,
        })

        const result = await registerWithUsername('newuser', 'password123')

        expect(result.success).toBe(false)
        expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('temp-user-id')
      })
    })

    describe('signInWithUsername', () => {
      beforeEach(() => {
        ;(checkOtpRateLimit as jest.Mock).mockResolvedValue(true)
      })

      it('should reject empty username', async () => {
        const result = await signInWithUsername('', 'password123')

        expect(result.success).toBe(false)
        // Zod returns generic error on login to avoid leaking username format requirements
        expect(result.error).toBe('Invalid username or password')
      })

      it('should reject empty password', async () => {
        const result = await signInWithUsername('user', '')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Password is required')
      })

      it('should reject when rate limited', async () => {
        ;(checkOtpRateLimit as jest.Mock).mockResolvedValue(false)

        const result = await signInWithUsername('user', 'password123')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Too many login attempts')
      })

      it('should reject non-existent username', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })

        const result = await signInWithUsername('nonexistent', 'password123')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid username or password')
      })

      it('should sign in successfully', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { user_id: 'user-123' },
            error: null,
          }),
        })

        mockAdminClient.auth.admin.getUserById.mockResolvedValue({
          data: { user: { id: 'user-123', email: 'internal@student.atal.internal' } },
          error: null,
        })

        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: 'user-123', app_metadata: {} }, session: {} },
          error: null,
        })

        const result = await signInWithUsername('validuser', 'password123')

        expect(result.success).toBe(true)
      })

      it('should reject teacher/admin username login', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { user_id: 'teacher-123' },
            error: null,
          }),
        })

        mockAdminClient.auth.admin.getUserById.mockResolvedValue({
          data: { user: { id: 'teacher-123', email: 'internal@teacher.atal.internal' } },
          error: null,
        })

        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: {
            user: { id: 'teacher-123', app_metadata: { role: 'teacher' } },
            session: {},
          },
          error: null,
        })

        const result = await signInWithUsername('teacher', 'password123')

        expect(result.success).toBe(false)
        expect(result.error).toContain('cannot use username login')
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      })

      it('should handle wrong password', async () => {
        const mockFrom = mockAdminClient.from as jest.Mock
        mockFrom.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { user_id: 'user-123' },
            error: null,
          }),
        })

        mockAdminClient.auth.admin.getUserById.mockResolvedValue({
          data: { user: { id: 'user-123', email: 'internal@student.atal.internal' } },
          error: null,
        })

        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' },
        })

        const result = await signInWithUsername('validuser', 'wrongpassword')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Invalid username or password')
      })
    })
  })
})
