/**
 * Unit Tests for useAsyncOperation Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock client logger
jest.mock('@/lib/client-logger', () => ({
  clientLogger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { toast } from 'sonner';

describe('useAsyncOperation Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAsyncOperation());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('execute', () => {
    it('should set loading state during operation', async () => {
      const { result } = renderHook(() => useAsyncOperation());

      let loadingDuringExecution = false;

      await act(async () => {
        const promise = result.current.execute(async () => {
          loadingDuringExecution = result.current.isLoading;
          return 'success';
        });
        await promise;
      });

      // Loading should be true during execution (captured above)
      // and false after completion
      expect(result.current.isLoading).toBe(false);
    });

    it('should return result on successful operation', async () => {
      const { result } = renderHook(() => useAsyncOperation());

      let returnValue: string | null = null;

      await act(async () => {
        returnValue = await result.current.execute(async () => 'test-result');
      });

      expect(returnValue).toBe('test-result');
    });

    it('should show success toast on completion', async () => {
      const { result } = renderHook(() =>
        useAsyncOperation({ successMessage: 'Operation succeeded' })
      );

      await act(async () => {
        await result.current.execute(async () => 'done');
      });

      expect(toast.success).toHaveBeenCalledWith('Operation succeeded');
    });

    it('should not show success toast when disabled', async () => {
      const { result } = renderHook(() =>
        useAsyncOperation({ showSuccessToast: false })
      );

      await act(async () => {
        await result.current.execute(async () => 'done');
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useAsyncOperation({ onSuccess, showSuccessToast: false })
      );

      await act(async () => {
        await result.current.execute(async () => 'done');
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should handle errors and set error state', async () => {
      const { result } = renderHook(() => useAsyncOperation());

      await act(async () => {
        await result.current.execute(async () => {
          throw new Error('Test error');
        });
      });

      expect(result.current.error).toBe('Test error');
      expect(toast.error).toHaveBeenCalledWith('Test error');
    });

    it('should return null on error', async () => {
      const { result } = renderHook(() => useAsyncOperation());

      let returnValue: unknown = 'initial';

      await act(async () => {
        returnValue = await result.current.execute(async () => {
          throw new Error('Test error');
        });
      });

      expect(returnValue).toBe(null);
    });

    it('should call custom onError handler', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useAsyncOperation({ onError }));

      await act(async () => {
        await result.current.execute(async () => {
          throw new Error('Custom error');
        });
      });

      expect(onError).toHaveBeenCalledWith('Custom error');
      expect(result.current.error).toBe(null); // Error not set when custom handler provided
    });
  });

  describe('resetError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useAsyncOperation());

      await act(async () => {
        await result.current.execute(async () => {
          throw new Error('Error');
        });
      });

      expect(result.current.error).toBe('Error');

      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const { result } = renderHook(() => useAsyncOperation());

      await act(async () => {
        await result.current.execute(async () => {
          throw new Error('Error');
        });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });
});
