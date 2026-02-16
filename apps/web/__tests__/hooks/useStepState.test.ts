/**
 * Unit Tests for useStepState Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useStepState } from '@/hooks/useStepState';

type TestStep = 'email' | 'password' | 'verify';

describe('useStepState Hook', () => {
  it('should initialize with the provided initial step', () => {
    const { result } = renderHook(() => useStepState<TestStep>('email'));

    expect(result.current.step).toBe('email');
  });

  it('should change step when setStep is called', () => {
    const { result } = renderHook(() => useStepState<TestStep>('email'));

    act(() => {
      result.current.setStep('password');
    });

    expect(result.current.step).toBe('password');
  });

  it('should allow navigating through multiple steps', () => {
    const { result } = renderHook(() => useStepState<TestStep>('email'));

    act(() => {
      result.current.setStep('password');
    });
    expect(result.current.step).toBe('password');

    act(() => {
      result.current.setStep('verify');
    });
    expect(result.current.step).toBe('verify');

    act(() => {
      result.current.setStep('email');
    });
    expect(result.current.step).toBe('email');
  });

  it('should maintain stable setStep function reference', () => {
    const { result, rerender } = renderHook(() => useStepState<TestStep>('email'));

    const initialSetStep = result.current.setStep;

    rerender();

    expect(result.current.setStep).toBe(initialSetStep);
  });

  it('should work with different step types', () => {
    type NumericStep = 1 | 2 | 3;
    const { result } = renderHook(() => useStepState<NumericStep>(1));

    expect(result.current.step).toBe(1);

    act(() => {
      result.current.setStep(2);
    });

    expect(result.current.step).toBe(2);
  });

  it('should work with string literal steps', () => {
    const { result } = renderHook(() => useStepState('step-one'));

    expect(result.current.step).toBe('step-one');

    act(() => {
      result.current.setStep('step-two');
    });

    expect(result.current.step).toBe('step-two');
  });
});
