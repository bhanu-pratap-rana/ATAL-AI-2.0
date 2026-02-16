/**
 * Jest Setup File
 * Configures testing utilities and global mocks
 */

import '@testing-library/jest-dom';
import React from 'react';

// Filter out framer-motion specific props
const filterMotionProps = (props: Record<string, unknown>) => {
  const motionProps = ['whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'initial', 'animate', 'exit', 'transition', 'variants', 'layout', 'layoutId'];
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!motionProps.includes(key)) {
      filtered[key] = props[key];
    }
  }
  return filtered;
};

// Mock framer-motion to render regular HTML elements
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...filterMotionProps(props), ref }, children)
    ),
    button: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLButtonElement>) =>
      React.createElement('button', { ...filterMotionProps(props), ref }, children)
    ),
    span: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLSpanElement>) =>
      React.createElement('span', { ...filterMotionProps(props), ref }, children)
    ),
    p: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLParagraphElement>) =>
      React.createElement('p', { ...filterMotionProps(props), ref }, children)
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

// Mock @radix-ui/react-slot
jest.mock('@radix-ui/react-slot', () => ({
  Slot: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLElement>) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { ...props, ref });
    }
    return children;
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js image component (returns a simple mock element)
jest.mock('next/image', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((props) => ({
    type: 'img',
    props: { ...props, alt: props.alt || '' },
  })),
}));

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(private callback: IntersectionObserverCallback) {}

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock crypto.getRandomValues for secure random tests
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array | Uint32Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => 'test-uuid-1234-5678-90ab-cdefghij',
    subtle: {},
  },
});

// Suppress console errors during tests (optional - uncomment if needed)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };
