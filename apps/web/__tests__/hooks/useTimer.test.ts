/**
 * Tests for useTimer Hook
 *
 * Tests timer functionality including:
 * - Elapsed time tracking
 * - Pause/resume
 * - Callback invocation
 * - Initial seconds setting
 */

import { renderHook, act } from "@testing-library/react";
import { useTimer, formatTimeMMSS } from "@/hooks/useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should start at 0 by default", () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current).toBe(0);
  });

  it("should start at initialSeconds when provided", () => {
    const { result } = renderHook(() => useTimer({ initialSeconds: 30 }));
    expect(result.current).toBe(30);
  });

  it("should increment every second when not paused", () => {
    const { result } = renderHook(() => useTimer());

    expect(result.current).toBe(0);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(1);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(3);
  });

  it("should not increment when paused", () => {
    const { result, rerender } = renderHook(
      ({ isPaused }) => useTimer({ isPaused }),
      { initialProps: { isPaused: false } }
    );

    // Advance time
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(2);

    // Pause
    rerender({ isPaused: true });

    // Advance time while paused
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(2); // Should not change
  });

  it("should resume after unpause", () => {
    const { result, rerender } = renderHook(
      ({ isPaused }) => useTimer({ isPaused }),
      { initialProps: { isPaused: true } }
    );

    // Advance time while paused
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(0);

    // Unpause
    rerender({ isPaused: false });

    // Advance time after unpause
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(3);
  });

  it("should call onTimeUpdate callback every second", () => {
    const onTimeUpdate = jest.fn();
    renderHook(() => useTimer({ onTimeUpdate }));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onTimeUpdate).toHaveBeenCalledTimes(3);
    expect(onTimeUpdate).toHaveBeenNthCalledWith(1, 1);
    expect(onTimeUpdate).toHaveBeenNthCalledWith(2, 2);
    expect(onTimeUpdate).toHaveBeenNthCalledWith(3, 3);
  });

  it("should not call onTimeUpdate when paused", () => {
    const onTimeUpdate = jest.fn();
    renderHook(() => useTimer({ isPaused: true, onTimeUpdate }));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onTimeUpdate).not.toHaveBeenCalled();
  });

  it("should update when initialSeconds changes", () => {
    const { result, rerender } = renderHook(
      ({ initialSeconds }) => useTimer({ initialSeconds }),
      { initialProps: { initialSeconds: 10 } }
    );

    expect(result.current).toBe(10);

    rerender({ initialSeconds: 50 });
    expect(result.current).toBe(50);
  });

  it("should cleanup interval on unmount", () => {
    const clearIntervalSpy = jest.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useTimer());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});

describe("formatTimeMMSS", () => {
  it("should format 0 seconds", () => {
    expect(formatTimeMMSS(0)).toBe("00:00");
  });

  it("should format seconds only", () => {
    expect(formatTimeMMSS(45)).toBe("00:45");
  });

  it("should format minutes and seconds", () => {
    expect(formatTimeMMSS(65)).toBe("01:05");
  });

  it("should format with padded minutes", () => {
    expect(formatTimeMMSS(323)).toBe("05:23");
  });

  it("should handle large values", () => {
    expect(formatTimeMMSS(3661)).toBe("61:01"); // 1 hour, 1 min, 1 sec
  });

  it("should format exact minutes", () => {
    expect(formatTimeMMSS(120)).toBe("02:00");
  });

  it("should pad single digit seconds", () => {
    expect(formatTimeMMSS(61)).toBe("01:01");
  });
});
