/**
 * Auth Handlers Tests
 *
 * Tests for the unified authentication handlers that centralize
 * signin, signup, OTP verification, and password management flows.
 *
 * These tests ensure consistent behavior across all auth operations.
 */

import {
  handleSignIn,
  handleSendOTP,
  handleVerifyOTP,
  handleSetPassword,
  handleAnonymousSignIn,
} from '@/lib/auth-handlers'
import type { SupabaseClient, User, AuthError } from '@supabase/supabase-js'

// Mock the validation utilities
jest.mock('@/lib/validation-utils', () => ({
  validateEmail: jest.fn((email: string) => {
    if (!email) return { valid: false, error: 'Email is required' }
    if (!email.includes('@')) return { valid: false, error: 'Invalid email format' }
    return { valid: true }
  }),
  validatePhone: jest.fn((phone: string) => {
    if (!phone) return { valid: false, error: 'Phone is required' }
    if (!/^\+91\d{10}$/.test(phone)) return { valid: false, error: 'Invalid phone format' }
    return { valid: true }
  }),
  validatePassword: jest.fn((password: string) => {
    if (!password) return { valid: false, errors: ['Password is required'] }
    if (password.length < 8) return { valid: false, errors: ['Password must be at least 8 characters'] }
    return { valid: true, errors: [] }
  }),
}))

// Mock rate limiter
jest.mock('@/lib/rate-limiter-distributed', () => ({
  checkOtpRateLimit: jest.fn().mockResolvedValue(true),
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

// Helper to create mock Supabase client
function createMockSupabase(overrides: Partial<SupabaseClient['auth']> = {}): SupabaseClient {
  return {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } as User, session: {} },
        error: null,
      }),
      signInWithOtp: jest.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
      verifyOtp: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } as User, session: {} },
        error: null,
      }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } as User },
        error: null,
      }),
      signInAnonymously: jest.fn().mockResolvedValue({
        data: { user: { id: 'anon-user-id' } as User },
        error: null,
      }),
      ...overrides,
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  } as unknown as SupabaseClient
}

