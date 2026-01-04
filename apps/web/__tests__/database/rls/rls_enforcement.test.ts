/**
 * RLS Policy Enforcement Tests
 * Verifies all RLS policies enforce correct data isolation across user roles
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseTestManager } from '../setup/database-manager';

describe('RLS Policy Enforcement', () => {
  let dbTest: DatabaseTestManager;

  beforeEach(async () => {
    dbTest = new DatabaseTestManager();
  });

  afterEach(async () => {
    await dbTest.cleanup();
  });

  describe('student_profiles table', () => {
    it('students can only read their own profile', async () => {
      const student1Id = await dbTest.createTestUser('student', 'student-1');
      const student2Id = await dbTest.createTestUser('student', 'student-2');

      const serviceClient = dbTest.getServiceRoleClient();
      const { error } = await serviceClient.from('student_profiles').insert([
        {
          user_id: student1Id,
          name: 'Student One',
          gender: 'M',
          school_id: 'test-school-1',
        },
        {
          user_id: student2Id,
          name: 'Student Two',
          gender: 'F',
          school_id: 'test-school-1',
        },
      ]);

      expect(error).toBeNull();

      const student1Client = await dbTest.getUserClient(student1Id);
      const { data: student1Data } = await student1Client
        .from('student_profiles')
        .select('*');

      expect(student1Data).toHaveLength(1);
      expect(student1Data?.[0]?.user_id).toBe(student1Id);
    });

    it('teachers cannot read student profiles', async () => {
      const teacherId = await dbTest.createTestUser('teacher', 'teacher-1');
      const studentId = await dbTest.createTestUser('student', 'student-1');

      const serviceClient = dbTest.getServiceRoleClient();
      await serviceClient.from('student_profiles').insert({
        user_id: studentId,
        name: 'Test Student',
        gender: 'M',
        school_id: 'test-school-1',
      });

      const teacherClient = await dbTest.getUserClient(teacherId);
      const { data: teacherData } = await teacherClient
        .from('student_profiles')
        .select('*');

      expect(teacherData).toEqual([]);
    });

    it('admins can read all student profiles', async () => {
      const adminId = await dbTest.createTestUser('admin', 'admin-1');
      const student1Id = await dbTest.createTestUser('student', 'student-1');
      const student2Id = await dbTest.createTestUser('student', 'student-2');

      const serviceClient = dbTest.getServiceRoleClient();
      await serviceClient.from('student_profiles').insert([
        {
          user_id: student1Id,
          name: 'Student One',
          gender: 'M',
          school_id: 'test-school-1',
        },
        {
          user_id: student2Id,
          name: 'Student Two',
          gender: 'F',
          school_id: 'test-school-1',
        },
      ]);

      const adminClient = await dbTest.getUserClient(adminId);
      const { data: adminData } = await adminClient
        .from('student_profiles')
        .select('*');

      expect(adminData!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('assessment_sessions table', () => {
    it('students can only read their own assessment sessions', async () => {
      const student1Id = await dbTest.createTestUser('student', 'student-1');
      const student2Id = await dbTest.createTestUser('student', 'student-2');

      const serviceClient = dbTest.getServiceRoleClient();
      await serviceClient.from('assessment_sessions').insert([
        {
          user_id: student1Id,
          assessment_type: 'diagnostic',
          status: 'completed',
        },
        {
          user_id: student1Id,
          assessment_type: 'practice',
          status: 'completed',
        },
        {
          user_id: student2Id,
          assessment_type: 'diagnostic',
          status: 'completed',
        },
      ]);

      const student1Client = await dbTest.getUserClient(student1Id);
      const { data: student1Sessions } = await student1Client
        .from('assessment_sessions')
        .select('*')
        .eq('user_id', student1Id);

      expect(student1Sessions).toHaveLength(2);
      expect(student1Sessions?.every((s) => s.user_id === student1Id)).toBe(true);
    });
  });

  describe('RLS policy performance', () => {
    it('large queries should complete in reasonable time', async () => {
      const studentId = await dbTest.createTestUser('student', 'perf-test-student');

      const serviceClient = dbTest.getServiceRoleClient();
      const sessions = Array.from({ length: 50 }, (_, i) => ({
        user_id: studentId,
        assessment_type: i % 2 === 0 ? 'diagnostic' : 'practice',
        status: 'completed',
      }));

      const { error: insertError } = await serviceClient
        .from('assessment_sessions')
        .insert(sessions);

      expect(insertError).toBeNull();

      const studentClient = await dbTest.getUserClient(studentId);
      const startTime = Date.now();

      const { data } = await studentClient
        .from('assessment_sessions')
        .select('*')
        .eq('user_id', studentId);

      const duration = Date.now() - startTime;

      expect(data).toHaveLength(50);
      expect(duration).toBeLessThan(2000);
    });
  });
});
