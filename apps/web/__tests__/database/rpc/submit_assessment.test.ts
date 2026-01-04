/**
 * RPC Function Tests: submit_assessment()
 * Tests core assessment submission functionality with RLS enforcement
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseTestManager } from '../setup/database-manager';

describe('RPC: submit_assessment()', () => {
  let dbTest: DatabaseTestManager;
  let studentId: string;
  let sessionId: string;

  beforeEach(async () => {
    dbTest = new DatabaseTestManager();
    studentId = await dbTest.createTestUser('student', 'submit-test-student');

    const serviceClient = dbTest.getServiceRoleClient();
    const { data, error } = await serviceClient
      .from('assessment_sessions')
      .insert({
        user_id: studentId,
        assessment_type: 'diagnostic',
        status: 'in_progress',
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create test session: ${error?.message}`);
    }

    sessionId = data.id;
  });

  afterEach(async () => {
    await dbTest.cleanup();
  });

  it('should submit valid assessment and return score', async () => {
    const responses = [
      {
        item_id: 'test-item-1',
        user_response: 'A',
        is_correct: true,
        rt_ms: 45,
        focus_blur_count: 0,
        chosen_option: 'A',
      },
    ];

    const result = await dbTest.executeRPC(
      'submit_assessment',
      {
        p_session_id: sessionId,
        p_user_id: studentId,
        p_responses: responses,
      },
      studentId
    );

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.correct_answers).toBe(1);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should handle mixed correct and incorrect responses', async () => {
    const responses = [
      {
        item_id: 'test-item-1',
        user_response: 'A',
        is_correct: true,
        rt_ms: 45,
        focus_blur_count: 0,
        chosen_option: 'A',
      },
      {
        item_id: 'test-item-2',
        user_response: 'B',
        is_correct: false,
        rt_ms: 60,
        focus_blur_count: 1,
        chosen_option: 'C',
      },
      {
        item_id: 'test-item-3',
        user_response: 'A',
        is_correct: true,
        rt_ms: 50,
        focus_blur_count: 0,
        chosen_option: 'A',
      },
    ];

    const result = await dbTest.executeRPC(
      'submit_assessment',
      {
        p_session_id: sessionId,
        p_user_id: studentId,
        p_responses: responses,
      },
      studentId
    );

    expect(result.success).toBe(true);
    expect(result.correct_answers).toBe(2);
    expect(result.total_questions).toBe(3);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should enforce RLS - students cannot submit for other students', async () => {
    const otherStudentId = await dbTest.createTestUser('student', 'other-student');

    const responses = [
      {
        item_id: 'test-item-1',
        user_response: 'A',
        is_correct: true,
        rt_ms: 45,
        focus_blur_count: 0,
        chosen_option: 'A',
      },
    ];

    await expect(
      dbTest.executeRPC(
        'submit_assessment',
        {
          p_session_id: sessionId,
          p_user_id: otherStudentId,
          p_responses: responses,
        },
        otherStudentId
      )
    ).rejects.toThrow();
  });

  it('should update knowledge state after submission', async () => {
    const responses = [
      {
        item_id: 'test-item-1',
        user_response: 'A',
        is_correct: true,
        rt_ms: 45,
        focus_blur_count: 0,
        chosen_option: 'A',
      },
    ];

    const submitResult = await dbTest.executeRPC(
      'submit_assessment',
      {
        p_session_id: sessionId,
        p_user_id: studentId,
        p_responses: responses,
      },
      studentId
    );

    expect(submitResult.success).toBe(true);

    const clientAfter = await dbTest.getUserClient(studentId);
    const { data: stateAfterSubmission } = await clientAfter
      .from('knowledge_states')
      .select('submitted_at')
      .eq('user_id', studentId)
      .single();

    expect(stateAfterSubmission).toBeDefined();
  });

  it('should handle idempotent resubmission gracefully', async () => {
    const responses = [
      {
        item_id: 'test-item-1',
        user_response: 'A',
        is_correct: true,
        rt_ms: 45,
        focus_blur_count: 0,
        chosen_option: 'A',
      },
    ];

    const result1 = await dbTest.executeRPC(
      'submit_assessment',
      {
        p_session_id: sessionId,
        p_user_id: studentId,
        p_responses: responses,
      },
      studentId
    );

    const result2 = await dbTest.executeRPC(
      'submit_assessment',
      {
        p_session_id: sessionId,
        p_user_id: studentId,
        p_responses: responses,
      },
      studentId
    );

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.score).toBe(result2.score);
    expect(result1.correct_answers).toBe(result2.correct_answers);
  });
});
