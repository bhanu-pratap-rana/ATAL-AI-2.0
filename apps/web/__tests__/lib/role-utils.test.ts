/**
 * Unit Tests for Role Utilities
 */

import {
  isTeacherOrHigher,
  isAdmin,
  isSuperAdmin,
  isTeacherOnly,
  isStudent,
  hasMinimumRole,
  isValidRole,
  getRoleDisplayName,
  ROLE_HIERARCHY,
  ADMIN_ROLES,
  TEACHER_ROLES,
} from '@/lib/auth/role-utils';

describe('Role Utils', () => {
  describe('isTeacherOrHigher', () => {
    it('should return true for teacher, admin, and super_admin', () => {
      expect(isTeacherOrHigher('teacher')).toBe(true);
      expect(isTeacherOrHigher('admin')).toBe(true);
      expect(isTeacherOrHigher('super_admin')).toBe(true);
    });

    it('should return false for student', () => {
      expect(isTeacherOrHigher('student')).toBe(false);
    });

    it('should return false for undefined/null', () => {
      expect(isTeacherOrHigher(undefined)).toBe(false);
      expect(isTeacherOrHigher(null)).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin and super_admin', () => {
      expect(isAdmin('admin')).toBe(true);
      expect(isAdmin('super_admin')).toBe(true);
    });

    it('should return false for teacher and student', () => {
      expect(isAdmin('teacher')).toBe(false);
      expect(isAdmin('student')).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true only for super_admin', () => {
      expect(isSuperAdmin('super_admin')).toBe(true);
    });

    it('should return false for all other roles', () => {
      expect(isSuperAdmin('admin')).toBe(false);
      expect(isSuperAdmin('teacher')).toBe(false);
      expect(isSuperAdmin('student')).toBe(false);
    });
  });

  describe('isTeacherOnly', () => {
    it('should return true only for teacher', () => {
      expect(isTeacherOnly('teacher')).toBe(true);
    });

    it('should return false for admin and super_admin', () => {
      expect(isTeacherOnly('admin')).toBe(false);
      expect(isTeacherOnly('super_admin')).toBe(false);
    });
  });

  describe('isStudent', () => {
    it('should return true only for student', () => {
      expect(isStudent('student')).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(isStudent('teacher')).toBe(false);
      expect(isStudent('admin')).toBe(false);
    });
  });

  describe('hasMinimumRole', () => {
    it('should correctly check role hierarchy', () => {
      // Super admin has all permissions
      expect(hasMinimumRole('super_admin', 'student')).toBe(true);
      expect(hasMinimumRole('super_admin', 'teacher')).toBe(true);
      expect(hasMinimumRole('super_admin', 'admin')).toBe(true);
      expect(hasMinimumRole('super_admin', 'super_admin')).toBe(true);

      // Admin can access teacher and student areas
      expect(hasMinimumRole('admin', 'student')).toBe(true);
      expect(hasMinimumRole('admin', 'teacher')).toBe(true);
      expect(hasMinimumRole('admin', 'admin')).toBe(true);
      expect(hasMinimumRole('admin', 'super_admin')).toBe(false);

      // Teacher can access teacher and student areas
      expect(hasMinimumRole('teacher', 'student')).toBe(true);
      expect(hasMinimumRole('teacher', 'teacher')).toBe(true);
      expect(hasMinimumRole('teacher', 'admin')).toBe(false);

      // Student can only access student areas
      expect(hasMinimumRole('student', 'student')).toBe(true);
      expect(hasMinimumRole('student', 'teacher')).toBe(false);
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('student')).toBe(true);
      expect(isValidRole('teacher')).toBe(true);
      expect(isValidRole('admin')).toBe(true);
      expect(isValidRole('super_admin')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('invalid')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
      expect(isValidRole(123)).toBe(false);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return human-readable names', () => {
      expect(getRoleDisplayName('student')).toBe('Student');
      expect(getRoleDisplayName('teacher')).toBe('Teacher');
      expect(getRoleDisplayName('admin')).toBe('Administrator');
      expect(getRoleDisplayName('super_admin')).toBe('Super Administrator');
    });

    it('should return Unknown for invalid roles', () => {
      expect(getRoleDisplayName('invalid')).toBe('Unknown');
      expect(getRoleDisplayName(undefined)).toBe('Unknown');
    });
  });

  describe('Role Constants', () => {
    it('should have correct role hierarchy values', () => {
      expect(ROLE_HIERARCHY.student).toBeLessThan(ROLE_HIERARCHY.teacher);
      expect(ROLE_HIERARCHY.teacher).toBeLessThan(ROLE_HIERARCHY.admin);
      expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.super_admin);
    });

    it('should have correct admin roles', () => {
      expect(ADMIN_ROLES).toContain('admin');
      expect(ADMIN_ROLES).toContain('super_admin');
      expect(ADMIN_ROLES).not.toContain('teacher');
    });

    it('should have correct teacher roles', () => {
      expect(TEACHER_ROLES).toContain('teacher');
      expect(TEACHER_ROLES).toContain('admin');
      expect(TEACHER_ROLES).toContain('super_admin');
      expect(TEACHER_ROLES).not.toContain('student');
    });
  });
});
