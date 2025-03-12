// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
import '@testing-library/jest-dom';
import { beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Global test setup
beforeEach(() => {
  // Clear console mocks between tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  // Clean up any mounted components
  cleanup();
  // Clear all mocks
  vi.clearAllMocks();
});

// Set up global fetch mock
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response)
);