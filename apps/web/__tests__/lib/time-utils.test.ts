/**
 * Unit Tests for Time Utilities
 */

import {
  formatTimeMMSS,
  formatTimeTidyCompact,
  formatTimeHumanReadable,
  isCooldownElapsed,
  getRemainingCooldown,
  parseDuration,
} from '@/lib/time-utils';

describe('Time Utilities', () => {
  describe('formatTimeMMSS', () => {
    it('should format zero seconds', () => {
      expect(formatTimeMMSS(0)).toBe('00:00');
    });

    it('should format seconds only', () => {
      expect(formatTimeMMSS(45)).toBe('00:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatTimeMMSS(90)).toBe('01:30');
      expect(formatTimeMMSS(330)).toBe('05:30');
    });

    it('should handle large values', () => {
      expect(formatTimeMMSS(3661)).toBe('61:01'); // Over an hour
    });

    it('should pad single digits', () => {
      expect(formatTimeMMSS(65)).toBe('01:05');
    });
  });

  describe('formatTimeTidyCompact', () => {
    it('should format seconds with "s" suffix when under a minute', () => {
      expect(formatTimeTidyCompact(45)).toBe('45s');
      expect(formatTimeTidyCompact(5)).toBe('5s');
    });

    it('should format minutes with colon notation', () => {
      expect(formatTimeTidyCompact(90)).toBe('1:30');
      expect(formatTimeTidyCompact(300)).toBe('5:00');
    });

    it('should handle zero', () => {
      expect(formatTimeTidyCompact(0)).toBe('0s');
    });
  });

  describe('formatTimeHumanReadable', () => {
    it('should format seconds', () => {
      expect(formatTimeHumanReadable(1)).toBe('1 second');
      expect(formatTimeHumanReadable(30)).toBe('30 seconds');
    });

    it('should format minutes', () => {
      expect(formatTimeHumanReadable(60)).toBe('1 minute');
      expect(formatTimeHumanReadable(120)).toBe('2 minutes');
    });

    it('should format hours', () => {
      expect(formatTimeHumanReadable(3600)).toBe('1 hour');
      expect(formatTimeHumanReadable(7200)).toBe('2 hours');
    });

    it('should format days', () => {
      expect(formatTimeHumanReadable(86400)).toBe('1 day');
      expect(formatTimeHumanReadable(172800)).toBe('2 days');
    });
  });

  describe('isCooldownElapsed', () => {
    it('should return true when cooldown has elapsed', () => {
      const pastTime = new Date(Date.now() - 60000); // 1 minute ago
      expect(isCooldownElapsed(pastTime, 30)).toBe(true);
    });

    it('should return false when cooldown has not elapsed', () => {
      const recentTime = new Date(Date.now() - 5000); // 5 seconds ago
      expect(isCooldownElapsed(recentTime, 30)).toBe(false);
    });

    it('should return true when exactly at cooldown boundary', () => {
      const exactTime = new Date(Date.now() - 30000); // 30 seconds ago
      expect(isCooldownElapsed(exactTime, 30)).toBe(true);
    });
  });

  describe('getRemainingCooldown', () => {
    it('should return 0 when cooldown has elapsed', () => {
      const pastTime = new Date(Date.now() - 60000); // 1 minute ago
      expect(getRemainingCooldown(pastTime, 30)).toBe(0);
    });

    it('should return remaining seconds when in cooldown', () => {
      const recentTime = new Date(Date.now() - 10000); // 10 seconds ago
      const remaining = getRemainingCooldown(recentTime, 30);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(20);
    });
  });

  describe('parseDuration', () => {
    it('should parse hours', () => {
      expect(parseDuration('1h')).toBe(3600);
      expect(parseDuration('2h')).toBe(7200);
    });

    it('should parse minutes', () => {
      expect(parseDuration('30m')).toBe(1800);
      expect(parseDuration('45m')).toBe(2700);
    });

    it('should parse seconds', () => {
      expect(parseDuration('30s')).toBe(30);
      expect(parseDuration('90s')).toBe(90);
    });

    it('should parse combined durations', () => {
      expect(parseDuration('1h30m')).toBe(5400);
      expect(parseDuration('1h30m45s')).toBe(5445);
    });

    it('should handle case insensitivity', () => {
      expect(parseDuration('1H30M')).toBe(5400);
      expect(parseDuration('1h30M45S')).toBe(5445);
    });

    it('should return 0 for empty string', () => {
      expect(parseDuration('')).toBe(0);
    });
  });
});