describe('Auth Handlers', () => {
  describe('handleSignIn', () => {
    it('should require email or phone', async () => {
      const supabase = createMockSupabase()

      const result = await handleSignIn(supabase, { password: 'password123' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email or phone is required')
    })

    it('should successfully sign in with email', async () => {
      const supabase = createMockSupabase()

      const result = await handleSignIn(supabase, {
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should successfully sign in with phone', async () => {
      const supabase = createMockSupabase()

      const result = await handleSignIn(supabase, {
        phone: '+911234567890',
        password: 'password123',
      })

      expect(result.success).toBe(true)
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        phone: '+911234567890',
        password: 'password123',
      })
    })

    it('should validate email with custom validator', async () => {
      const supabase = createMockSupabase()
      const customValidator = jest.fn().mockReturnValue({ valid: false, error: 'Custom error' })

      const result = await handleSignIn(
        supabase,
        { email: 'invalid', password: 'password123' },
        { validatorFn: customValidator }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Custom error')
      expect(customValidator).toHaveBeenCalledWith('invalid')
    })

    it('should handle authentication errors', async () => {
      const supabase = createMockSupabase({
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' } as AuthError,
        }),
      })

      const result = await handleSignIn(supabase, {
        email: 'test@example.com',
        password: 'wrong-password',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should handle no user returned', async () => {
      const supabase = createMockSupabase({
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: null, session: {} },
          error: null,
        }),
      })

      const result = await handleSignIn(supabase, {
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication failed - no user returned')
    })

    it('should check profile when required', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { user_id: 'test-user-id', name: 'Teacher' },
          error: null,
        }),
      })

      const supabase = createMockSupabase()
      ;(supabase as unknown as { from: typeof mockFrom }).from = mockFrom

      const result = await handleSignIn(
        supabase,
        { email: 'teacher@example.com', password: 'password123' },
        { requireProfileCheck: true, profileTable: 'teacher_profiles' }
      )

      expect(result.success).toBe(true)
      expect(result.requiresProfileCheck).toBeUndefined()
      expect(mockFrom).toHaveBeenCalledWith('teacher_profiles')
    })

    it('should indicate when profile not found', async () => {
      const supabase = createMockSupabase()

      const result = await handleSignIn(
        supabase,
        { email: 'teacher@example.com', password: 'password123' },
        { requireProfileCheck: true, profileTable: 'teacher_profiles' }
      )

      expect(result.success).toBe(true)
      expect(result.requiresProfileCheck).toBe(true)
      expect(result.error).toBe('Profile not found')
    })

    it('should handle unexpected errors gracefully', async () => {
      const supabase = createMockSupabase({
        signInWithPassword: jest.fn().mockRejectedValue(new Error('Network error')),
      })

      const result = await handleSignIn(supabase, {
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  describe('handleSendOTP', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      // Reset and ensure rate limit allows by default
      const { checkOtpRateLimit } = require('@/lib/rate-limiter-distributed')
      checkOtpRateLimit.mockReset()
      checkOtpRateLimit.mockResolvedValue(true)
    })

    it('should validate email for email channel', async () => {
      const supabase = createMockSupabase()

      const result = await handleSendOTP(supabase, 'invalid-email', 'email')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email format')
    })

    it('should validate phone for phone channel', async () => {
      const supabase = createMockSupabase()

      const result = await handleSendOTP(supabase, '1234567890', 'phone')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid phone format')
    })

    it('should send OTP to valid email', async () => {
      const supabase = createMockSupabase()

      const result = await handleSendOTP(supabase, 'test@example.com', 'email')

      expect(result.success).toBe(true)
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          shouldCreateUser: true,
        },
      })
    })

    it('should send OTP to valid phone', async () => {
      const supabase = createMockSupabase()

      const result = await handleSendOTP(supabase, '+911234567890', 'phone')

      expect(result.success).toBe(true)
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+911234567890',
        options: {
          shouldCreateUser: true,
        },
      })
    })

    it('should include redirect URL for email', async () => {
      const supabase = createMockSupabase()

      await handleSendOTP(supabase, 'test@example.com', 'email', {
        redirectUrl: 'https://app.example.com/verify',
      })

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'https://app.example.com/verify',
          shouldCreateUser: true,
        },
      })
    })

    it('should respect shouldCreateUser option', async () => {
      const supabase = createMockSupabase()

      await handleSendOTP(supabase, 'test@example.com', 'email', {
        shouldCreateUser: false,
      })

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          shouldCreateUser: false,
        },
      })
    })

    it('should check rate limit by default', async () => {
      const { checkOtpRateLimit } = require('@/lib/rate-limiter-distributed')
      checkOtpRateLimit.mockResolvedValueOnce(false)

      const supabase = createMockSupabase()
      const result = await handleSendOTP(supabase, 'test@example.com', 'email')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Too many OTP requests')
    })

    it('should skip rate limit when requested', async () => {
      const { checkOtpRateLimit } = require('@/lib/rate-limiter-distributed')
      checkOtpRateLimit.mockResolvedValueOnce(false)

      const supabase = createMockSupabase()
      const result = await handleSendOTP(supabase, 'test@example.com', 'email', {
        skipRateLimit: true,
      })

      expect(result.success).toBe(true)
    })

    it('should handle Supabase OTP errors', async () => {
      const supabase = createMockSupabase({
        signInWithOtp: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Email provider error' } as AuthError,
        }),
      })

      const result = await handleSendOTP(supabase, 'test@example.com', 'email')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email provider error')
    })
  })

  describe('handleVerifyOTP', () => {
    it('should require email or phone', async () => {
      const supabase = createMockSupabase()

      const result = await handleVerifyOTP(supabase, {}, '123456', 'email')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email or phone is required')
    })

    it('should verify email OTP successfully', async () => {
      const supabase = createMockSupabase()

      const result = await handleVerifyOTP(
        supabase,
        { email: 'test@example.com' },
        '123456',
        'email'
      )

      expect(result.success).toBe(true)
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      })
    })

    it('should verify phone OTP successfully', async () => {
      const supabase = createMockSupabase()

      const result = await handleVerifyOTP(
        supabase,
        { phone: '+911234567890' },
        '123456',
        'sms'
      )

      expect(result.success).toBe(true)
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: '+911234567890',
        token: '123456',
        type: 'sms',
      })
    })

    it('should return user when requested', async () => {
      const supabase = createMockSupabase()

      const result = await handleVerifyOTP(
        supabase,
        { email: 'test@example.com' },
        '123456',
        'email',
        { returnUser: true }
      )

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('should handle expired OTP', async () => {
      const supabase = createMockSupabase({
        verifyOtp: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Token has expired' } as AuthError,
        }),
      })

      const result = await handleVerifyOTP(
        supabase,
        { email: 'test@example.com' },
        '123456',
        'email'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should handle invalid OTP', async () => {
      const supabase = createMockSupabase({
        verifyOtp: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Token is invalid' } as AuthError,
        }),
      })

      const result = await handleVerifyOTP(
        supabase,
        { email: 'test@example.com' },
        'wrong',
        'email'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain("didn't work")
    })

    it('should handle no user returned after verification', async () => {
      const supabase = createMockSupabase({
        verifyOtp: jest.fn().mockResolvedValue({
          data: { user: null, session: {} },
          error: null,
        }),
      })

      const result = await handleVerifyOTP(
        supabase,
        { email: 'test@example.com' },
        '123456',
        'email'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Verification failed - no user data')
    })

    it('should trim whitespace from token', async () => {
      const supabase = createMockSupabase()

      await handleVerifyOTP(
        supabase,
        { email: 'test@example.com' },
        '  123456  ',
        'email'
      )

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      })
    })

    it('should lowercase email', async () => {
      const supabase = createMockSupabase()

      await handleVerifyOTP(
        supabase,
        { email: 'TEST@EXAMPLE.COM' },
        '123456',
        'email'
      )

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      })
    })
  })

  describe('handleSetPassword', () => {
    it('should validate password by default', async () => {
      const supabase = createMockSupabase()

      const result = await handleSetPassword(supabase, 'short')

      expect(result.success).toBe(false)
      expect(result.error).toContain('8 characters')
    })

    it('should set password successfully', async () => {
      const supabase = createMockSupabase()

      const result = await handleSetPassword(supabase, 'validPassword123')

      expect(result.success).toBe(true)
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'validPassword123',
      })
    })

    it('should skip validation when requested', async () => {
      const supabase = createMockSupabase()

      const result = await handleSetPassword(supabase, 'short', false)

      expect(result.success).toBe(true)
    })

    it('should handle password update errors', async () => {
      const supabase = createMockSupabase({
        updateUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Password too weak' } as AuthError,
        }),
      })

      const result = await handleSetPassword(supabase, 'validPassword123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Password too weak')
    })
  })

  describe('handleAnonymousSignIn', () => {
    it('should sign in anonymously successfully', async () => {
      const supabase = createMockSupabase()

      const result = await handleAnonymousSignIn(supabase)

      expect(result.success).toBe(true)
      expect(supabase.auth.signInAnonymously).toHaveBeenCalled()
    })

    it('should handle anonymous signin errors', async () => {
      const supabase = createMockSupabase({
        signInAnonymously: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Anonymous auth disabled' } as AuthError,
        }),
      })

      const result = await handleAnonymousSignIn(supabase)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Anonymous auth disabled')
    })

    it('should handle unexpected errors', async () => {
      const supabase = createMockSupabase({
        signInAnonymously: jest.fn().mockRejectedValue(new Error('Network error')),
      })

      const result = await handleAnonymousSignIn(supabase)

      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
    })
  })

  describe('Edge Cases', () => {
    it('should handle email with mixed case', async () => {
      const supabase = createMockSupabase()

      await handleSignIn(supabase, {
        email: '  Test@Example.COM  ',
        password: 'password123',
      })

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'Test@Example.COM',
        password: 'password123',
      })
    })

    it('should handle empty password', async () => {
      const supabase = createMockSupabase()

      const result = await handleSetPassword(supabase, '')

      expect(result.success).toBe(false)
    })

    it('should handle null credentials gracefully', async () => {
      const supabase = createMockSupabase()

      const result = await handleSignIn(supabase, {
        email: undefined,
        phone: undefined,
        password: 'password123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email or phone is required')
    })
  })
})
