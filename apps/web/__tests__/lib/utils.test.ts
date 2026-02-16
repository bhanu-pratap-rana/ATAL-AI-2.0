/**
 * Tests for General Utilities
 *
 * Tests the cn() utility function for combining Tailwind classes
 */

import { cn } from '@/lib/utils';

describe('cn (class name utility)', () => {
  it('should merge single class', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('should merge multiple classes', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toContain('text-red-500');
    expect(result).toContain('bg-blue-500');
  });

  it('should handle undefined values', () => {
    expect(cn('text-red-500', undefined)).toBe('text-red-500');
  });

  it('should handle null values', () => {
    expect(cn('text-red-500', null)).toBe('text-red-500');
  });

  it('should handle false values', () => {
    expect(cn('text-red-500', false)).toBe('text-red-500');
  });

  it('should handle empty string', () => {
    expect(cn('text-red-500', '')).toBe('text-red-500');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
  });

  it('should handle conditional classes when false', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class');
  });

  it('should merge conflicting Tailwind classes', () => {
    // tailwind-merge should keep the last conflicting class
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should merge padding classes correctly', () => {
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');
  });

  it('should merge margin classes correctly', () => {
    const result = cn('m-2', 'm-4');
    expect(result).toBe('m-4');
  });

  it('should preserve non-conflicting classes', () => {
    const result = cn('text-red-500', 'p-4', 'bg-white');
    expect(result).toContain('text-red-500');
    expect(result).toContain('p-4');
    expect(result).toContain('bg-white');
  });

  it('should handle array input', () => {
    const result = cn(['text-red-500', 'bg-blue-500']);
    expect(result).toContain('text-red-500');
    expect(result).toContain('bg-blue-500');
  });

  it('should handle object input', () => {
    const result = cn({
      'text-red-500': true,
      'bg-blue-500': true,
      'hidden': false,
    });
    expect(result).toContain('text-red-500');
    expect(result).toContain('bg-blue-500');
    expect(result).not.toContain('hidden');
  });

  it('should handle mixed inputs', () => {
    const result = cn(
      'base',
      ['array-class'],
      { 'object-class': true },
      'inline'
    );
    expect(result).toContain('base');
    expect(result).toContain('array-class');
    expect(result).toContain('object-class');
    expect(result).toContain('inline');
  });

  it('should return empty string for no valid classes', () => {
    expect(cn()).toBe('');
    expect(cn(undefined, null, false)).toBe('');
  });

  it('should handle responsive classes', () => {
    const result = cn('w-full', 'md:w-1/2', 'lg:w-1/3');
    expect(result).toContain('w-full');
    expect(result).toContain('md:w-1/2');
    expect(result).toContain('lg:w-1/3');
  });

  it('should handle pseudo-class variants', () => {
    const result = cn('bg-white', 'hover:bg-gray-100', 'focus:ring-2');
    expect(result).toContain('bg-white');
    expect(result).toContain('hover:bg-gray-100');
    expect(result).toContain('focus:ring-2');
  });
});
