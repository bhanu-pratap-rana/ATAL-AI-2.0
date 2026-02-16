/**
 * Tests for auth-otp.ts server actions
 *
 * Tests OTP-based authentication flows:
 * - requestOtp: Request OTP for login/signup
 * - verifyOtp: Verify OTP and create session
 * - sendForgotPasswordOtp: Password recovery OTP
 * - resetPasswordWithOtp: Reset password with OTP
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies before importing the module under test
const mockCreateClient = jest.fn();
const mockRevalidatePath = jest.fn();
const mockRedirect = jest.fn();

// Mock Supabase auth methods
const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockUpdateUser = jest.fn();
const mockSignOut = jest.fn();

const mockSupabaseClient = {
  auth: {
    signInWithOtp: mockSignInWithOtp,
    verifyOtp: mockVerifyOtp,
    updateUser: mockUpdateUser,
    signOut: mockSignOut,
  },
};

// Mock rate limiters
const mockCheckOtpRateLimit = jest.fn().mockResolvedValue(true);
const mockCheckOtpVerifyRateLimit = jest.fn().mockResolvedValue(true);
const mockCheckPasswordResetRateLimit = jest.fn().mockResolvedValue(true);
const mockCheckEnumerationRateLimit = jest.fn().mockResolvedValue(true);

// Mock auth logger
const mockAuthLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
};

// Mock email existence check
const mockCheckEmailExistsInAuth = jest.fn().mockResolvedValue({ exists: false });

// Setup mocks
jest.mock('@/lib/supabase-server', () => ({
  createClient: () => mockCreateClient(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error('NEXT_REDIRECT');
  },
}));

jest.mock('@/lib/rate-limiter-distributed', () => ({
  checkOtpRateLimit: (email: string) => mockCheckOtpRateLimit(email),
  checkOtpVerifyRateLimit: (email: string) => mockCheckOtpVerifyRateLimit(email),
  checkPasswordResetRateLimit: (email: string) => mockCheckPasswordResetRateLimit(email),
  checkEnumerationRateLimit: (key: string) => mockCheckEnumerationRateLimit(key),
}));

jest.mock('@/lib/auth-logger', () => ({
  authLogger: mockAuthLogger,
}));

jest.mock('../../../src/app/actions/auth/auth-verification', () => ({
  checkEmailExistsInAuth: (email: string) => mockCheckEmailExistsInAuth(email),
}));

// Import the module under test after mocks are set up
import {
  requestOtp,
  verifyOtp,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
} from '@/app/actions/auth/auth-otp';

describe('auth-otp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabaseClient);

    // Reset to default successful states
    mockCheckOtpRateLimit.mockResolvedValue(true);
    mockCheckOtpVerifyRateLimit.mockResolvedValue(true);
    mockCheckPasswordResetRateLimit.mockResolvedValue(true);
    mockCheckEnumerationRateLimit.mockResolvedValue(true);
    mockCheckEmailExistsInAuth.mockResolvedValue({ exists: false });
  });

  // ==========================================
  // requestOtp tests
  // ==========================================
  describe('requestOtp', () => {
    describe('Input Validation', () => {
      it('should reject empty email', async () => {
        const result = await requestOtp('');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject invalid email format', async () => {
        const result = await requestOtp('invalid-email');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject email without domain', async () => {
        const result = await requestOtp('user@');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject email with invalid TLD', async () => {
        const result = await requestOtp('user@domain');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should accept valid email format', async () => {
        mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

        const result = await requestOtp('valid@example.com');
        expect(result.success).toBe(true);
      });

      it('should lowercase email', async () => {
        mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

        // The schema transforms email to lowercase
        const result = await requestOtp('Valid@Example.COM');
        expect(result.success).toBe(true);
        expect(mockSignInWithOtp).toHaveBeenCalled();
      });

      it('should reject email with leading/trailing whitespace', async () => {
        // Whitespace is validated before transform, so it fails email validation
        const result = await requestOtp('  valid@example.com  ');
        expect(result.success).toBe(false);
      });
    });

    describe('Rate Limiting', () => {
      it('should reject when OTP rate limit exceeded', async () => {
        mockCheckOtpRateLimit.mockResolvedValue(false);

        const result = await requestOtp('user@example.com');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Too many OTP requests');
      });

      it('should reject when enumeration rate limit exceeded', async () => {
        mockCheckEnumerationRateLimit.mockResolvedValue(false);

        const result = await requestOtp('user@example.com');
        expect(result.success).toBe(false);
        expect(result.error).toContain('If this email is registered');
      });

      it('should check rate limits in correct order', async () => {
        mockCheckOtpRateLimit.mockResolvedValue(false);

        await requestOtp('user@example.com');

        // OTP limit should be checked first
        expect(mockCheckOtpRateLimit).toHaveBeenCalled();
        // Enumeration limit should NOT be checked if OTP limit failed
        expect(mockCheckEnumerationRateLimit).not.toHaveBeenCalled();
      });
    });

    describe('Email Enumeration Protection', () => {
      it('should return generic message when email already exists', async () => {
        mockCheckEmailExistsInAuth.mockResolvedValue({
          exists: true,
          role: 'teacher',
        });

        const result = await requestOtp('existing@example.com');
        expect(result.success).toBe(false);
        expect(result.error).toContain('If this email is registered');
        // Should NOT reveal that email exists
        expect(result.error).not.toContain('already registered');
      });

      it('should proceed for new email addresses', async () => {
        mockCheckEmailExistsInAuth.mockResolvedValue({ exists: false });
        mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

        const result = await requestOtp('new@example.com');
        expect(result.success).toBe(true);
      });
    });

    describe('Supabase Integration', () => {
      it('should call signInWithOtp with correct parameters', async () => {
        mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

        await requestOtp('user@example.com');

        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          email: 'user@example.com',
          options: {
            shouldCreateUser: true,
          },
        });
      });

      it('should handle Supabase error gracefully', async () => {
        mockSignInWithOtp.mockResolvedValue({
          data: null,
          error: { message: 'Supabase error' },
        });

        const result = await requestOtp('user@example.com');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should return success with data on successful OTP send', async () => {
        const mockData = { messageId: 'msg-123' };
        mockSignInWithOtp.mockResolvedValue({ data: mockData, error: null });

        const result = await requestOtp('user@example.com');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
      });
    });

    describe('Error Handling', () => {
      it('should catch and handle unexpected errors', async () => {
        mockCheckOtpRateLimit.mockRejectedValue(new Error('Unexpected error'));

        const result = await requestOtp('user@example.com');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Unexpected error');
      });

      it('should log errors appropriately', async () => {
        mockSignInWithOtp.mockResolvedValue({
          data: null,
          error: { message: 'Auth error' },
        });

        await requestOtp('user@example.com');
        // Logger should be called for the error scenario
        expect(mockAuthLogger.debug).toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // verifyOtp tests
  // ==========================================
  describe('verifyOtp', () => {
    describe('Input Validation', () => {
      it('should reject invalid email', async () => {
        const result = await verifyOtp('invalid-email', '123456');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject empty token', async () => {
        const result = await verifyOtp('user@example.com', '');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject token with wrong length', async () => {
        const result = await verifyOtp('user@example.com', '12345'); // 5 digits
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject non-numeric token', async () => {
        const result = await verifyOtp('user@example.com', 'abcdef');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Rate Limiting', () => {
      it('should reject when verification rate limit exceeded', async () => {
        mockCheckOtpVerifyRateLimit.mockResolvedValue(false);

        const result = await verifyOtp('user@example.com', '123456');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Too many verification attempts');
      });

      it('should check rate limit with correct email', async () => {
        mockCheckOtpVerifyRateLimit.mockResolvedValue(false);

        await verifyOtp('test@example.com', '123456');
        expect(mockCheckOtpVerifyRateLimit).toHaveBeenCalledWith('test@example.com');
      });
    });

    describe('Successful Verification', () => {
      it('should redirect student to dashboard after verification', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              app_metadata: { role: 'student' },
            },
          },
          error: null,
        });

        try {
          await verifyOtp('student@example.com', '123456');
        } catch (error) {
          // Redirect throws NEXT_REDIRECT
          expect((error as Error).message).toBe('NEXT_REDIRECT');
        }

        expect(mockRedirect).toHaveBeenCalledWith('/app/dashboard');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
      });

      it('should redirect teacher to classes after verification', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: {
            user: {
              id: 'teacher-123',
              app_metadata: { role: 'teacher' },
            },
          },
          error: null,
        });

        try {
          await verifyOtp('teacher@example.com', '123456');
        } catch (error) {
          expect((error as Error).message).toBe('NEXT_REDIRECT');
        }

        expect(mockRedirect).toHaveBeenCalledWith('/app/teacher/classes');
      });

      it('should redirect admin to teacher classes', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: {
            user: {
              id: 'admin-123',
              app_metadata: { role: 'admin' },
            },
          },
          error: null,
        });

        try {
          await verifyOtp('admin@example.com', '123456');
        } catch (error) {
          expect((error as Error).message).toBe('NEXT_REDIRECT');
        }

        expect(mockRedirect).toHaveBeenCalledWith('/app/teacher/classes');
      });

      it('should default to student role if no role set', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              app_metadata: {},
            },
          },
          error: null,
        });

        try {
          await verifyOtp('user@example.com', '123456');
        } catch (error) {
          expect((error as Error).message).toBe('NEXT_REDIRECT');
        }

        expect(mockRedirect).toHaveBeenCalledWith('/app/dashboard');
      });
    });

    describe('Failed Verification', () => {
      it('should return error for invalid OTP', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid OTP' },
        });

        const result = await verifyOtp('user@example.com', '123456');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid OTP');
      });

      it('should return error for expired OTP', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: null },
          error: { message: 'Token has expired or is invalid' },
        });

        const result = await verifyOtp('user@example.com', '123456');
        expect(result.success).toBe(false);
        expect(result.error).toContain('expired');
      });
    });
  });

  // ==========================================
  // sendForgotPasswordOtp tests
  // ==========================================
  describe('sendForgotPasswordOtp', () => {
    describe('Input Validation', () => {
      it('should reject invalid email', async () => {
        const result = await sendForgotPasswordOtp('invalid');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should accept valid email', async () => {
        mockSignInWithOtp.mockResolvedValue({ error: null });

        const result = await sendForgotPasswordOtp('user@example.com');
        expect(result.success).toBe(true);
      });
    });

    describe('Rate Limiting', () => {
      it('should reject when password reset rate limit exceeded', async () => {
        mockCheckPasswordResetRateLimit.mockResolvedValue(false);

        const result = await sendForgotPasswordOtp('user@example.com');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Too many password reset requests');
      });
    });

    describe('Email Enumeration Protection', () => {
      it('should always return success regardless of email existence', async () => {
        // Even if Supabase returns error (email doesn't exist), we return success
        mockSignInWithOtp.mockResolvedValue({
          error: { message: 'User not found' },
        });

        const result = await sendForgotPasswordOtp('nonexistent@example.com');
        expect(result.success).toBe(true);
        expect(result.message).toContain('If this email is registered');
      });

      it('should return generic success message', async () => {
        mockSignInWithOtp.mockResolvedValue({ error: null });

        const result = await sendForgotPasswordOtp('user@example.com');
        expect(result.message).toContain('If this email is registered');
        // Should NOT reveal whether email exists
        expect(result.message).not.toContain('sent successfully');
      });
    });

    describe('Supabase Integration', () => {
      it('should call signInWithOtp with shouldCreateUser: false', async () => {
        mockSignInWithOtp.mockResolvedValue({ error: null });

        await sendForgotPasswordOtp('user@example.com');

        expect(mockSignInWithOtp).toHaveBeenCalledWith({
          email: 'user@example.com',
          options: {
            shouldCreateUser: false,
          },
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        mockCheckPasswordResetRateLimit.mockRejectedValue(new Error('DB error'));

        const result = await sendForgotPasswordOtp('user@example.com');
        expect(result.success).toBe(false);
        expect(result.error).toBe('DB error');
      });
    });
  });

  // ==========================================
  // resetPasswordWithOtp tests
  // ==========================================
  describe('resetPasswordWithOtp', () => {
    describe('Input Validation', () => {
      it('should reject invalid email', async () => {
        const result = await resetPasswordWithOtp('invalid', '123456', 'newPassword123');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject invalid token', async () => {
        const result = await resetPasswordWithOtp('user@example.com', 'abc', 'newPassword123');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject short password', async () => {
        const result = await resetPasswordWithOtp('user@example.com', '123456', 'short');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should accept password at minimum length (8 chars) with complexity', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });
        mockUpdateUser.mockResolvedValue({ error: null });
        mockSignOut.mockResolvedValue({ error: null });

        // Password requires: uppercase, lowercase, digit, special char
        const result = await resetPasswordWithOtp('user@example.com', '123456', 'Pass123!');
        expect(result.success).toBe(true);
      });

      it('should accept long passphrases with complexity (up to 64 chars)', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });
        mockUpdateUser.mockResolvedValue({ error: null });
        mockSignOut.mockResolvedValue({ error: null });

        // Long passphrase with required complexity
        const longPassword = 'Correct Horse Battery Staple 123!';
        const result = await resetPasswordWithOtp('user@example.com', '123456', longPassword);
        expect(result.success).toBe(true);
      });

      it('should reject password without uppercase', async () => {
        const result = await resetPasswordWithOtp('user@example.com', '123456', 'password123!');
        expect(result.success).toBe(false);
        expect(result.error).toContain('uppercase');
      });

      it('should reject password without special character', async () => {
        const result = await resetPasswordWithOtp('user@example.com', '123456', 'Password123');
        expect(result.success).toBe(false);
        expect(result.error).toContain('special');
      });
    });

    describe('OTP Verification', () => {
      it('should return error for invalid OTP', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid OTP' },
        });

        const result = await resetPasswordWithOtp('user@example.com', '123456', 'NewPass123!');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid or expired recovery code');
      });

      it('should return error when user not found after verification', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await resetPasswordWithOtp('user@example.com', '123456', 'NewPass123!');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Verification failed');
      });
    });

    describe('Password Update', () => {
      it('should update password after successful OTP verification', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });
        mockUpdateUser.mockResolvedValue({ error: null });
        mockSignOut.mockResolvedValue({ error: null });

        const newPassword = 'NewSecurePass123!';
        await resetPasswordWithOtp('user@example.com', '123456', newPassword);

        expect(mockUpdateUser).toHaveBeenCalledWith({
          password: newPassword,
        });
      });

      it('should return error if password update fails', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });
        mockUpdateUser.mockResolvedValue({
          error: { message: 'Password update failed' },
        });

        const result = await resetPasswordWithOtp('user@example.com', '123456', 'ValidPass123!');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Password update failed');
      });
    });

    describe('Session Security', () => {
      it('should invalidate other sessions after password reset', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });
        mockUpdateUser.mockResolvedValue({ error: null });
        mockSignOut.mockResolvedValue({ error: null });

        await resetPasswordWithOtp('user@example.com', '123456', 'NewPassword123!');

        expect(mockSignOut).toHaveBeenCalledWith({ scope: 'others' });
      });

      it('should succeed even if session revocation fails', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });
        mockUpdateUser.mockResolvedValue({ error: null });
        mockSignOut.mockResolvedValue({
          error: { message: 'Session error' },
        });

        const result = await resetPasswordWithOtp('user@example.com', '123456', 'NewPassword123!');
        // Password reset should still succeed
        expect(result.success).toBe(true);
      });

      it('should revalidate path after successful reset', async () => {
        mockVerifyOtp.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });
        mockUpdateUser.mockResolvedValue({ error: null });
        mockSignOut.mockResolvedValue({ error: null });

        await resetPasswordWithOtp('user@example.com', '123456', 'NewPassword123!');

        expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
      });
    });

    describe('Error Handling', () => {
      it('should handle unexpected errors', async () => {
        mockVerifyOtp.mockRejectedValue(new Error('Network error'));

        const result = await resetPasswordWithOtp('user@example.com', '123456', 'NewPassword123!');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Network error');
      });
    });
  });
});
