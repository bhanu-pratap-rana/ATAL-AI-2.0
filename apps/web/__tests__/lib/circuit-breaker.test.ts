/**
 * Tests for circuit-breaker.ts
 * Tests circuit breaker pattern implementation
 */

import {
  CircuitBreaker,
  CircuitBreakerFactory,
  CircuitBreakerState,
} from "@/lib/circuit-breaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    jest.useFakeTimers();
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initial state", () => {
    it("should start in CLOSED state", () => {
      expect(breaker.getState()).toBe("CLOSED");
    });

    it("should have zero counts initially", () => {
      const metrics = breaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.lastFailureTime).toBeNull();
      expect(metrics.nextAttemptTime).toBeNull();
    });
  });

  describe("execute in CLOSED state", () => {
    it("should allow successful requests", async () => {
      const fn = jest.fn().mockResolvedValue("success");

      const result = await breaker.execute(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe("CLOSED");
    });

    it("should propagate errors but stay CLOSED below threshold", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Test error"));

      await expect(breaker.execute(fn)).rejects.toThrow("Test error");
      await expect(breaker.execute(fn)).rejects.toThrow("Test error");

      expect(breaker.getState()).toBe("CLOSED");
      expect(breaker.getMetrics().failureCount).toBe(2);
    });

    it("should transition to OPEN after reaching failure threshold", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Test error"));

      // Execute until threshold (3 failures)
      await expect(breaker.execute(fn)).rejects.toThrow();
      await expect(breaker.execute(fn)).rejects.toThrow();
      await expect(breaker.execute(fn)).rejects.toThrow();

      expect(breaker.getState()).toBe("OPEN");
    });

    it("should reset failure count on success", async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error("Test error"));
      const successFn = jest.fn().mockResolvedValue("success");

      // 2 failures, then success
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      await breaker.execute(successFn);

      // Failure count should be reset
      expect(breaker.getMetrics().failureCount).toBe(0);
      expect(breaker.getState()).toBe("CLOSED");
    });
  });

  describe("execute in OPEN state", () => {
    beforeEach(async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Test error"));
      // Trigger circuit breaker to OPEN
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }
      expect(breaker.getState()).toBe("OPEN");
    });

    it("should reject requests immediately when OPEN", async () => {
      const fn = jest.fn().mockResolvedValue("success");

      await expect(breaker.execute(fn)).rejects.toThrow(
        /Circuit breaker is OPEN/
      );
      expect(fn).not.toHaveBeenCalled();
    });

    it("should include retry time in error message", async () => {
      const fn = jest.fn().mockResolvedValue("success");

      await expect(breaker.execute(fn)).rejects.toThrow(/Retrying in/);
    });

    it("should transition to HALF_OPEN after timeout", async () => {
      const fn = jest.fn().mockResolvedValue("success");

      // Advance time past timeout
      jest.advanceTimersByTime(5001);

      await breaker.execute(fn);

      // Should be CLOSED after success in HALF_OPEN
      // (or still HALF_OPEN if successThreshold not met)
      expect(["HALF_OPEN", "CLOSED"]).toContain(breaker.getState());
    });
  });

  describe("execute in HALF_OPEN state", () => {
    beforeEach(async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Test error"));
      // Trigger to OPEN
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }
      // Advance to HALF_OPEN
      jest.advanceTimersByTime(5001);
    });

    it("should transition back to OPEN on failure", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Still failing"));

      await expect(breaker.execute(fn)).rejects.toThrow("Still failing");

      expect(breaker.getState()).toBe("OPEN");
    });

    it("should transition to CLOSED after success threshold", async () => {
      const fn = jest.fn().mockResolvedValue("success");

      // Need 2 successes (successThreshold) to close
      await breaker.execute(fn);
      expect(breaker.getState()).toBe("HALF_OPEN");

      await breaker.execute(fn);
      expect(breaker.getState()).toBe("CLOSED");
    });

    it("should reset metrics when transitioning to CLOSED", async () => {
      const fn = jest.fn().mockResolvedValue("success");

      await breaker.execute(fn);
      await breaker.execute(fn);

      expect(breaker.getState()).toBe("CLOSED");
      const metrics = breaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
    });
  });

  describe("reset", () => {
    it("should reset to CLOSED state", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Test error"));
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }
      expect(breaker.getState()).toBe("OPEN");

      breaker.reset();

      expect(breaker.getState()).toBe("CLOSED");
      const metrics = breaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.lastFailureTime).toBeNull();
      expect(metrics.nextAttemptTime).toBeNull();
    });
  });

  describe("onStateChange callback", () => {
    it("should call callback when state changes", async () => {
      const onStateChange = jest.fn();
      const breakerWithCallback = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 5000,
        onStateChange,
      });

      const fn = jest.fn().mockRejectedValue(new Error("Test error"));

      await expect(breakerWithCallback.execute(fn)).rejects.toThrow();
      expect(onStateChange).not.toHaveBeenCalled(); // Still CLOSED

      await expect(breakerWithCallback.execute(fn)).rejects.toThrow();
      expect(onStateChange).toHaveBeenCalledWith("OPEN");
    });

    it("should not call callback if state doesn't change", async () => {
      const onStateChange = jest.fn();
      const breakerWithCallback = new CircuitBreaker({
        failureThreshold: 3,
        onStateChange,
      });

      const fn = jest.fn().mockResolvedValue("success");
      await breakerWithCallback.execute(fn);
      await breakerWithCallback.execute(fn);

      expect(onStateChange).not.toHaveBeenCalled();
    });
  });

  describe("default options", () => {
    it("should use default values when options not provided", () => {
      const defaultBreaker = new CircuitBreaker();
      const metrics = defaultBreaker.getMetrics();

      expect(defaultBreaker.getState()).toBe("CLOSED");
      expect(metrics.failureCount).toBe(0);
    });
  });

  describe("getMetrics", () => {
    it("should track lastFailureTime", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Test error"));

      const before = Date.now();
      await expect(breaker.execute(fn)).rejects.toThrow();

      const metrics = breaker.getMetrics();
      expect(metrics.lastFailureTime).toBeGreaterThanOrEqual(before);
    });

    it("should track nextAttemptTime when OPEN", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Test error"));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }

      const metrics = breaker.getMetrics();
      expect(metrics.nextAttemptTime).not.toBeNull();
      expect(metrics.nextAttemptTime).toBeGreaterThan(Date.now());
    });
  });
});

