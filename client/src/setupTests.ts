// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
import '@testing-library/jest-dom';

// Mock date-fns to ensure consistent date handling in tests
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn((date, formatStr) => `Formatted: ${date.toISOString()} (${formatStr})`),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
}));

// Set up global fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response)
);

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
