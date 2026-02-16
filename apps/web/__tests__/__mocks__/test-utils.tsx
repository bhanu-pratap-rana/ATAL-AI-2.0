/**
 * Test Utilities and Custom Render Functions
 *
 * Provides helper functions for testing React components
 * with all necessary providers and context.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Custom render function that wraps components with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: Record<string, unknown>;
}

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };

// Test data factories
export function createMockFormEvent(overrides: Partial<React.FormEvent> = {}): React.FormEvent {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...overrides,
  } as unknown as React.FormEvent;
}

export function createMockChangeEvent(value: string): React.ChangeEvent<HTMLInputElement> {
  return {
    target: { value },
    currentTarget: { value },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  } as unknown as React.ChangeEvent<HTMLInputElement>;
}

// Async utilities
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock timer utilities
export function advanceTimersByTime(ms: number) {
  jest.advanceTimersByTime(ms);
}

export function runAllTimers() {
  jest.runAllTimers();
}

// Assertion helpers
export function expectToBeInDocument(element: HTMLElement | null) {
  expect(element).toBeInTheDocument();
}

export function expectNotToBeInDocument(element: HTMLElement | null) {
  expect(element).not.toBeInTheDocument();
}