describe("CircuitBreakerFactory", () => {
  let factory: CircuitBreakerFactory;

  beforeEach(() => {
    factory = new CircuitBreakerFactory();
  });

  describe("getBreaker", () => {
    it("should create new breaker for unknown name", () => {
      const breaker = factory.getBreaker("test-service");

      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getState()).toBe("CLOSED");
    });

    it("should return same breaker for same name", () => {
      const breaker1 = factory.getBreaker("test-service");
      const breaker2 = factory.getBreaker("test-service");

      expect(breaker1).toBe(breaker2);
    });

    it("should create different breakers for different names", () => {
      const breaker1 = factory.getBreaker("service-a");
      const breaker2 = factory.getBreaker("service-b");

      expect(breaker1).not.toBe(breaker2);
    });

    it("should pass options to new breakers", async () => {
      jest.useFakeTimers();

      const breaker = factory.getBreaker("test-service", {
        failureThreshold: 1,
        timeout: 1000,
      });

      const fn = jest.fn().mockRejectedValue(new Error("Test"));
      await expect(breaker.execute(fn)).rejects.toThrow();

      expect(breaker.getState()).toBe("OPEN");

      jest.useRealTimers();
    });
  });

  describe("reset", () => {
    it("should reset specific breaker", async () => {
      jest.useFakeTimers();

      const breaker = factory.getBreaker("test-service", {
        failureThreshold: 1,
      });
      const fn = jest.fn().mockRejectedValue(new Error("Test"));
      await expect(breaker.execute(fn)).rejects.toThrow();
      expect(breaker.getState()).toBe("OPEN");

      factory.reset("test-service");

      expect(breaker.getState()).toBe("CLOSED");

      jest.useRealTimers();
    });

    it("should not throw for unknown breaker name", () => {
      expect(() => factory.reset("unknown")).not.toThrow();
    });
  });

  describe("resetAll", () => {
    it("should reset all breakers", async () => {
      jest.useFakeTimers();

      const breaker1 = factory.getBreaker("service-a", { failureThreshold: 1 });
      const breaker2 = factory.getBreaker("service-b", { failureThreshold: 1 });

      const fn = jest.fn().mockRejectedValue(new Error("Test"));
      await expect(breaker1.execute(fn)).rejects.toThrow();
      await expect(breaker2.execute(fn)).rejects.toThrow();

      expect(breaker1.getState()).toBe("OPEN");
      expect(breaker2.getState()).toBe("OPEN");

      factory.resetAll();

      expect(breaker1.getState()).toBe("CLOSED");
      expect(breaker2.getState()).toBe("CLOSED");

      jest.useRealTimers();
    });
  });

  describe("getAllMetrics", () => {
    it("should return empty object when no breakers", () => {
      expect(factory.getAllMetrics()).toEqual({});
    });

    it("should return metrics for all breakers", async () => {
      factory.getBreaker("service-a");
      factory.getBreaker("service-b");

      const metrics = factory.getAllMetrics();

      expect(Object.keys(metrics)).toEqual(["service-a", "service-b"]);
      expect(metrics["service-a"].state).toBe("CLOSED");
      expect(metrics["service-b"].state).toBe("CLOSED");
    });
  });
});
