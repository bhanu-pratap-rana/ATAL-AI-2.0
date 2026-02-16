/**
 * Unit Tests for useModalState Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useModalState } from '@/hooks/useModalState';

describe('useModalState Hook', () => {
  it('should initialize with closed state and initial data', () => {
    const { result } = renderHook(() => useModalState<string | null>(null));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toBe(null);
  });

  it('should initialize with custom initial data', () => {
    const initialData = { id: '123', name: 'Test' };
    const { result } = renderHook(() => useModalState(initialData));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toEqual(initialData);
  });

  it('should open modal with new data', () => {
    const { result } = renderHook(() => useModalState<{ id: string } | null>(null));

    act(() => {
      result.current.open({ id: 'test-id' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toEqual({ id: 'test-id' });
  });

  it('should close modal and reset data to initial state', () => {
    const initialData = { id: '', name: '' };
    const { result } = renderHook(() => useModalState(initialData));

    // Open with new data
    act(() => {
      result.current.open({ id: 'test', name: 'Test Name' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toEqual({ id: 'test', name: 'Test Name' });

    // Close
    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toEqual(initialData);
  });

  it('should allow updating data while modal is open', () => {
    const { result } = renderHook(() => useModalState({ value: 0 }));

    act(() => {
      result.current.open({ value: 1 });
    });

    act(() => {
      result.current.setData({ value: 2 });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toEqual({ value: 2 });
  });

  it('should handle null initial state correctly', () => {
    const { result } = renderHook(() => useModalState<{ email: string } | null>(null));

    act(() => {
      result.current.open({ email: 'test@example.com' });
    });

    expect(result.current.data).toEqual({ email: 'test@example.com' });

    act(() => {
      result.current.close();
    });

    expect(result.current.data).toBe(null);
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useModalState(null));

    const initialOpen = result.current.open;
    const initialClose = result.current.close;
    const initialSetData = result.current.setData;

    rerender();

    expect(result.current.open).toBe(initialOpen);
    expect(result.current.close).toBe(initialClose);
    expect(result.current.setData).toBe(initialSetData);
  });
});
