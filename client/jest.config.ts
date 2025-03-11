import type { Config } from 'vitest/config';
import { pathsToModuleNameMapper } from 'ts-jest';

const config: Config = {
  test: {
    globals: true,
    environment: 'jsdom',
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
      '^@shared/(.*)$': '<rootDir>/src/__tests__/__mocks__/$1',
    },
    setupFiles: ['<rootDir>/src/setupTests.ts'],
    testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  },
};

export default config;